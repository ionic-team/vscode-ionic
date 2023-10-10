## Changelog

### Version 1.52

- Fix issue where searching for a dependency will show twice if the dependency is already installed
- Option added to only manually show the new project wizard (for users who have customized their VS Code view causing it to unwantedly appear)

### Version 1.51

- Detect onesignal-cordova-plugin and @ionic-enterprise/auth conflict
- Recommend Cocoapods update to 1.13.0 to fix issues with building with XCode 15

### Version 1.50

- New Project now has Capacitor Plugin as an option

### Version 1.49.2

- Fix for starting new projects on Windows machines
- Fix for plugin explorer not ending response

### Version 1.48

- Fix for yarn 1.x projects to correctly show outdated packages and all updates to minor dependencies

### Version 1.47

- A new "New Project" experience

### Version 1.46

- Recommendations for replacement plugins are worded more clearly.

### Version 1.45.5

- Plugin Search!
- Show Ignored Recommendations (from Project ... menu)
- Fix for Capacitor 5 migration with Cordova plugins that require jetifier
- Fix for new projects where a number was used as part of the application name
- Fix for Capacitor 5 starter projects to set the default Gradle JDK to 17
- Fix for pnpm projects running npm outdated instead of pnpm outdated

### Version 1.44

- Fix to include missing .jar files from Trapeze

### Version 1.43

- Fix for NX projects when node modules are not installed
- Fix for the build command when an Angular configuration is selected
- Fix for Angular project with multiple configurations

### Version 1.42

- Add recommendation for cordova-sqlite-storage causing errors with Secure Storage
- Update to use Trapeze for project configuration (fixes Capacitor 5 Android projects)

### Version 1.41

- You can now press ALT+B to build your project
- If computer has multiple IP Addresses then remember the IP Address chosen
- Fix to check for the version of Java
- Fix issue with detection of missing plugin for Typescript wrappers

### Version 1.40

- Migration to Capacitor 5!
- Migration to Capacitor 5 will look for incompatible plugins and upgrade them if needed.
- Fix for adding Capacitor platforms for older Capacitor projects

### Version 1.39

- Keyboard shortcut: Alt+R to run your app
- Keyboard shortcut: Alt+D to run and debug your app
- Recommend removal of @awesome-cordova-plugin wrappers when plugin is not installed
- Starters for Angular now have option for either ngModules or Standalone
- Capacitor 5 upgrade will check for minimum Android Studio version
- Selection of debug browser is now done through the 3 dots next to "debug"
- Recommend removal of all deprecated @ionic-native wrappers

### Version 1.38

- Automated migration for Capacitor 4 Plugins
- Detect if gem used to install Cocoapods and use it for upgrades

### Version 1.37

- Show recommendation of Cocoapods upgrade to fix XCode 14.3+ issue

### Version 1.36

- NX projects run web will use external address and work with Nexus Browser
- On Windows machines starters will correctly suggest a project name
- Running iOS and Android projects at the same time no longer queues
- Fix for NX projects and Capacitor detection
- Add jetifier removal recommendation

### Version 1.35

- Fix live reload for Angular project with non default (app) project names
- Fix running for iOS/Android to ensure stop option always available
- Support for https with Nexus Browser

### Version 1.34.2

- Fix for projects that appear to have folder based monorepos but are not
- Fix for Angular projects with non default (app) project names
- Support for Capacitor 5 beta migration

### Version 1.33.0

- Support for Standalone modules and use of Standalone pages by default for new pages
- Updated from built in Ionic CLI 6.20.9 to 7.0.0

### Version 1.32.0

- Splash screen and icon generation now uses @capacitor/assets instead of cordova-res
- Fix for Capacitor migration recommended replacement plugins

### Version 1.31.0

- Fix for starter projects switching to project view
- Fix for NX projects with subfolders

### Version 1.30.1

- NX 15 support for Standalone projects or projects with @nxext/capacitor
- NX Projects now run statistics and security audits
- Preselect real devices if there is only one real device connected
- Simplify list of devices with icon for real or emulator

