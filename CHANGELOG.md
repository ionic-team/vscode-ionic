## Changelog
### Version 0.0.2
- On commands with long logs (eg Sync or Build) make sure the bottom scrolls into view
- Show estimated progress bar for operations that have been run more than once

### Version 0.0.1
- Fix additional carriage returns in logging
- Fix label when running on a device
- Fix iOS target device selection to filter unknown device
- Remove recommendations group if no recommendations
- Cleanup links to node packages and wording of 'upgrade' vs 'update'
- Improve titles for running tasks
- Add option to create Ionic project for blank folders
- Stream output for commands and focus output window
- Show progress when getting device list
- Fix bug with display of protractor removal
- Detect ionic CLI missing and direct user to website
- Add link for recommendation of migration from Protractor
- Added newrelic-cordova-plugin as a incompatible Capacitor plugin
- In Capacitor projects: if `cordova-plugin-file-transfer` is used then verify `cordova-plugin-whitelist` is installed (see [https://github.com/ionic-team/capacitor/issues/1199]())