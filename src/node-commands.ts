import * as fs from 'fs';

import { InternalCommand } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { MonoRepoType } from './monorepo';
import { Project } from './project';

export function outdatedCommand(project: Project): string {
  return 'npm outdated --json';
}

export function listCommand(project: Project): string {
  return 'npm list --json';
}

export function npmInstall(name: string, ...args): string {
  const argList = args.join(' ').trim();

  switch (ionicState.repoType) {
    case MonoRepoType.npm:
      return `npm install ${name} --save-exact ${argList} --workspace=${ionicState.workspace}`;
    case MonoRepoType.folder:
      return InternalCommand.cwd + `npm install ${name} --save-exact ${argList}`;
    default:
      return `npm install ${name} --save-exact ${argList}`;
  }
}

/**
 * Check to see if we have node modules installed and return a command to prepend to any operations we may do
 * @param  {Project} project
 * @returns string
 */
export function preflightNPMCheck(project: Project): string {
  const nmf = project.getNodeModulesFolder();
  let preop = !fs.existsSync(nmf) ? 'npm install && ' : '';

  // If not set then set to a default value to prevent failrue
  if (!process.env.ANDROID_SDK_ROOT && !process.env.ANDROID_HOME && process.platform !== 'win32') {
    preop = preop + 'export ANDROID_HOME=~/Library/Android/sdk && ';
  }

  return preop;
}

export function npmInstallAll(): string {
  switch (ionicState.repoType) {
    case MonoRepoType.folder:
      return InternalCommand.cwd + `npm install`;
    default:
      return `npm install`;
  }
}

export function npmUninstall(name: string): string {
  switch (ionicState.repoType) {
    case MonoRepoType.npm:
      return `npm uninstall ${name} --workspace=${ionicState.workspace}`;
    case MonoRepoType.folder:
      return `${InternalCommand.cwd}npm uninstall ${name}`;
    default:
      return `npm uninstall ${name}`;
  }
}

export function npmRun(name: string): string {
  switch (ionicState.repoType) {
    case MonoRepoType.npm:
      return `npm run ${name} --workspace=${ionicState.workspace}`;
    case MonoRepoType.folder:
      return `${InternalCommand.cwd}npm run ${name}`;
    default:
      return `npm run ${name}`;
  }
}
