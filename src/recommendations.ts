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
	notRequiredPlugin,
	replacementPlugin,
	incompatiblePlugin,
	reviewPlugin,
	warnMinVersion,
	checkAndroidManifest,
	exists
} from './analyzer';

import * as vscode from 'vscode';
import { error, libString } from './messages';
import { reviewPackages, reviewPluginsWithHooks, reviewPluginProperties } from './process-packages';
import { Recommendation } from './recommendation';
import { Tip, TipType } from './tip';
import * as fs from 'fs';
import * as path from 'path';
import { CapacitorProject } from '@capacitor/project';
import { CapacitorConfig } from '@capacitor/cli';
import { getPackageJSON, getRunOutput, getStringFrom, PackageFile, setStringIn } from './utilities';
import { fixIssue } from './extension';


enum NativePlatform {
	iOSOnly,
	AndroidOnly
}

function capacitorMigrationChecks(packages, project: Project) {
	const tips: Tip[] = [];
	project.setGroup(
		'Capacitor Migration',
		'Your Cordova application ' + project.name + ' can be migrated to Capacitor (see [guide](https://capacitorjs.com/docs/cordova/migrating-from-cordova-to-capacitor)). The following recommendations will help with the migration:',
		TipType.Capacitor, true
	);

	tips.push(...capacitorRecommendations(project));

	// Plugins with Hooks
	tips.push(...reviewPluginsWithHooks(packages, project));

	// Requires evaluation to determine compatibility
	tips.push(reviewPlugin('cordova-wheel-selector-plugin'));
	tips.push(reviewPlugin('cordova-plugin-secure-storage'));
	tips.push(reviewPlugin('newrelic-cordova-plugin'));

	if (exists('cordova-ios') || (exists('cordova-android') || (project.fileExists('config.xml')))) {
		tips.push(new Tip('Remove Cordova Integration', '', TipType.Capacitor, 'Remove the Cordova integration',
			['npm uninstall cordova-ios', 'npm uninstall cordova-android', 'mv config.xml config.xml.bak', 'rem-cordova'],
			'Remove Cordova', 'Removing Cordova', 'Successfully removed Cordova'));
	}
	project.tips(tips);
}

function asAppId(name: string): string {
	name = name.split('-').join('.');
	name = name.split(' ').join('.');
	if (!name.includes('.')) {
		name = 'com.' + name; // Must have at least a . in the name
	}
	return name;
}

