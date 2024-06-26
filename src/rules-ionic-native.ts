import { exists } from './analyzer';
import { npmInstall, npmUninstall } from './node-commands';
import { Project } from './project';
import { Tip, TipType } from './tip';

export function checkIonicNativePackages(packages, project: Project) {
  const wrappersAndPlugins = getWrappersAndPlugins();
  const deprecatedPackages = getDeprecatedPackages();
  for (const name of Object.keys(packages)) {
    if (name.startsWith('@ionic-native/')) {
      const replacement = name.replace('@ionic-native', '@awesome-cordova-plugins');
      if (deprecatedPackages.includes(name)) {
        project.deprecatedPlugin(name, 'Its support was removed from @awesome-cordova-plugins');
      } else {
        if (exists(replacement)) {
          project.recommendRemove(
            name,
            name,
            `You already have a newer version of this package installed (${replacement}) so ${name} can be uninstalled as it is not needed`,
          );
        } else {
          replacePackage(project, name, replacement);
        }
      }
    } else if (name.startsWith('@awesome-cordova-plugins')) {
      const plugin = wrappersAndPlugins[name];
      if (plugin && !exists(plugin)) {
        project.recommendRemove(
          name,
          name,
          `You have the typescript wrapper '${name}' installed but do not have the matching plugin '${plugin}' installed.`,
        );
      }
    }
  }
}

function replacePackage(project: Project, name: string, replacement: string) {
  project.add(
    new Tip(
      name,
      'Migrate to @awesome-cordova-plugins',
      TipType.Idea,
      `@ionic-native migrated to @awesome-cordova-plugins in 2021. You can safely migrate from ${name} to ${replacement}`,
      npmInstall(replacement) + ' && ' + npmUninstall(name),
      `Replace ${name}`,
    ),
  );
}

/**
 * Returns an object with the list of wrappers along with the matching plugin
 */
