
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { checkConsistentVersions, checkCordovaAndroidPreference, checkCordovaAndroidPreferenceMinimum, checkCordovaIosPreference, checkMinVersion, exists, isCapacitor, isCordova, isGreaterOrEqual, warnMinVersion } from './analyzer';
import { reviewCapacitorConfig } from './capacitor-configure';
import { ionicBuild } from './ionic-build';
import { ionicServe } from './ionic-serve';
import { Project } from './project';
import { addSplashAndIconFeatures } from './splash-icon';
import { Tip, TipType } from './tip';
import { libString } from './messages';
import { capacitorMigrationChecks, capacitorRecommendations } from './capacitor-migration';
import { reviewPackages, reviewPluginProperties } from './process-packages';
import { CapacitorPlatform, capRun } from './capacitor-run';
import { asAppId } from './utilities';

export async function getRecommendations(project: Project, context: vscode.ExtensionContext, packages: any): Promise<void> {
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

		project.add(new Tip('Build', '', TipType.Build, 'Build', undefined, 'Building', undefined).setDynamicCommand(ionicBuild, project.folder));
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

	const nmf = path.join(project.folder, 'node_modules');
	if (!fs.existsSync(nmf)) {
		project.add(new Tip('Install Node Modules', '', TipType.Idea, 'Install Node Modules', 'npm install', 'Installing').performRun().showProgressDialog());
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