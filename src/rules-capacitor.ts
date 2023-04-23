import * as fs from 'fs';
import * as path from 'path';

import {
  checkConsistentVersions,
  checkMinVersion,
  exists,
  getPackageVersion,
  incompatiblePlugin,
  incompatibleReplacementPlugin,
  isGreaterOrEqual,
  isLess,
  isLessOrEqual,
  isVersionGreaterOrEqual,
  notRequiredPlugin,
  replacementPlugin,
  startsWith,
} from './analyzer';
import { checkMigrationAngularToolkit } from './rules-angular-toolkit';
import { Project } from './project';
import { Tip, TipType } from './tip';
import { asAppId, getRunOutput, showProgress } from './utilities';
import { capacitorAdd } from './capacitor-add';
import { CapacitorPlatform } from './capacitor-platform';
import { npmInstall, npx } from './node-commands';
import { InternalCommand } from './command-name';
import { MonoRepoType } from './monorepo';
import { migrateCapacitor, migrateCapacitor5 } from './capacitor-migrate';
import { checkAngularJson } from './rules-angular-json';
import { checkBrowsersList } from './rules-browserslist';
import { ionicState } from './ionic-tree-provider';
import { integratePrettier } from './prettier';
import { getOutputChannel, writeIonic } from './extension';
import { window } from 'vscode';
import { WorkspaceSetting, getSetting, setSetting } from './workspace-state';

/**
 * Check rules for Capacitor projects
 * @param  {Project} project
 */
