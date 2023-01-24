import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Project } from './project';
import { MonoRepoType } from './monorepo';
import { ionicState } from './ionic-tree-provider';
import { InternalCommand } from './command-name';
import { npx, preflightNPMCheck } from './node-commands';
import { exists } from './analyzer';

/**
 * Creates the ionic build command
 * @param  {Project} project
 * @returns string
 */
export function ionicBuild(project: Project, configurationArg?: string): string {
  const preop = preflightNPMCheck(project);

  ionicState.projectDirty = false;

  const prod: boolean = vscode.workspace.getConfiguration('ionic').get('buildForProduction');
  let projectName = '';
  if (ionicState.project) {
    projectName = ` --project=${ionicState.project}`;
  }
  switch (project.repoType) {
    case MonoRepoType.none:
      return `${preop}${ionicCLIBuild(prod, project, configurationArg)}${projectName}`;
    case MonoRepoType.npm:
      return `${InternalCommand.cwd}${preop}${ionicCLIBuild(prod, project, configurationArg)}`;
    case MonoRepoType.nx:
      return `${preop}${nxBuild(prod, project)}`;
    case MonoRepoType.folder:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.pnpm:
      return `${InternalCommand.cwd}${preop}${ionicCLIBuild(prod, project, configurationArg)}`;
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function ionicCLIBuild(prod: boolean, project: Project, configurationArg?: string): string {
  let cmd = `${npx(project.packageManager)} ionic build`;
  if (configurationArg) {
    cmd += ` ${configurationArg}`;
  } else if (prod) {
    cmd += ' --prod';
  }
  if (exists('@capacitor/ios') || exists('@capacitor/android')) {
    cmd += ` && ${npx(project.packageManager)} cap copy`;
  }
  return cmd;
}

function nxBuild(prod: boolean, project: Project, configurationArg?: string): string {
  let cmd = `${npx(project.packageManager)} nx build ${project.monoRepo.name}`;
  if (configurationArg) {
    cmd += ` ${configurationArg}`;
  } else if (prod) {
    cmd += ' --configuration=production';
  }
  return cmd;
}
