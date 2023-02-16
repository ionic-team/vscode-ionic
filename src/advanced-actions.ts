import { Project } from './project';
import * as vscode from 'vscode';
import { PackageManager } from './node-commands';
import { getRunOutput, replaceAll } from './utilities';
import { writeError, writeIonic } from './extension';
import { isGreaterOrEqual } from './analyzer';
import { readAngularJson, writeAngularJson } from './rules-angular-json';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

enum Features {
  migrateToPNPM = 'Migrate to PNPM',
  reinstallNodeModules = 'Reinstall Node Modules',
  angularESBuild = 'Switch from WebPack to ESBuild (experimental)',
}

export async function advancedActions(project: Project) {
  const picks: Array<Features> = [];
  if (project.packageManager == PackageManager.npm) {
    picks.push(Features.migrateToPNPM);
    picks.push(Features.reinstallNodeModules);
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
    case Features.reinstallNodeModules:
      await runCommands(reinstallNodeModules(), selection, project);
      break;
    case Features.angularESBuild:
      switchAngularToESBuild(project);
  }
}

function migrateToPNPM(): Array<string> {
  return ['pnpm -v', 'rm -rf node_modules', 'pnpm import', 'pnpm install', 'rm package-lock.json'];
}

function reinstallNodeModules(): Array<string> {
  return ['rm -rf node_modules', 'npm install'];
}

async function runCommands(commands: Array<string>, title: string, project: Project): Promise<void> {
  try {
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

async function run(commands: Array<string>, folder: string) {
  for (const command of commands) {
    writeIonic(command);
    try {
      const result = await getRunOutput(command, folder);
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
