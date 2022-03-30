import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { Project } from './project';
import { Tip, TipType } from './tip';

/**
 * For Capacitor project if @ionic/angular-toolkit >= v6 then
 * "ionic-cordova-build" / "ionic-cordova-serve" sections in angular.json are not needed
 * Note: In Cordova projects require @ionic/cordova-builders
 * @param  {Project} project
 */
export function checkMigrationAngularToolkit(project: Project) {
  // v6 removed the "ionic-cordova-build" / "ionic-cordova-serve" sections in Angular.json
  const filename = path.join(project.folder, 'angular.json');
  if (fs.existsSync(filename)) {
    const txt = fs.readFileSync(filename, 'utf8');
    if (txt && txt.includes('ionic-cordova-build')) {
      project.add(
        new Tip('Migrate angular.json', 'Remove Cordova configurations', TipType.Error).setAction(
          fixAngularJson,
          filename
        )
      );
    }
  }
}

async function fixAngularJson(filename: string) {
  if (
    !(await vscode.window.showErrorMessage(
      'When using @ionic/angular-toolkit v6+ the ionic-cordova-build and ionic-cordova-serve sections in angular.json can be removed.',
      'Fix angular.json'
    ))
  )
    return;
  const txt = fs.readFileSync(filename, 'utf8');
  const angular = JSON.parse(txt);
  try {
    for (const project of Object.keys(angular.projects)) {
      delete angular.projects[project].architect['ionic-cordova-build'];
      delete angular.projects[project].architect['ionic-cordova-serve'];
    }
    fs.writeFileSync(filename, JSON.stringify(angular, undefined, 2));
    vscode.window.showInformationMessage('angular.json has been migrated');
  } catch (err) {
    vscode.window.showErrorMessage('Failed to fix angular.json: ' + err);
  }
}
