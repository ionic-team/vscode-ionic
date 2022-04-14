This extension for Visual Studio Code features:

- [Create a Project](#creating-ionic-projects) - Start a project for `Angular`, `React` or `Vue`
- [Run Commands](#creating-ionic-projects) - Such as build, sync, serve and test
- [Run Apps](#running-on-android) - Launch on a real or emulated iOS or Android device
- [Migrate to Capacitor](#capacitor-migration) - Actions and recommendations to migrate from Cordova
- [Find Deprecated Plugins]() - Identify known end of life or deprecated packages and plugins
- [Native Projects Settings](#native-project-settings) - Set Bundle id, display name, version number and build number of the native project
- [Outdated Packages](#upgrading-packages) - Provides easy upgrade to the latest version
  `androidmanifest.xml`
- [Configuration Issues](#upgrading-packages) - Recommends changes to `config.xml` and `androidmanifest.xml`
- [Integrate Capacitor](#adding-capacitor) into web projects
- [Run Scripts](#upgrading-packages) from `package.json`
- [Angular Migrations](#angular-migrations) - Automate Angular version migrations using `ng update`
- [Splash Screen and Icons](#splash-screen-and-icons) - Generate Splash Screen and Icons assets for iOS and Android projects
- [Error Assistant](#error-assistant) - Detect errors in `swift`, `java`, `typescript`, `eslint`, `jasmine` and `jest`
- [Mono Repo Support for Nx](#nx-support) - Support for Capacitor and Ionic Angular/React with Nx and `nxtend.dev`
- [Mono Repo Support for npm workspaces](#npm-workspaces-support) - Support for npm workspaces
- [Mono Repo Support for Folders](#mono-repos-in-folders) - Support for multiple apps in folders
- [Debugging for Web](#debugging-for-web) - Support for debugging via browser (Chrome or Edge)
- [Debugging for Android](#debugging-for-android) - Support for debugging for Android devices
- **Package Managers** - Support for npm, Yarn and Pnpm

## Creating Ionic Projects

- Open an Empty Folder
- Choose a starter project
- Your project will be created ready to run
  ![Video of creating a project](https://user-images.githubusercontent.com/84595830/159510276-6766a5b8-132d-4284-a3fa-cd6374d64891.gif)

## Running on Android

- Choose `Run On Android`
- Select the chosen emulator or connected Android device
- Changes to source code are instantly updated in the app using Live Reload
  ![Video of running on Android](https://user-images.githubusercontent.com/84595830/159510386-5099c8fc-6419-4808-b0d1-15d6a6e46f68.gif)

## Running on iOS

- Choose `Run On iOS`
- Select the chosen simulator or connected iOS device
- Changes to source code are instantly updated in the app using Live Reload
  ![Video of running on iOS](https://user-images.githubusercontent.com/84595830/159510473-f39aed81-f620-4a2d-9b11-ad7c1777e5bb.gif)

## Adding Capacitor

- Choose `Integrate Capacitor`
- Required packages and setup will be applied to your web application or SPA
  ![Video of adding Capacitor](https://user-images.githubusercontent.com/84595830/159510570-b5a151bb-2e17-42c8-8cab-bffbaa849576.gif)

## Upgrading Packages

- Select a package from `Packages` section
- Choose to `Upgrade` or `Install`
- The `Info` option will launch the packages home page on npm
- Select the `Light Bulb` icon next to a scoped package (eg @capacitor) to allow upgrading of all packages

### Upgrade to a particular version

- Find the package to upgrade from the `Packages` section
- Click the `...` icon on the right
- Choose the version from the selection of released versions
  ![Video of upgrading packages](https://user-images.githubusercontent.com/84595830/159510720-e5af0233-064f-4016-91e7-70d5541bfae0.gif)

## Capacitor Migration

- Migrate a Cordova project to Capacitor
- Incompatible plugins are flagged
- Equivalent Capacitor plugins are identified and replaced
- Unrequired plugins are removed
- [Video of migration to Capacitor](https://vs-ionic.netlify.app/videos/cap-migration.gif)

## Native Project Settings

By opening the `Configuration` item you can set native projects settings:

- Change Display Name, Version Number and Build Number.
- A change in settings will be applied to both the iOS and Android project.
- Handles when the iOS and Android settings are deliberately different from each other.
- [Video of Changing Native Project Settings](https://user-images.githubusercontent.com/84595830/159510925-6b989ac4-0ce9-445e-a578-b83b5c4be38f.gif)

## Angular Migrations

- Open the `Packages` section and find `@angular`
- Click the `Light Bulb` icon
- Choose an `Upgrade` option of either the next or latest version
- `ng update` will be used to update your Angular dependencies and perform automated code migrations
- Follow up with manual steps documented at [update.angular.io](https://update.angular.io/)
- [Video of Angular Migration](https://user-images.githubusercontent.com/84595830/159511018-f9ba0c20-d407-4a5b-b8a4-32cf6296f143.mp4)

## Ionic Angular Toolkit Migration

Performs migrations related to upgrading to v6+ of `@ionic/angular-toolkit`:

- Adds `ionic/cordova-builders` to Cordova projects using `@ionic/angular-toolkit` version 6+
- Removes `ionic/cordova-builders` from Capacitor projects (usually migrated from Cordova)
- Removes `ionic-cordova-build` and `ionic-cordova-serve` sections in `angular.json` in Capacitor Projects
- [Video of Angular Toolkit Migration](https://user-images.githubusercontent.com/84595830/159511121-6db2eb5f-7663-42b3-af9a-9e90d8040ccb.gif)

## Splash Screen and Icons

A splash screen and icon image can be set:

- The package `cordova-res` will be installed as a dev dependency
- Images will be generated by resizing for various iOS and Android sizes
- These images will be included as part the native projects
- Allows setting of [Adaptive Icons](https://github.com/ionic-team/capacitor-assets#adaptive-icons) which are used by Android

## Error Assistant

Detects errors in `swift`, `java`, `typescript`, `eslint`, `jasmine` and `jest` files after operations.

- Opens the place in code where the error occurs
- Allows navigation to `next` and `previous` errors
- Re-runs the operation when you correct the problem and save the file

## Nx Support

Detects a Nx workspace and provides a Nx Project selector for `apps`. When an Nx project is selected menu options will reflect what the project is capable of (eg running a native iOS or Android app). The `scripts` section will also include the common Nx commands for `build`, `test`, `lint` and `e2e`.

Note: The extension only provides support for node package upgrades at the root of your Nx workspace.

- [Video of Nx Workspace](https://user-images.githubusercontent.com/84595830/159509969-70a0c5ed-aebd-4d9d-9691-426675be93f6.mp4)

## Mono Repos in Folders

Detects a workspace where subfolders contain Ionic applications and provides a project selector.

## Npm Workspaces Support

Detects when npm workspaces are used as part of a mono repo and provides a project selector.

## Debugging for Web

For debugging (adding breakpoints, inspecting variables and seeing console logging) use the options under the `Debug` folder.
Debugging for web will launch a seperate web browser instance that is debuggable (Google Chrome by Default). You can also choose Microsoft Edge from the `settings` option.

## Debugging for Android

Debugging for Android can be done by first running for Android. Any web view instances found will appear under the `Debug` folder. This allows any in-app browser instances to also be debugged.
For the best experience ensure the Ionic CLI is installed and Live Reload is turned on (in `Settings`), this will allow breakpoints to be set. Without Ionic's Live Reload you will need to inline sourcemaps to be able set breakpoints in code.

## Debugging for iOS

Debugging for iOS is not supported yet. Use Safari's debugging options documented [here](https://ionicframework.com/docs/troubleshooting/debugging#ios-and-safari).

## Submit Feedback

[File an issue](https://github.com/ionic-team/vscode-extension/issues) to provide feedback on bugs and feature requests.
