import * as fs from 'fs';
import { window, commands } from 'vscode';
import { CommandName, InternalCommand } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { getMonoRepoFolder, MonoRepoType } from './monorepo';
import { Project } from './project';
import { showProgress } from './utilities';

export enum PackageManager {
  npm,
  yarn,
  pnpm,
}

export enum PMOperation {
  install,
  installAll,
  uninstall,
  update,
  run,
}

export function outdatedCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case PackageManager.yarn:
      return 'yarn outdated --json';
    case PackageManager.pnpm:
      return 'pnpm outdated --json';
    default:
      return 'npm outdated --json';
  }
}

export function listCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case PackageManager.yarn:
      return 'yarn list --json';
    case PackageManager.pnpm:
      return 'pnpm list --json';
    default:
      return 'npm list --json';
  }
}

export function npmInstall(name: string, ...args): string {
  const argList = args.join(' ').trim();

  switch (ionicState.repoType) {
    case MonoRepoType.npm:
      return `${pm(PMOperation.install, name)} ${argList} --workspace=${getMonoRepoFolder(
        ionicState.workspace,
        undefined
      )}`;
    case MonoRepoType.folder:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.pnpm:
      return InternalCommand.cwd + `${pm(PMOperation.install, name)} ${argList}`;
    default:
      return `${pm(PMOperation.install, name)} ${argList}`;
  }
}

// The package manager add command (without arguments)
export function addCommand(): string {
  const a = pm(PMOperation.install, '*');
  return a.replace('*', '').replace('--save-exact', '').replace('--exact', '').trim();
}

/**
 * Check to see if we have node modules installed and return a command to prepend to any operations we may do
 * @param  {Project} project
 * @returns string
 */
export function preflightNPMCheck(project: Project): string {
  const nmf = project.getNodeModulesFolder();
  const preop = !fs.existsSync(nmf) ? npmInstallAll() + ' && ' : '';

  // If not set then set to a default value to prevent failrue
  if (!process.env.ANDROID_SDK_ROOT && !process.env.ANDROID_HOME && process.platform !== 'win32') {
    process.env.ANDROID_HOME = `~/Library/Android/sdk`;
    //preop = preop + 'export ANDROID_HOME=~/Library/Android/sdk && ';
  }

  return preop;
}

export async function suggestInstallAll(project: Project) {
  if (!ionicState || !ionicState.hasPackageJson) {
    return;
  }

  ionicState.hasNodeModulesNotified = true;

  if (project.isModernYarn()) {
    return;
  }
  const res = await window.showInformationMessage(
    `Would you like to install node modules for this project?`,
    'Yes',
    'No'
  );
  if (res != 'Yes') return;
  showProgress(`Installing....`, async () => {
    await project.runAtRoot(npmInstallAll());
    commands.executeCommand(CommandName.Refresh);
  });
}

export function npmInstallAll(): string {
  switch (ionicState.repoType) {
    case MonoRepoType.pnpm:
    case MonoRepoType.lerna:
    case MonoRepoType.folder:
      return InternalCommand.cwd + pm(PMOperation.installAll);
    default:
      return pm(PMOperation.installAll);
  }
}

export function npmUpdate(): string {
  switch (ionicState.repoType) {
    case MonoRepoType.pnpm:
    case MonoRepoType.lerna:
    case MonoRepoType.folder:
      return InternalCommand.cwd + pm(PMOperation.update);
    default:
      return pm(PMOperation.update);
  }
}

function pm(operation: PMOperation, name?: string): string {
  switch (ionicState.packageManager) {
    case PackageManager.npm:
      return npm(operation, name);
    case PackageManager.yarn:
      return yarn(operation, name);
    case PackageManager.pnpm:
      return pnpm(operation, name);
    default:
      window.showErrorMessage('Unknown package manager');
  }
}

function yarn(operation: PMOperation, name?: string): string {
  switch (operation) {
    case PMOperation.installAll:
      return 'yarn install';
    case PMOperation.install:
      return `yarn add ${name} --exact`;
    case PMOperation.uninstall:
      return `yarn remove ${name}`;
    case PMOperation.run:
      return `yarn run ${name}`;
    case PMOperation.update:
      return `yarn update`;
  }
}

function npm(operation: PMOperation, name?: string): string {
  switch (operation) {
    case PMOperation.installAll:
      return 'npm install';
    case PMOperation.install:
      return `npm install ${name} --save-exact`;
    case PMOperation.uninstall:
      return `npm uninstall ${name}`;
    case PMOperation.run:
      return `npm run ${name}`;
    case PMOperation.update:
      return `npm update`;
  }
}

function pnpm(operation: PMOperation, name?: string): string {
  switch (operation) {
    case PMOperation.installAll:
      return 'pnpm install';
    case PMOperation.install:
      return `pnpm add ${name}  --save-exact`;
    case PMOperation.uninstall:
      return `pnpm remove ${name}`;
    case PMOperation.run:
      return `pnpm ${name}`;
    case PMOperation.update:
      return `pnpm update`;
  }
}

export function npx(packageManager: PackageManager): string {
  switch (packageManager) {
    case PackageManager.pnpm:
      return `${InternalCommand.cwd}pnpm exec`;
    default:
      return `${InternalCommand.cwd}npx`;
  }
}

export function npmUninstall(name: string): string {
  switch (ionicState.repoType) {
    case MonoRepoType.npm:
      return `${pm(PMOperation.uninstall, name)} --workspace=${getMonoRepoFolder(ionicState.workspace, undefined)}`;
    case MonoRepoType.folder:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.pnpm:
      return `${InternalCommand.cwd}${pm(PMOperation.uninstall, name)}`;
    default:
      return pm(PMOperation.uninstall, name);
  }
}

export function npmRun(name: string): string {
  switch (ionicState.repoType) {
    case MonoRepoType.npm:
      return `${pm(PMOperation.run, name)} --workspace=${getMonoRepoFolder(ionicState.workspace, undefined)}`;
    case MonoRepoType.folder:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.pnpm:
      return `${InternalCommand.cwd}${pm(PMOperation.run, name)}`;
    default:
      return pm(PMOperation.run, name);
  }
}
