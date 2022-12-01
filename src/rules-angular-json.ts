import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { Project } from './project';
import { Tip, TipType } from './tip';
import { writeError } from './extension';

/**
 * For Capacitor project if @angular/core >= v13 then
 * Check if aot is false in angular.json and remove it
 * Note: When Angular defaulted to AOT only the Ionic starter wasnt updated
 * and it misses syntax errors checked by AOT that arent in JIT
 * @param  {Project} project
 */
export function checkAngularJson(project: Project) {
  try {
    const filename = path.join(project.folder, 'angular.json');
    if (fs.existsSync(filename)) {
      const angular = JSON.parse(fs.readFileSync(filename, 'utf8'));
      for (const projectName of Object.keys(angular.projects)) {
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

async function fixAngularJson(filename: string) {
  if (
    !(await vscode.window.showErrorMessage(
      `Use Angular's recommended AOT (Ahead of Time) compilation? (this will find additional errors in your templates by switching from JIT to AOT compilation during development)`,
      'Yes, Apply Changes'
    ))
  )
    return;
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