export function checkCapacitorRules(project: Project) {
  project.tip(checkMinVersion('@capacitor/core', '2.2.0'));
  project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/cli'));
  project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/ios'));
  project.tip(checkConsistentVersions('@capacitor/core', '@capacitor/android'));

  if (exists('@ionic/cli')) {
    project.tip(checkMinVersion('@ionic/cli', '6.0.0'));
  }
  if (!exists('@capacitor/cli')) {
    // Capacitor CLI should be installed locally
    project.recommendAdd(
      '@capacitor/cli',
      '@capacitor/cli',
      'Install @capacitor/cli',
      'The Capacitor CLI should be installed locally in your project',
      true
    );
  }

  // cordova-plugin-appsflyer-sdk doesn't build with Capacitor. Use appsflyer-capacitor-plugin instead
  // see https://github.com/AppsFlyerSDK/appsflyer-cordova-plugin#------%EF%B8%8F-note-for-capacitor-users--%EF%B8%8F------
  project.recommendReplace(
    'cordova-plugin-appsflyer-sdk',
    'cordova-plugin-appsflyer-sdk',
    `Replace with appsflyer-capacitor-plugin.`,
    `The plugin cordova-plugin-appsflyer-sdk should be replaced with appsflyer-capacitor-plugin.`,
    'appsflyer-capacitor-plugin'
  );

  project.recommendReplace(
    '@ionic-enterprise/dialogs',
    '@ionic-enterprise/dialogs',
    `Replace with @capacitor/dialog due to official support`,
    `The plugin @ionic-enterprise/dialogs should be replaced with @capacitor/dialog as it is an officially supported Capacitor plugin`,
    '@capacitor/dialog'
  );

  project.recommendReplace(
    '@ionic-enterprise/app-rate',
    '@ionic-enterprise/app-rate',
    `Replace with capacitor-rate-app due to Capacitor support`,
    `The plugin @ionic-enterprise/app-rate should be replaced with capacitor-rate-app as designed to work with Capacitor`,
    'capacitor-rate-app'
  );

  project.recommendReplace(
    '@ionic-enterprise/nativestorage',
    '@ionic-enterprise/nativestorage',
    `Replace with @ionic/storage due to support`,
    `The plugin @ionic-enterprise/nativestorage should be replaced with @ionic/storage. Consider @ionic-enterprise/secure-storage if encryption is required`,
    '@ionic/storage'
  );

  project.recommendReplace(
    'cordova-plugin-advanced-http',
    'cordova-plugin-advanced-http',
    `Replace with @capacitor/http due to official support`,
    `The plugin cordova-plugin-advanced-http should be replaced with @capacitor/http. Capacitor now provides the equivalent native http functionality built in.`,
    '@capacitor/core'
  );

  project.recommendRemove(
    '@ionic-enterprise/promise',
    '@ionic-enterprise/promise',
    'This plugin should no longer be required in projects.'
  );

  project.recommendRemove(
    'cordova-plugin-appminimize',
    'cordova-plugin-appminimize',
    'This plugin is not required and can be replaced with the minimizeApp method of @capacitor/app',
    undefined,
    'https://capacitorjs.com/docs/apis/app#minimizeapp'
  );

  project.recommendRemove(
    'cordova-plugin-datepicker',
    'cordova-plugin-datepicker',
    'This plugin appears to have been abandoned in 2015. Consider using ion-datetime.'
  );

  project.recommendRemove(
    '@jcesarmobile/ssl-skip',
    '@jcesarmobile/ssl-skip',
    'This plugin should only be used during development. Submitting an app with it included will cause it to be rejected.'
  );

  if (exists('cordova-plugin-file-transfer') && !exists('cordova-plugin-whitelist')) {
    // Latest 1.7.1 of the file-transfer plugin requires whitelist in Capacitor projects. See: https://github.com/ionic-team/capacitor/issues/1199
    project.recommendAdd(
      'cordova-plugin-whitelist',
      'cordova-plugin-file-transfer',
      'Install cordova-plugin-whitelist for compatibility',
      'The plugin cordova-plugin-file-transfer has a dependency on cordova-plugin-whitelist when used with a Capacitor project',
      false
    );
  }

  if (exists('@ionic/cordova-builders')) {
    // This is likely a leftover from a Cordova migration
    project.recommendRemove(
      '@ionic/cordova-builders',
      '@ionic/cordova-builders',
      'This package is only required for Cordova projects.'
    );
  }

  if (isGreaterOrEqual('@ionic/angular-toolkit', '6.0.0')) {
    checkMigrationAngularToolkit(project);
  }

  if (isGreaterOrEqual('@angular/core', '12.0.0')) {
    checkAngularJson(project);
    if (exists('@capacitor/android') || exists('@capacitor/ios')) {
      checkBrowsersList(project);
    }
  }

  if (isLess('@capacitor/android', '3.2.3')) {
    // Check minifyEnabled is false for release
    checkBuildGradleForMinifyInRelease(project);
  }

  if (isLess('@capacitor/android', '3.0.0')) {
    project.tip(
      new Tip(
        `Your app cannot be submitted to the Play Store after 1st November 2022`,
        undefined,
        TipType.Error,
        undefined,
        undefined,
        undefined,
        undefined,
        'https://capacitorjs.com/docs/updating/3-0'
      ).setTooltip(
        `Capacitor ${getPackageVersion(
          '@capacitor/core'
        )} must be migrated to Capacitor 4 to meet Play Store requirements of minimum target of SDK 31. Migration to Capacitor 3 is required. Click for more information.`
      )
    );
  }

  // Migration for 3.x, 4.0.0-beta, 4.0.0 to Capacitor 4.0.1+
  if (isLess('@capacitor/core', '4.0.1') || startsWith('@capacitor/core', '4.0.0')) {
    if (ionicState.hasNodeModules && isGreaterOrEqual('@capacitor/core', '3.0.0')) {
      // Recommend migration from 3 to 4
      project.tip(
        new Tip('Migrate to Capacitor 4', '', TipType.Idea)
          .setAction(migrateCapacitor, project, getPackageVersion('@capacitor/core'))
          .canIgnore()
      );
    }
  }

  if (isLess('@capacitor/core', '5.0.0')) {
    if (ionicState.hasNodeModules && isGreaterOrEqual('@capacitor/core', '4.0.0')) {
      project.tip(
        new Tip('Migrate to Capacitor 5 Beta', '', TipType.Idea)
          .setAction(migrateCapacitor5, project, getPackageVersion('@capacitor/core'))
          .canIgnore()
      );
    }
  }

  // Ionic CLI should not be required as a copy is installed with the extension
  // const liveReload = getSetting(WorkspaceSetting.liveReload);
  // if (!exists('@ionic/cli') && isIonicBasedProject() && liveReload) {
  //   project.recommendAdd(
  //     '@ionic/cli',
  //     '@ionic/cli',
  //     'Add the Ionic CLI for Live Reload',
  //     'The Ionic CLI adds the "Live Reload" feature to quickly refresh your application on a device after a code change.',
  //     true
  //   );
  // }

  if (exists('cordova-plugin-x-socialsharing')) {
    // TODO: Verify that Android Manifest contains
    // <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
  }

  if (!isGreaterOrEqual('@ionic-enterprise/identity-vault', '5.1.0')) {
    project.tip(
      checkMinVersion(
        '@ionic-enterprise/identity-vault',
        '5.1.0',
        'as the current version is missing important security fixes.',
        'https://ionic.io/docs/identity-vault'
      )
    );
  }

  if (isLessOrEqual('@ionic/angular-toolkit', '8.1.0') && isGreaterOrEqual('@angular/core', '15.0.0')) {
    project.tip(
      checkMinVersion('@ionic/angular-toolkit', '8.1.0', 'as the current version is missing Angular 15 support.')
    );
  }
}

