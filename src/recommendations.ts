import {
	checkConsistentVersions,
	checkMinVersion,
	load,
	isCapacitor,
	isCordova,
	isGreaterOrEqual,
	checkCordovaAndroidPreference,
	checkCordovaAndroidPreferenceMinimum,
	checkCordovaIosPreference,
	warnMinVersion,	
	exists
} from './analyzer';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { libString } from './messages';
import { reviewPackages, reviewPluginProperties } from './process-packages';
import { Recommendation } from './recommendation';
import { Tip, TipType } from './tip';

import { asAppId, getPackageJSON, PackageFile } from './utilities';
import { fixIssue } from './extension';
import { getGlobalIonicConfig, sendTelemetryEvents } from './telemetry';
import { ionicState } from './ionic-tree-provider';
import { Context } from './context-variables';
import { addSplashAndIconFeatures } from './splash-icon';
import { capacitorMigrationChecks, capacitorRecommendations } from './capacitor-migration';
import { CapacitorPlatform, capRun } from './capacitor-run';
import { ionicBuild } from './ionic-build';
import { reviewCapacitorConfig } from './capacitor-configure';
import { ionicServe } from './ionic-serve';

export class Project {
	name: string;
	type: string = undefined;
	folder: string;
	modified: Date; // Last modified date of package.json
	group: Recommendation;
	subgroup: Recommendation;
	groups: Recommendation[] = [];

	constructor(_name: string) {
		this.name = _name;
	}

