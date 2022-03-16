import * as fs from 'fs';
import * as path from 'path';

import { checkConsistentVersions, checkMinVersion, exists, incompatiblePlugin, incompatibleReplacementPlugin, isGreaterOrEqual, isLess, isLessOrEqual, notRequiredPlugin, replacementPlugin } from "./analyzer";
import { checkMigrationAngularToolkit } from "./rules-angular-toolkit";
import { Project } from "./project";
import { Tip, TipType } from "./tip";
import { asAppId } from "./utilities";

/**
 * Check rules for Capacitor projects
 * @param  {Project} project
 */
export function checkCapacitorRules(project: Project) {
	project.tip(checkMinVersion('@capacitor/core', '2.2.0'));
	project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/cli'));
	project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/ios'));
	project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/android'));

	// cordova-plugin-appsflyer-sdk doesnt build with Capacitor. Use appsflyer-capacitor-plugin instead 
	// see https://github.com/AppsFlyerSDK/appsflyer-cordova-plugin#------%EF%B8%8F-note-for-capacitor-users--%EF%B8%8F------
	project.recommendReplace('cordova-plugin-appsflyer-sdk', 'cordova-plugin-appsflyer-sdk',
		`Replace with appsflyer-capacitor-plugin.`,
		`The plugin cordova-plugin-appsflyer-sdk should be replaced with appsflyer-capacitor-plugin.`,
		'appsflyer-capacitor-plugin'
	);

	if (exists('cordova-plugin-file-transfer') && !exists('cordova-plugin-whitelist')) {
		// Latest 1.7.1 of the file-transfer plugin requires whitelist in Capacitor projects. See: https://github.com/ionic-team/capacitor/issues/1199
		project.recommendAdd('cordova-plugin-whitelist', 'cordova-plugin-file-transfer',
			'Install cordova-plugin-whitelist for compatibility',
			'The plugin cordova-plugin-file-transfer has a dependency on cordova-plugin-whitelist when used with a Capacitor project');
	}

	if (exists('@ionic/cordova-builders')) {
		// This is likely a leftover from a Cordova migration
		project.recommendRemove('@ionic/cordova-builders', '@ionic/cordova-builders', 'This package is only required for Cordova projects.');
	}

	if (isGreaterOrEqual('@ionic/angular-toolkit', '6.0.0')) {
		checkMigrationAngularToolkit(project);
	}

	if (isLess('@capacitor/android', '3.2.3')) {
		// Check minifyEnabled is false for release
		checkBuildGradleForMinifyInRelease(project);
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
}

/**
 * These rules are shared by the Capacitor Migration which is why they return an array
 * @param  {Project} project
 * @returns Tip
 */
export function capacitorRecommendations(project: Project): Tip[] {
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
		).showProgressDialog());
	} else {
		const ionic = exists('@ionic/cli') ? 'ionic ' : '';
		if (!exists('@capacitor/android')) {
			tips.push(new Tip(
				'Add Android Integration', '', TipType.Capacitor, 'Add Android support to your Capacitor project',
				['npm install @capacitor/android --save-exact', `npx ${ionic}cap add android`], 'Add Android', 'Android support added to your project').showProgressDialog());
		}

		if (!exists('@capacitor/ios')) {
			tips.push(new Tip(
				'Add iOS Integration', '', TipType.Capacitor, 'Add iOS support to your Capacitor project',
				['npm install @capacitor/ios --save-exact', `npx ${ionic}cap add ios`], 'Add iOS', 'iOS support added to your project').showProgressDialog());
		}
	}


	// List of incompatible plugins
	tips.push(incompatiblePlugin('cordova-plugin-admobpro', 'https://github.com/ionic-team/capacitor/issues/1101'));
	tips.push(incompatiblePlugin('cordova-plugin-braintree', 'https://github.com/ionic-team/capacitor/issues/1415'));
	tips.push(incompatiblePlugin('cordova-plugin-code-push', 'https://github.com/microsoft/code-push/issues/615'));
	tips.push(incompatiblePlugin('cordova-plugin-fcm', 'https://github.com/ionic-team/capacitor/issues/584'));
	tips.push(incompatiblePlugin('cordova-plugin-firebase', 'https://github.com/ionic-team/capacitor/issues/815'));
	tips.push(incompatiblePlugin('cordova-plugin-firebasex', 'https://github.com/dpa99c/cordova-plugin-firebasex/issues/610#issuecomment-810236545'));
	tips.push(incompatiblePlugin('cordova-plugin-music-controls', 'It causes build failures, skipped'));
	tips.push(incompatiblePlugin('cordova-plugin-qrscanner', 'https://github.com/ionic-team/capacitor/issues/1213'));
	tips.push(incompatiblePlugin('cordova-plugin-googlemaps', 'It causes build failures on iOS, skipped for iOS only'));
	tips.push(incompatiblePlugin('cordova-plugin-swrve', 'It relies on Cordova specific feature CDVViewController'));

	tips.push(incompatiblePlugin('newrelic-cordova-plugin', 'It relies on Cordova hooks. https://github.com/newrelic/newrelic-cordova-plugin/issues/15'));
	//tips.push(incompatiblePlugin('phonegap-plugin-push', 'It will not compile but can be replaced with the plugin cordova-plugin-push'));
	tips.push(replacementPlugin('phonegap-plugin-push', 'cordova-plugin-push', 'It will not compile but can be replaced with the plugin cordova-plugin-push'));

	tips.push(incompatiblePlugin('cordova-plugin-appsflyer-sdk', 'It will not compile but can be replaced with the plugin appsflyer-capacitor-plugin'));

	// Plugins that are not required	
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
	tips.push(notRequiredPlugin('cordova-plugin-enable-multidex', 'Multidex is handled by Android Stuido and doesnt requiure a plugin'));
	tips.push(notRequiredPlugin('cordova-support-android-plugin', 'This plugin is used to simplify Cordova plugin development and is not required for Capacitor'));
	tips.push(notRequiredPlugin('cordova-plugin-androidx-adapter', 'Android Studio patches plugins for AndroidX without requiring this plugin'));
	tips.push(notRequiredPlugin('cordova-custom-config', 'Configuration achieved through native projects'));
	tips.push(notRequiredPlugin('cordova-plugin-cocoapod-support', 'Pod dependencies supported in Capacitor'));
	tips.push(notRequiredPlugin('phonegap-plugin-multidex', 'Android Studio handles compilation'));

	// Plugins which have a minimum versions
	tips.push(checkMinVersion('cordova-plugin-inappbrowser', '5.0.0', 'to compile in a Capacitor project'));
	tips.push(checkMinVersion('cordova-plugin-camera', '6.0.0', 'to compile in a Capacitor project'));
	tips.push(checkMinVersion('branch-cordova-sdk', '4.0.0', 'Requires update. See: https://help.branch.io/developers-hub/docs/capacitor'));

	// Plugins to recommend replacement with a Capacitor equivalent
	tips.push(incompatibleReplacementPlugin('sentry-cordova', '@sentry/capacitor'));
	tips.push(replacementPlugin('cordova-plugin-actionsheet', '@capacitor/action-sheet', 'https://capacitorjs.com/docs/apis/action-sheet'));
	tips.push(replacementPlugin('cordova-plugin-camera', '@capacitor/camera', 'https://capacitorjs.com/docs/apis/camera'));
	tips.push(replacementPlugin('@ionic-enterprise/clipboard', '@capacitor/clipboard', 'https://capacitorjs.com/docs/apis/clipboard'));
	tips.push(replacementPlugin('@ionic-enterprise/deeplinks', '@capacitor/app', 'https://capacitorjs.com/docs/guides/deep-links'));
	tips.push(replacementPlugin('@ionic-enterprise/statusbar', '@capacitor/status-bar', 'https://capacitorjs.com/docs/apis/status-bar'));
	tips.push(replacementPlugin('cordova-plugin-firebase', '@capacitor-community/fcm', 'https://github.com/capacitor-community/fcm'));
	tips.push(replacementPlugin('cordova-plugin-firebase-messaging', '@capacitor/push-notifications', 'https://capacitorjs.com/docs/apis/push-notifications'));
	tips.push(replacementPlugin('cordova-plugin-firebase-analytics', '@capacitor-community/firebase-analytics', 'https://github.com/capacitor-community/firebase-analytics'));
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

// Capacity Android 3.2.3 added proguard rules for Capacitor for release build
// Get users to upgrade if they turn on minifyEnabled to true
function checkBuildGradleForMinifyInRelease(project: Project) {
	// Look in android/app/build.gradle for "minifyEnabled true"
	const filename = path.join(project.folder, 'android', 'app', 'build.gradle');
	if (fs.existsSync(filename)) {
		const txt = fs.readFileSync(filename, 'utf8');
		if (txt.includes('minifyEnabled true')) {
			project.add(checkMinVersion('@capacitor/android', '3.2.3', 'to ensure Android release builds work when minifyEnabled is true','https://developer.android.com/studio/build/shrink-code'));
		}
	}
}