/**
 * These rules are shared by the Capacitor Migration which is why they return an array
 * @param  {Project} project
 * @param {bool} forMigration Whether the recommendations are for a migration of a Cordova project
 * @returns Tip
 */
export async function capacitorRecommendations(project: Project, forMigration: boolean): Promise<Tip[]> {
  const tips: Tip[] = [];

  // This is used for recommendations that arent required for a migration from Cordova but are for Capacitor projects
  // Eg go from cordova-plugin-actionsheet to @capacitor/actionsheet
  function addOptional(tip: Tip) {
    if (!forMigration) {
      tips.push(tip);
    }
  }

  if (project.repoType == MonoRepoType.nx && !exists('@nxext/capacitor') && exists('@nrwl/workspace')) {
    tips.push(
      new Tip(
        'Add Capacitor Extension for NX',
        '',
        TipType.Capacitor,
        'Add Capacitor Extension for NX?',
        [npmInstall('@nxext/capacitor')],
        'Add Capacitor NX',
        'NX Support added for your project',
        'https://nxext.dev/docs/capacitor/overview.html',
        'Adding NX Support...'
      )
        .showProgressDialog()
        .canIgnore()
    );
  }

  // Capacitor Integrations
  if (
    !project.fileExists('capacitor.config.ts') &&
    !project.fileExists('capacitor.config.js') &&
    !project.fileExists('capacitor.config.json') &&
    !project.isCapacitorPlugin
  ) {
    const local = project.repoType != MonoRepoType.none ? InternalCommand.cwd : '';
    tips.push(
      new Tip(
        'Add Capacitor Integration',
        '',
        TipType.Capacitor,
        'Add the Capacitor integration to this project',
        [
          npmInstall('@capacitor/core@latest', '--save', '-E'),
          npmInstall('@capacitor/cli@latest', '-D', '-E'),
          npmInstall(`@capacitor/app @capacitor/core @capacitor/haptics @capacitor/keyboard @capacitor/status-bar`),
          `${local}${npx(project.packageManager)} capacitor init "${project.name}" "${asAppId(
            project.name
          )}" --web-dir www`,
        ],
        'Add Capacitor',
        'Capacitor added to this project',
        'https://capacitorjs.com/docs/cordova/migrating-from-cordova-to-capacitor',
        'Adding Capacitor to the project...'
      ).showProgressDialog()
    );
  } else {
    if (!project.hasCapacitorProject(CapacitorPlatform.android) && ionicState.hasNodeModules) {
      tips.push(
        new Tip(
          'Add Android Project',
          '',
          TipType.Android,
          'Add Android support to your Capacitor project?',
          [npmInstall('@capacitor/android'), capacitorAdd(project, CapacitorPlatform.android)],
          'Add Android',
          'Android support added to your project',
          undefined,
          'Adding Native Android Project...'
        )
          .showProgressDialog()
          .canIgnore()
      );
    }

    if (!project.hasCapacitorProject(CapacitorPlatform.ios) && ionicState.hasNodeModules) {
      tips.push(
        new Tip(
          'Add iOS Project',
          '',
          TipType.Apple,
          'Add iOS support to your Capacitor project?',
          [npmInstall('@capacitor/ios'), capacitorAdd(project, CapacitorPlatform.ios)],
          'Add iOS',
          'iOS support added to your project',
          undefined,
          'Adding Native iOS Project...'
        )
          .showProgressDialog()
          .canIgnore()
      );
    }
  }

  const TODO = false; // TODO: ALLOW THIS FEATURE
  if (!exists('husky') && project.isCapacitor && TODO) {
    if (isGreaterOrEqual('typescript', '4.0.0')) {
      const csTip = new Tip(
        'Enforce Coding Standards',
        '',
        TipType.Idea,
        'Enforce coding standard using Prettier, ESLint and Husky'
      ).canIgnore();
      tips.push(csTip.setAction(integratePrettier, project, csTip, ionicState.context));
    }
  }

  // List of incompatible plugins
  tips.push(incompatiblePlugin('cordova-plugin-admobpro', 'https://github.com/ionic-team/capacitor/issues/1101'));
  tips.push(incompatiblePlugin('cordova-plugin-braintree', 'https://github.com/ionic-team/capacitor/issues/1415'));
  tips.push(incompatiblePlugin('cordova-plugin-code-push', 'https://github.com/microsoft/code-push/issues/615'));
  tips.push(incompatiblePlugin('cordova-plugin-fcm', 'https://github.com/ionic-team/capacitor/issues/584'));
  tips.push(incompatiblePlugin('cordova-plugin-firebase', 'https://github.com/ionic-team/capacitor/issues/815'));

  tips.push(notRequiredPlugin('cordova-support-google-services'));
  tips.push(incompatiblePlugin('cordova-plugin-passbook'));
  tips.push(incompatibleReplacementPlugin('cordova-plugin-ionic-keyboard', '@capacitor/keyboard'));

  tips.push(
    incompatiblePlugin(
      'cordova-plugin-firebasex',
      'https://github.com/dpa99c/cordova-plugin-firebasex/issues/610#issuecomment-810236545'
    )
  );

  tips.push(incompatiblePlugin('cordova-plugin-music-controls', 'It causes build failures, skipped'));
  tips.push(incompatiblePlugin('cordova-plugin-qrscanner', 'https://github.com/ionic-team/capacitor/issues/1213'));
  tips.push(incompatiblePlugin('cordova-plugin-swrve', 'It relies on Cordova specific feature CDVViewController'));
  tips.push(incompatiblePlugin('cordova-plugin-ios-keychain', 'It is not compatible with Capacitor'));

  tips.push(
    replacementPlugin(
      'cordova-plugin-googlemaps',
      '@capacitor/google-maps',
      'It causes build failures on iOS but can be replaced with @capacitor/google-maps and will require code refactoring.',
      TipType.Error
    )
  );

  tips.push(
    incompatiblePlugin(
      'newrelic-cordova-plugin',
      'It relies on Cordova hooks. https://github.com/newrelic/newrelic-cordova-plugin/issues/15'
    )
  );
  //tips.push(incompatiblePlugin('phonegap-plugin-push', 'It will not compile but can be replaced with the plugin cordova-plugin-push'));
  tips.push(
    replacementPlugin(
      'phonegap-plugin-push',
      '@havesource/cordova-plugin-push',
      'It will not compile but can be replaced with the plugin cordova-plugin-push'
    )
  );

  tips.push(
    incompatiblePlugin(
      'cordova-plugin-appsflyer-sdk',
      'It will not compile but can be replaced with the plugin appsflyer-capacitor-plugin'
    )
  );

  if (process.platform !== 'win32' && exists('@capacitor/ios')) {
    const cocoaPods = await getCocoaPodsVersion(project);
    if (cocoaPods && !isVersionGreaterOrEqual(cocoaPods, '1.12.1')) {
      project.add(
        new Tip('Update Cocoapods', `Cocoapods requires updating.`, TipType.Error).setAction(
          updateCocoaPods,
          cocoaPods,
          project
        )
      );
    }
  }

  // Plugins that are not required
  tips.push(notRequiredPlugin('cordova-plugin-compat'));
  if (!exists('cordova-plugin-file-transfer')) {
    // Note: If you still use cordova-plugin-file-transfer it requires the whitelist plugin (https://github.com/ionic-team/capacitor/issues/1199)
    tips.push(
      notRequiredPlugin('cordova-plugin-whitelist', 'The functionality is built into Capacitors configuration file')
    );
  }
  tips.push(notRequiredPlugin('cordova-plugin-crosswalk-webview', 'Capacitor doesn’t allow to change the webview'));
  tips.push(
    notRequiredPlugin('cordova-plugin-ionic-webview', 'An App store compliant Webview is built into Capacitor')
  );
  tips.push(
    notRequiredPlugin('cordova-plugin-wkwebview-engine', 'An App store compliant Webview is built into Capacitor')
  );
  tips.push(
    notRequiredPlugin(
      'cordova-plugin-androidx',
      'This was required for Cordova Android 10 support but is not required by Capacitor'
    )
  );
  tips.push(
    notRequiredPlugin('cordova-android-support-gradle-release', 'Capacitor provides control to set library versions')
  );
  tips.push(notRequiredPlugin('cordova-plugin-add-swift-support', 'Swift is supported out-of-the-box with Capacitor'));
  tips.push(
    notRequiredPlugin(
      'cordova-plugin-enable-multidex',
      'Multidex is handled by Android Studio and does not require a plugin'
    )
  );
  tips.push(
    notRequiredPlugin(
      'cordova-support-android-plugin',
      'This plugin is used to simplify Cordova plugin development and is not required for Capacitor'
    )
  );
  tips.push(
    notRequiredPlugin(
      'cordova-plugin-androidx-adapter',
      'Android Studio patches plugins for AndroidX without requiring this plugin'
    )
  );
  tips.push(notRequiredPlugin('cordova-custom-config', 'Configuration achieved through native projects'));
  tips.push(notRequiredPlugin('cordova-plugin-cocoapod-support', 'Pod dependencies supported in Capacitor'));
  tips.push(notRequiredPlugin('phonegap-plugin-multidex', 'Android Studio handles compilation'));

  // Plugins which have a minimum versions
  tips.push(checkMinVersion('cordova-plugin-inappbrowser', '5.0.0', 'to compile in a Capacitor project'));
  tips.push(checkMinVersion('cordova-plugin-camera', '6.0.0', 'to compile in a Capacitor project'));
  tips.push(checkMinVersion('cordova.plugins.diagnostic', '6.1.1', 'to compile in a Capacitor project'));
  tips.push(checkMinVersion('cordova-plugin-file-opener2', '2.1.1', 'to compile in a Capacitor project'));
  tips.push(checkMinVersion('cordova-plugin-statusbar', '3.0.0', 'to compile in a Capacitor project'));

  tips.push(
    checkMinVersion(
      'branch-cordova-sdk',
      '4.0.0',
      'Requires update. See: https://help.branch.io/developers-hub/docs/capacitor'
    )
  );

  // Plugins to recommend replacement with a Capacitor equivalent
  tips.push(incompatibleReplacementPlugin('sentry-cordova', '@sentry/capacitor'));
  addOptional(
    replacementPlugin(
      'cordova-plugin-actionsheet',
      '@capacitor/action-sheet',
      'https://capacitorjs.com/docs/apis/action-sheet'
    )
  );
  addOptional(
    replacementPlugin('cordova-plugin-camera', '@capacitor/camera', 'https://capacitorjs.com/docs/apis/camera')
  );
  addOptional(
    replacementPlugin('ionic-plugin-deeplinks', '@capacitor/app', 'https://capacitorjs.com/docs/guides/deep-links')
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-customurlscheme',
      '@capacitor/app',
      'https://capacitorjs.com/docs/guides/deep-links'
    )
  );
  addOptional(
    replacementPlugin(
      '@ionic-enterprise/clipboard',
      '@capacitor/clipboard',
      'https://capacitorjs.com/docs/apis/clipboard'
    )
  );
  addOptional(
    replacementPlugin('@ionic-enterprise/deeplinks', '@capacitor/app', 'https://capacitorjs.com/docs/guides/deep-links')
  );
  addOptional(
    replacementPlugin(
      '@ionic-enterprise/statusbar',
      '@capacitor/status-bar',
      'https://capacitorjs.com/docs/apis/status-bar'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-firebase',
      '@capacitor-community/fcm',
      'https://github.com/capacitor-community/fcm'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-firebase-messaging',
      '@capacitor/push-notifications',
      'https://capacitorjs.com/docs/apis/push-notifications'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-firebase-analytics',
      '@capacitor-community/firebase-analytics',
      'https://github.com/capacitor-community/firebase-analytics'
    )
  );
  addOptional(
    replacementPlugin('cordova-plugin-app-version', '@capacitor/device', 'https://capacitorjs.com/docs/apis/device')
  );
  addOptional(
    replacementPlugin('cordova-plugin-dialogs', '@capacitor/dialog', 'https://capacitorjs.com/docs/apis/dialog')
  );

  // cordova-plugin-advanced-http required cordova-plugin-file
  if (!exists('cordova-plugin-advanced-http')) {
    addOptional(
      replacementPlugin('cordova-plugin-file', '@capacitor/filesystem', 'https://capacitorjs.com/docs/apis/filesystem')
    );
  }

  addOptional(
    replacementPlugin(
      'cordova-plugin-file-transfer',
      '@capacitor/filesystem',
      'https://capacitorjs.com/docs/apis/filesystem'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-datepicker',
      '@capacitor-community/date-picker',
      'https://github.com/capacitor-community/date-picker'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-geolocation',
      '@capacitor/geolocation',
      'https://capacitorjs.com/docs/apis/geolocation'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-sqlite-storage',
      '@capacitor-community/sqlite',
      'https://github.com/capacitor-community/sqlite'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-safariviewcontroller',
      '@capacitor/browser',
      'https://capacitorjs.com/docs/apis/browser'
    )
  );
  addOptional(
    replacementPlugin('cordova-plugin-appavailability', '@capacitor/app', 'https://capacitorjs.com/docs/apis/app')
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-network-information',
      '@capacitor/network',
      'https://capacitorjs.com/docs/apis/network'
    )
  );
  addOptional(
    replacementPlugin('cordova-plugin-device', '@capacitor/device', 'https://capacitorjs.com/docs/apis/device')
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-ionic-keyboard',
      '@capacitor/keyboard',
      'https://capacitorjs.com/docs/apis/keyboard'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-splashscreen',
      '@capacitor/splash-screen',
      'https://capacitorjs.com/docs/apis/splash-screen'
    )
  );
  addOptional(
    replacementPlugin(
      'cordova-plugin-statusbar',
      '@capacitor/status-bar',
      'https://capacitorjs.com/docs/apis/status-bar'
    )
  );
  addOptional(
    replacementPlugin(
      'phonegap-plugin-push',
      '@capacitor/push-notifications',
      'https://capacitorjs.com/docs/apis/push-notifications'
    )
  );
  return tips;
}

