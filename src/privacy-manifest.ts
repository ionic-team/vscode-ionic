export const privacyManifestRules = [
  {
    plugin: '@ionic-enterprise/identity-vault',
    category: 'NSPrivacyAccessedAPICategoryUserDefaults',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278401',
    reasons: ['CA92.1', '1C8F.1'],
  },
  {
    plugin: '@capacitor/preferences',
    category: 'NSPrivacyAccessedAPICategoryUserDefaults',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278401',
    reasons: ['CA92.1', '1C8F.1'],
  },
  {
    plugin: '@capacitor-community/mdm-appconfig',
    category: 'NSPrivacyAccessedAPICategoryUserDefaults',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278401',
    reasons: ['AC6B.1'],
  },
];
