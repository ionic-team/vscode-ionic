import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { coerce } from 'semver';
import { Command, Tip, TipType } from './tip';
import { Project } from './project';
import { getRunOutput, getStringFrom } from './utilities';
import { NpmDependency, NpmOutdatedDependency, NpmPackage, PackageType, PackageVersion } from './npm-model';
import { listCommand, outdatedCommand } from './node-commands';
import { PackageCacheList, PackageCacheModified, PackageCacheOutdated } from './context-variables';
import { join } from 'path';

export function clearRefreshCache(context: vscode.ExtensionContext) {
	if (context) {
		for (const key of context.workspaceState.keys()) {
			if (key.startsWith(PackageCacheOutdated(undefined))) {
				context.workspaceState.update(key, undefined);
			}
			if (key.startsWith(PackageCacheList(undefined))) {
				context.workspaceState.update(key, undefined);
			}
		}
	}

	console.log('Cached data cleared');
}

export async function processPackages(folder: string, allDependencies: object, devDependencies: object, context: vscode.ExtensionContext, project: Project): Promise<any> {
	if (!fs.lstatSync(folder).isDirectory()) {
		return {};
	}


	// npm outdated only shows dependencies and not dev dependencies if the node module isnt installed
	let outdated = '[]';
	let versions = '{}';
	try {
		const packagesModified: Date = project.modified;
		const packageModifiedLast = context.workspaceState.get(PackageCacheModified(project));
		outdated = context.workspaceState.get(PackageCacheOutdated(project));
		versions = context.workspaceState.get(PackageCacheList(project));
		const changed = packagesModified.toUTCString() != packageModifiedLast;
		if (changed || !outdated || !versions) {
			await Promise.all([
				getRunOutput(outdatedCommand(project), folder).then((data) => {
					outdated = data;
					context.workspaceState.update(PackageCacheOutdated(project), outdated);
				}),
				getRunOutput(listCommand(project), folder).then((data) => {
					versions = data;
					context.workspaceState.update(PackageCacheList(project), versions);
				})
			]);
			context.workspaceState.update(PackageCacheModified(project), packagesModified.toUTCString());
		} else {
			// Use the cached value
			// But also get a copy of the latest packages for updating later
			getRunOutput(outdatedCommand(project), folder).then((outdatedFresh) => {
				context.workspaceState.update(PackageCacheOutdated(project), outdatedFresh);
				context.workspaceState.update(PackageCacheModified(project), packagesModified.toUTCString());
			});

			getRunOutput(listCommand(project), folder).then((versionsFresh) => {
				context.workspaceState.update(PackageCacheList(project), versionsFresh);
			});
		}
	} catch (err) {
		outdated = '[]';
		versions = '{}';
		if (err && err.includes('401')) {
			vscode.window.showInformationMessage(`Unable to run 'npm outdated' due to authentication error. Check .npmrc`, 'OK');
		}
		console.error(err);
	}

	// outdated is an array with:
	//  "@ionic-native/location-accuracy": { "wanted": "5.36.0", "latest": "5.36.0", "dependent": "cordova-old" }  

	const packages = processDependencies(allDependencies, getOutdatedData(outdated), devDependencies, getListData(versions));
	inspectPackages(project.folder ? project.folder : folder, packages);
	return packages;
}

function getOutdatedData(outdated: string): any {
	try {
		return JSON.parse(outdated);
	}
	catch
	{
		return [];
	}
}

function getListData(list: string): NpmPackage {
	try {
		return JSON.parse(list);
	}
	catch
	{
		return { name: undefined, dependencies: undefined, version: undefined };
	}
}

export function reviewPackages(packages: object, project: Project) {
	if (Object.keys(packages).length == 0) return;

	listPackages(
		project,
		"Packages",
		`Your ${project.type} project relies on these packages. Consider packages which have not had updates in more than a year to be a candidate for replacement in favor of a project that is actively maintained.`,
		packages, PackageType.Dependency);

	listPackages(
		project,
		`Cordova Plugins`,
		`Your project relies on these Cordova plugins. Consider plugins which have not had updates in more than a year to be a candidate for replacement in favor of a plugin that is actively maintained.`,
		packages, PackageType.CordovaPlugin, TipType.Cordova);

	listPackages(
		project,
		`Capacitor Plugins`,
		`Your project relies on these Capacitor plugins. Consider plugins which have not had updates in more than a year to be a candidate for replacement in favor of a plugin that is actively maintained.`,
		packages, PackageType.CapacitorPlugin, TipType.Capacitor);
}

