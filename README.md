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

## Creating Ionic Projects
- Open an Empty Folder
- Choose a starter project
- Your project will be created ready to run
![Video of creating a project](https://vs-ionic.netlify.app/videos/new-project.gif)

## Running on Android
- Choose `Run On Android`
- Select the chosen emulator or connected Android device
- Changes to source code are instantly updated in the app using Live Reload
![Video of running on Android](https://vs-ionic.netlify.app/videos/run-on-android.gif)

## Running on iOS
- Choose `Run On iOS`
- Select the chosen simulator or connected iOS device
- Changes to source code are instantly updated in the app using Live Reload
![Video of running on iOS](https://vs-ionic.netlify.app/videos/run-on-ios.gif)

## Adding Capacitor
- Choose `Integrate Capacitor`
- Required packages and setup will be applied to your web application or SPA
![Video of adding Capacitor](https://vs-ionic.netlify.app/videos/web-native.gif)

## Upgrading Packages
- Select a package from `Packages` section
- Choose to `Upgrade` or `Install`
- The `Info` option will launch the packages home page on npm
![Video of upgrading packages](https://vs-ionic.netlify.app/videos/upgrade-packages.gif)

## Capacitor Migration
- Migrate a Cordova project to Capacitor
- Incompatible plugins are flagged
- Equivalent Capacitor plugins are identified and replaced
- Unrequired plugins are removed
![Video of migrating to Capacitor](https://vs-ionic.netlify.app/videos/cap-migration.gif)

## Native Project Settings
By opening the `Configuration` item you can set a projects Display Name, Version Number and Build Number. A change in settings will be applied to both the iOS and Android project.

## Submit Feedback
[File an issue](https://github.com/ionic-team/vscode-extension/issues) to provide feedback on bugs and feature requests.



