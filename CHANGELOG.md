## Changelog
### Version 0.0.3
- External address for live reload used by default
- Bug fix for run on Android / iOS for live reload

### Version 0.0.2
- Option added for building with the production flag 
- Option added for Https when running on the web 
- Standardized labels and icons
- External IP Address and Live Reload as settings
- On commands with long logs (eg Sync or Build) make sure the bottom scrolls into view
- If upgrading a package the dialog title is "Upgrade" rather than "Upgrading <package>"
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