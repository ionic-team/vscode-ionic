import { isGreaterOrEqual, isLess } from './analyzer';
import { showOutput, writeIonic } from './logging';
import { Project } from './project';
import { Tip, TipType } from './tip';
import { window } from 'vscode';
import { PackageFile, getPackageJSON, replaceStringIn, showProgress } from './utilities';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { getPackageJSONFilename } from './monorepo';
import { npmInstallAll } from './node-commands';
import { join } from 'path';

export function checkCapacitorPluginMigration(project: Project) {
  if (isGreaterOrEqual('@capacitor/core', '4.0.0') && isLess('@capacitor/core', '5.0.0')) {
    // Capacitor 4 to 5 plugin migration
    project.add(
      new Tip('Migrate Plugin to Capacitor 5', undefined, TipType.Error).setAction(migratePluginToCapacitor5, project)
    );
  }
}

async function migratePluginToCapacitor5(project: Project) {
  const txt = 'Migrate Plugin';
  const res = await window.showInformationMessage(
    `Your Capacitor 4 plugin can be migrated to Capacitor 5.`,
    txt,
    'Exit'
  );
  if (!res || res != txt) return;

  showOutput();

  writeIonic('This feature will be released as soon Capacitor 5 is released.');
  return;

  const target = '^5.0.0';

  await showProgress('Migrating Plugin...', async () => {
    let changes = 0;
    function update(data: string, from: string, to: string, replace: string): string {
      const changed = replaceStringIn(data, from, to, replace);
      if (changed !== data) {
        changes++;
      }
      return changed;
    }

    const packages: PackageFile = getPackageJSON(project.projectFolder());
    for (const dep of ['@capacitor/ios', '@capacitor/android', '@capacitor/core']) {
      if (packages.devDependencies[dep]) {
        packages.devDependencies[dep] = target;
      }
    }
    if (packages.version.startsWith('4.')) {
      packages.version = '5.0.0';
    }

    const buildGradle = join(project.projectFolder(), 'android', 'build.gradle');
    if (existsSync(buildGradle)) {
      let data = readFileSync(buildGradle, 'utf-8');
      data = update(
        data,
        `compileSdkVersion project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion`,
        `\n`,
        `compileSdkVersion project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 33\n`
      );

      data = update(
        data,
        `targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion`,
        `\n`,
        `targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 33\n`
      );

      data = update(
        data,
        `androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion :`,
        '\n',
        `androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.6.1'\n`
      );

      data = update(
        data,
        `androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion :`,
        `\n`,
        `androidxJunitVersion = project.hasProperty('androidxJunitVersion') ? rootProject.ext.androidxJunitVersion : '1.1.5'\n`
      );

      data = update(
        data,
        `androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion :`,
        `\n`,
        `androidxEspressoCoreVersion = project.hasProperty('androidxEspressoCoreVersion') ? rootProject.ext.androidxEspressoCoreVersion : '3.5.1'\n`
      );

      data = update(
        data,
        `classpath 'com.android.tools.build:gradle:7.2.1'`,
        `\n`,
        `classpath 'com.android.tools.build:gradle:7.4.1'\n`
      );

      writeIonic(`Updated ${buildGradle}`);

      writeFileSync(buildGradle, data);
    }

    const gradleWrapper = join(project.projectFolder(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
    if (existsSync(gradleWrapper)) {
      let w = readFileSync(gradleWrapper, 'utf-8');
      w = update(
        w,
        // eslint-disable-next-line no-useless-escape
        `gradle-7.4.2-all.zip`,
        `\n`,
        // eslint-disable-next-line no-useless-escape
        `gradle-7.5-all.zip\n`
      );
      writeIonic(`Updated ${gradleWrapper}`);
      writeFileSync(gradleWrapper, w);
    }

    const filename = getPackageJSONFilename(project.projectFolder());
    writeIonic(`Updated package.json.`);
    writeFileSync(filename, JSON.stringify(packages, undefined, 2));
    writeIonic(`Installing node modules`);
    await project.run2(npmInstallAll());
    const success = changes == 7 ? ' successfully' : '';
    const msg = `Plugin has been migrated${success}. Please read migration docs and verify your plugin before publishing.`;
    writeIonic(msg);
    window.showInformationMessage(msg, 'OK');
  });
}
