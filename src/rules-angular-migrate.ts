import { getPackageVersion } from './analyzer';
import { Tip, TipType } from './tip';
import { coerce } from 'semver';
import { npx } from './node-commands';
import { ionicState } from './ionic-tree-provider';
import { runCommands } from './advanced-actions';
import { Project } from './project';
import { window } from 'vscode';
import { openUri } from './utilities';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { write } from './logging';
import { join } from 'path';

// Maximum supported Angular version that we'll suggest migrating to
export const maxAngularVersion = '17';

export function angularMigrate(project: Project, latestVersion: string): Tip | undefined {
  const current = getPackageVersion('@angular/core');
  let latest = coerce(latestVersion);
  const next = current.major + 1;
  if (!latest) latest = current;
  if (!current) return;
  return new Tip(`Migrate to Angular ${next}`, '', TipType.Angular).setAction(
    migrate,
    project,
    next,
    current.major,
    current
  );
}

async function migrate(project: Project, next: number, current: number, now: string) {
  const nextButton = `Update to v${next}`;
  const currentButton = `Update to latest v${current}`;
  const infoButton = 'Info';
  const result = await window.showInformationMessage(
    `Would you like to migrate from Angular ${now} to ${next}? This will use 'ng update': Make sure you have committed your code before you begin.`,
    infoButton,
    currentButton,
    nextButton
  );
  if (!result) return;
  switch (result) {
    case infoButton:
      openUri('https://angular.io/cli/update');
      break;
    case currentButton:
      await runCommands(
        [
          `${npx(
            ionicState.packageManager
          )} ng update @angular/cli@${current} @angular/core@${current} --allow-dirty --force`,
        ],
        `Updating to latest Angular ${current}`,
        project
      );
      postFixes(project, current);
      break;
    case nextButton:
      await runCommands(
        [
          `${npx(
            ionicState.packageManager
          )} ng update @angular/cli@${next} @angular/core@${next} --allow-dirty --force`,
        ],
        `Migrating to Angular ${next}`,
        project
      );
      postFixes(project, next);
      break;
  }

  function postFixes(project: Project, version: number) {
    if (version == 17) {
      // Fix polyfills.ts
      replaceInFile(
        join(project.projectFolder(), 'src', 'polyfills.ts'),
        `import 'zone.js/dist/zone';`,
        `import 'zone.js';`
      );
    }
    if (version >= 16) {
      replaceInFile(join(project.projectFolder(), '.browserslistrc'), `Chrome >=60';`, `Chrome >=61';`);
    }
  }
}

function replaceInFile(filename: string, search: string, replace: string): boolean {
  if (!existsSync(filename)) {
    return false;
  }
  const before = readFileSync(filename, 'utf8');
  const after = before.replace(search, replace);
  if (before == after) {
    return false;
  }
  writeFileSync(filename, after);
  write(`Updated ${filename}.`);
}