function capacitorRecommendations(project: Project): Tip[] {
	const tips: Tip[] = [];

	// Capacitor Integrations
	if (!project.fileExists('capacitor.config.ts') && (!project.fileExists('capacitor.config.json'))) {
		tips.push(new Tip(
			'Add Capacitor Integration', '', TipType.Capacitor, 'Add the Capacitor integration to this project',
			[
				`npm install --save -E @capacitor/core@latest`,
				`npm install -D -E @capacitor/cli@latest`,
				`npm install @capacitor/app @capacitor/core @capacitor/haptics @capacitor/keyboard @capacitor/status-bar --save-exact`,
				`npx capacitor init "${project.name}" "${asAppId(project.name)}" --web-dir www`
			],
			'Add Capacitor', 'Capacitor added to this project',
			'https://capacitorjs.com/docs/cordova/migrating-from-cordova-to-capacitor'
		));
	} else {
		if (!exists('@capacitor/android')) {
			tips.push(new Tip(
				'Add Android Integration', '', TipType.Capacitor, 'Add Android support to your Capacitor project',
				['npm install @capacitor/android --save-exact', 'npx cap add android'], 'Add Android', 'Android support added to your project'));
		}

		if (!exists('@capacitor/ios')) {
			tips.push(new Tip(
				'Add iOS Integration', '', TipType.Capacitor, 'Add iOS support to your Capacitor project',
				['npm install @capacitor/ios --save-exact', 'npx cap add ios'], 'Add iOS', 'iOS support added to your project'));
		}
	}


	// List of incompatible plugins
	tips.push(incompatiblePlugin('cordova-plugin-admobpro', 'https://github.com/ionic-team/capacitor/issues/1101'));
	tips.push(incompatiblePlugin('cordova-plugin-braintree', 'https://github.com/ionic-team/capacitor/issues/1415'));
	tips.push(incompatiblePlugin('cordova-plugin-code-push', 'https://github.com/microsoft/code-push/issues/615'));
	tips.push(incompatiblePlugin('cordova-plugin-fcm', 'https://github.com/ionic-team/capacitor/issues/584'));
	tips.push(incompatiblePlugin('cordova-plugin-firebase', 'https://github.com/ionic-team/capacitor/issues/815'));
	tips.push(incompatiblePlugin('cordova-plugin-music-controls', 'It causes build failures, skipped'));
	tips.push(incompatiblePlugin('cordova-plugin-qrscanner', 'https://github.com/ionic-team/capacitor/issues/1213'));
	tips.push(incompatiblePlugin('cordova-plugin-googlemaps', 'It causes build failures on iOS, skipped for iOS only'));
	tips.push(incompatiblePlugin('newrelic-cordova-plugin', 'It relies on Cordova hooks. https://github.com/newrelic/newrelic-cordova-plugin/issues/15'));
	//tips.push(incompatiblePlugin('phonegap-plugin-push', 'It will not compile but can be replaced with the plugin cordova-plugin-push'));
	tips.push(replacementPlugin('phonegap-plugin-push', 'cordova-plugin-push', 'It will not compile but can be replaced with the plugin cordova-plugin-push'));

	tips.push(incompatiblePlugin('cordova-plugin-appsflyer-sdk', 'It will not compile but can be replaced with the plugin appsflyer-capacitor-plugin'));

	// Plugins that are not required
	tips.push(notRequiredPlugin('cordova-plugin-add-swift-support'));
	tips.push(notRequiredPlugin('cordova-plugin-compat'));
	if (!exists('cordova-plugin-file-transfer')) {
		// Note: If you still use cordova-plugin-file-transfer it requires the whitelist plugin (https://github.com/ionic-team/capacitor/issues/1199)
		tips.push(notRequiredPlugin('cordova-plugin-whitelist', 'The functionality is built into Capacitors configuration file'));
	}
	tips.push(notRequiredPlugin('cordova-plugin-crosswalk-webview', 'Capacitor doesn’t allow to change the webview'));
	tips.push(notRequiredPlugin('cordova-plugin-ionic-webview', 'An App store compliant Webview is built into Capacitor'));
	tips.push(notRequiredPlugin('cordova-plugin-wkwebview-engine', 'An App store compliant Webview is built into Capacitor'));
	tips.push(notRequiredPlugin('cordova-plugin-androidx', 'This was required for Cordova Android 10 support but isnt required by Capacitor'));
	tips.push(notRequiredPlugin('cordova-android-support-gradle-release', 'Capacitor provides control to set library versions'));
	tips.push(notRequiredPlugin('cordova-plugin-add-swift-support', 'Swift is supported out-of-the-box with Capacitor'));
	tips.push(notRequiredPlugin('cordova-plugin-androidx-adapter', 'Android Studio patches plugins for AndroidX without requiring this plugin'));
	tips.push(notRequiredPlugin('cordova-custom-config', 'Configuration achieved through native projects'));
	tips.push(notRequiredPlugin('cordova-plugin-cocoapod-support', 'Pod dependencies supported in Capacitor'));
	tips.push(notRequiredPlugin('phonegap-plugin-multidex', 'Android Studio handles compilation'));

	// Plugins which have a minimum versions
	tips.push(checkMinVersion('cordova-plugin-inappbrowser', '5.0.0', 'to compile in a Capacitor project'));
	tips.push(checkMinVersion('cordova-plugin-camera', '6.0.0', 'to compile in a Capacitor project'));
	tips.push(checkMinVersion('branch-cordova-sdk', '4.0.0', 'Requires update. See: https://help.branch.io/developers-hub/docs/capacitor'));

	// Plugins to recommend replacement with a Capacitor equivalent
	tips.push(replacementPlugin('cordova-plugin-camera', '@capacitor/camera', 'https://capacitorjs.com/docs/apis/camera'));
	tips.push(replacementPlugin('@ionic-enterprise/clipboard', '@capacitor/clipboard', 'https://capacitorjs.com/docs/apis/clipboard'));
	tips.push(replacementPlugin('@ionic-enterprise/deeplinks', '@capacitor/app', 'https://capacitorjs.com/docs/guides/deep-links'));
	tips.push(replacementPlugin('@ionic-enterprise/statusbar', '@capacitor/status-bar', 'https://capacitorjs.com/docs/apis/status-bar'));
	tips.push(replacementPlugin('cordova-plugin-firebase', '@capacitor-community/fcm', 'https://github.com/capacitor-community/fcm'));
	tips.push(replacementPlugin('cordova-plugin-firebase-messaging', '@capacitor/push-notifications', 'https://capacitorjs.com/docs/apis/push-notifications'));
	tips.push(replacementPlugin('cordova-plugin-app-version', '@capacitor/device', 'https://capacitorjs.com/docs/apis/device'));
	tips.push(replacementPlugin('cordova-plugin-dialogs', '@capacitor/dialog', 'https://capacitorjs.com/docs/apis/dialog'));
	tips.push(replacementPlugin('cordova-plugin-file', '@capacitor/filesystem', 'https://capacitorjs.com/docs/apis/filesystem'));
	tips.push(replacementPlugin('cordova-plugin-file-transfer', '@capacitor/filesystem', 'https://capacitorjs.com/docs/apis/filesystem'));
	tips.push(replacementPlugin('cordova-plugin-datepicker', '@capacitor-community/date-picker', 'https://github.com/capacitor-community/date-picker'));
	tips.push(replacementPlugin('cordova-plugin-geolocation', '@capacitor/geolocation', 'https://capacitorjs.com/docs/apis/geolocation'));
	tips.push(replacementPlugin('cordova-sqlite-storage', '@capacitor-community/sqlite', 'https://github.com/capacitor-community/sqlite'));
	tips.push(replacementPlugin('cordova-plugin-safariviewcontroller', '@capacitor/browser', 'https://capacitorjs.com/docs/apis/browser'));
	tips.push(replacementPlugin('cordova-plugin-appavailability', '@capacitor/app', 'https://capacitorjs.com/docs/apis/app'));
	tips.push(replacementPlugin('cordova-plugin-network-information', '@capacitor/network', 'https://capacitorjs.com/docs/apis/network'));
	tips.push(replacementPlugin('cordova-plugin-device', '@capacitor/device', 'https://capacitorjs.com/docs/apis/device'));
	tips.push(replacementPlugin('cordova-plugin-ionic-keyboard', '@capacitor/keyboard', 'https://capacitorjs.com/docs/apis/keyboard'));
	tips.push(replacementPlugin('cordova-plugin-splashscreen', '@capacitor/splash-screen', 'https://capacitorjs.com/docs/apis/splash-screen'));
	tips.push(replacementPlugin('cordova-plugin-statusbar', '@capacitor/status-bar', 'https://capacitorjs.com/docs/apis/status-bar'));
	tips.push(replacementPlugin('phonegap-plugin-push', '@capacitor/push-notifications', 'https://capacitorjs.com/docs/apis/push-notifications'));
	return tips;
}

