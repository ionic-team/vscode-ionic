export const privacyManifestRules = [
  {
    plugin: '@ionic-enterprise/identity-vault', // Uses UserDefaults
    category: 'NSPrivacyAccessedAPICategoryUserDefaults',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278401',
    reasons: ['CA92.1', '1C8F.1'],
  },
  {
    plugin: '@capacitor/preferences', // Uses UserDefaults
    category: 'NSPrivacyAccessedAPICategoryUserDefaults',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278401',
    reasons: ['CA92.1', '1C8F.1'],
  },
  {
    plugin: '@capawesome/capacitor-file-picker', // Uses .modificationDate
    category: 'NSPrivacyAccessedAPICategoryFileTimestamp',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278393',
    reasons: ['C617.1', 'DDA9.1', '3B52.1'], // FYI: 0A2A.1 is not applicable
  },
  {
    plugin: '@capacitor/device', // Uses .systemSize, systemFreeSize, volumeAvailableCapacityForImportantUsageKey
    category: 'NSPrivacyAccessedAPICategoryDiskSpace',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278397',
    reasons: ['85F4.1', 'E174.1', '7D9E.1', 'B728.1'],
  },
  {
    plugin: '@capacitor/filesystem', // Uses .modificationDate
    category: 'NSPrivacyAccessedAPICategoryFileTimestamp',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278393',
    reasons: ['C617.1', 'DDA9.1', '3B52.1'], // FYI: 0A2A.1 is not applicable
  },
  {
    plugin: '@capacitor-community/mdm-appconfig',
    category: 'NSPrivacyAccessedAPICategoryUserDefaults',
    reasonUrl:
      'https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api#4278401',
    reasons: ['AC6B.1'],
  },
];
