# Roadmap

x Report bug: in `iOS` the `.gitignore` needs to ignore the `App/output` folder

- (feat) Coding standards;: Review
  https://github.com/ionic-team/prettier-config
  https://github.com/ionic-team/eslint-config

- (feat) Use https://stackoverflow.com/a/22040887 for Android and dont use Julios SSL plugin
- (feat) Open in Editor as web site
- (feat) Dark/Light mode (add 'dark' to class of body)
- (feat) Rotate device
- (feat) Support flavors and schemes using the CLI
- (feat) Preview in Editor - Show Device Name with Check mark
- (feat) Editor preview - option to rotate
- (feat) Editor preview - dark / light mode switch
- (fix) Remote logging for android turn on clearText
- (feat) Run > Web - Change label to Run > Editor
- (fix) On a Stencil project selecting run in editor doesn't seem to work
- (fix) If upgrading/changing a package then make sure dev server is stopped
- (fix) For a regular Angular project that is in a subfolder it reports not finding www folder when running npx cap copy. But dist exists and the extension can correct that in capacitor.config.ts. The dist folder may be separated by app too so dist/my-app may be where the index.html is located
- (fix) When running on web for regular Angular app it doesn't launch the browser

## Ditch Ionic CLI

- Check `package.json` for missing `name` and `version` and set if needed
- Avoid `ionic init` and instead guess best npm run script based on `package.json` having React,Vue,Nuxt etc.
- Guess `dist` folder based on `package.json`
- Guess IP Address, Port based on logged output

## View Style

- Run iOS, Android - Show lists of devices and option to run as live reload
- Splash, Icon, Settings - Named Configuration allow visuals
- Plugins - Allow checkboxes for functionality with groups Official, Community
- Support - Link for feedback, framework, each of the components
- Angular - New components, Show existing pages, components, and settings files

## QR Preview

- Button on Toolbar for Build
- Button on Toolbar for Run Web, Run iOS, Run Android
- Option to hide logs that aren't errors
- Click QR Code to display "Use the 'Capacitor View' App to open this application
- Use this to add QR Code / Webview in side panel:
  https://stackoverflow.com/questions/67150547/vs-code-extension-how-to-add-a-webviewpanel-to-the-sidebar

## Angular Generate

- Switch to standalone components (one SCAM at a time then the base app module)

## Use Capacitor Assets

- Switch from cordova-res to capacitor/assets for splash and icon generation
- need to have logo.png and logo-dark.png, icon background color, icon background color dark, splash background color, splash background color dark as a set of minimum options
- option to switch to custom mode with icon and splash
- generate will do ios, android and pwa

## Certificates

- Certificate setup for Windows (for Live Reload with HTTPS)
- Handle scenario where openssl is not installed
- SSL options for non-angular projects
- Add document on Live Reload with https
- (fix) - Add removal of `@jcesarmobile/ssl-skip` as recommendation

### Android Trust Issues

- Android ([info](https://github.com/react-native-webview/react-native-webview/issues/2147))
- May need an intermediate cert ([info](https://developer.android.com/training/articles/security-ssl))

## Features

- If you add a @capacitor/plugin then sync should be done as well
- See `tslint.json` and angular 12+ then link to [blog](https://ionicframework.com/blog/eslint-for-ionic-angular/) for migration
- Show git remote url somewhere (`git config --get remote.origin.url`)
- Detect plugins/platforms folders in a capacitor project and recommend removal
- Listing recent Appflow builds and allowing users to sideload the artifacts from those builds onto their simulators/devices (lots of potential cert issues with iOS here)

- Augmenting the New Project functionality to create the app in appflow and begin with the project linked, similar to the Ionic App Wizard
  Starting an appflow trial directly from the extension… thinking a 1-click experience to install AC/IV/etc
- (feat) Debugger for iOS (add breakpoints, inspection etc)
- (feat) info.plist editing
- (feat) Tool to capture plugins, cap community and paid plugins, evaluate (rank on archived, stars etc) and capture in json. Then use as part of an option to install known good plugins
- (feat) Twitter to RSS feed - pull news into plugin ??
- (1) Getting devices takes some time to run the first time. Make sure logging goes to Output window and if taking > 5 seconds then give user feedback that it may take time
- (32) Debugging for iOS
- (2) If you sync but the build didn't work then show suitable error (or trigger build)
- (2) If a project has not been built and you try running on ios/android it could build for you beforehand
- (2) Show gotchas page for Angular migration x to x+1
- (2) For web based projects have "Run on Web" under an Ionic Project
- (2) On Web projects that are Angular based hook up dist or configured folder
- (4) Recommend applying exact version numbers in package.json rather than ~ or ^
- (16) Allow add of plugins: list all official capacitor, ionic enterprise, supported plugins
- (16) If using say @capacitor/camera then allow editing of info.plist and Android permissions (highlight if empty)
- (4) When running for web, if you close the browser, a button for "Open Browser" should allow opening it again.
- (8) Show preview as soon as "Run on Web" is clicked and show progress until app is ready
- (8) Amp eslint rules to 11: using https://gist.github.com/dtarnawsky/7c42cec330443c7093976136286b5473
- (8) Evaluate age of packages: when current version was released, when latest was released. If latest > 365 then warn. If latest - current > 365 then warn
- (4) Highlight dev dependencies in some way
- (4) Check for leftover platforms and plugins folders when removing cordova or when capacitor is detected
- (4) Detect if Android Studio not installed

## Performance

- (perf) Only run capacitor config commands when "Configuration" is expanded

## Bugs

- (bug) Bug capturing of inspection with telemetry reporting on exception
- (bug) On a new project - see if it can be built in current directory otherwise git history is messed up when it moves the folder.

## Support For NX

- (bug) Package reconciliation (from root and project)
- (feat) Needs lint, test and e2e nx tasks added (assuming @nxtend/ionic-angular)
- (feat) Detect missing @nxtend/ionic-angular or @nxtend/ionic-react. Option to add
- (feat) Detect missing @nxtend/capacitor. Option to add
- Starters for NX?

## Dependency Errors

From what I see in Discord and many ZD tickets, errors like this completely stump people on a daily basis:

```shell
npm i @capacitor-community/sqlite@3.3.3-2
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR!
npm ERR! While resolving: ___-_____@0.0.1
npm ERR! Found: @capacitor/core@4.6.3
npm ERR! node_modules/@capacitor/core
npm ERR!   @capacitor/core@"4.6.3" from the root project
npm ERR!
npm ERR! Could not resolve dependency:
npm ERR! peer @capacitor/core@"^3.3.3" from @capacitor-community/sqlite@3.3.3-2
npm ERR! node_modules/@capacitor-community/sqlite
npm ERR!   @capacitor-community/sqlite@"3.3.3-2" from the root project
npm ERR!
npm ERR! Fix the upstream dependency conflict, or retry
npm ERR! this command with --force, or --legacy-peer-deps
npm ERR! to accept an incorrect (and potentially broken) dependency resolution.
```

Where the error could read:
`v3.3.3-2 of @capacitor-community/sqlite does not work with your project because you are using v4 of @capacitor/core (it only supports v3). Find a version of @capacitor-community/sqlite that works with @capacitor/core v4 or file an issue.`