// List any plugins that use Cordova Hooks as potential issue
export function reviewPluginsWithHooks(packages: object): Tip[] {
	const tips = [];
	// List of packages that don't need to be reported to the user because they would be dropped in a Capacitor migration
	const dontReport = [
		'cordova-plugin-add-swift-support',
		'cordova-plugin-androidx',
		'cordova-plugin-androidx-adapter',
		'cordova-plugin-ionic', // Works for Capacitor
		'phonegap-plugin-push', // This has a hook for browser which is not applicable
		'cordova-plugin-push', // This has a hook for browser which is not applicable
	];

	if (Object.keys(packages).length == 0) return;
	for (const library of Object.keys(packages)) {
		if (packages[library].plugin && (packages[library].plugin.hasHooks) && !dontReport.includes(library)) {
			tips.push(new Tip(library,
				`contains Cordova hooks that may require manual migration to use with Capacitor.`,
				TipType.Warning,
				`${library} contains Cordova hooks that may to require manual migration to use with Capacitor.`, Command.NoOp, 'OK'
			));
		}
	}
	return tips;
}

export function reviewPluginProperties(packages, project: Project) {
	if (Object.keys(packages).length == 0) return;

	// Process features and permissions
	const features = {};
	const permissions = {};
	for (const library of Object.keys(packages)) {
		if (packages[library].depType == 'Plugin') {
			for (const permission of packages[library].plugin.androidPermissions) {
				if (!permissions[permission]) {
					permissions[permission] = [];
				}
				permissions[permission].push(library);
			}
			for (const feature of packages[library].plugin.androidFeatures) {
				if (!features[feature]) {
					features[feature] = [];
				}
				features[feature].push(library);
			}
		}
	}

	if (Object.keys(permissions).length > 0) {
		project.setGroup(`Android Permissions`, 'The following Android permissions are used by plugins.', TipType.Android);
		for (const permission of Object.keys(permissions)) {
			project.note(permission, permissions[permission].join(', '));
		}
	}

	if (Object.keys(features).length > 0) {
		project.setGroup(`Android Features`, 'The following Android features are used by plugins.', TipType.Android);
		for (const feature of Object.keys(features)) {
			project.note(feature, features[feature].join(', '));
		}
	}
}

function dateDiff(d1: Date, d2: Date): string {
	let months;
	months = (d2.getFullYear() - d1.getFullYear()) * 12;
	months -= d1.getMonth();
	months += d2.getMonth();
	months = months <= 0 ? 0 : months;
	let updated = `${months} months`;
	if (months == 0) {
		updated = 'Recent';
	}
	if (months >= 12) {
		updated = `${Math.trunc(months / 12)} years`;
	}
	return updated;
}

function olderThan(d1: Date, d2: Date, days: number): boolean {
	const diff = d2.getTime() - d1.getTime();
	return diff / (1000 * 3600 * 24) > days;
}

function markIfPlugin(folder: string): boolean {
	const pkg = path.join(folder, 'package.json');
	if (fs.existsSync(pkg)) {
		try {
			const packages = JSON.parse(fs.readFileSync(pkg, 'utf8'));
			if (packages.capacitor?.ios || packages.capacitor?.android) {
				return true;
			}
		} catch {
			console.warn(`Unable to parse ${pkg}`);
			return false;
		}
	}
	return false;
}

