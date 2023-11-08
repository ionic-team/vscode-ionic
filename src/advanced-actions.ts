import { Project } from './project';
import * as vscode from 'vscode';
import { PackageManager, npmInstall } from './node-commands';
import { confirm, getRunOutput, isWindows, replaceAll } from './utilities';
import { write, writeError, writeIonic } from './logging';
import { isGreaterOrEqual, isLess } from './analyzer';
import { readAngularJson, writeAngularJson } from './rules-angular-json';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ionicState } from './ionic-tree-provider';
import { clearIgnored } from './ignore';
import { CommandName } from './command-name';

enum Features {
  migrateToPNPM = '$(find-replace) Migrate to PNPM',
  migrateToNX = '$(outline-view-icon) Migrate to NX',
  reinstallNodeModules = '$(extensions-sync-enabled) Reinstall Node Modules',
  angularESBuild = '$(test-view-icon) Switch from WebPack to ESBuild (experimental)',
  showIgnoredRecommendations = '$(light-bulb) Show Ignored Recommendations',
  migrateAngularStandalone = '$(find-replace) Migrate to Ionic standalone components',
}

export async function advancedActions(project: Project) {
  const picks: Array<Features> = [];
  if (project.packageManager == PackageManager.npm) {
    picks.push(Features.migrateToPNPM);

    if (isGreaterOrEqual('@angular/core', '14.0.0')) {
      picks.push(Features.migrateToNX);
    }
    if (isGreaterOrEqual('@angular/core', '14.0.0')) {
      picks.push(Features.migrateAngularStandalone);
    }
    picks.push(Features.reinstallNodeModules);
    picks.push(Features.showIgnoredRecommendations);
  }
  if (isGreaterOrEqual('@angular-devkit/build-angular', '14.0.0')) {
    if (!angularUsingESBuild(project)) {
      picks.push(Features.angularESBuild);
    }
  }
  const selection = await vscode.window.showQuickPick(picks, {});
  switch (selection) {
    case Features.migrateToPNPM:
      await runCommands(migrateToPNPM(), selection, project);
      break;
    case Features.migrateToNX:
      await vscode.window.showInformationMessage('Run the following command: npx nx init', 'OK');
      break;
    case Features.reinstallNodeModules:
      await runCommands(reinstallNodeModules(), selection, project);
      break;
    case Features.angularESBuild:
      switchAngularToESBuild(project);
      break;
    case Features.migrateAngularStandalone:
      migrateToAngularStandalone(selection, project);
      break;
    case Features.showIgnoredRecommendations:
      showIgnoredRecommendations();
      break;
  }
}

function migrateToPNPM(): Array<string> {
  return ['pnpm -v', 'rm -rf node_modules', 'pnpm import', 'pnpm install', 'rm package-lock.json'];
}

async function migrateToAngularStandalone(selection: string, project: Project) {
  if (
    !(await confirm(
      'This will replace IonicModule with individual Ionic components and icons in your project. Are you sure?',
      'Continue'
    ))
  )
    return;

  const commands = ['npx @ionic/angular-standalone-codemods --non-interactive'];
  if (isGreaterOrEqual('@ionic/angular', '7.0.0')) {
    if (isLess('@ionic/angular', '7.5.1')) {
      commands.unshift(npmInstall('@ionic/angular@7.5.1'));
    }
  } else {
    writeError('You must be using @ionic/angular version 7 or higher.');
    return;
  }
  if (isLess('ionicons', '7.2.1')) {
    commands.unshift(npmInstall('ionicons@latest'));
  }
  await runCommands(commands, selection, project);
}

export function removeNodeModules(): string {
  return isWindows() ? 'del node_modules /S /Q' : 'rm -rf node_modules';
}
function reinstallNodeModules(): Array<string> {
  return [removeNodeModules(), 'npm install'];
}

function showIgnoredRecommendations(): void {
  clearIgnored(ionicState.context);
  vscode.commands.executeCommand(CommandName.Refresh);
}

async function runCommands(commands: Array<string>, title: string, project: Project): Promise<void> {
  try {
    if (title.includes(')')) {
      title = title.substring(title.indexOf(')') + 1);
    }
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title, cancellable: false },
      async () => {
        await run(commands, project.folder);
      }
    );

    writeIonic(`Completed ${title}`);
  } catch (err) {
    writeError(`Failed ${title}: ${err}`);
  }
}

async function run(commands: Array<string>, folder: string): Promise<void> {
  for (const command of commands) {
    writeIonic(command);
    try {
      write(await getRunOutput(command, folder));
    } catch (err) {
      writeError(err);
      break;
    }
  }
}

function angularUsingESBuild(project: Project): boolean {
  try {
    const angular = readAngularJson(project);
    for (const prj of Object.keys(angular?.projects)) {
      if (angular.projects[prj]?.architect?.build?.builder == '@angular-devkit/build-angular:browser-esbuild') {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

function switchAngularToESBuild(project: Project): void {
  const angular = readAngularJson(project);
  let changes = false;
  if (!angular) return;
  for (const prj of Object.keys(angular?.projects)) {
    if (angular.projects[prj]?.architect?.build?.builder == '@angular-devkit/build-angular:browser') {
      angular.projects[prj].architect.build.builder = '@angular-devkit/build-angular:browser-esbuild';
      changes = true;
    }
  }
  if (changes) {
    fixGlobalScss(project);
    writeAngularJson(project, angular);
    vscode.window.showInformationMessage(`The Angular project has been changed to esbuild. Enjoy faster builds!`, 'OK');
  }
}

function fixGlobalScss(project: Project) {
  try {
    const filename = join(project.folder, 'src', 'global.scss');
    if (existsSync(filename)) {
      let txt = readFileSync(filename, 'utf8');
      txt = replaceAll(txt, `@import "~@ionic/`, `@import "@ionic/`);
      txt = replaceAll(txt, `@import '~@ionic/`, `@import '@ionic/`);
      writeFileSync(filename, txt);
    }
  } catch (error) {
    writeError(`Unable to write global.scss ${error}`);
  }
}
