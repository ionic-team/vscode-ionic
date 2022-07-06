import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as vscode from 'vscode';
import { exists } from './analyzer';
import { getOutputChannel, writeError, writeIonic } from './extension';
import { npmInstall, npmUninstall } from './node-commands';
import { Project } from './project';
import { run, setAllStringIn, showProgress } from './utilities';
import { capacitorSync } from './capacitor-sync';
import { ActionResult } from './command-name';

export async function migrateCapacitor(project: Project, currentVersion: string): Promise<ActionResult> {
  const coreVersion = '4.0.0-beta.1';
  const pluginVersion = '4.0.0-beta.0';

  const daysLeft = daysUntil(new Date('11/01/2022'));
  let warning = `Google Play Store requires a minimum target of SDK 31 by 1st November 2022`;
  if (daysLeft > 0) {
    warning += ` (${daysLeft} days left)`;
  }
  const result = await vscode.window.showInformationMessage(
    `Capacitor 4 sets a deployment target of iOS 13 and Android 12 (SDK 32). ${warning}`,
    'Migrate to v4 Beta',
    'Ignore'
  );
  if (result == 'Ignore') {
    return ActionResult.Ignore;
  }
  if (!result) {
    return;
  }

  await showProgress(`Migrating to Capacitor ${coreVersion}`, async () => {
    try {
      await run2(
        project,
        install(
          ['@capacitor/core', '@capacitor/cli', '@capacitor/ios', '@capacitor/android'],
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

      if (exists('@capacitor/storage')) {
        await run2(project, npmUninstall(`@capacitor/storage`));
        await run2(project, npmInstall(`@capacitor/preferences@${pluginVersion}`));
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

        // Remove touchesBegan
        updateFile(project, join('ios', 'App', 'App', 'AppDelegate.swift'), `override func touchesBegan`, `}`);

        // Remove NSAppTransportSecurity
        removeKey(join(project.folder, 'ios', 'App', 'App', 'info.plist'), 'NSAppTransportSecurity');

        // Remove USE_PUSH
        replacePush(join(project.folder, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'));

        // Remove from App Delegate
        removeInFile(join(project.folder, 'ios', 'App', 'App', 'AppDelegate.swift'), `#if USE_PUSH`, `#endif`);
      }

      if (exists('@capacitor/android')) {
        // AndroidManifest.xml add attribute: <activity android:exported="true"
        updateAndroidManifest(join(project.folder, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));

        // Update build.gradle
        updateBuildGradle(join(project.folder, 'android', 'build.gradle'));
        updateAppBuildGradle(join(project.folder, 'android', 'app', 'build.gradle'));

        // Update gradle-wrapper.properties
        updateGradleWrapper(join(project.folder, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties'));

        // Update .gitIgnore
        updateGitIgnore(join(project.folder, 'android', '.gitignore'), [
          `# Generated Config files`,
          `app/src/main/assets/capacitor.config.json`,
          `app/src/main/assets/capacitor.plugins.json`,
          `app/src/main/res/xml/config.xml`,
        ]);

        // Update .gitIgnore
        updateGitIgnore(join(project.folder, 'ios', '.gitignore'), [
          `# Generated Config files`,
          `App/App/capacitor.config.json`,
          `App/App/config.xml`,
        ]);

        // Variables gradle
        const variables = {
          minSdkVersion: 22,
          compileSdkVersion: 32,
          targetSdkVersion: 32,
          androidxActivityVersion: '1.4.0',
          androidxAppCompatVersion: '1.4.1',
          androidxCoordinatorLayoutVersion: '1.2.0',
          androidxCoreVersion: '1.7.0',
          androidxFragmentVersion: '1.4.1',
          junitVersion: '4.13.2',
          androidxJunitVersion: '1.1.3',
          androidxEspressoCoreVersion: '3.4.0',
          cordovaAndroidVersion: '10.1.1',
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
            updateFile(
              project,
              join('android', 'variables.gradle'),
              `${variable} = `,
              `\n`,
              variables[variable].toString(),
              true
            );
          }
        }
      }

      // Ran Cap Sync
      await run2(project, capacitorSync(project), true);

      writeIonic('Capacitor 4 Migration Completed.');

      writeBreakingChanges();
      getOutputChannel().show();
      const message = `Migration to Capacitor ${coreVersion} is complete. Run and test your app!`;

      vscode.window.showInformationMessage(message, 'OK');
    } catch (err) {
      writeError(`Failed to migrate: ${err}`);
    }
  });
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
      `IMPORTANT: Review https://next.capacitorjs.com/docs/updating/4-0#plugins for breaking changes in these plugins that you use: ${broken.join(
        ', '
      )}.`
    );
  }
  if (exists('@capacitor/android')) {
    writeIonic(
      'Warning: The Android Gradle plugin was updated and it requires Java 11 to run. You may need to select this in Android Studio.'
    );
  }
}
function updateAndroidManifest(filename: string) {
  const txt = readFile(filename);
  if (!txt) {
    return;
  }

  // AndroidManifest.xml add attribute: <activity android:exported="true"
  if (txt.includes('<activity android:exported="')) {
    return; // Probably already updated manually
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
  if (replaced.includes('gradle-7.0-all.zip')) {
    replaced = setAllStringIn(
      replaced,
      'distributionUrl=',
      '\n',
      // eslint-disable-next-line no-useless-escape
      `https\://services.gradle.org/distributions/gradle-7.4.2-bin.zip`
    );
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
  if (txt.includes('androidx.coordinatorlayout:coordinatorlayout:')) {
    return;
  }

  const replaced = txt.replace(
    'dependencies {',
    'dependencies {\n    implementation "androidx.coordinatorlayout:coordinatorlayout:$androidxCoordinatorLayoutVersion"'
  );
  const lines = txt.split('\n');
  writeFileSync(filename, replaced, 'utf-8');
  writeIonic(`Migrated ${filename} by adding androidx.coordinatorlayout dependency.`);
}

function updateBuildGradle(filename: string) {
  // In build.gradle add dependencies:
  // classpath 'com.android.tools.build:gradle:7.2.1'
  // classpath 'com.google.gms:google-services:4.3.10'
  const txt = readFile(filename);
  if (!txt) {
    return;
  }
  const neededDeps = {
    'com.android.tools.build:gradle': '7.2.1',
    'com.google.gms:google-services': '4.3.10',
  };
  let replaced = txt;

  for (const dep of Object.keys(neededDeps)) {
    if (!replaced.includes(`classpath '${dep}`)) {
      replaced = txt.replace('dependencies {', `dependencies {\n        classpath '${dep}:${neededDeps[dep]}'`);
    } else {
      // Update
      replaced = setAllStringIn(replaced, `classpath '${dep}:`, `'`, neededDeps[dep]);
      writeIonic(`Migrated build.gradle set ${dep} = ${neededDeps[dep]}.`);
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
  const path = join(project.folder, filename);
  let txt = readFile(path);
  if (!txt) {
    return;
  }
  if (txt.includes(textStart)) {
    if (replacement) {
      txt = setAllStringIn(txt, textStart, textEnd, replacement);
      writeFileSync(path, txt, { encoding: 'utf-8' });
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
        }
      }
      writeFileSync(path, replaced, { encoding: 'utf-8' });
    }
    const message = replacement ? `${textStart} => ${replacement}` : '';
    writeIonic(`Migrated ${filename} ${message}.`);
    return true;
  } else if (!skipIfNotFound) {
    writeError(`Unable to find "${textStart}" in ${filename}. Try updating it manually`);
  }

  return false;
}

function install(libs: Array<string>, plugins: Array<string>, version: string, pluginVerison: string): string {
  let result = '';
  for (const lib of libs) {
    if (exists(lib)) {
      result += `${lib}@${version} `;
    }
  }

  for (const plugin of plugins) {
    if (exists(plugin)) {
      result += `${plugin}@${pluginVerison} `;
    }
  }

  return npmInstall(result.trim());
}

async function run2(project: Project, command: string, supressOutput?: boolean): Promise<boolean> {
  const channel = getOutputChannel();
  return await run(
    project.projectFolder(),
    command,
    channel,
    undefined,
    [],
    [],
    undefined,
    undefined,
    undefined,
    supressOutput
  );
}

function daysUntil(date_1: Date) {
  const date_2 = new Date();
  const difference = date_1.getTime() - date_2.getTime();
  return Math.ceil(difference / (1000 * 3600 * 24));
}
