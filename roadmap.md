# ToDo

## Features
- (1) Add .vs-code/extensions.json to recommend Ionic extension on starters
- (16) Folder based monorepo style
- (4) Conference starter is using Cordova, probably should be using Capacitor
- (2) If you sync but the build didnt work then show suitable error (or trigger build)
- (2) If a project has not been built and you try running on ios/android it could build for you beforehand
- (2) @ionic/native should move to @awesome-cordova-plugins
- (4) Add ionic:build -> npm run build script for Vue if you get "Since you're using the Vue project type, you must provide the ionic:build npm script so the Ionic CLI can build your project."
- (2) Show gotchas page for Angular migration x to x+1
- (2) For web based projects have "Run on Web" under an Ionic Project
- (2) On Web projects that are Angular based hook up dist or configured folder
- (2) Recommend: Capacitor 2 to 3 migration
- (4) Recommend applying exact version numbers in package.json rather than ~ or ^
- (16) Allow add of plugins: list all official capacitor, ionic enterprise, supported plugins
- (16) If using say @capacitor/camera then allow editing of info.plist and Android permissions (highlight if empty)
- (4) When running for web, if you close the browser, a button for "Open Browser" should allow opening it again. 
- (4) Add "Build", "Sync", "Run" etc to commmand palette with keyboard shortcut
- (8) Show preview as soon as "Run on Web" is clicked and show progress until app is ready
- (16) Option to export package/plugin list: version, latest, and dev dep or regular dep
- (8) Amp eslink rules to 11: using https://gist.github.com/dtarnawsky/7c42cec330443c7093976136286b5473
- (8) Evaluate age of packages: when current version was released, when latest was released. If latest > 365 then warn. If latest - current > 365 then warn
- (4) Highlight dev dependencies in some way
- (8) Open selection of an update check versions and provide option to update to the latest minor version. Eg 12.1 -> 12.x or 12.1.0 -> 12.1.x
- (4) Check for leftover platforms and plugins folders when removing cordova or when capacitor is detected
- (4) Detect if Android Studio not installed

## Performance
- (perf) Only run capacitor config commands when "Configuration" is expanded

## Bugs
- (bug) Handle scenarios where npx/npm cannot be found (eg bash)
- (bug) Bug capturing of inspection with telemetry reporting on exception
- (bug) On a new project - see if it can be built in current directory otherwise git history is messed up when it moves the folder.
- (bug) Bundle id validate doesnt accept "stuff"
- (bug) Creating a new Ionic project should allow changing version number/bundleid (see bug WN-276 in Capacitor project)
- (feat) cordova-plugin-file is required if you install cordova-plugin-advanced-http (inspect plugin.xml)

## Docs
- (docs) Record video of previewing in editor
- (docs) Video of splashscreen and icon assets

# Large Feature Requests
- (feat) nx support
- (feat) Capture console/network etc https://medium.com/swlh/chrome-dev-tools-protocol-2d0ef2baf4bf
  - See chrome-remote-interface for debugging with Chrome/Edge/Firefox/Android
- (feat) Debugger for browser, iOS and Android (add breakpoints, inspection etc)
- (feat) Bundle Analyser button, use stats.json for own report
- (feat) Use npm audit to list vulnerable packages
- (feat) info.plist editing
- (feat) pnpm support
- (feat) pnpm monorepo support
- (feat) lerna support
- (feat) Tool to capture plugins, cap community and paid plugins, evaluate (rank on archived, stars etc) and capture in json. Then use as part of an option to install known good plugins
- (feat) Review output folder www and report any assets that are too large (eg photos that are png etc)
- (feat) Twitter to RSS feed - pull news into plugin ??

# Known Issues
- Badge option is not available for VS Code Extensions
- links to external content cannot open in VS Code editor window (must be browser)

# MonoRepo Tools
Usage based on 2021.stateofjs.com:
- Lerna - 25%
- Yarn Workspaces - 25%
- npm workspaces - 18%
- pnpm - 13%
- nx - 13%
- Turborepo - 3%
- Yalc - 2%
- Rush - 2%

### Js Painpoints
- Managing Dependies, Code Architecture, State Management, Debugging...


# Support For NX
- (bug) Package reconciliation (from root and project)
- (feat) Needs lint, test and e2e nx tasks added (assuming @nxtend/ionic-angular)
- (feat) Detect missing @nxtend/ionic-angular or @nxtend/ionic-react. Option to add
- (feat) Detect missing @nxtend/capacitor. Option to add

- Starters for NX?

# Support for pnpm
- See: https://github.com/reslear/ionic-vue-pnpm-monorepo

# Browser Debugging
- When url is known and debug is turned on:
- use no-open
- update launch.json with config
- run vscode.command.executeCommand

