import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { Project } from './project';
import { ionicState } from './ionic-tree-provider';
import { exists } from './analyzer';

export function getConfigurationName(): string {
  if (!ionicState.configuration || ionicState.configuration == 'default') {
    return '';
  } else {
    return `(${ionicState.configuration})`;
  }
}

export function getConfigurationArgs(): string {
  if (!ionicState.configuration || ionicState.configuration == 'default') {
    return '';
  } else {
    if (exists('@ionic/cli')) {
      return ` --configuration=${ionicState.configuration}`;
    } else {
      return ''; // Cap CLI doesnt know about --configuration
    }
  }
}

export async function buildConfiguration(
  folder: string,
  context: vscode.ExtensionContext,
  project: Project
): Promise<string> {
  let configs = [];
  const filename = path.join(project.projectFolder(), 'angular.json');
  if (fs.existsSync(filename)) {
    configs = getAngularBuildConfigs(filename);
  }
  if (configs.length == 0) {
    vscode.window.showInformationMessage('No build configurations found in this project');
    return;
  }
  configs.unshift('default');
  const selection = vscode.window.showQuickPick(configs, { placeHolder: 'Select a build configuration to use' });
  return selection;
}

function getAngularBuildConfigs(filename: string): Array<string> {
  try {
    const result = [];
    const angular = JSON.parse(fs.readFileSync(filename, 'utf8'));
    for (const config of Object.keys(angular.projects.app.architect.build.configurations)) {
      result.push(config);
    }
    return result;
  } catch {
    return [];
  }
}
