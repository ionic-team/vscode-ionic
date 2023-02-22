import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { Project } from './project';
import { Tip, TipType } from './tip';
import { writeError } from './extension';
import { ionicState } from './ionic-tree-provider';

/**
 * For Capacitor project if @angular/core >= v13 then
 * Check if aot is false in angular.json and remove it
 * Note: When Angular defaulted to AOT only the Ionic starter wasnt updated
 * and it misses syntax errors checked by AOT that arent in JIT
 * @param  {Project} project
 */
export function checkAngularJson(project: Project) {
  let defaultConfiguration = undefined;
  try {
    const filename = path.join(project.folder, 'angular.json');
    if (fs.existsSync(filename)) {
      const angular = parseAngularJSON(filename);
      for (const projectName of Object.keys(angular.projects)) {
        defaultConfiguration = angular.projects[projectName].architect?.build?.defaultConfiguration;
        if (!ionicState.configuration && defaultConfiguration) {
          ionicState.configuration = defaultConfiguration;
          ionicState.project = projectName == 'app' ? undefined : projectName;
        }
        if (angular.projects[projectName].architect?.build?.options?.aot === false) {
          project.add(
            new Tip(
              'Use Default Angular Compilation',
              `Use Angular's recommended AOT (Ahead of Time) compilation`,
              TipType.Error
            ).setAction(fixAngularJson, filename)
          );
          break;
        }
      }
    }
  } catch (e) {
    writeError(e);
  }
}

export function readAngularJson(project: Project): any {
  try {
    const filename = path.join(project.folder, 'angular.json');
    if (fs.existsSync(filename)) {
      return parseAngularJSON(filename);
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
}

export function writeAngularJson(project: Project, angular: any): void {
  const filename = path.join(project.folder, 'angular.json');
  if (fs.existsSync(filename)) {
    fs.writeFileSync(filename, JSON.stringify(angular, null, 2));
  }
}

function parseAngularJSON(filename: string): any {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (err) {
    // Angular json may have comments
    try {
      const txt = fs.readFileSync(filename, 'utf8');
      const lines = txt.split('\n');
      let tmp = '';
      for (const line of lines) {
        if (line && line.trim().startsWith('//')) {
          // Ignore comments
        } else {
          tmp += line;
        }
      }
      return JSON.parse(tmp);
    } catch (err) {
      writeError(`Unable to parse angular.json: ${err}`);
    }
  }
}

async function fixAngularJson(filename: string) {
  if (
    !(await vscode.window.showErrorMessage(
      `Use Angular's recommended AOT (Ahead of Time) compilation? (this will find additional errors in your templates by switching from JIT to AOT compilation during development)`,
      'Yes, Apply Changes'
    ))
  ) {
    return;
  }
  const txt = fs.readFileSync(filename, 'utf8');
  const angular = JSON.parse(txt);
  try {
    for (const project of Object.keys(angular.projects)) {
      delete angular.projects[project].architect?.build?.options?.aot;
    }
    fs.writeFileSync(filename, JSON.stringify(angular, undefined, 2));
  } catch (err) {
    vscode.window.showErrorMessage('Failed to fix angular.json: ' + err);
  }
}