function inspectPackages(folder: string, packages) {
	// plugins
	for (const library of Object.keys(packages)) {
		const plugin = join(folder, 'node_modules', library, 'plugin.xml');
		if (fs.existsSync(plugin)) {
			// Cordova based
			const content = fs.readFileSync(plugin, 'utf8');
			packages[library].depType = PackageType.CordovaPlugin;
			packages[library].plugin = processPlugin(content);
		}

		const nmFolder = folder + '/node_modules/' + library;

		let isPlugin = false;

		if (fs.existsSync(nmFolder)) {
			isPlugin = markIfPlugin(nmFolder);

			fs.readdirSync(nmFolder, { withFileTypes: true })
				.filter(dirent => dirent.isDirectory())
				.map(dirent => {
					const hasPlugin = markIfPlugin(path.join(nmFolder, dirent.name));
					if (hasPlugin) {
						isPlugin = true;
					}
				});
		}

		// Look for capacitor only as well
		if (isPlugin) {
			packages[library].depType = PackageType.CapacitorPlugin;
			if (!packages[library].plugin) {
				packages[library].plugin = processPlugin('');
			}
		}
	}

	// Whether to run without inspecting every package for descriptions, updates etc
	const quick = true;

	for (const library of Object.keys(packages)) {
		// Runs a command like this to find last update and other info: 
		// npm show cordova-plugin-app-version --json
		try {
			if (packages[library].version == PackageVersion.Custom) {
				packages[library].updated = PackageVersion.Unknown;
				packages[library].description = '';
				packages[library].isOld = true;
			} else {
				if (!quick) {
					const json = child_process.execSync(`npm show ${library} --json`, { cwd: folder }).toString();
					const info = JSON.parse(json);

					const modified = new Date(info.time.modified);
					packages[library].updated = dateDiff(modified, new Date(Date.now())); // "2020-12-10T08:56:06.108Z" -> 6 Months
					packages[library].isOld = olderThan(modified, new Date(Date.now()), 365);
					packages[library].url = info.repository?.url; // eg git+https://github.com/sampart/cordova-plugin-app-version.git            
					packages[library].description = info.description;
					packages[library].latest = info.version;
				}
			}
		} catch (err) {
			console.log(`Unable to find latest version of ${library} on npm`, err);
			packages[library].updated = PackageVersion.Unknown;
			packages[library].description = '';
			packages[library].isOld = true;
		}
	}
}

function processPlugin(content: string) {
	const result = { androidPermissions: [], androidFeatures: [], hasHooks: false };
	// Inspect plugin.xml in content and return plugin information { androidPermissions: ['android.permission.INTERNET']}
	for (const permission of findAll(content, '<uses-permission android:name="', '"')) {
		result.androidPermissions.push(permission);
	}
	for (const feature of findAll(content, '<uses-feature android:name="', '"')) {
		result.androidFeatures.push(feature);
	}
	for (const hook of findAll(content, '<hook', '"')) {
		result.hasHooks = true;
	}
	return result;
}

function findAll(content, search: string, endsearch: string): Array<any> {
	const list = Array.from(content.matchAll(new RegExp(search + '(.*?)' + endsearch, 'g')));
	const result = [];
	if (!list) return result;
	for (const item of list) {
		result.push(item[1]);
	}
	return result;
}

function listPackages(project: Project, title: string, description: string, packages: object, depType: string, tipType?: TipType) {
	const count = Object.keys(packages).filter((library) => { return (packages[library].depType == depType); }).length;
	if (count == 0) return;

	if (title) {
		project.setGroup(`${count} ${title}`, description, tipType, undefined, 'packages');
	}

	let lastScope: string;
	for (const library of Object.keys(packages).sort()) {
		if (packages[library].depType == depType) {
			let v = `${packages[library].version}`;
			let latest;
			if (v == 'null') v = PackageVersion.Custom;

			let url = packages[library].url;
			if (url) {
				url = url.replace('git+', '');
			}

			const scope = getStringFrom(library, '@', '/');
			if (scope != lastScope) {
				if (scope) {
					latest = undefined;
					if (scope == 'angular') {
						//
						latest = packages['@angular/core']?.latest;
					}
					project.addSubGroup(scope, latest);
					lastScope = scope;
				} else {
					project.clearSubgroup();
				}
			}
			let libraryTitle = library;
			if (scope) {
				libraryTitle = library.substring(scope.length + 2);
			}
			if (v != packages[library].latest && (packages[library].latest !== PackageVersion.Unknown)) {
				project.upgrade(library, libraryTitle, `${v} → ${packages[library].latest}`, v, packages[library].latest);
			} else {
				project.package(library, libraryTitle, `${v}`);
			}
		}
	}
	project.clearSubgroup();
}

function processDependencies(allDependencies: object, outdated: object, devDependencies: object, list: NpmPackage) {
	const packages = {};
	for (const library of Object.keys(allDependencies)) {
		const dep: NpmDependency = list.dependencies ? list.dependencies[library] : undefined;
		let version = dep ? dep.version : `${coerce(allDependencies[library])}`;
		if (allDependencies[library].startsWith('git') ||
			allDependencies[library].startsWith('file')) {
			version = PackageVersion.Custom;
		}

		const recent: NpmOutdatedDependency = outdated[library];
		const wanted = recent?.wanted;
		const latest = recent?.latest == undefined ? PackageVersion.Unknown : recent.latest;
		const current = recent?.current;

		const isDev = devDependencies && (library in devDependencies);

		packages[library] = {
			version: version,
			current: current,
			wanted: wanted,
			latest: latest,
			isDevDependency: isDev,
			depType: PackageType.Dependency
		};
	}
	return packages;
}