### Version 1.29.1

- Logging filters added to settings
- Fix for NX projects that expect @nrwl/cli globally
- Rule for duplicate @ionic-native and @awesome-cordova-plugins packages
- Project export for NX fixed

### Version 1.28

- Remote logging enabled without requiring code changes
- If its not a Capacitor or Cordova app then expand Scripts
- Fix detection of Capacitor projects that do not use @capacitor/core
- Fix color logging for vite projects
- Fix project statistics for projects folders that have spaces
- Provide recommendation to projects whose ionic.config.json is malformed

### Version 1.27.1

- Preview apps with Nexus Browser

### Version 1.26.0

- Fix detection of node modules with NX repos
- Add scripts from the base package.json of NX repos

### Version 1.25.0

- Replacement plugin recommendation can be ignored
- Support for pnpm projects using NX
- Fix logging color for warnings
- Nexus

### Version 1.24.0

- Angular projects default is "production". Switch to "development" when attempting to debug.
- Support for projects that use .nvmrc (will switch node version when running commands)

### Version 1.23.6

- Remote Logging
- Fix for non-Ionic folder based workspaces
- Handle config.xml with no platforms
- Add option to switch to ESBuild for Angular (Click Project > ...)
- Add rule to handle cases where ionic-angular and @ionic/angular are installed
- Update rule on cordova-plugin-file-opener2
- Add Nuxt support (detection of dev web server, run and build)
- Add AnalogJs support
- Fix if Use HTTPS is used make sure dev server is stopped

### Version 1.22.4

- cordova-plugin-contacts as a deprecated plugin
- Handle Angular item creation with names that have spaces

### Version 1.22.3

- Handle angular.json files that have comments
- Use package-lock.json version for recommendations
- Additional error logging for new Angular items

### Version 1.22.2

- Add recommendations for replacement plugins related to @ionic-enterprise
- Show Capacitor recommendations even if cordova remnants are in the project
- Hide disconnected devices when running iOS/Android
- Expand native project properties by default

### Version 1.22.1

- Remove "properties" option when no iOS or Android project are present
- Fix for web debugging added (was failing to launch debugger in Angular projects)
- Migrate to PNPM feature added
- Reinstall node modules features added

### Version 1.22.0

- Support for pnpm exec (instead of calling npx)
- Security Audit is only available for npm based projects

### Version 1.21.6

- Support for folders that contain a space
- Debugging for Android now works (was queuing)
- Ionic CLI is no longer required for Live Reload to work (its built in)
- Live Reload will now use an external IP Address by default when running Native
- Fix launching the browser for Vite based editors
- Upgrade internal @ionic/cli to 6.20.8
- Fix for "prepare release" on Windows

### Version 1.21.1

- Feature to create Angular components, services, classes, directives, pages
- Tasks are now queued
- Project structure improved
- Live Reload setting only shows on iOS/Android projects
- Fix for React and Vue projects to open browser when run on web

### Version 1.20.0

- Feature to prepare release build (.ipa, .apk, .aab) using the cap build command
- When build is done it will also copy the web assets to the native platforms
- Adding iOS or Android platforms can be ignored (if you are only targeting a single platform)

### Version 1.19.2

- Fix for "Check for minor updates" related to Typescript 4.9.x compatibility
- Fix for npm workspaces to recognize that node_modules are at the root
- Fix live reload issue with npm workspaces
- Fix script run, package install/uninstall with npm workspaces
- Fix run on web for vite based projects

### Version 1.19.0

- HTTPS option added which supports trusted certificate setup

### Version 1.18.0

- Detect browserslist settings that will cause blank page on older devices

### Version 1.17.0

- Support for VS Code Workspaces
- Default port number can be configured in Advanced -> Settings
- Minimum version of locally installed @ionic/cli set to 6+
- Support for Angular projects with project names other than app

### Version 1.16.0