function getWrappersAndPlugins() {
  return {
    '@awesome-cordova-plugins/abbyy-rtr': 'cordova-plugin-abbyy-rtr-sdk',
    '@awesome-cordova-plugins/action-sheet': 'cordova-plugin-actionsheet',
    '@awesome-cordova-plugins/admob-plus': 'cordova-admob-plus',
    '@awesome-cordova-plugins/admob-pro': 'cordova-plugin-admobpro',
    '@awesome-cordova-plugins/admob': 'cordova-admob',
    '@awesome-cordova-plugins/aes-256': 'cordova-plugin-aes256-encryption',
    '@awesome-cordova-plugins/all-in-one-sdk': 'cordova-paytm-allinonesdk',
    '@awesome-cordova-plugins/analytics-firebase': 'cordova-plugin-analytics',
    '@awesome-cordova-plugins/android-exoplayer': 'cordova-plugin-exoplayer',
    '@awesome-cordova-plugins/android-full-screen': 'cordova-plugin-fullscreen',
    '@awesome-cordova-plugins/android-notch': 'cordova-plugin-android-notch',
    '@awesome-cordova-plugins/android-permissions': 'cordova-plugin-android-permissions',
    '@awesome-cordova-plugins/anyline': 'io-anyline-cordova',
    '@awesome-cordova-plugins/app-availability': 'cordova-plugin-appavailability',
    '@awesome-cordova-plugins/app-center-analytics': 'cordova-plugin-appcenter-analytics',
    '@awesome-cordova-plugins/app-center-crashes': 'cordova-plugin-appcenter-crashes',
    '@awesome-cordova-plugins/app-center-push': 'cordova-plugin-appcenter-push',
    '@awesome-cordova-plugins/app-center-shared': 'cordova-plugin-appcenter-shared',
    '@awesome-cordova-plugins/app-preferences': 'cordova-plugin-app-preferences',
    '@awesome-cordova-plugins/app-rate': 'cordova-plugin-apprate',
    '@awesome-cordova-plugins/app-version': 'cordova-plugin-app-version',
    '@awesome-cordova-plugins/apple-wallet': 'cordova-apple-wallet',
    '@awesome-cordova-plugins/approov-advanced-http': 'cordova-approov-advanced-http',
    '@awesome-cordova-plugins/background-fetch': 'cordova-plugin-background-fetch',
    '@awesome-cordova-plugins/background-geolocation': '@mauron85/cordova-plugin-background-geolocation',
    '@awesome-cordova-plugins/background-mode': 'cordova-plugin-background-mode',
    '@awesome-cordova-plugins/background-upload': 'cordova-plugin-background-upload',
    '@awesome-cordova-plugins/badge': 'cordova-plugin-badge',
    '@awesome-cordova-plugins/barcode-scanner': 'phonegap-plugin-barcodescanner',
    '@awesome-cordova-plugins/battery-status': 'cordova-plugin-battery-status',
    '@awesome-cordova-plugins/biocatch': 'cordova-plugin-biocatch',
    '@awesome-cordova-plugins/biometric-wrapper': 'undefined',
    '@awesome-cordova-plugins/ble': 'cordova-plugin-ble-central',
    '@awesome-cordova-plugins/blinkid': 'blinkid-cordova',
    '@awesome-cordova-plugins/bluetooth-classic-serial-port': 'cordova-plugin-bluetooth-classic-serial-port',
    '@awesome-cordova-plugins/bluetooth-le': 'cordova-plugin-bluetoothle',
    '@awesome-cordova-plugins/bluetooth-serial': 'cordova-plugin-bluetooth-serial',
    '@awesome-cordova-plugins/branch-io': 'branch-cordova-sdk',
    '@awesome-cordova-plugins/broadcaster': 'cordova-plugin-broadcaster',
    '@awesome-cordova-plugins/browser-tab': 'cordova-plugin-browsertab',
    '@awesome-cordova-plugins/build-info': 'cordova-plugin-buildinfo',
    '@awesome-cordova-plugins/calendar': 'cordova-plugin-calendar',
    '@awesome-cordova-plugins/call-directory': 'cordova-plugin-call-directory',
    '@awesome-cordova-plugins/call-number': 'call-number',
    '@awesome-cordova-plugins/camera-preview': 'cordova-plugin-camera-preview',
    '@awesome-cordova-plugins/camera': 'cordova-plugin-camera',
    '@awesome-cordova-plugins/checkout': 'undefined',
    '@awesome-cordova-plugins/chooser': 'cordova-plugin-chooser',
    '@awesome-cordova-plugins/clevertap': 'clevertap-cordova',
    '@awesome-cordova-plugins/clipboard': 'cordova-clipboard',
    '@awesome-cordova-plugins/cloud-settings': 'cordova-plugin-cloud-settings',
    '@awesome-cordova-plugins/code-push': 'cordova-plugin-code-push',
    '@awesome-cordova-plugins/deeplinks': 'ionic-plugin-deeplinks',
    '@awesome-cordova-plugins/device-accounts': 'cordova-device-accounts-v2',
    '@awesome-cordova-plugins/device-motion': 'cordova-plugin-device-motion',
    '@awesome-cordova-plugins/device-orientation': 'cordova-plugin-device-orientation',
    '@awesome-cordova-plugins/device': 'cordova-plugin-device',
    '@awesome-cordova-plugins/dfu-update': 'cordova-plugin-dfu-update',
    '@awesome-cordova-plugins/diagnostic': 'cordova.plugins.diagnostic',
    '@awesome-cordova-plugins/dialogs': 'cordova-plugin-dialogs',
    '@awesome-cordova-plugins/dns': 'cordova-plugin-dns',
    '@awesome-cordova-plugins/document-scanner': 'cordova-plugin-document-scanner',
    '@awesome-cordova-plugins/document-viewer': 'cordova-plugin-document-viewer',
    '@awesome-cordova-plugins/dynamsoft-barcode-scanner': 'cordova-plugin-dynamsoft-barcode-reader',
    '@awesome-cordova-plugins/email-composer': 'cordova-plugin-email-composer',
    '@awesome-cordova-plugins/fabric': 'cordova-fabric-plugin',
    '@awesome-cordova-plugins/facebook': 'cordova-plugin-facebook-connect',
    '@awesome-cordova-plugins/fcm': 'cordova-plugin-fcm-with-dependecy-updated',
    '@awesome-cordova-plugins/file-opener': 'cordova-plugin-file-opener2',
    '@awesome-cordova-plugins/file-path': 'cordova-plugin-filepath',
    '@awesome-cordova-plugins/file-transfer': 'cordova-plugin-file-transfer',
    '@awesome-cordova-plugins/file': 'cordova-plugin-file',
    '@awesome-cordova-plugins/fingerprint-aio': 'cordova-plugin-fingerprint-aio',
    '@awesome-cordova-plugins/firebase-analytics': 'cordova-plugin-firebase-analytics',
    '@awesome-cordova-plugins/firebase-authentication': 'cordova-plugin-firebase-authentication',
    '@awesome-cordova-plugins/firebase-config': 'cordova-plugin-firebase-config',
    '@awesome-cordova-plugins/firebase-crash': 'cordova-plugin-firebase-crash',
    '@awesome-cordova-plugins/firebase-crashlytics': 'cordova-plugin-firebase-crashlytics',
    '@awesome-cordova-plugins/firebase-dynamic-links': 'cordova-plugin-firebase-dynamiclinks',
    '@awesome-cordova-plugins/firebase-messaging': 'cordova-plugin-firebase-messaging',
    '@awesome-cordova-plugins/firebase-vision': 'cordova-plugin-firebase-mlvision',
    '@awesome-cordova-plugins/firebase-x': 'cordova-plugin-firebasex',
    '@awesome-cordova-plugins/firebase': 'cordova-plugin-firebase',
    '@awesome-cordova-plugins/flashlight': 'cordova-plugin-flashlight',
    '@awesome-cordova-plugins/foreground-service': 'cordova-plugin-foreground-service',
    '@awesome-cordova-plugins/ftp': 'cordova-plugin-ftp',
    '@awesome-cordova-plugins/gao-de-location': 'cordova-plugin-gaodelocation-chenyu',
    '@awesome-cordova-plugins/gcdwebserver': 'cordova-plugin-gcdwebserver',
    '@awesome-cordova-plugins/ge-tui-sdk-plugin': 'cordova-plugin-getuisdk',
    '@awesome-cordova-plugins/geolocation': 'cordova-plugin-geolocation',
    '@awesome-cordova-plugins/globalization': 'cordova-plugin-globalization',
    '@awesome-cordova-plugins/google-analytics': 'cordova-plugin-google-analytics',
    '@awesome-cordova-plugins/google-nearby': 'cordova-plugin-google-nearby',
    '@awesome-cordova-plugins/google-plus': 'cordova-plugin-googleplus',
    '@awesome-cordova-plugins/header-color': 'cordova-plugin-headercolor',
    '@awesome-cordova-plugins/health-kit': 'com.telerik.plugins.healthkit',
    '@awesome-cordova-plugins/health': 'cordova-plugin-health',
    '@awesome-cordova-plugins/http': 'cordova-plugin-advanced-http',
    '@awesome-cordova-plugins/iamport-cordova': 'iamport-cordova',
    '@awesome-cordova-plugins/ibeacon': 'cordova-plugin-ibeacon',
    '@awesome-cordova-plugins/image-picker': 'cordova-plugin-telerik-imagepicker',
    '@awesome-cordova-plugins/imap': 'cordova-plugin-imap',
    '@awesome-cordova-plugins/in-app-browser': 'cordova-plugin-inappbrowser',
    '@awesome-cordova-plugins/in-app-purchase-2': 'cordova-plugin-purchase',
    '@awesome-cordova-plugins/in-app-review': 'com.omarben.inappreview',
    '@awesome-cordova-plugins/in-app-update': 'cordova-in-app-update',
    '@awesome-cordova-plugins/insomnia': 'cordova-plugin-insomnia',
    '@awesome-cordova-plugins/instagram': 'cordova-instagram-plugin',
    '@awesome-cordova-plugins/intercom': 'cordova-plugin-intercom',
    '@awesome-cordova-plugins/ionic-webview': 'cordova-plugin-ionic-webview',
    '@awesome-cordova-plugins/ios-aswebauthenticationsession-api': 'cordova-plugin-ios-aswebauthenticationsession-api',
    '@awesome-cordova-plugins/is-debug': 'cordova-plugin-is-debug',
    '@awesome-cordova-plugins/keyboard': 'cordova-plugin-ionic-keyboard',
    '@awesome-cordova-plugins/keychain': 'cordova-plugin-ios-keychain',
    '@awesome-cordova-plugins/kommunicate': 'kommunicate-cordova-plugin',
    '@awesome-cordova-plugins/launch-navigator': 'uk.co.workingedge.phonegap.plugin.launchnavigator',
    '@awesome-cordova-plugins/launch-review': 'cordova-launch-review',
    '@awesome-cordova-plugins/local-backup': 'cordova-plugin-local-backup',
    '@awesome-cordova-plugins/local-notifications': 'cordova-plugin-local-notification',
    '@awesome-cordova-plugins/location-accuracy': 'cordova-plugin-request-location-accuracy',
    '@awesome-cordova-plugins/lottie-splash-screen': 'undefined',
    '@awesome-cordova-plugins/media-capture': 'cordova-plugin-media-capture',
    '@awesome-cordova-plugins/media': 'cordova-plugin-media',
    '@awesome-cordova-plugins/metrix': 'ir.metrix.sdk',
    '@awesome-cordova-plugins/mixpanel': 'cordova-plugin-mixpanel',
    '@awesome-cordova-plugins/mlkit-translate': 'cordova-plugin-mlkit-translate',
    '@awesome-cordova-plugins/mobile-messaging': 'com-infobip-plugins-mobilemessaging',
    '@awesome-cordova-plugins/multiple-document-picker': 'cordova-plugin-multiple-documents-picker',
    '@awesome-cordova-plugins/music-controls': 'cordova-plugin-music-controls2',
    '@awesome-cordova-plugins/native-audio': 'cordova-plugin-nativeaudio',
    '@awesome-cordova-plugins/native-geocoder': 'cordova-plugin-nativegeocoder',
    '@awesome-cordova-plugins/native-keyboard': 'cordova-plugin-native-keyboard',
    '@awesome-cordova-plugins/native-page-transitions': 'com.telerik.plugins.nativepagetransitions',
    '@awesome-cordova-plugins/native-storage': 'cordova-plugin-nativestorage',
    '@awesome-cordova-plugins/native-view': 'cordova-plugin-nativeview',
    '@awesome-cordova-plugins/network-interface': 'cordova-plugin-networkinterface',
    '@awesome-cordova-plugins/network': 'cordova-plugin-network-information',
    '@awesome-cordova-plugins/ocr': 'cordova-plugin-mobile-ocr',
    '@awesome-cordova-plugins/onesignal': 'onesignal-cordova-plugin',
    '@awesome-cordova-plugins/open-native-settings': 'cordova-open-native-settings',
    '@awesome-cordova-plugins/openalpr': 'cordova-plugin-openalpr',
    '@awesome-cordova-plugins/paytabs': 'com.paytabs.cordova.plugin',
    '@awesome-cordova-plugins/pdf-generator': 'cordova-pdf-generator',
    '@awesome-cordova-plugins/photo-library': 'cordova-plugin-photo-library',
    '@awesome-cordova-plugins/photo-viewer': 'com-sarriaroman-photoviewer',
    '@awesome-cordova-plugins/play-install-referrer': 'cordova-plugin-play-installreferrer',
    '@awesome-cordova-plugins/pollfish': 'com.pollfish.cordova_plugin',
    '@awesome-cordova-plugins/power-management': 'cordova-plugin-powermanagement',
    '@awesome-cordova-plugins/power-optimization': 'cordova-plugin-power-optimization',
    '@awesome-cordova-plugins/printer': 'cordova-plugin-printer',
    '@awesome-cordova-plugins/pspdfkit-cordova': 'pspdfkit-cordova',
    '@awesome-cordova-plugins/purchases': 'cordova-plugin-purchases',
    '@awesome-cordova-plugins/push': 'phonegap-plugin-push',
    '@awesome-cordova-plugins/pushape-push': 'pushape-cordova-push',
    '@awesome-cordova-plugins/safari-view-controller': 'cordova-plugin-safariviewcontroller',
    '@awesome-cordova-plugins/screen-orientation': 'cordova-plugin-screen-orientation',
    '@awesome-cordova-plugins/secure-storage-echo': 'cordova-plugin-secure-storage-echo',
    '@awesome-cordova-plugins/secure-storage': 'cordova-plugin-secure-storage-echo',
    '@awesome-cordova-plugins/service-discovery': 'cordova-plugin-discovery',
    '@awesome-cordova-plugins/shake': 'cordova-plugin-shake',
    '@awesome-cordova-plugins/sign-in-with-apple': 'cordova-plugin-sign-in-with-apple',
    '@awesome-cordova-plugins/sms-retriever': 'cordova-plugin-sms-retriever-manager',
    '@awesome-cordova-plugins/sms': 'cordova-sms-plugin',
    '@awesome-cordova-plugins/social-sharing': 'cordova-plugin-x-socialsharing',
    '@awesome-cordova-plugins/speech-recognition': 'cordova-plugin-speechrecognition',
    '@awesome-cordova-plugins/spinner-dialog': 'cordova-plugin-native-spinner',
    '@awesome-cordova-plugins/splash-screen': 'cordova-plugin-splashscreen',
    '@awesome-cordova-plugins/spotify-auth': 'cordova-spotify-oauth',
    '@awesome-cordova-plugins/sqlite-db-copy': 'cordova-plugin-dbcopy',
    '@awesome-cordova-plugins/sqlite-porter': 'uk.co.workingedge.cordova.plugin.sqliteporter',
    '@awesome-cordova-plugins/sqlite': 'cordova-sqlite-storage',
    '@awesome-cordova-plugins/star-prnt': 'cordova-plugin-starprnt',
    '@awesome-cordova-plugins/status-bar': 'cordova-plugin-statusbar',
    '@awesome-cordova-plugins/streaming-media': 'cordova-plugin-streaming-media',
    '@awesome-cordova-plugins/stripe': 'cordova-plugin-stripe',
    '@awesome-cordova-plugins/sum-up': 'cordova-sumup-plugin',
    '@awesome-cordova-plugins/system-alert-window-permission': 'cordova-plugin-system-alert-window-permission',
    '@awesome-cordova-plugins/taptic-engine': 'cordova-plugin-taptic-engine',
    '@awesome-cordova-plugins/text-to-speech-advanced': 'cordova-plugin-tts-advanced',
    '@awesome-cordova-plugins/theme-detection': 'cordova-plugin-theme-detection',
    '@awesome-cordova-plugins/three-dee-touch': 'cordova-plugin-3dtouch',
    '@awesome-cordova-plugins/toast': 'cordova-plugin-x-toast',
    '@awesome-cordova-plugins/touch-id': 'cordova-plugin-touch-id',
    '@awesome-cordova-plugins/uptime': 'cordova-plugin-uptime',
    '@awesome-cordova-plugins/urbanairship': 'urbanairship-cordova',
    '@awesome-cordova-plugins/usabilla-cordova-sdk': 'usabilla-cordova',
    '@awesome-cordova-plugins/vibes': 'vibes-cordova',
    '@awesome-cordova-plugins/vibration': 'cordova-plugin-vibration',
    '@awesome-cordova-plugins/video-editor': 'cordova-plugin-video-editor',
    '@awesome-cordova-plugins/web-intent': 'com-darryncampbell-cordova-plugin-intent',
    '@awesome-cordova-plugins/web-server': 'cordova-plugin-webserver2',
    '@awesome-cordova-plugins/web-socket-server': 'cordova-plugin-websocket-server',
    '@awesome-cordova-plugins/webengage': 'cordova-plugin-webengage',
    '@awesome-cordova-plugins/wechat': 'cordova-plugin-wechat --variable wechatappid=YOUR_WECHAT_APPID',
    '@awesome-cordova-plugins/wheel-selector': 'cordova-wheel-selector-plugin',
    '@awesome-cordova-plugins/wifi-wizard-2': 'cordova-plugin-wifiwizard2',
    '@awesome-cordova-plugins/wonderpush': 'wonderpush-cordova-sdk',
    '@awesome-cordova-plugins/youtube-video-player': 'cordova-plugin-youtube-video-player',
    '@awesome-cordova-plugins/zbar': 'cordova-plugin-cszbar',
    '@awesome-cordova-plugins/zeroconf': 'cordova-plugin-zeroconf',
    '@awesome-cordova-plugins/zoom': 'cordova.plugin.zoom',
  };
}

