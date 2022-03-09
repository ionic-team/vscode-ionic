# ToDo

## Features
- (feat) From packages have the option to update to any particular version found with `npm view package versions`
- (feat) Option to hide particular recommendations
- (feat) For web based projects have "Run on Web" under an Ionic Project
- (feat) On Web projects that are Angular based hook up dist or configured folder
- (feat) Support @angular project upgrades (ie multiple package update)
- (feat) Recommend: Capacitor 2 to 3 migration
- (feat) Recommend applying exact version numbers in package.json rather than ~ or ^
- (feat) Allow add of plugins: list all official capacitor, ionic enterprise, supported plugins
- (feat) If using say @capacitor/camera then allow editing of info.plist and Android permissions (highlight if empty)
- (feat) When running for web, if you close the browser, a button for "Open Browser" should allow opening it again. 
- (feat) Add "Build", "Sync", "Run" etc to commmand palette with keyboard shortcut
- (feat) Show preview as soon as "Run on Web" is clicked and show progress until app is ready

## Performance
- (perf) Only run capacitor config commands when "Configuration" is expanded

## Bugs
- (bug) Creating a new Ionic project should allow changing version number/bundleid (see bug WN-276 in Capacitor project)

## Docs
- (docs) Record video of changing display name, bundle id, version number, build number
- (docs) Record video of previewing in editor

# Milestones
- (feat) Bundle Analyser button, use stats.json for own report
- (feat) Capture console/network etc https://medium.com/swlh/chrome-dev-tools-protocol-2d0ef2baf4bf
  - See chrome-remote-interface for debugging with Chrome/Edge/Firefox/Android
- (feat) Debugger for browser, iOS and Android (add breakpoints, inspection etc)
- (feat) Use npm audit to list vulnerable packages
- (feat) info.plist editing

- (feat) Splash screen and icon setting
  - Red Icon for missing, Checkmark for set
  - On splashscreen but missing Icon just show message rather then rebuild
  - On setting default for Icon show message about adaptive icons
  - Rebuild button if assets are set ??
  - Group for Splash Screen, Icon
  - Size of files ??
  - Pixel size ??

# Known Issues
- Colorization of the output window is not supported in VS Code Extensions
- Badge option is not available for VS Code Extensions
- Show icon change when running is not supported by treeview without full refresh
- links to external content cannot open in VS Code editor window (must be browser)