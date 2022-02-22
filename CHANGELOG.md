## Changelog
### Version 0.0.11
- For install/uninstall/update write to output instead of a window that requires closing
- First run for web now shows the preview tab

### Version 0.0.10
- When building/syncing show percentage (eg Building 65%)
- When building Will perform npm install if no node_modules folder present
- Ionic ClI comands are prefixed with npx to ensure that the local cli is used before global
- Scoped packages are placed in a subfolder. Eg @capacitor, @ionic etc
- Packages are sorted alphabetically
- Fix for preview of app in Editor (2 panes opened)
- Add phone layout to web preview with button for app restart

### Version 0.0.9
- Preview app in VS Code Editor added as an option
- Option to install new packages
- Option to uninstall packages
- Allow JAVA_HOME to be set (to allow building with different version of Java)
- Settings are now applied immediated (do not require a refresh)
- Build command now uses ionic build
- Production flag setting now correctly works
- When rerunning an operation the previous operation is cancelled

### Version 0.0.8
- Handle scenarios with iOS and Android have different bundle ids, display names or version numbers
- Fix for ensuring environment variables like JAVA_HOME are used when running tasks

### Version 0.0.7
- commands running sync will set an environment variable of LANG=en_US.UTF-8 (To avoid cocoapods error)
- Sync option no longer shown if not using Capacitor
- Option to run on native device not shown if @capacitor/ios or @capacitor/android not used

### Version 0.0.6
- Operations that have errors should no longer cause "Operation X already running"
- Fix for projects without iOS or Android integration (toString undefined error)

### Version 0.0.5
- Ability to set Bundle Id, Version Number, Build Number and Display Name of app
- Handle when a user uses spaces in an app name when creating a project

### Version 0.0.4
- When running most tasks the progress dialog should be hidden
- If node_modules folder is not found then recommendation given for npm install
- Speed improvement between operations by caching npm outdated call
- If @capacitor/core is upgraded then also upgrade @capacitor/ios and @capacitor/android
- Test the minimum version of node when run
- Application name can be changed when a new project is created
- Fix for running iOS apps with live reload
- Display version numbers when selecting iOS devices

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