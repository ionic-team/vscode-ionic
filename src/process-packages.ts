import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { coerce, major } from 'semver';
import { libString } from './messages';
import { Tip, TipType } from './tip';
import { Project } from './project';
import { getRunOutput, getStringFrom } from './utilities';

export function clearRefreshCache(context: vscode.ExtensionContext) {
	if (context) {
		context.workspaceState.update('npmOutdatedData', undefined);
	}

	console.log('Cached list of outdated packages cleared');
}

export async function processPackages(folder: string, allDependencies, devDependencies, context: vscode.ExtensionContext, packagesModified: Date): Promise<any> {
	if (!fs.lstatSync(folder).isDirectory()) {
		return {};
	}

	// npm outdated only shows dependencies and not dev dependencies if the node module isnt installed
	let outdated = '[]';
	try {
		const packageModifiedLast = context.workspaceState.get('packagesModified');
		outdated = context.workspaceState.get('npmOutdatedData');
		const changed = packagesModified.toUTCString() != packageModifiedLast;
		if (changed || !outdated) {
			outdated = await getRunOutput('npm outdated --json', folder);
			context.workspaceState.update('npmOutdatedData', outdated);
			context.workspaceState.update('packagesModified', packagesModified.toUTCString());
		} else {
			// Use the cached value
			// But also get a copy of the latest packages for updating later
			getRunOutput('npm outdated --json', folder).then((outdatedFresh) => {
				context.workspaceState.update('npmOutdatedData', outdatedFresh);
				context.workspaceState.update('packagesModified', packagesModified.toUTCString());
			});
		}
	} catch (err) {
		outdated = '[]';
		if (err && err.includes('401')) {
			vscode.window.showInformationMessage(`Unable to run 'npm outdated' due to authentication error. Check .npmrc`, 'OK');
		}
		console.error(err);
	}

	// outdated is an array with:
	//  "@ionic-native/location-accuracy": { "wanted": "5.36.0", "latest": "5.36.0", "dependent": "cordova-old" }  

	const packages = processDependencies(allDependencies, JSON.parse(outdated), devDependencies);
	inspectPackages(folder, packages);
	return packages;
}

export function reviewPackages(packages, project) {
	if (Object.keys(packages).length == 0) return;

	// Uncomment to show packages that have a major bump
	// listChanges(
	// 	project,
	// 	"Major Updates Available",
	// 	'These project dependencies have major releases that you should consider updating to.',
	// 	packages, "major");

	listPackages(
		project,
		"Packages",
		'Your ' + project.type + ' project relies on these packages. Consider packages which have not had updates in more than a year to be a candidate for replacement in favor of a project that is actively maintained.',
		packages, 'Dependency');

	listPackages(
		project,
		`Cordova Plugins`,
		`Your project relies on these Cordova plugins. Consider plugins which have not had updates in more than a year to be a candidate for replacement in favor of a plugin that is actively maintained.`,
		packages, 'Plugin', TipType.Cordova);

	listPackages(
		project,
		`Capacitor Plugins`,
		`Your project relies on these Capacitor plugins. Consider plugins which have not had updates in more than a year to be a candidate for replacement in favor of a plugin that is actively maintained.`,
		packages, 'Capacitor Plugin', TipType.Capacitor);
}