function isIonicBasedProject() {
  return exists('@ionic/angular') || exists('@ionic/react') || exists('@ionic/vue');
}

// Capacity Android 3.2.3 added proguard rules for Capacitor for release build
// Get users to upgrade if they turn on minifyEnabled to true
function checkBuildGradleForMinifyInRelease(project: Project) {
  // Look in android/app/build.gradle for "minifyEnabled true"
  const filename = path.join(project.folder, 'android', 'app', 'build.gradle');
  if (fs.existsSync(filename)) {
    const txt = fs.readFileSync(filename, 'utf8');
    if (txt.includes('minifyEnabled true')) {
      project.add(
        checkMinVersion(
          '@capacitor/android',
          '3.2.3',
          'to ensure Android release builds work when minifyEnabled is true',
          'https://developer.android.com/studio/build/shrink-code'
        )
      );
    }
  }
}

async function getCocoaPodsVersion(project: Project, avoidCache?: boolean): Promise<string> {
  try {
    const cocoaPodsVersion = getSetting(WorkspaceSetting.cocoaPods);
    if (!avoidCache && cocoaPodsVersion) {
      return cocoaPodsVersion;
    }
    let data = await getRunOutput('pod --version', project.folder);
    data = data.replace('\n', '');
    setSetting(WorkspaceSetting.cocoaPods, data);
    return data;
  } catch (error) {
    if (error?.includes('GemNotFoundException')) {
      return 'missing';
    }
    return undefined;
  }
}

async function updateCocoaPods(currentVersion: string, project: Project) {
  const msg = currentVersion == 'missing' ? 'Install' : 'Update';
  const txt = `${msg} Cocoapods`;
  const data = await getRunOutput('which pod', project.folder);
  let cmd = 'brew install cocoapods';
  if (!data.includes('homebrew')) {
    cmd = 'gem install cocoapods --user-install';
  }

  const res = await window.showInformationMessage(
    `XCode 14.3+ will fail when using Project > Archive. ${msg} Cocoapods using "${cmd}" to fix the issue?`,
    txt,
    'Exit'
  );
  if (!res || res != txt) return;

  getOutputChannel().show();
  await showProgress(`${msg} Cocoapods...`, async () => {
    const channel = getOutputChannel();
    channel.appendLine(`> ${cmd}`);
    await project.run2(cmd, false);

    const v = await getCocoaPodsVersion(project, true);
    const msg = `Cocoapods Updated to ${v}. Be sure to "Sync" your project.`;
    writeIonic(msg);
    if (isVersionGreaterOrEqual(v, '1.12.1')) {
      window.showInformationMessage(msg, 'OK');
    }
  });
}