function getDeprecatedPackages() {
  return [
    '@ionic-native/admob-free',
    '@ionic-native/alipay',
    '@ionic-native/android-fingerprint-auth',
    '@ionic-native/app-launcher',
    '@ionic-native/app-minimize',
    '@ionic-native/app-update',
    '@ionic-native/apple-pay',
    '@ionic-native/appodeal',
    '@ionic-native/audio-management',
    '@ionic-native/autostart',
    '@ionic-native/backlight',
    '@ionic-native/baidu-push',
    '@ionic-native/base64-to-gallery',
    '@ionic-native/base64',
    '@ionic-native/blinkup',
    '@ionic-native/braintree',
    '@ionic-native/brightness',
    '@ionic-native/browser-tab',
    '@ionic-native/call-log',
    '@ionic-native/card-io',
    '@ionic-native/class-kit',
    '@ionic-native/clover-go',
    '@ionic-native/colored-browser-tabs',
    '@ionic-native/contacts',
    '@ionic-native/couchbase-lite',
    '@ionic-native/crop',
    '@ionic-native/date-picker',
    '@ionic-native/db-meter',
    '@ionic-native/device-feedback',
    '@ionic-native/downloader',
    '@ionic-native/emm-app-config',
    '@ionic-native/estimote-beacons',
    '@ionic-native/extended-device-information',
    '@ionic-native/file-encryption',
    '@ionic-native/file-picker',
    '@ionic-native/flurry-analytics',
    '@ionic-native/full-screen-image',
    '@ionic-native/geofence',
    '@ionic-native/google-play-games-services',
    '@ionic-native/gyroscope',
    '@ionic-native/hce',
    '@ionic-native/hot-code-push',
    '@ionic-native/hotspot',
    '@ionic-native/httpd',
    '@ionic-native/image-resizer',
    '@ionic-native/in-app-purchase',
    '@ionic-native/index-app-content',
    '@ionic-native/janalytics',
    '@ionic-native/jumio',
    '@ionic-native/keychain-touch-id',
    '@ionic-native/last-cam',
    '@ionic-native/luxand',
    '@ionic-native/magnetometer',
    '@ionic-native/market',
    '@ionic-native/mobile-accessibility',
    '@ionic-native/ms-adal',
    '@ionic-native/native-ringtones',
    '@ionic-native/navigation-bar',
    '@ionic-native/paypal',
    '@ionic-native/pedometer',
    '@ionic-native/phonegap-local-notification',
    '@ionic-native/pin-check',
    '@ionic-native/pin-dialog',
    '@ionic-native/pinterest',
    '@ionic-native/power-management',
    '@ionic-native/qqsdk',
    '@ionic-native/qr-scanner',
    '@ionic-native/quikkly',
    '@ionic-native/regula-document-reader',
    '@ionic-native/restart',
    '@ionic-native/rollbar',
    '@ionic-native/screenshot',
    '@ionic-native/sensors',
    '@ionic-native/serial',
    '@ionic-native/shop-checkout',
    '@ionic-native/shortcuts-android',
    '@ionic-native/sim',
    '@ionic-native/siri-shortcuts',
    '@ionic-native/speechkit',
    '@ionic-native/ssh-connect',
    '@ionic-native/stepcounter',
    '@ionic-native/text-to-speech',
    '@ionic-native/themeable-browser',
    '@ionic-native/twitter-connect',
    '@ionic-native/uid',
    '@ionic-native/unique-device-id',
    '@ionic-native/user-agent',
    '@ionic-native/video-capture-plus',
    '@ionic-native/zip',
  ];
}