	public setGroup(title: string, message: string, type?: TipType, expanded?: boolean, contextValue?: string): Recommendation {

		// If the last group has no items in it then remove it (eg if there are no recommendations for a project)
		if (this.groups.length > 1 && this.groups[this.groups.length - 1].children.length == 0) {
			this.groups.pop();
		}
		const r = new Recommendation(message, '', title, expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
		if (contextValue) {
			r.setContext(contextValue);
		}
		r.children = [];
		r.setIcon('dependency');
		this.setIcon(type, r);
		this.group = r;
		this.groups.push(this.group);
		return r;
	}

	// Look in package.json for scripts and add options to execute
	public addScripts() {
		const packages: PackageFile = getPackageJSON(this.folder);
		for (const script of Object.keys(packages.scripts)) {
			this.add(new Tip(script, '', TipType.Run, '', `npm run ${script}`, `Running ${script}`, `Ran ${script}`));
		}
	}

	public note(title: string, message: string, url?: string, tipType?: TipType, description?: string) {
		const tip = new Tip(title, message, tipType, description, undefined, undefined, undefined, url);
		const r = new Recommendation(description ? description : message, message, title, vscode.TreeItemCollapsibleState.None,
			{
				command: 'ionic.fix',
				title: 'Information',
				arguments: [tip]
			}, undefined);

		this.setIcon(tipType, r);

		this.group.children.push(r);
	}

	setIcon(tipType: TipType, r: Recommendation) {
		switch (tipType) {
			case TipType.Error: r.setIcon('error'); break;
			case TipType.Warning: r.setIcon('warning'); break;
			case TipType.Idea: r.setIcon('lightbulb'); break;
			case TipType.Files: r.setIcon('files'); break;
			case TipType.Media: r.setIcon('file-media'); break;
			case TipType.Cordova: r.setIcon('cordova'); break;
			case TipType.Capacitor: r.setIcon('capacitor'); break;
			case TipType.Ionic: r.setIcon('ionic'); break;
			case TipType.Android: r.setIcon('android'); break;
			case TipType.Comment: r.setIcon('comment'); break;
			case TipType.Settings: r.setIcon('settings-gear'); break;
			case TipType.Run: r.setIcon('run'); break;
			case TipType.Link: r.setIcon('files'); break;
			case TipType.None: break;
			case TipType.Add: r.setIcon('add'); break;
			case TipType.Sync: r.setIcon('sync'); break;
			case TipType.Build: r.setIcon('build'); break;
			case TipType.Edit: r.setIcon('edit'); break;
		}
	}

	public add(tip: Tip) {
		let cmd: vscode.Command = {
			command: 'ionic.fix',
			title: 'Fix',
			arguments: [tip]
		};

		if ([TipType.Run, TipType.Sync, TipType.Build, TipType.Edit].includes(tip.type) || tip.doRun) {
			cmd = {
				command: 'ionic.runapp',
				title: 'Run',
				arguments: [tip]
			};
		}

		if (tip.type == TipType.Link) {
			cmd = {
				command: 'ionic.link',
				title: 'Open',
				arguments: [tip]
			};
			tip.url = tip.description as string;
		}

		const tooltip = tip.tooltip ? tip.tooltip : tip.message;
		const r = new Recommendation(tooltip, tip.message, tip.title, vscode.TreeItemCollapsibleState.None, cmd, tip, tip.url);
		this.setIcon(tip.type, r);

		// Context values are used for the when condition for vscode commands (see ionic.open in package.json)
		if (tip.contextValue) {
			r.setContext(tip.contextValue);
		}

		if (this.subgroup) {
			this.subgroup.children.push(r);
		} else {
			this.group.children.push(r);
		}
	}

	public addSubGroup(title: string) {
		const r = new Recommendation(undefined, undefined, '@' + title, vscode.TreeItemCollapsibleState.Expanded);
		r.children = [];
		this.group.children.push(r);
		this.subgroup = r;
	}

	public clearSubgroup() {
		this.subgroup = undefined;
	}

	public recommendReplace(name: string, title: string, message: string, description: string, replacement: string) {
		if (exists(name)) {
			this.add(new Tip(title, message, TipType.Warning, description, `npm install ${replacement} && npm uninstall ${name}`, 'Replace', `Replaced ${name} with ${replacement}`));
		}
	}

	public recommendRemove(name: string, title: string, message: string, description?: string, url?: string) {
		if (exists(name)) {
			this.add(new Tip(title, message, TipType.Warning, description, `npm uninstall ${name}`, 'Uninstall', `Uninstalled ${name}`, url));
		}
	}

	public recommendAdd(name: string, title: string, message: string, description?: string) {
		this.add(new Tip(title, message, TipType.Warning, description, `npm install ${name}`, 'Install', `Installed ${name}`));
	}

	public deprecatedPlugin(name: string, message: string, url?: string) {
		if (exists(name)) {
			this.note(
				name,
				`This plugin is deprecated. ${message}`,
				url,
				TipType.Warning,
				`The plugin ${name} is deprecated. ${message}`
			);
		}
	}

	public upgrade(name: string, title: string, message: string, fromVersion: string, toVersion: string) {
		if (exists(name)) {
			let extra = '';
			if (name == '@capacitor/core') {
				if (exists('@capacitor/ios')) {
					extra += ` @capacitor/ios@${toVersion}`;
				}
				if (exists('@capacitor/android')) {
					extra += ` @capacitor/android@${toVersion}`;
				}
			}
			this.add(new Tip(
				title,
				message,
				undefined,
				`Upgrade ${name} from ${fromVersion} to ${toVersion}`,
				`npm install ${name}@${toVersion}${extra} --save-exact`,
				`Upgrade`,
				`${name} upgraded to ${toVersion}`,
				`https://www.npmjs.com/package/${name}`,
				`Upgrading ${name}`
			).setSecondCommand(`Uninstall`, `npm uninstall ${name}`));
		}
	}

	public package(name: string, title: string, message: string) {
		if (exists(name)) {
			this.add(new Tip(
				title,
				message,
				undefined,
				`Uninstall ${name}`,
				`npm uninstall ${name}`,
				`Uninstall`,
				`${name} Uninstalled`,
				`https://www.npmjs.com/package/${name}`,
				`Uninstalling ${name}`
			));
		}
	}

	public checkNotExists(library: string, message: string) {
		if (exists(library)) {
			this.add(new Tip(library, message, TipType.Error, undefined, `npm uninstall ${library}`, 'Uninstall', `Uninstalled ${library}`));
		}
	}

	public tip(tip: Tip) {
		if (tip) {
			this.add(tip);
		}
	}

	public tips(tips: Tip[]) {
		for (const tip of tips) {
			this.tip(tip);
		}
	}

	public fileExists(filename: string): boolean {
		return fs.existsSync(path.join(this.folder, filename));
	}
}

function webProject(project: Project) {
	project.tip(new Tip(
		'Add Capacitor Integration', '', TipType.Capacitor, 'Integrate Capacitor with this project to make it native mobile.',
		[
			`npm install @capacitor/core`,
			`npm install @capacitor/cli --save-dev`,
			`npm install @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar --save-exact`,
			`npx cap init "${project.name}" "${asAppId(project.name)}"`
		],
		'Add Capacitor', 'Capacitor added to this project',
		'https://capacitorjs.com'
	));
}

function checkNodeVersion() {
	try {
		const v = process.version.split('.');
		const major = parseInt(v[0].substring(1));
		if (major < 13) {
			vscode.window.showErrorMessage(`This extension requires a minimum version of Node 14. ${process.version} is not supported.`, 'OK');
		}
	} catch {
		// Do nothing
	}
}

export async function installPackage(extensionPath: string, folder: string) {
	let items: Array<vscode.QuickPickItem> = [];
	const filename = path.join(extensionPath, 'resources', 'packages.json');
	items = JSON.parse(fs.readFileSync(filename) as any);
	items.map(item => { item.description = item.detail; item.detail = undefined; });
	//const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a package to install' });
	const selected = await vscode.window.showInputBox({ placeHolder: 'Enter package name to install' });
	if (!selected) return;
	await fixIssue(`npm install ${selected}`, folder, undefined,
		new Tip(`Install ${selected}`, undefined, TipType.Run, undefined, undefined,
			`Installing ${selected}`,
			`Installed ${selected}`).showProgressDialog());
}

export async function reviewProject(folder: string, context: vscode.ExtensionContext): Promise<Recommendation[]> {
	vscode.commands.executeCommand('setContext', Context.inspectedProject, false);
	vscode.commands.executeCommand('setContext', Context.isLoggingIn, false);

	const project: Project = new Project('My Project');
	const packages = await load(folder, project, context);
	ionicState.view.title = project.name;

	const gConfig = getGlobalIonicConfig();

	if (!gConfig['user.id'] && !ionicState.skipAuth) {
		vscode.commands.executeCommand('setContext', Context.isAnonymous, true);
		return undefined;
	} else {
		vscode.commands.executeCommand('setContext', Context.isAnonymous, false);
	}

	sendTelemetryEvents(folder, project, packages, context);

	checkNodeVersion();

	project.type = isCapacitor() ? 'Capacitor' : 'Cordova';
	project.folder = folder;

	if (isCapacitor() && !isCordova()) {
		project.setGroup(`Capacitor`, 'Recommendations related to Capacitor', TipType.Capacitor, true);

		const hasCapIos = exists('@capacitor/ios');
		const hasCapAndroid = exists('@capacitor/android');
		project.add(
			new Tip(
				'Run On Web', '', TipType.Run, 'Serve', undefined, 'Running on Web', `Project Served`)
				.setDynamicCommand(ionicServe)
				.requestViewEditor()
				.setRunPoints([
					{ title: 'Building...', text: 'Generating browser application bundles' },
					{ title: 'Serving', text: 'Development server running' }
				])
		);
		// project.add(new Tip('View In Editor', '', TipType.Run, 'Serve', undefined, 'Running on Web', `Project Served`).setAction(viewInEditor, 'http://localhost:8100'));
		if (hasCapAndroid) {
			project.add(new Tip('Run On Android', '', TipType.Run, 'Run', undefined, 'Running', 'Project is running').showProgressDialog().requestDeviceSelection().setDynamicCommand(capRun, CapacitorPlatform.android));
		}
		if (hasCapIos) {
			project.add(new Tip('Run On iOS', '', TipType.Run, 'Run', undefined, 'Running', 'Project is running').showProgressDialog().requestDeviceSelection().setDynamicCommand(capRun, CapacitorPlatform.ios));
		}

		project.add(new Tip('Build', '', TipType.Build, 'Build', undefined, 'Building', undefined).setDynamicCommand(ionicBuild, folder));
		if (exists('@capacitor/core')) {
			project.add(new Tip('Sync', '', TipType.Sync, 'Capacitor Sync', `npx cap sync`, 'Syncing', undefined));
		}
		if (hasCapIos) {
			project.add(new Tip('Open Xcode Project', '', TipType.Edit, 'Open Xcode', `npx cap open ios`, 'Opening project in Xcode').showProgressDialog());
		}
		if (hasCapAndroid) {
			project.add(new Tip('Open Android Studio Project', '', TipType.Edit, 'Opening project in Android Studio', `npx cap open android`, 'Open Android Studio').showProgressDialog());
		}

		project.setGroup(
			`Scripts`, ``, TipType.Files, false);
		project.addScripts();
	}

	if (isCapacitor()) {
		project.setGroup(`Configuration`, 'Configurations for native project', TipType.Capacitor, false);
		await reviewCapacitorConfig(project, context);

		// Splash Screen and Icon Features
		addSplashAndIconFeatures(project);
	}

	project.setGroup(
		`Recommendations`, `The following recommendations were made by analyzing the package.json file of your ${project.type} app.`, TipType.Idea, true);

	if (isCordova() && isCapacitor()) {
		project.note('Remove Cordova', 'The project is using both Cordova and Capacitor. Dependencies on Cordova should be removed', undefined, TipType.Error);
	}

	const nmf = path.join(folder, 'node_modules');
	if (!fs.existsSync(nmf)) {
		project.add(new Tip('Install Node Modules', '', TipType.Idea, 'Install Node Modules', 'npm install', 'Installing').performRun());
	}

	// Replace momentjs with date-fns
	project.recommendReplace('moment',
		`momentjs`,
		`Migrate the deprecated moment.js to date-fns`,
		`Migrate away from the deprecated library ${libString('moment')}. A good replacement is ${libString('date-fns')} which is significantly smaller and built for modern tooling (https://date-fns.org/)`,
		'date-fns'
	);

	// Remove jquery
	project.recommendRemove('jquery',
		'jQuery',
		`Refactor your code to remove the dependency on ${libString('jquery')}. Much of the API for Jquery is now available in browsers and often Jquery code conflicts with code written in your framework of choice.`,
	);

	project.recommendRemove('protractor',
		`Protractor`,
		`Your project has a dependency on Protractor whose development is slated to end December 2022. Consider migrating to a different E2E Testing solution.`, undefined,
		'https://docs.cypress.io/guides/migrating-to-cypress/protractor'
		//`Your project has a dependency on Protractor whose development is [slated to end December 2022](https://github.com/angular/protractor/issues/5502). Consider migrating to a different E2E Testing solution.`,
	);

	// node-sass deprecated and not required
	project.recommendRemove('node-sass',
		'node-sass',
		`The dependency ${libString('node-sass')} is deprecated and should be removed from package.json.`
	);

	// Adobe Mobiles services deprecation
	project.deprecatedPlugin('adobe-mobile-services', 'Mobile Services reaches end-of-life on December 31, 2022', 'https://experienceleague.adobe.com/docs/mobile-services/using/eol.html?lang=en');

	// App Center deprecated Cordova SDK
	project.deprecatedPlugin('cordova-plugin-appcenter-analytics', 'App Center is deprecating support for Cordova SDK in April 2022', 'https://devblogs.microsoft.com/appcenter/announcing-apache-cordova-retirement');
	project.deprecatedPlugin('cordova-plugin-appcenter-crashes', 'App Center is deprecating support for Cordova SDK in April 2022', 'https://devblogs.microsoft.com/appcenter/announcing-apache-cordova-retirement');
	project.deprecatedPlugin('cordova-plugin-appcenter-shared', 'App Center is deprecating support for Cordova SDK in April 2022', 'https://devblogs.microsoft.com/appcenter/announcing-apache-cordova-retirement');

	project.deprecatedPlugin('@ionic-enterprise/offline-storage', 'Replace this plugin with @ionic-enterprise/secure-storage');

	// Ionic 3+
	if (exists('ionic-angular')) {
		project.note('@ionic/angular',
			'Your Ionic project should be migrated to @ionic/angular version 5 or higher',
			'https://ionicframework.com/docs/reference/migration#migrating-from-ionic-3-0-to-ionic-4-0'
		);
	}

	// Angular 10 is in LTS until December 2021
	project.tip(warnMinVersion('@angular/core', '10.0.0', '. Your version is no longer supported.', 'https://angular.io/guide/releases#support-policy-and-schedule'));


	if (isCordova()) {
		project.tip(warnMinVersion('cordova-android', '10.0.1', 'to be able to target Android SDK v30 which is required for all submissions to the Play Store'));
		project.tip(warnMinVersion('cordova-ios', '6.1.0'));

		if (isGreaterOrEqual('cordova-android', '10.0.0')) {
			project.checkNotExists('cordova-plugin-whitelist', 'should be removed as its functionality is now built into Cordova');
			project.checkNotExists('phonegap-plugin-multidex', 'is not compatible with cordova-android 10+');
			project.checkNotExists('cordova-plugin-androidx', 'is not required when using cordova-android 10+');
			project.checkNotExists('cordova-plugin-androidx-adapter', 'is not required when using cordova-android 10+');
			project.checkNotExists('phonegap-plugin-push', 'is deprecated and does not support Android X. Migrate to using cordova-plugin-push');

			project.tip(checkMinVersion('cordova-plugin-inappbrowser', '5.0.0', 'to support Android 10+'));
			project.tip(checkMinVersion('cordova-plugin-ionic-webview', '5.0.0', 'to support Android 10+'));
			project.tip(checkMinVersion('scandit-cordova-datacapture-barcode', '6.9.1', 'to support Android 10+'));
			project.tip(checkMinVersion('cordova-plugin-ionic', '5.5.0', 'to support Android 10+'));
			project.tip(checkCordovaAndroidPreference('AndroidXEnabled', true));

			if (exists('cordova-plugin-push') || exists('@havesource/cordova-plugin-push')) {
				project.tip(checkCordovaAndroidPreference('GradlePluginGoogleServicesEnabled', true));
				project.tip(checkCordovaAndroidPreferenceMinimum('GradlePluginGoogleServicesVersion', '4.3.8'));
			}
		} else {
			project.checkNotExists('cordova-plugin-whitelist', 'is deprecated and no longer required with cordova-android v10+');
		}

		project.recommendReplace('phonegap-plugin-push', 'phonegap-plugin-push',
			`Replace with cordova-plugin-push due to deprecation`,
			`The plugin phonegap-plugin-push should be replaced with cordova-plugin-push as phonegap-plugin-push was deprecated in 2017`,
			'cordova-plugin-push');

		if (exists('@ionic-enterprise/identity-vault')) {
			// Make sure Swift is 4.2 or 5 when using identity vault
			project.tip(checkCordovaIosPreference('UseSwiftLanguageVersion', [4.2, 5], 4.2));
			if (!isGreaterOrEqual('@ionic-enterprise/identity-vault', '5.0.0')) {
				project.tip(checkMinVersion('@ionic-enterprise/identity-vault', '5.0.0', 'Update to v5 as it contains significant security fixes and broader support for Android security features', 'https://ionic.io/docs/identity-vault'));
			} else {
				if (!isGreaterOrEqual('@ionic-enterprise/identity-vault', '5.1.0')) {
					project.tip(checkMinVersion('@ionic-enterprise/identity-vault', '5.1.0', 'as the current version is missing important security fixes.', 'https://ionic.io/docs/identity-vault'));
				}
			}
		}

		if (exists('cordova-support-google-services') && (isGreaterOrEqual('cordova-android', '9.0.0'))) {
			project.recommendRemove('cordova-support-google-services', 'cordova-support-google-services', 'Remove as the functionality is built into cordova-android 9+. See: https://github.com/chemerisuk/cordova-support-google-services');
		}

		capacitorMigrationChecks(packages, project);

	} else if (isCapacitor()) {
		project.tip(checkMinVersion('@capacitor/core', '2.2.0'));
		project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/cli'));
		project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/ios'));
		project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/android'));

		// cordova-plugin-appsflyer-sdk doesnt build with Capacitor. Use appsflyer-capacitor-plugin instead (see https://github.com/AppsFlyerSDK/appsflyer-cordova-plugin#------%EF%B8%8F-note-for-capacitor-users--%EF%B8%8F------)
		project.recommendReplace('cordova-plugin-appsflyer-sdk', 'cordova-plugin-appsflyer-sdk',
			`Replace with appsflyer-capacitor-plugin.`,
			`The plugin ${libString('cordova-plugin-appsflyer-sdk')} should be replaced with ${libString('appsflyer-capacitor-plugin')}.`,
			'appsflyer-capacitor-plugin'
		);

		if (exists('cordova-plugin-file-transfer') && !exists('cordova-plugin-whitelist')) {
			// Latest 1.7.1 of the file-transfer plugin requires whitelist in Capacitor projects. See: https://github.com/ionic-team/capacitor/issues/1199
			project.recommendAdd('cordova-plugin-whitelist', 'cordova-plugin-file-transfer',
				'Install cordova-plugin-whitelist for compatibility',
				'The plugin cordova-plugin-file-transfer has a dependency on cordova-plugin-whitelist when used with a Capacitor project');
		}

		if (exists('@ionic-enterprise/auth')) {
			// TODO: Complete work
			// checkAndroidManifest();
		}
		if (exists('cordova-plugin-x-socialsharing')) {
			// TODO: Verify that Android Manifest contains
			// <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
		}

		if (!isGreaterOrEqual('@ionic-enterprise/identity-vault', '5.1.0')) {
			project.tip(checkMinVersion('@ionic-enterprise/identity-vault', '5.1.0', 'as the current version is missing important security fixes.', 'https://ionic.io/docs/identity-vault'));
		}
	} else {
		// The project is not using Cordova or Capacitor
		webProject(project);
	}

	if (isCapacitor() && !isCordova()) {
		project.tips(capacitorRecommendations(project));
	}

	if (isGreaterOrEqual('@angular/core', '11.0.0')) {
		project.checkNotExists('codelyzer', 'Codelyzer was popular in Angular projects before version 11 but has been superceded by angular-eslint. You can remove this dependency.');
	}
	if (exists('@ionic/angular')) {
		project.checkNotExists('ionicons', 'The @ionic/angular packages includes icons so the "ionicons" package is not required.');
	}
	reviewPackages(packages, project);
	reviewPluginProperties(packages, project);

	project.setGroup(`Support`, 'Feature requests and bug fixes', TipType.Ionic, true);
	project.add(new Tip('Provide Feedback', '', TipType.Comment, undefined, undefined, undefined, undefined, `https://github.com/ionic-team/vscode-extension/issues`));
	project.add(new Tip('Settings', '', TipType.Settings));

	vscode.commands.executeCommand('setContext', Context.inspectedProject, true);
	return project.groups;
}