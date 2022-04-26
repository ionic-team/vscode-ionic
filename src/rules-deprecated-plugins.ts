import { Project } from './project';

/**
 * Rules around deprecated plugins
 * @param  {Project} project
 */
export function checkDeprecatedPlugins(project: Project) {
  // Adobe Mobiles services deprecation
  project.deprecatedPlugin(
    'adobe-mobile-services',
    'Mobile Services reaches end-of-life on December 31, 2022',
    'https://experienceleague.adobe.com/docs/mobile-services/using/eol.html?lang=en'
  );

  // Cordova Plugin Crop deprecation
  project.deprecatedPlugin(
    'cordova-plugin-crop',
    'cordova-plugin-crop is deprecated and does not support Android 11+',
    'https://github.com/jeduan/cordova-plugin-crop#readme'
  );

  // App Center deprecated Cordova SDK
  project.deprecatedPlugin(
    'cordova-plugin-appcenter-analytics',
    'App Center is deprecating support for Cordova SDK in April 2022',
    'https://devblogs.microsoft.com/appcenter/announcing-apache-cordova-retirement'
  );
  project.deprecatedPlugin(
    'cordova-plugin-appcenter-crashes',
    'App Center is deprecating support for Cordova SDK in April 2022',
    'https://devblogs.microsoft.com/appcenter/announcing-apache-cordova-retirement'
  );
  project.deprecatedPlugin(
    'cordova-plugin-appcenter-shared',
    'App Center is deprecating support for Cordova SDK in April 2022',
    'https://devblogs.microsoft.com/appcenter/announcing-apache-cordova-retirement'
  );

  project.deprecatedPlugin(
    '@ionic-enterprise/offline-storage',
    'Replace this plugin with @ionic-enterprise/secure-storage'
  );
}
