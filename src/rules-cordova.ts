import {
  checkCordovaAndroidPreference,
  checkCordovaAndroidPreferenceMinimum,
  checkCordovaIosPreference,
  checkMinVersion,
  exists,
  isGreaterOrEqual,
  warnMinVersion,
} from './analyzer';
import { Project } from './project';

/**
 * Check rules for Cordova projects
 * @param  {Project} project
 */
export function checkCordovaRules(project: Project) {
  project.tip(
    warnMinVersion(
      'cordova-android',
      '10.0.1',
      'to be able to target Android SDK v30 which is required for all submissions to the Play Store'
    )
  );
  project.tip(warnMinVersion('cordova-ios', '6.1.0'));

  if (isGreaterOrEqual('cordova-android', '10.0.0')) {
    project.checkNotExists(
      'cordova-plugin-whitelist',
      'should be removed as its functionality is now built into Cordova'
    );
    project.checkNotExists('phonegap-plugin-multidex', 'is not compatible with cordova-android 10+');
    project.checkNotExists('cordova-plugin-androidx', 'is not required when using cordova-android 10+');
    project.checkNotExists('cordova-plugin-androidx-adapter', 'is not required when using cordova-android 10+');
    project.checkNotExists(
      'phonegap-plugin-push',
      'is deprecated and does not support Android X. Migrate to using cordova-plugin-push'
    );

    project.tip(checkMinVersion('cordova-plugin-inappbrowser', '5.0.0', 'to support Android 10+'));
    project.tip(checkMinVersion('cordova-plugin-ionic-webview', '5.0.0', 'to support Android 10+'));
    project.tip(checkMinVersion('scandit-cordova-datacapture-barcode', '6.9.1', 'to support Android 10+'));
    project.tip(checkMinVersion('cordova-plugin-ionic', '5.5.0', 'to support Android 10+'));
    project.tip(checkCordovaAndroidPreference(project, 'AndroidXEnabled', true));

    if (exists('cordova-plugin-push') || exists('@havesource/cordova-plugin-push')) {
      project.tip(checkCordovaAndroidPreference(project, 'GradlePluginGoogleServicesEnabled', true));
      project.tip(checkCordovaAndroidPreferenceMinimum('GradlePluginGoogleServicesVersion', '4.3.8'));
    }
  } else {
    project.checkNotExists(
      'cordova-plugin-whitelist',
      'is deprecated and no longer required with cordova-android v10+'
    );
  }

  if (isGreaterOrEqual('@ionic/angular-toolkit', '6.0.0')) {
    // In v6 Cordova projects require @ionic/cordova-builders
    if (!exists('@ionic/cordova-builders')) {
      project.recommendAdd(
        '@ionic/cordova-builders',
        '@ionic/cordova-builders',
        'Install @ionic/cordova-builders for compatibility',
        'The package @ionic/cordova-builders is required when @ionic/angular-toolkit is version 6 and higher.',
        true
      );
    }
  }

  project.recommendReplace(
    'phonegap-plugin-push',
    'phonegap-plugin-push',
    `Replace with cordova-plugin-push due to deprecation`,
    `The plugin phonegap-plugin-push should be replaced with cordova-plugin-push as phonegap-plugin-push was deprecated in 2017`,
    'cordova-plugin-push'
  );

  if (exists('@ionic-enterprise/identity-vault')) {
    // Make sure Swift is 4.2 or 5 when using identity vault
    project.tip(checkCordovaIosPreference('UseSwiftLanguageVersion', [4.2, 5], 4.2));
    if (!isGreaterOrEqual('@ionic-enterprise/identity-vault', '5.0.0')) {
      project.tip(
        checkMinVersion(
          '@ionic-enterprise/identity-vault',
          '5.0.0',
          'Update to v5 as it contains significant security fixes and broader support for Android security features',
          'https://ionic.io/docs/identity-vault'
        )
      );
    } else {
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
    }
  }

  if (exists('cordova-support-google-services') && isGreaterOrEqual('cordova-android', '9.0.0')) {
    project.recommendRemove(
      'cordova-support-google-services',
      'cordova-support-google-services',
      'Remove as the functionality is built into cordova-android 9+. See: https://github.com/chemerisuk/cordova-support-google-services'
    );
  }
}