- Display the build configuration used for Angular projects where DefaultConfiguration is set
- Run speed optimization: if a project is changed and rebuilt make sure cap run does not build again
- Optimization: if dependencies do not change then avoid cap sync when re-running
- Fix for Capacitor Sync where non-default build configuration is used
- Show Android version instead of SDK level in Android Device List
- Show Capacitor commands even if Cordova is still present

### Version 1.15.0

- Check angular.json and make sure aot is not false for Angular 12+ projects
- Fix log coloring for fatal and warning messages
- Commands like build and sync now clear output window

### Version 1.14.0

- Feature to check for minor dependency updates
- Feature to audit for security vulnerabilities in dependencies
- Report play store issue with cordova-plugin-file-opener2

### Version 1.13.0

- Editor preview now has back button and titled by device selected
- New projects are given a unique package id based on the chosen name
- Added cleanup task on package.json for Capacitor projects with cordova configs

### Version 1.12.2

- Reduce chance of other Ionic extensions registering the same named commands
- Selection of build configuration will apply when the run command is used

### Version 1.11.0

- Fix Capacitor 4 migration to change registerPlugin order (Fixes #66)
- Fix Capacitor 4 migration to prevent adding unused variables (Fixes #65)
- Fix Capacitor 4 migration to avoid downgrading gradle (Fixes #64)
- Fix Capacitor 4 migration to prevent duplicates exported=true (Fixes #63)
- Fix for Capacitor 4.0.0 projects which ran --inline which was introduced in 4.1.0

### Version 1.10.6

- Updated the inbuilt Ionic CLI to 6.20.3
- Fix for an project undefined error during the first analysis of a project

### Version 1.10.4

- Fix for Capacitor 3 projects to not include --sync option in sync commands

### Version 1.10.3

- Fix for Capacitor 4 migration and variables.gradle with single quotes
- Fix for Capacitor config files using double quotes

### Version 1.10.1

- Pressing Cmd/Ctrl + R will run the last chosen platform (or run for web)
- Path to ADB added to Settings -> Advanced

### Version 1.9.9

- Fix for Capacitor 4 migration with variables.grade for Camera and other plugins
- Fix for Capacitor 4 migration with NX projects
- Fix for Capacitor 4 migration for users with custom Podfile in iOS
- Fix for Capacitor 4 migration with preinstalled Capacitor 4 plugins

### Version 1.9.5

- Removal recommendation for ionicons removed as it is no longer a peer dependency (due to pnpm bug)
- Protractor deprecation removal removed as the npm package was marked deprecated
- Recommend removal of @ionic-native/contacts
- Fix reporting of dependent plugins on unsupported platforms (blackberry, windows phone)
- If prod builds are set then a cap run will now include the --prod argument

### Version 1.9.4

- Use the inline sync option to allow debugging via Edge/Chrome
- Add Android version numbers to device selection
- Fix to allow Capacitor 4 migration if @capacitor/storage is used

### Version 1.9.3

- Add support for detecting Vite based projects

### Version 1.9.2

- Migration for Capacitor 4 includes splash screen fixes and updated versions for variables gradle

### Version 1.9.0

- Migration for Capacitor 4
- Migration for Capacitor 4 beta to Capacitor 4 official

### Version 1.8.13

- Bundle Id, Version numbers no longer show as blank when only iOS platform is added

### Version 1.8.12

- Add rule for cordova-plugin-android-fingerprint-auth and Identity Vault
- Capacitor 4 migrations now use Beta 2

### Version 1.8.11

- Project Analysis feature added showing Javascript and Asset sizes
- Capacitor 3 to 4 migration feature added
- Recommend install of @awesome-cordova-plugins/core if using a plugin
- Recommend @capacitor/google-maps on Capacitor migration where cordova-plugin-googlemaps is present
- Add generated splash and icon resources to .gitignore when generating for Capacitor
- Fix for retrying builds when a bug is fixed in code and file saved
- Fix incorrect migration of cordova-plugin-push

### Version 1.8.6

- Support for multiple network interfaces with using live reload and external Ip addresses
- Detect malformed package.json and report better error

### Version 1.8.5

- Fix for mono repos that have only non-ionic subjects

### Version 1.8.4

- Option added in Settings -> Advanced to define skipFiles for debugging

### Version 1.8.3

- Fix for splash screen/icon viewing on Windows
- Settings for live reload, external IP and preview in editor now displayed
- Hide progress dialogs for running on iOS and Android
- Fix for mono repos when ionic cli is installed and capacitor sync is called
- Fix for mono repos for projects neither Capacitor or Cordova
- When serving for web, if the External IP address is turned on it will use it
- Animated icons for running tasks

### Version 1.7.9

- Login and Signup are now fixed
- Cordova based Ionic Enterprise plugins are no longer flagged for review

### Version 1.7.5

- Live reload now works with Auth Connect if version is at least v3.9.4

### Version 1.7.4

- Fix to allow Capacitor integrations to web projects by running ionic init

### Version 1.7.3

- Debugging for Android now allows breakpointing source code

### Version 1.6.2

- Support for Lerna
- Prevent focus of the Output Window and switching to Ionic extension
- Report deprecated plugin cordova-plugin-crop and Android 11 compatibility issues

### Version 1.5.14

- Report deprecated packages and plugins
- Report warning on remote dependencies
- Recommend removal of rxjs-compat (as you should migrate v5 to v6+)
- Report Cordova plugins in a Cordova project that cannot be inspected for Capacitor compatibility
- Fix when pressing stop would not stop all created child processes

### Version 1.5.13

- When finishing a debug session for web we now return back to ionic extension and stop running
- Support for Yarn and yarn workspaces
- Support for pnpm and pnpm workspaces
- Extension size has been reduced by 50%

### Version 1.5.8

- Fix for Windows error when ionic cli is not installed globally or locally
- Fix for when ANDROID_HOME or ANDROID_SDK_ROOT is not set in environment variables
- Fix to set default Java Home if not set as an environment variable
- Fix for default folder for Android Debugger Bridge

### Version 1.5.3

- Debugging added for Android devices
- Launch and debug option added for web
- Improved tooltips
- Fix for using an internal Ionic CLI (so commands work even if @ionic/cli not installed globally)
- Detection and recommendations for plugins that depend on other plugins
- Recommendation to replace @ionic/native with @awesome-cordova-plugins
- Handling of older typescript style errors
- Fix for folder based mono-repos and plugin detection

### Version 1.4.4

- Node modules will be installed if missing whenever an operation is started
- Fix to prevent focus changing to the output window while you editing your code during live reload (fixes #29)
- Fix when /bin/sh fails (switches to /bin/zsh)
- Setting added to override the default shell used to run commands

### Version 1.4.3

- Fix for NX monorepos where the app folder is specified in the root property

### Version 1.4.2

- When re-running on iOS or Android the device does not need to be reselected
- For projects not integrated with Ionic automate initialization of custom project with ionic:build and ionic:serve scripts
- If you change your project and click run on iOS/Android it will rebuild the app before running
- Un-displayable Ansi color text is removed from the output window
- Recommendation for Ionic CLI installation to allow Live Reload to work for Ionic projects

### Version 1.4.1

- Add folder style mono repos
- Option to debug for web browser
- Fix for Capacitor project information in a mono repo
- Fix for Add Capacitor integration for non-mono repos

### Version 1.3.2

- Mono Repo Support for npm workspaces
- New Build option selection from Angular configuration
- Fix for "upgrade all packages"
- Fix upgrade to version of package if package is on latest
- Fix when esc is pressed when selecting device
- Fix for Angular migrations when angular/cli is ony installed locally
- Better error message when shell is not set to /bin/zsh

### Version 1.3.1

- Mono Repo Support for Nx
- Recommendation for Capacitor projects to add @capacitor/cli locally
- Add cordova-plugin-ionic to list of plugins working in Capacitor
- Better handling of errors when Node is not installed

### Version 1.2.2

- Error assistance for errors from eslint, typescript, angular/vue/react cli, swift/java, jasmine/jest
- Colorize the output window for warnings, errors, urls
- Angular migration assistant (packages -> @angular -> click lightbulb)
- Option to upgrade all packages in a scope (eg @capacitor)
- Option to upgrade a package to a user chosen version (select ... on a package)
- Migration for Cordova projects using @ionic/angular-toolkit >= v6 (adds @ionic/cordova-builders)
- Migration for Capacitor projects using @ionic/angular-toolkit >= v6 (cleans angular.json)
- Migration to fix Cordova projects when AndroidXEnabled is false or omitted
- Detect projects where minifyEnabled is set to true and @capacitor/android is less than 3.2.3
- Fix for displayed version number when ^ or ~ is used
- Fix for Capacitor commands when @capacitor/cli is not installed
- Fix for malformed node_module package.json files
- Fix to validate application names for new projects

### Version 1.1.5

- Fix for starter projects with React and Vue

### Version 1.1.4

- Add recommendation for required replacement of sentry-cordova for Capacitor
- Fix for projects without ionic/cli local
- Fix for new projects

### Version 1.1.2

- Add ability to ignore recommendations
- Fix for package.json that has a missing name
- Fix to all script running on a vanilla web project
- Fix for handling authentication issue when running npm outdated
- Fix for new Angular projects which listed unavailable Ionic 2/3 starters
- Fix to move codelyzer recommendation into the correct area
- Avoid creating the resources folder if there are no splash/icons set

### Version 1.1.1

- Remove cordova feature now works on Windows
- Bug fix when semver encounters an invalid version
- Installing node modules now shows progress

### Version 1.1.0

- Allow Splash screen and icon to be set (and assets rebuilt)
- Add Capacitor recommendation for cordova-plugin-actionsheet to @capacitor/action-sheet
- Recommendations for codelyzer replacement
- Recommendation for ionicons removal if @ionic/angular used

### Version 1.0.8

- When Auth Connect is detected disable the live reload feature

### Version 1.0.7

- Fix for cocoapods error when run on iOS is called

### Version 1.0.6

- Fix for caching detection of outdated packages
- Common device types can be selected in the Preview App window (select power button)

### Version 1.0.5

- hide commands that are not needed in command palette

### Version 1.0.4

- Actions are logged in the output window when they start and end

### Version 1.0.3

- Fix for Ionic Sign In
- Fix when Visual Studio Code does not have a folder open

### Version 1.0.2

- Scripts moved below Capacitor features

### Version 1.0.1

- Windows support added (fix for creating new Ionic/Capacitor projects)
- Fix for duplicate commands when installed with Microsoft Cordova Tools extension
- Fix to allow setting version numbers to non-semver strings
- Fix for un-required plugin cordova-plugin-add-swift-support is reported twice
- Add recommendation for Capacitor migration for cordova-plugin-firebase-analytics
- Add recommendation for Capacitor migration of removal of cordova-plugin-enable-multidex
- Add cordova-plugin-firebasex to incompatible list for Capacitor
- Add cordova-plugin-swrve to incompatible list for Capacitor
- App title is displayed above the tree view

### Version 1.0.0

- First Release

### Version 0.0.12

- Validation is now done on bundle identifiers, build numbers and version numbers

### Version 0.0.11

- For install/uninstall/update write to output instead of a window that requires closing
- First run for web now shows the preview tab
- Performance improved by caching capacitor project and outdated packages

### Version 0.0.10

- When building/syncing show percentage (eg Building 65%)
- When building Will perform npm install if no node_modules folder present
- Ionic ClI commands are prefixed with npx to ensure that the local cli is used before global
- Scoped packages are placed in a subfolder. Eg @capacitor, @ionic etc
- Packages are sorted alphabetically
- Fix for preview of app in Editor (2 panes opened)
- Add phone layout to web preview with button for app restart

### Version 0.0.9

- Preview app in VS Code Editor added as an option
- Option to install new packages
- Option to uninstall packages
- Allow JAVA_HOME to be set (to allow building with different version of Java)
- Settings are now applied immediately (do not require a refresh)
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