export class Project {
	name: string;
	type: string = undefined;
	folder: string;
	group: Recommendation;
	subgroup: Recommendation;
	groups: Recommendation[] = [];
	capConfig: CapacitorConfig;

	constructor(_name: string) {
		this.name = _name;
	}

	public setGroup(title: string, message: string, type?: TipType, expanded?: boolean, contextValue?: string) {

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
	}

	// Look in package.json for scripts and add options to execute
	public addScripts() {
		const packages: PackageFile = getPackageJSON(this.folder);
		for (const script of Object.keys(packages.scripts)) {
			this.add(new Tip(script, '', TipType.Run, '', `npm run ${script}`, `Running ${script}`, `Ran ${script}`));
		}
	}



	public async reviewCapacitorConfig() {
		this.capConfig = {
			ios: {
				path: path.join(this.folder, 'ios'),
			},
			android: {
				path: path.join(this.folder, 'android'),
			},
		};
		const project = new CapacitorProject(this.capConfig);
		await project.load();
		let iosBundleId;
		let androidBundleId;
		let iosVersion;
		let androidVersion;
		let iosBuild;
		let androidBuild;
		let iosDisplayName;
		let androidDisplayName;

		if (project.ios) {
			const appTarget = project.ios?.getAppTarget();
			iosBundleId = project.ios.getBundleId(appTarget.name);
			iosDisplayName = await project.ios.getDisplayName(appTarget.name);
			for (const buildConfig of project.ios.getBuildConfigurations(appTarget.name)) {
				iosVersion = project.ios?.getVersion(appTarget.name, buildConfig.name);
				iosBuild = project.ios.getBuild(appTarget.name, buildConfig.name);
			}
		}

		if (project.android) {
			androidBundleId = project.android?.getPackageName();
			androidVersion = await project.android?.getVersionName();
			androidBuild = await project.android?.getVersionCode();
			const data = await project.android?.getResource('values', 'strings.xml');
			androidDisplayName = getStringFrom(data as string, `<string name="app_name">`, `</string`);
		}

		if (!project.ios && !project.android) {
			return;
		}

		// Allow the user to set the bundle id
		if (androidBundleId == iosBundleId || !iosBundleId || !androidBundleId) {
			// Create a single Bundle Id the user can edit
			const tip = new Tip('Bundle Id', androidBundleId, TipType.None);
			tip.setAction(this.setBundleId, androidBundleId, project);
			this.add(tip);
		} else {
			// Bundle Ids different
			const tip = new Tip('Android Bundle Id', androidBundleId, TipType.None);
			tip.setAction(this.setBundleId, androidBundleId, project, NativePlatform.AndroidOnly);
			this.add(tip);

			const tip2 = new Tip('iOS Bundle Id', iosBundleId, TipType.None);
			tip2.setAction(this.setBundleId, iosBundleId, project, NativePlatform.iOSOnly);
			this.add(tip2);
		}

		// Allow the user to edit the display name of the app
		if (androidDisplayName == iosDisplayName || !iosDisplayName || !androidDisplayName) {
			const displayName = androidDisplayName ? androidDisplayName : iosDisplayName;
			const tip = new Tip('Display Name', displayName, TipType.None);
			tip.setAction(this.setDisplayName, displayName, project, this.folder);
			this.add(tip);
		} else {
			const tip = new Tip('Android Display Name', androidDisplayName, TipType.None);
			tip.setAction(this.setDisplayName, androidDisplayName, project, this.folder, NativePlatform.AndroidOnly);
			this.add(tip);

			const tip2 = new Tip('iOS Display Name', iosDisplayName, TipType.None);
			tip2.setAction(this.setDisplayName, iosDisplayName, project, this.folder, NativePlatform.iOSOnly);
			this.add(tip2);
		}

		// Allow the user to set the version
		if (androidVersion == iosVersion || !iosVersion || !androidVersion) {
			const tip = new Tip('Version Number', androidVersion, TipType.None);
			tip.setAction(this.setVersion, androidVersion, project);
			this.add(tip);
		} else {
			const tip = new Tip('Android Version Number', androidVersion, TipType.None);
			tip.setAction(this.setVersion, androidVersion, project, NativePlatform.AndroidOnly);
			this.add(tip);

			const tip2 = new Tip('iOS Version Number', iosVersion, TipType.None);
			tip2.setAction(this.setVersion, iosVersion, project, NativePlatform.iOSOnly);
			this.add(tip2);
		}

		// Allow the user to increment the build
		if (androidBuild == iosBuild || !iosBuild || !androidBuild) {
			const tip = new Tip('Build Number', androidBuild?.toString(), TipType.None);
			tip.setAction(this.setBuild, androidBuild, project);
			this.add(tip);
		} else {
			const tip = new Tip('Android Build Number', androidBuild?.toString(), TipType.None);
			tip.setAction(this.setBuild, androidBuild, project, NativePlatform.AndroidOnly);
			this.add(tip);

			const tip2 = new Tip('iOS Build Number', iosBuild?.toString(), TipType.None);
			tip2.setAction(this.setBuild, iosBuild, project, NativePlatform.iOSOnly);
			this.add(tip2);
		}
	}

