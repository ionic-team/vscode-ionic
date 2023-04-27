import { exists } from './analyzer';
import { npmInstall, npmUninstall } from './node-commands';
import { Project } from './project';
import { Tip, TipType } from './tip';

export function checkIonicNativePackages(packages, project: Project) {
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
            `You already have a newer version of this package installed (${replacement}) so ${name} can be uninstalled as it is not needed`
          );
        } else {
          replacePackage(project, name, replacement);
        }
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
      `Replace ${name}`
    )
  );
}

const deprecatedPackages = [
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
