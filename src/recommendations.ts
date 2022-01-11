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
import { getPackageJSON, PackageFile } from './utilities';

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
	groups: Recommendation[] = [];

	constructor(_name: string) {
		this.name = _name;
	}

	public setGroup(title: string, message: string, type?: TipType, expanded?: boolean) {
		const r = new Recommendation(message, title, '', expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
		r.children = [];
		r.iconDependency();
		if (type == TipType.Capacitor) r.iconCapacitor();
		if (type == TipType.Cordova) r.iconCordova();
		if (type == TipType.Ionic) r.iconIonic();
		if (type == TipType.Android) r.iconAndroid();
		this.group = r;
		this.groups.push(this.group);
	}

	// Look in package.json for scripts and add options to execute
	public addScripts() {
		const packages: PackageFile = getPackageJSON(this.folder);
		for (const script of Object.keys(packages.scripts)) {
			this.add(new Tip(script, '', TipType.Run, '', `npm run ${script}`, 'Run', `Ran ${script}`));
		}
	}


	public note(title: string, message: string, url?: string, tipType?: TipType, description?: string) {
		const r = new Recommendation(description ? description : message, message, title, vscode.TreeItemCollapsibleState.None,
			{
				command: 'ionicRecommendations.fixIssue',
				title: 'Do Things',
				arguments: []
			}, undefined);

		this.setIcon(tipType, r);

		this.group.children.push(r);
	}

	setIcon(tipType: TipType, r: Recommendation) {
		switch (tipType) {
			case TipType.Error: r.iconError(); break;
			case TipType.Warning: r.iconWarning(); break;
			case TipType.Idea: r.iconIdea(); break;
			case TipType.Cordova: r.iconCordova(); break;
			case TipType.Capacitor: r.iconCapacitor(); break;
			case TipType.Ionic: r.iconIonic(); break;
			case TipType.Android: r.iconAndroid(); break;
			case TipType.Run: r.iconRun(); break;
		}
	}

	public add(tip: Tip) {
		let cmd: vscode.Command = {
			command: 'ionicRecommendations.fixIssue',
			title: 'Fix',
			arguments: [tip]
		};

		if (tip.type == TipType.Run) {
			cmd = {
				command: 'ionicRecommendations.run',
				title: 'Run',
				arguments: [tip]
			};
		}

		const r = new Recommendation(tip.message, tip.message, tip.title, vscode.TreeItemCollapsibleState.None, cmd, tip, tip.url);
		this.setIcon(tip.type, r);
		this.group.children.push(r);
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

	public upgrade(name: string, message: string, fromVersion: string, toVersion: string) {
		if (exists(name)) {
			this.add(new Tip(
				name,
				message,
				undefined,
				`Upgrade ${name} from ${fromVersion} to ${toVersion}`,
				`npm install ${name}@${toVersion} --save-exact`, `Update`,
				`${name} updated to ${toVersion}`));
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

export function reviewProject(folder: string): Recommendation[] {
	const project: Project = new Project('My Project');
	const packages = load(folder, project);

	project.type = isCapacitor() ? 'Capacitor' : 'Cordova';
	project.folder = folder;

	if (isCapacitor() && !isCordova()) {
		project.setGroup(
			`${project.name}`, ``, TipType.Ionic, false);

		project.addScripts();
		project.setGroup(`Capacitor`, 'Recommendations related to Capacitor', TipType.Capacitor, true);

		project.add(new Tip('Serve', '(in default browser)', TipType.Run, 'Serve', `ionic serve`, 'Serving', `Project Served`));
		project.add(new Tip('Run on Android','(With Live Reload)', TipType.Run, 'Run', 'ionic cap run android -l --external --list', 'Running', 'Project is running'));
		project.add(new Tip('Run on iOS','(With Live Reload)', TipType.Run, 'Run', 'ionic cap run ios -l --external --list', 'Running', 'Project is running'));
		project.add(new Tip('Build', '', TipType.Run, 'Build', `npm run build`, 'Building', `Project Built`));
		project.add(new Tip('Sync', '', TipType.Run, 'Capacitor Sync', `npx cap sync`, 'Capacitor Sync', `Capacitor Dependencies Synced`));
		if (exists('@capacitor/ios')) {
			project.add(new Tip('Open XCode', '', TipType.Run, 'Open XCode', `npx cap open ios`, 'Open XCode', `XCode Opened`));
		}
		if (exists('@capacitor/android')) {
			project.add(new Tip('Open Android Studio', '', TipType.Run, 'Open Android Studio', `npx cap open android`, 'Open Android Studio', `Android Studio Opened`));
		}
	}

	project.setGroup(
		`Recommendations`, `The following recommendations were made by analyzing the package.json file of your ${project.type} app.`, TipType.Idea, true);

	if (isCordova() && isCapacitor()) {
		project.note('Remove Cordova', 'The project is using both Cordova and Capacitor. Dependencies on Cordova should be removed', undefined, TipType.Error);
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
		`Your project has a dependency on Protractor whose development is slated to end December 2022. Consider migrating to a different E2E Testing solution.`,
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

	return project.groups;
}