	/**
	 * Change the Bundle Id of an App in the iOS and Android projects
	 * @param  {string} bundleId The original bundle id / package name
	 * @param  {CapacitorProject} project The Capacitor project
	 * @param  {NativePlatform} platform Whether iOS or Android only (default both)
	 */
	private async setBundleId(bundleId: string, project: CapacitorProject, platform: NativePlatform) {
		const newBundleId = await vscode.window.showInputBox({
			title: 'Application Bundle Id',
			placeHolder: bundleId,
			value: bundleId
		});

		if (!newBundleId) {
			return; // User cancelled
		}
		const channel = vscode.window.createOutputChannel("Ionic");

		if (project?.ios && platform != NativePlatform.AndroidOnly) {
			const appTarget = project.ios?.getAppTarget();
			for (const buildConfig of project.ios.getBuildConfigurations(appTarget.name)) {
				channel.appendLine(`Set iOS Bundle Id for target ${appTarget.name} buildConfig.${buildConfig.name} to ${newBundleId}`);
				project.ios.setBundleId(appTarget.name, buildConfig.name, newBundleId);
			}
		}
		if (project.android && platform != NativePlatform.iOSOnly) {
			channel.appendLine(`Set Android Package Name to ${newBundleId}`);
			await project.android?.setPackageName(newBundleId);
		}
		project.commit();
		channel.show();
	}
	/**
	 * Set Version Number of iOS and Android Project
	 * @param  {string} version
	 * @param  {CapacitorProject} project
	 * @param  {NativePlatform} platform Whether to apply for iOS only, Android only or both (default)
	 */
	private async setVersion(version: string, project: CapacitorProject, platform: NativePlatform) {
		const newVersion = await vscode.window.showInputBox({
			title: 'Application Version Number',
			placeHolder: version,
			value: version
		});

		if (!newVersion) {
			return; // User cancelled
		}
		const channel = vscode.window.createOutputChannel("Ionic");

		if (project?.ios && platform != NativePlatform.AndroidOnly) {
			const appTarget = project.ios?.getAppTarget();
			for (const buildConfig of project.ios.getBuildConfigurations(appTarget.name)) {
				channel.appendLine(`Set iOS Version for target ${appTarget.name} buildConfig.${buildConfig.name} to ${newVersion}`);
				await project.ios.setVersion(appTarget.name, buildConfig.name, newVersion);
			}
		}
		if (project.android && platform != NativePlatform.iOSOnly) {
			channel.appendLine(`Set Android Version to ${newVersion}`);
			await project.android?.setVersionName(newVersion);
		}
		project.commit();
		channel.show();
	}
	/**
	 * Set the build number
	 * @param  {string} build The build number
	 * @param  {CapacitorProject} project The Capacitor project
	 * @param  {NativePlatform} platform Whether to apply on iOS only, Android Only or both (default)
	 */
	private async setBuild(build: string, project: CapacitorProject, platform: NativePlatform) {
		const newBuild = await vscode.window.showInputBox({
			title: 'Application Build Number',
			placeHolder: build,
			value: build
		});

		if (!newBuild) {
			return; // User cancelled
		}
		const channel = vscode.window.createOutputChannel("Ionic");

		if (project?.ios && platform != NativePlatform.AndroidOnly) {
			const appTarget = project.ios?.getAppTarget();
			for (const buildConfig of project.ios.getBuildConfigurations(appTarget.name)) {
				channel.appendLine(`Set iOS Version for target ${appTarget.name} buildConfig.${buildConfig.name} to ${newBuild}`);
				await project.ios.setBuild(appTarget.name, buildConfig.name, parseInt(newBuild));
			}
		}
		if (project.android && platform != NativePlatform.iOSOnly) {
			channel.appendLine(`Set Android Version to ${newBuild}`);
			await project.android?.setVersionCode(parseInt(newBuild));
		}
		project.commit();
		channel.show();
	}
	/**
	 * Set the display name of the app
	 * @param  {string} currentDisplayName The current value for the display name
	 * @param  {CapacitorProject} project The Capacitor project
	 * @param  {string} folder Folder for the project
	 * @param  {NativePlatform} platform Whether to apply to iOS only, Android only or both (default)
	 */
	private async setDisplayName(currentDisplayName: string, project: CapacitorProject, folder: string, platform: NativePlatform) {
		const displayName = await vscode.window.showInputBox({
			title: 'Application Display Name',
			placeHolder: currentDisplayName,
			value: currentDisplayName
		});

		if (!displayName) {
			return; // User cancelled
		}
		const channel = vscode.window.createOutputChannel("Ionic");
		console.log(`Display name changed to ${displayName}`);
		if (project.ios != null && platform != NativePlatform.AndroidOnly) {
			const appTarget = project.ios?.getAppTarget();
			for (const buildConfig of project.ios.getBuildConfigurations(appTarget.name)) {
				channel.appendLine(`Set iOS Displayname for target ${appTarget.name} buildConfig.${buildConfig.name} to ${displayName}`);
				await project.ios.setDisplayName(appTarget.name, buildConfig.name, displayName);
			}
		}
		if (project.android != null && platform != NativePlatform.iOSOnly) {
			let data = await project.android?.getResource('values', 'strings.xml');
			if (!data) {
				channel.appendLine(`Unable to set Android display name`);
			}
			console.log('setValue');
			data = setStringIn(data as string, `<string name="app_name">`, `</string>`, displayName);
			console.log('setValue', data);
			data = setStringIn(data as string, `<string name="title_activity_main">`, `</string>`, displayName);
			console.log('setValue', data);
			const filename = path.join(folder, 'android/app/src/main/res/values/strings.xml');
			if (fs.existsSync(filename)) {
				fs.writeFileSync(filename, data);
				channel.appendLine(`Set Android app_name to ${displayName}`);
				channel.appendLine(`Set Android title_activity_main to ${displayName}`);
			} else {
				vscode.window.showErrorMessage('Unable to write to ' + filename);
			}

		}
		channel.show();
		project.commit();
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
				command: 'ionic.run',
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

		const r = new Recommendation(tip.message, tip.message, tip.title, vscode.TreeItemCollapsibleState.None, cmd, tip, tip.url);
		this.setIcon(tip.type, r);
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

export async function starterProject(folder: string): Promise<Recommendation[]> {
	const project: Project = new Project('New Project');

	const out = await getRunOutput('ionic start -l', folder);
	const projects = parseIonicStart(out);
	let type = undefined;
	for (const starter of projects) {
		if (type != starter.type) {
			type = starter.type;
			project.setGroup(`New ${type} Project`, '', TipType.Ionic, false);
		}

		project.add(new Tip(
			`${starter.name}`,
			`${starter.description}`,
			TipType.Run,
			'Create Project',
			[`ionic start @app ${starter.name} --capacitor`,
			process.platform === "win32" ? `move @app .` : `mv @app/{,.[^.]}* .`,
				`rmdir @app`
			],
			'Creating Project',
			'Project Created').requestAppName().showProgressDialog());
	}
	return project.groups;
}

function parseIonicStart(text: string): Array<any> {
	const lines = text.split('\n');
	let type = undefined;
	let result = [];
	for (const line of lines) {
		if (line.includes('--type=')) {
			const t = line.split('=');
			type = t[1].replace(')', '');
			switch (type) {
				case 'ionic-angular': type = 'Angular'; break;
				case 'react': type = 'React'; break;
				case 'vue': type = 'Vue'; break;
			}
		}
		if (line.includes('|')) {
			const t = line.split('|');
			const name = t[0].trim();
			const description = t[1].trim();
			if (name != 'name') {
				result.push({ type: type, name: name, description: description });
			}
		}
	}
	result = result.filter((project) => { return (project.type != 'ionic1') && (project.type != 'angular'); });
	return result;
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

export function viewInEditor(url: string) {
	const previewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
	if (!previewInEditor) return;
	const panel = vscode.window.createWebviewPanel(
		'viewApp',
		'Preview',
		vscode.ViewColumn.Beside,
		{ enableScripts: true }
	);

	panel.webview.html = getWebviewContent(url);
}

function getWebviewContent(url: string) {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Preview App</title>
	</head>
	<body style="display: flex; align-items: center; justify-content: center; margin-top:20px;">
		<div style="width: 375px; height: 717px; border: 2px solid #333; border-radius:10px; padding:10px; display: flex; align-items: center; flex-direction: column;">
		   <div style="width: 100%; height: 667px;">
				<iframe id="frame" src="${url}" width="100%" height="100%" frameBorder="0"></iframe>
		   </div>
		  <div style="width: 100%; height: 50px; display: flex; align-items: center; justify-content: center;">
			<div style="background-color: #333; cursor: pointer; height: 25px; width:25px; border-radius:30px; padding:5px" onclick="document.getElementById('frame').src = '${url}'"></div>
		  </div>  
		 </div>
	</body>
	</html>`;
}

function ionicServe(): string {
	const httpsForWeb = vscode.workspace.getConfiguration('ionic').get('httpsForWeb');
	const previewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
	let serveFlags = ' --consolelogs';
	if (previewInEditor) {
		serveFlags += ' --no-open';
	}
	if (httpsForWeb) {
		serveFlags += ' --ssl';
	}
	return `npx ionic serve${serveFlags}`;
}

function capRun(platform: string): string {
	const liveReload = vscode.workspace.getConfiguration('ionic').get('liveReload');
	const externalIP = vscode.workspace.getConfiguration('ionic').get('externalAddress');
	let capRunFlags = liveReload ? ' -l' : '';
	if (externalIP) {
		if (capRunFlags.length > 0) capRunFlags += ' ';
		capRunFlags += '--external ';
	}
	return `npx ionic cap run ${platform}${capRunFlags} --list`;
}

function ionicBuild(folder: string): string {
	const buildForProduction = vscode.workspace.getConfiguration('ionic').get('buildForProduction');
	const buildFlags = buildForProduction ? ' --prod' : '';

	const nmf = path.join(folder, 'node_modules');
	const preop = (!fs.existsSync(nmf)) ? 'npm install && ' : '';
	return `${preop}npx ionic build${buildFlags}`;
}

export async function reviewProject(folder: string, extensionPath: string): Promise<Recommendation[]> {
	const project: Project = new Project('My Project');
	const packages = await load(folder, project);

	checkNodeVersion();


	project.type = isCapacitor() ? 'Capacitor' : 'Cordova';
	project.folder = folder;

	if (isCapacitor() && !isCordova()) {
		project.setGroup(
			`${project.name}`, ``, TipType.Ionic, false);

		project.addScripts();

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
			project.add(new Tip('Run On Android', '', TipType.Run, 'Run', undefined, 'Running', 'Project is running').showProgressDialog().requestDeviceSelection().setDynamicCommand(capRun, 'android'));
		}
		if (hasCapIos) {
			project.add(new Tip('Run On iOS', '', TipType.Run, 'Run', undefined, 'Running', 'Project is running').showProgressDialog().requestDeviceSelection().setDynamicCommand(capRun, 'ios'));
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
	}

	if (isCapacitor()) {
		project.setGroup(`Configuration`, 'Configurations for native project', TipType.Capacitor, false);
		await project.reviewCapacitorConfig();
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
	project.deprecatedPlugin('adobe-mobile-services', 'Mobile Services reaches end-of-life on December 31, 2022', 'https://shorturl.at/lnpDT');

	// App Center deprecated Cordova SDK
	project.deprecatedPlugin('cordova-plugin-appcenter-analytics', 'App Center is deprecating support for Cordova SDK in April 2022', 'https://shorturl.at/irzIL');
	project.deprecatedPlugin('cordova-plugin-appcenter-crashes', 'App Center is deprecating support for Cordova SDK in April 2022', 'https://shorturl.at/irzIL');
	project.deprecatedPlugin('cordova-plugin-appcenter-shared', 'App Center is deprecating support for Cordova SDK in April 2022', 'https://shorturl.at/irzIL');

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

	reviewPackages(packages, project);
	reviewPluginProperties(packages, project);

	project.setGroup(`Support`, 'Feature requests and bug fixes', TipType.Ionic, true);
	project.add(new Tip('Provide Feedback', '', TipType.Comment, undefined, undefined, undefined, undefined, `https://github.com/ionic-team/vscode-extension/issues`));
	project.add(new Tip('Settings', '', TipType.Settings));

	return project.groups;
}