// List any plugins that use Cordova Hooks as potential issue
export function reviewPluginsWithHooks(packages): Tip[] {
	const tips = [];
	// List of packages that don't need to be reported to the user because they would be dropped in a Capacitor migration
	const dontReport = [
		'cordova-plugin-add-swift-support',
		'cordova-plugin-androidx',
		'cordova-plugin-androidx-adapter',
		'phonegap-plugin-push', // This has a hook for browser which is not applicable
		'cordova-plugin-push', // This has a hook for browser which is not applicable
	];

	if (Object.keys(packages).length == 0) return;
	for (const library of Object.keys(packages)) {
		if (packages[library].plugin && (packages[library].plugin.hasHooks) && !dontReport.includes(library)) {
			tips.push(new Tip(library,
				`contains Cordova hooks that may require manual migration to use with Capacitor.`,
				TipType.Warning,
				`${libString(library)} contains Cordova hooks that may to require manual migration to use with Capacitor.`
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
		const packages = JSON.parse(fs.readFileSync(pkg, 'utf8'));
		if (packages.capacitor?.ios || packages.capacitor?.android) {
			return true;
		}
	}
	return false;
}

function inspectPackages(folder: string, packages) {
	// plugins
	for (const library of Object.keys(packages)) {
		const plugin = folder + '/node_modules/' + library + '/plugin.xml';
		if (fs.existsSync(plugin)) {
			// Cordova based
			const content = fs.readFileSync(plugin, 'utf8');
			packages[library].depType = 'Plugin';
			packages[library].plugin = processPlugin(library, content);
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
			packages[library].depType = 'Capacitor Plugin';
			if (!packages[library].plugin) {
				packages[library].plugin = processPlugin(library, '');
			}
		}
	}

	// Whether to run without inspecting every package for descriptions, updates etc
	const quick = true;

	for (const library of Object.keys(packages)) {
		// Runs a command like this to find last update and other info: 
		// npm show cordova-plugin-app-version --json
		try {
			if (packages[library].version == '[custom]') {
				packages[library].updated = 'Unknown';
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
			packages[library].updated = 'Unknown';
			packages[library].description = '';
			packages[library].isOld = true;
		}
	}
}

function processPlugin(library: string, content) {
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

function listPackages(project: Project, title: string, description: string, packages, depType: string, tipType?: TipType) {
	const count = Object.keys(packages).filter((library) => { return (packages[library].depType == depType); }).length;
	if (count == 0) return;

	if (title) {
		project.setGroup(`${count} ${title}`, description, tipType, undefined, 'packages');
	}

	let lastScope;
	for (const library of Object.keys(packages).sort()) {
		if (packages[library].depType == depType) {
			let v = `${packages[library].version}`;
			if (v == 'null') v = '[custom]';

			let url = packages[library].url;
			if (url) {
				url = url.replace('git+', '');
			}
			const updated = packages[library].updated;
			const available = packages[library].latest;
			let update = '';
			if (packages[library].change == 'major') {
				update = `Major update available to ${packages[library].latest}`;
			} else if (packages[library].change == 'minor') {
				update = `Minor update available to ${packages[library].latest}`;
			}

			const description = packages[library].description;
			const scope = getStringFrom(library, '@', '/');
			if (scope != lastScope) {
				if (scope) {
					project.addSubGroup(scope);
					lastScope = scope;
				} else {
					project.clearSubgroup();
				}
			}
			let libraryTitle = library;
			if (scope) {
				libraryTitle = library.substring(scope.length + 2);
			}
			if (v != packages[library].latest && (packages[library].latest != 'Unknown')) {
				project.upgrade(library, libraryTitle, `${v} → ${packages[library].latest}`, v, packages[library].latest);
			} else {
				project.package(library, libraryTitle, `${v}`);
			}
		}
	}
	project.clearSubgroup();
}

function listChanges(project: Project, title, description, packages, changeType) {
	const count = Object.keys(packages).filter((library) => { return (packages[library].change == changeType); }).length;
	project.setGroup(`${count} ${title}`, description);

	for (const library of Object.keys(packages)) {
		if (packages[library].change == changeType) {
			let v = `${packages[library].version}`;
			if (v == 'null') v = '[custom]';

			project.upgrade(library, library, `${v} → ${packages[library].latest}`, v, packages[library].latest);
		}
	}
}

function processDependencies(allDependencies, outdated, devDependencies) {
	const packages = {};
	for (const library of Object.keys(allDependencies)) {
		let v = coerce(allDependencies[library]);
		if (allDependencies[library].startsWith('git') ||
			allDependencies[library].startsWith('file')) {
			v = '[custom]';
		}

		const recent = outdated[library];
		const wanted = recent?.wanted;
		let latest = recent?.latest;
		const current = recent?.current;
		const version = `${v}`;
		const isDev = devDependencies && (library in devDependencies);
		let change = 'none';
		try {
			if (latest) {
				const latestv = coerce(latest);
				if (latestv && latestv !== null) {
					if (major(v) !== major(latestv)) {
						change = 'major';
					} else if (version != latest) {
						change = 'minor';
					}
				} else { latest = 'Unknown'; }
			} else {
				latest = 'Unknown';
			}
		} catch (err) {
			console.error(`${library} latest version of "${latest}" is invalid`, err);
			latest = 'Unknown';
		}

		packages[library] = {
			version: version,
			current: current,
			wanted: wanted,
			latest: latest,
			versionString: allDependencies[library],
			change: change,
			depType: isDev ? 'Dependency' : 'Dependency'
		};
	}
	return packages;
}
