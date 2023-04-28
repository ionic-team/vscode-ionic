import { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as vscode from 'vscode';
import { exists, isVersionGreaterOrEqual } from './analyzer';
import { showOutput, writeError, writeIonic } from './logging';
import { npmInstall, npmUninstall } from './node-commands';
import { Project } from './project';
import { getStringFrom, run, setAllStringIn, showProgress } from './utilities';
import { capacitorSync } from './capacitor-sync';
import { ActionResult } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { PackageManager } from './node-commands';
import { openUri } from './utilities';
import { capacitorOpen } from './capacitor-open';
import { CapacitorPlatform } from './capacitor-platform';

export async function migrateCapacitor5(project: Project, currentVersion: string): Promise<ActionResult> {
  const coreVersion = '5.0.0-beta.1';
  // Android Studio Flamingo is Build #AI-222.4459.24.2221.9862592, built on March 31, 2023
  const openStudio = 'Open Android Studio';
  if (exists('@capacitor/android') && !checkAndroidStudio('222.4459.24')) {
    const res = await vscode.window.showInformationMessage(
      `Android Studio Flamingo (2022.2.1) is the minimum version needed for Capacitor 5 (It comes with Java 17 and Gradle 8). Choosen Android Studio > Check for Updates.`,
      openStudio,
      'Continue...'
    );
    if (res === openStudio) {
      await run(project.folder, capacitorOpen(project, CapacitorPlatform.android), undefined, [], undefined, undefined);
      return;
    }
    if (!res) return;
  }
  const result = await vscode.window.showInformationMessage(
    `Capacitor 5 sets a deployment target of iOS 13 and Android 13 (SDK 33).`,
    'Migrate to v5',
    'Ignore'
  );
  if (result == 'Ignore') {
    return ActionResult.Ignore;
  }
  if (!result) {
    return;
  }
  await showProgress('Migrating to Capacitor 5 beta...', async () => {
    await project.run2(npmInstall(`@capacitor/cli@${coreVersion} --save-dev --force`));
    const manager = getPackageManager(ionicState.packageManager);
    await project.run2(`npx cap migrate --noprompt --packagemanager=${manager}`);
    writeIonic('Capacitor 5 Migration Completed.');
    showOutput();
  });
  const message = `Migration to Capacitor 5 is complete. You can also read about the changes in Capacitor 5.`;
  if ((await vscode.window.showInformationMessage(message, 'Capacitor 5 Changes', 'OK')) == 'Capacitor 5 Changes') {
    openUri('https://capacitorjs.com/docs/next/updating/5-0');
  }
}

function checkAndroidStudio(minVersion: string): boolean {
  // This returns true if the installed version of Android Studio meets the minimum version
  try {
    const studioFile = `/Applications/Android Studio.app/Contents/Resources/product-info.json`;
    if (existsSync(studioFile)) {
      const data = readFileSync(studioFile, 'utf-8');
      const info: AndroidStudioInfo = JSON.parse(data);
      const build = info.buildNumber;
      const v = build.split('.');
      const version = `${v[0]}.${v[1]}.${v[2]}`;
      return isVersionGreaterOrEqual(version, minVersion);
    }
  } catch (error) {
    writeError(`Unable to check Android Studio Version ${error}`);
    return true;
  }
  return true;
}

export interface AndroidStudioInfo {
  buildNumber: string;
  customProperties: any[];
  dataDirectoryName: string;
  launch: any;
  name: string;
  productCode: string;
  svgIconPath: string;
  version: string;
}

export async function migrateCapacitor(project: Project, currentVersion: string): Promise<ActionResult> {
  const coreVersion = '^4.0.1';
  const pluginVersion = '^4.0.1';

  const daysLeft = daysUntil(new Date('11/01/2022'));
  let warning = `Google Play Store requires a minimum target of SDK 31 by 1st November 2022`;
  if (daysLeft > 0) {
    warning += ` (${daysLeft} days left)`;
  }
  const result = await vscode.window.showInformationMessage(
    `Capacitor 4 sets a deployment target of iOS 13 and Android 12 (SDK 32). ${warning}`,
    'Migrate to v4',
    'Ignore'
  );
  if (result == 'Ignore') {
    return ActionResult.Ignore;
  }
  if (!result) {
    return;
  }

  await showProgress(`Migrating to Capacitor 4`, async () => {
    try {
      let replaceStorage = false;
      if (exists('@capacitor/storage')) {
        await project.run2(npmUninstall(`@capacitor/storage --force`));
        replaceStorage = true;
      }
      if (exists('@capacitor/cli')) {
        await project.run2(npmInstall(`@capacitor/cli@4 --save-dev --force`));
      }
      await project.run2(
        install(
          ['@capacitor/core', '@capacitor/ios', '@capacitor/android', '@capacitor/cli'],
          [
            '@capacitor/action-sheet',
            '@capacitor/app',
            '@capacitor/app-launcher',
            '@capacitor/browser',
            '@capacitor/camera',
            '@capacitor/clipboard',
            '@capacitor/device',
            '@capacitor/dialog',
            '@capacitor/filesystem',
            '@capacitor/geolocation',
            '@capacitor/google-maps',
            '@capacitor/haptics',
            '@capacitor/keyboard',
            '@capacitor/local-notifications',
            '@capacitor/motion',
            '@capacitor/network',
            '@capacitor/push-notifications',
            '@capacitor/screen-reader',
            '@capacitor/share',
            '@capacitor/splash-screen',
            '@capacitor/status-bar',
            '@capacitor/text-zoom',
            '@capacitor/toast',
          ],
          coreVersion,
          pluginVersion
        )
      );

      if (replaceStorage) {
        await project.run2(npmInstall(`@capacitor/preferences@${pluginVersion}`));
        writeIonic('Migrated @capacitor/storage to @capacitor/preferences.');
      }

      if (exists('@capacitor/ios')) {
        // Set deployment target to 13.0
        updateFile(
          project,
          join('ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
          'IPHONEOS_DEPLOYMENT_TARGET = ',
          ';',
          '13.0'
        );

        // Update Podfile to 13.0
        updateFile(project, join('ios', 'App', 'Podfile'), `platform :ios, '`, `'`, '13.0');
        patchPodFile(join(project.projectFolder(), 'ios', 'App', 'Podfile'));

        // Remove touchesBegan
        updateFile(project, join('ios', 'App', 'App', 'AppDelegate.swift'), `override func touchesBegan`, `}`);

        // Remove NSAppTransportSecurity
        removeKey(join(project.projectFolder(), 'ios', 'App', 'App', 'info.plist'), 'NSAppTransportSecurity');

        // Remove USE_PUSH
        replacePush(join(project.projectFolder(), 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'));

        // Remove from App Delegate
        removeInFile(join(project.projectFolder(), 'ios', 'App', 'App', 'AppDelegate.swift'), `#if USE_PUSH`, `#endif`);
      }

      if (exists('@capacitor/android')) {
        // AndroidManifest.xml add attribute: <activity android:exported="true"
        updateAndroidManifest(join(project.projectFolder(), 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));

        // Update styles.xml for SplashScreen
        updateStyles(join(project.projectFolder(), 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml'));

        // Update build.gradle
        updateBuildGradle(join(project.projectFolder(), 'android', 'build.gradle'));
        updateAppBuildGradle(join(project.projectFolder(), 'android', 'app', 'build.gradle'));

        // Update MainActivity.java
        updateMainActivity(join(project.projectFolder(), 'android', 'app', 'src', 'main'));

        // Update gradle-wrapper.properties
        updateGradleWrapper(join(project.projectFolder(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties'));

        // Update .gitIgnore
        updateGitIgnore(join(project.projectFolder(), 'android', '.gitignore'), [
          `# Generated Config files`,
          `app/src/main/assets/capacitor.config.json`,
          `app/src/main/assets/capacitor.plugins.json`,
          `app/src/main/res/xml/config.xml`,
        ]);

        // Update .gitIgnore
        updateGitIgnore(join(project.projectFolder(), 'ios', '.gitignore'), [
          `# Generated Config files`,
          `App/App/capacitor.config.json`,
          `App/App/config.xml`,
        ]);

        // Variables gradle
        const variables = {
          minSdkVersion: 22,
          compileSdkVersion: 32,
          targetSdkVersion: 32,
          coreSplashScreenVersion: '1.0.0',
          androidxWebkitVersion: '1.4.0',
          androidxActivityVersion: '1.4.0',
          androidxAppCompatVersion: '1.4.2',
          androidxCoordinatorLayoutVersion: '1.2.0',
          androidxCoreVersion: '1.8.0',
          androidxFragmentVersion: '1.4.1',
          junitVersion: '4.13.2',
          androidxJunitVersion: '1.1.3',
          androidxEspressoCoreVersion: '3.4.0',
          cordovaAndroidVersion: '10.1.1',
          androidxMaterialVersion: '1.6.1',
          androidxBrowserVersion: '1.4.0',
          firebaseMessagingVersion: '23.0.5',
          playServicesLocationVersion: '20.0.0',
          androidxExifInterfaceVersion: '1.3.3',
        };

        for (const variable of Object.keys(variables)) {
          if (
            !updateFile(
              project,
              join('android', 'variables.gradle'),
              `${variable} = '`,
              `'`,
              variables[variable].toString(),
              true
            )
          ) {
            if (
              !updateFile(
                project,
                join('android', 'variables.gradle'),
                `${variable} = `,
                `\n`,
                addQuotes(variables[variable].toString()),
                true
              )
            ) {
              // Add variables if they are in the core list of required ones
              if (
                [
                  'coreSplashScreenVersion',
                  'cordovaAndroidVersion',
                  'androidxCoordinatorLayoutVersion',
                  'androidxCoordinatorLayoutVersion',
                  'androidxFragmentVersion',
                  'androidxActivityVersion',
                ].includes(variable)
              ) {
                updateVariablesGradle(
                  join(project.projectFolder(), 'android', 'variables.gradle'),
                  variable,
                  variables[variable].toString()
                );
              }
            }
          }
        }
      }

      // Ran Cap Sync
      await project.run2(capacitorSync(project), true);

      writeIonic('Capacitor 4 Migration Completed.');

      writeBreakingChanges();
      showOutput();
      const message = `Migration to Capacitor ${coreVersion} is complete. Run and test your app!`;

      vscode.window.showInformationMessage(message, 'OK');
    } catch (err) {
      writeError(`Failed to migrate: ${err}`);
    }
  });
}

function getPackageManager(manager: PackageManager): string {
  switch (manager) {
    case PackageManager.npm:
      return 'npm';
    case PackageManager.pnpm:
      return 'pnpm';
    case PackageManager.yarn:
      return 'yarn';
    default:
      writeError(`Unknown package manager ${manager}`);
  }
}

function addQuotes(value: string): string {
  if (value && value.includes('.')) {
    return `'${value}'`;
  }
  return value;
}

function writeBreakingChanges() {
  const breaking = [
    '@capacitor/storage',
    '@capacitor/camera',
    '@capacitor/push-notifications',
    '@capacitor/local-notifications',
  ];
  const broken = [];
  for (const lib of breaking) {
    if (exists(lib)) {
      broken.push(lib);
    }
  }
  if (broken.length > 0) {
    writeIonic(
      `IMPORTANT: Review https://capacitorjs.com/docs/updating/4-0#plugins for breaking changes in these plugins that you use: ${broken.join(
        ', '
      )}.`
    );
  } else {
    writeIonic('IMPORTANT: Review https://capacitorjs.com/docs/updating/4-0 for optional manual updates.');
  }
  if (exists('@capacitor/android')) {
    writeIonic(
      'Warning: The Android Gradle plugin was updated and it requires Java 11 to run (included with Android Studio). You may need to select this in Android Studio (Preferences > Build, Execution, Deployment > Build Tools > Gradle).'
    );
  }
}

function updateVariablesGradle(filename: string, variable: string, value: string) {
  let txt = readFile(filename);
  if (!txt) {
    return;
  }

  txt = txt.replace('}', `    ${variable}='${value}'\n}`);
  writeFileSync(filename, txt, 'utf-8');
  writeIonic(`Migrated variables.gradle by adding ${variable} = ${value}.`);
}

function updateAndroidManifest(filename: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }

  // AndroidManifest.xml add attribute: <activity android:exported="true"
  const activity = getStringFrom(txt, '<activity', '>');
  if (activity.includes('android:exported="')) {
    return;
  }

  const replaced = setAllStringIn(txt, '<activity', ' ', ' android:exported="true"');
  if (txt == replaced) {
    writeError(`Unable to update Android Manifest. Missing <activity> tag`);
    return;
  }
  writeFileSync(filename, replaced, 'utf-8');
  writeIonic(`Migrated AndroidManifest.xml by adding android:exported attribute to Activity.`);
}

function removeKey(filename: string, key: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  let lines = txt.split('\n');
  let removed = false;
  let removing = false;
  lines = lines.filter((line) => {
    if (removing && line.includes('</dict>')) {
      removing = false;
      return false;
    }
    if (line.includes(`<key>${key}</key`)) {
      removing = true;
      removed = true;
    }
    return !removing;
  });

  if (removed) {
    writeFileSync(filename, lines.join('\n'), 'utf-8');
    writeIonic(`Migrated info.plist by removing  ${key} key.`);
  }
}

function updateMainActivity(path: string) {
  function findFilesInDir(startPath: string, filter: string) {
    let results = [];
    if (!existsSync(startPath)) {
      return;
    }

    const files = readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
      const filename = join(startPath, files[i]);
      const stat = lstatSync(filename);
      if (stat.isDirectory()) {
        results = results.concat(findFilesInDir(filename, filter)); //recurse
      } else if (filename.toLowerCase().indexOf(filter) >= 0) {
        results.push(filename);
      }
    }
    return results;
  }

  const list = findFilesInDir(path, 'mainactivity.java');
  for (const file of list) {
    let data = readFile(file);
    if (data) {
      const bindex = data.indexOf('this.init(savedInstanceState');
      if (bindex !== -1) {
        const eindex = data.indexOf('}});', bindex) + 4;

        data = data.replace(data.substring(bindex, eindex), '');

        data = data.replace('// Initializes the Bridge', '');
      }

      const rindex = data.indexOf('registerPlugin');
      const superLine = 'super.onCreate(savedInstanceState);';
      if (rindex !== -1) {
        if (data.indexOf(superLine) < rindex) {
          const linePadding = rindex - data.indexOf(superLine) - superLine.length - 1;
          data = data.replace(`${superLine}\n${' '.repeat(linePadding)}`, '');
          const eindex = data.lastIndexOf('.class);') + 8;
          data = data.replace(
            data.substring(bindex, eindex),
            `${data.substring(bindex, eindex)}\n${' '.repeat(linePadding) + superLine.padStart(linePadding)}`
          );
        }
      }

      if (bindex == -1 && rindex == -1) {
        return;
      }

      writeFileSync(file, data);
    }
  }
}

function updateGitIgnore(filename: string, lines: Array<string>) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  let replaced = txt;
  for (const line of lines) {
    if (!replaced.includes(line)) {
      replaced += line + '\n';
    }
  }
  if (replaced !== txt) {
    writeFileSync(filename, replaced, 'utf-8');
    writeIonic(`Migrated .gitignore by adding generated config files.`);
  }
}

function patchPodFile(filename: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  let replaced = txt;

  if (!replaced.includes('pods_helpers')) {
    replaced = `require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'\n\n` + replaced;
  }

  if (!replaced.includes('post_install')) {
    replaced += `\n\npost_install do |installer|\n  assertDeploymentTarget(installer)\nend\n`;
  } else {
    if (!replaced.includes('assertDeploymentTarget(installer)')) {
      replaced = replaced.replace(
        `post_install do |installer|`,
        `post_install do |installer|\n  assertDeploymentTarget(installer)\n`
      );
    }
  }

  if (replaced !== txt) {
    writeFileSync(filename, replaced, 'utf-8');
    writeIonic(`Migrated Podfile by assertingDeploymentTarget.`);
  }
}

function removeInFile(filename: string, startLine: string, endLine: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  let changed = false;
  let lines = txt.split('\n');
  let removing = false;
  lines = lines.filter((line) => {
    if (line.includes(endLine)) {
      removing = false;
      return false;
    }
    if (line.includes(startLine)) {
      removing = true;
      changed = true;
    }
    return !removing;
  });
  if (changed) {
    writeFileSync(filename, lines.join('\n'), 'utf-8');
    writeIonic(`Migrated ${filename} by removing ${startLine}.`);
  }
}

function replacePush(filename: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  let replaced = txt;
  replaced = replaced.replace('DEBUG USE_PUSH', 'DEBUG');
  replaced = replaced.replace('USE_PUSH', '""');
  if (replaced != txt) {
    writeFileSync(filename, replaced, 'utf-8');
    writeIonic(`Migrated ${filename} by removing USE_PUSH.`);
  }
}

function updateGradleWrapper(filename: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  let replaced = txt;

  replaced = setAllStringIn(
    replaced,
    'distributionUrl=',
    '\n',
    // eslint-disable-next-line no-useless-escape
    `https\://services.gradle.org/distributions/gradle-7.4.2-bin.zip`
  );
  if (txt != replaced) {
    writeFileSync(filename, replaced, 'utf-8');
    writeIonic(`Migrated gradle-wrapper.properties by updating gradle version from 7.0 to 7.4.2.`);
  }
}

function readFile(filename: string): string {
  try {
    if (!existsSync(filename)) {
      writeError(`Unable to find ${filename}. Try updating it manually`);
      return;
    }
    return readFileSync(filename, 'utf-8');
  } catch (err) {
    writeError(`Unable to read ${filename}. Verify it is not already open. ${err}`);
  }
}

function updateAppBuildGradle(filename: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  let replaced = txt;
  function add(line: string) {
    if (!replaced.includes(line)) {
      replaced = replaced.replace('dependencies {', `dependencies {\n    ${line}`);
    }
  }
  add('implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"');
  add('implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"');

  if (txt != replaced) {
    writeFileSync(filename, replaced, 'utf-8');
    writeIonic(`Migrated ${filename}`);
  }
}

function updateStyles(filename: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }

  let replaced = txt;
  //if (exists('@capacitor/splash-screen')) {
  replaced = replaced.replace(
    '<style name="AppTheme.NoActionBarLaunch" parent="AppTheme.NoActionBar">',
    '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">'
  );
  //}
  replaced = replaced.replace(`parent="Theme.AppCompat.NoActionBar"`, `parent="Theme.AppCompat.DayNight.NoActionBar"`);
  if (txt != replaced) {
    writeFileSync(filename, replaced, 'utf-8');
    writeIonic(`Migrated ${filename} for Android 12 splash screen.`);
  }
}

function updateBuildGradle(filename: string) {
  // In build.gradle add dependencies:
  // classpath 'com.android.tools.build:gradle:7.2.1'
  // classpath 'com.google.gms:google-services:4.3.13'
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  const neededDeps = {
    'com.android.tools.build:gradle': '7.2.1',
    'com.google.gms:google-services': '4.3.13',
  };
  let replaced = txt;

  for (const dep of Object.keys(neededDeps)) {
    if (!replaced.includes(`classpath '${dep}`)) {
      replaced = txt.replace('dependencies {', `dependencies {\n        classpath '${dep}:${neededDeps[dep]}'`);
    } else {
      const current = getStringFrom(replaced, `classpath '${dep}:`, `'`);
      if (isVersionGreaterOrEqual(neededDeps[dep], current)) {
        // Update
        replaced = setAllStringIn(replaced, `classpath '${dep}:`, `'`, neededDeps[dep]);
        writeIonic(`Migrated build.gradle set ${dep} = ${neededDeps[dep]}.`);
      }
    }
  }

  // Replace jcenter()
  const lines = replaced.split('\n');
  let inRepositories = false;
  let hasMavenCentral = false;
  let final = '';
  for (const line of lines) {
    if (line.includes('repositories {')) {
      inRepositories = true;
      hasMavenCentral = false;
    } else if (line.trim() == '}') {
      // Make sure we have mavenCentral()
      if (inRepositories && !hasMavenCentral) {
        final += '        mavenCentral()\n';
        writeIonic(`Migrated build.gradle added mavenCentral().`);
      }
      inRepositories = false;
    }
    if (inRepositories && line.trim() === 'mavenCentral()') {
      hasMavenCentral = true;
    }
    if (inRepositories && line.trim() === 'jcenter()') {
      // skip jCentral()
      writeIonic(`Migrated build.gradle removed jcenter().`);
    } else {
      final += line + '\n';
    }
  }

  if (txt !== final) {
    writeFileSync(filename, final, 'utf-8');
    return;
  }
}

function updateFile(
  project: Project,
  filename: string,
  textStart: string,
  textEnd: string,
  replacement?: string,
  skipIfNotFound?: boolean
): boolean {
  const path = join(project.projectFolder(), filename);
  const txt = readFile(path);
  if (!txt) {
    return;
  }
  if (txt.includes(textStart)) {
    let changed = false;
    if (replacement) {
      const replaced = setAllStringIn(txt, textStart, textEnd, replacement);
      if (replaced != txt) {
        writeFileSync(path, replaced, { encoding: 'utf-8' });
        changed = true;
      }
    } else {
      // Replacing in code so we need to count the number of brackets to find the end of the function in swift
      const lines = txt.split('\n');
      let replaced = '';
      let keep = true;
      let brackets = 0;
      for (const line of lines) {
        if (line.includes(textStart)) {
          keep = false;
        }
        if (!keep) {
          brackets += (line.match(/{/g) || []).length;
          brackets -= (line.match(/}/g) || []).length;
          if (brackets == 0) {
            keep = true;
          }
        } else {
          replaced += line + '\n';
          changed = true;
        }
      }
      writeFileSync(path, replaced, { encoding: 'utf-8' });
    }
    const message = replacement ? `${textStart} => ${replacement}` : '';
    if (changed) {
      writeIonic(`Migrated ${filename} ${message}.`);
    }
    return true;
  } else if (!skipIfNotFound) {
    writeError(`Unable to find "${textStart}" in ${filename}. Try updating it manually`);
  }

  return false;
}

function install(libs: Array<string>, plugins: Array<string>, version: string, pluginVersion: string): string {
  let result = '';
  for (const lib of libs) {
    if (exists(lib)) {
      result += `${lib}@${version} `;
    }
  }

  for (const plugin of plugins) {
    if (exists(plugin)) {
      result += `${plugin}@${pluginVersion} `;
    }
  }

  return npmInstall(result.trim() + ' --force');
}

function daysUntil(date_1: Date) {
  const date_2 = new Date();
  const difference = date_1.getTime() - date_2.getTime();
  return Math.ceil(difference / (1000 * 3600 * 24));
}
