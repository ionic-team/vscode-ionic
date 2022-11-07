# ToDo

## Features

- See tslint.json and angular 12+ then link to https://ionicframework.com/blog/eslint-for-ionic-angular/ for migration
- Show git remote url somewhere (git config --get remote.origin.url)
- Clicking build should clear output window

- Listing recent appflow builds and allowing users to sideload the artifacts from those builds onto their simulators/devices (lots of potential cert issues with iOS here)

- Augmenting the New Project functionality to create the app in appflow and begin with the project linked, similar to the Ionic App Wizard
  Starting an appflow trial directly from the extension… thinking a 1-click experience to install AC/IV/etc

- Bug - For a regular Angular app where in angular.json the project has been renamed from app to say fuse the build command fails.

- (2) For mono-repos include root package.json scripts
- (1) Add .vs-code/extensions.json to recommend Ionic extension on starters (pr: https://github.com/ionic-team/starters/pull/1720)
- (1) Getting devices takes some time to run the first time. Make sure logging goes to Output window and if taking > 5 seconds then give user feedback that it may take time
- (32) Debugging for iOS
- (2) If you sync but the build didnt work then show suitable error (or trigger build)
- (2) If a project has not been built and you try running on ios/android it could build for you beforehand
- (2) Show gotchas page for Angular migration x to x+1
- (2) For web based projects have "Run on Web" under an Ionic Project
- (2) On Web projects that are Angular based hook up dist or configured folder
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

- (bug) Debugging with Android web view without live reload doesnt allow breakpoints (see https://ionic-cloud.atlassian.net/browse/WN-391)
- (bug) Bug capturing of inspection with telemetry reporting on exception
- (bug) On a new project - see if it can be built in current directory otherwise git history is messed up when it moves the folder.
- (bug) Bundle id validate doesnt accept "stuff"

## Docs

- (docs) Record video of previewing in editor
- (docs) Video of splashscreen and icon assets

# Large Feature Requests

- (feat) Debugger for iOS (add breakpoints, inspection etc)
- (feat) Build to ipa/apk/aab option - select options for keystore/password etc
- (feat) Use npm audit to list vulnerable packages
- (feat) info.plist editing
- (feat) Tool to capture plugins, cap community and paid plugins, evaluate (rank on archived, stars etc) and capture in json. Then use as part of an option to install known good plugins
- (feat) Twitter to RSS feed - pull news into plugin ??

# Support For NX

- (bug) Package reconciliation (from root and project)
- (feat) Needs lint, test and e2e nx tasks added (assuming @nxtend/ionic-angular)
- (feat) Detect missing @nxtend/ionic-angular or @nxtend/ionic-react. Option to add
- (feat) Detect missing @nxtend/capacitor. Option to add
- Starters for NX?

# Remote Logging Issues

- Need this in capacitor config to allow Remote Logging to work: server: { cleartext: true }
- Add for React and Vue

# Remote logging 2:

Angular process:
Instead of writing into index.html
Add to angular.json:

```json
            "scripts": [
              {
                "input": "stuff/script.js"
              }
            ],
```
