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
- (feat) Option to export package/plugin list: version, latest, and dev dep or regular dep
- (feat) Highlight dev dependencies in some way
- (feat) Option to ignore particular update
- (feat) Evaluate age of packages: when current version was released, when latest was released. If latest > 365 then warn. If latest - current > 365 then warn
- (feat) Amp eslink rules to 11: using https://gist.github.com/dtarnawsky/7c42cec330443c7093976136286b5473
- (feat) Open selection of an update check versions and provide option to update to the latest minor version. Eg 12.1 -> 12.x or 12.1.0 -> 12.1.x

## Performance
- (perf) Only run capacitor config commands when "Configuration" is expanded

## Bugs
- (bug) Bug capturing of inspection with telemetry reporting on exception
- (bug) On a new project - see if it can be built in current directory otherwise git history is messed up when it moves the folder.
- (bug) Bundle id validate doesnt accept "stuff"
- (bug) Creating a new Ionic project should allow changing version number/bundleid (see bug WN-276 in Capacitor project)
- (bug) If a project has not been built and you try running on ios/android it could build for you beforehand
- (bug) Detect if Android Studio not installed


## Docs
- (docs) Record video of changing display name, bundle id, version number, build number
- (docs) Record video of previewing in editor
- (docs) Show splashscreen and icon assets

# Milestones
- (feat) Bundle Analyser button, use stats.json for own report
- (feat) Capture console/network etc https://medium.com/swlh/chrome-dev-tools-protocol-2d0ef2baf4bf
  - See chrome-remote-interface for debugging with Chrome/Edge/Firefox/Android
- (feat) Debugger for browser, iOS and Android (add breakpoints, inspection etc)
- (feat) Use npm audit to list vulnerable packages
- (feat) info.plist editing
- (feat) pnpm support
- (feat) pnpm monorepo support
- (feat) nx support
- (feat) lerna support

# Known Issues
- Colorization of the output window is not supported in VS Code Extensions
- Badge option is not available for VS Code Extensions
- Show icon change when running is not supported by treeview without full refresh
- links to external content cannot open in VS Code editor window (must be browser)