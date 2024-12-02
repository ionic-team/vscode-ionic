import { window, commands } from 'vscode';
import { CommandName, InternalCommand } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { getMonoRepoFolder, MonoRepoType } from './monorepo';
import { Project } from './project';
import { showProgress } from './utilities';
import { existsSync } from 'fs';
import { GlobalSetting, getGlobalSetting, setGlobalSetting } from './workspace-state';
import { exists } from './analyzer';

export enum PackageManager {
  npm,
  yarn,
  pnpm,
  bun,
}

export enum PMOperation {
  install,
  installAll,
  uninstall,
  update,
  run,
}

export function outdatedCommand(project: Project): string {
  switch (project.packageManager) {
    case PackageManager.yarn: {
      if (project.isYarnV1()) {
        return 'yarn outdated --json';
      }
      // Uses https://github.com/mskelton/yarn-plugin-outdated
      return 'yarn outdated --format=json';
    }
    case PackageManager.bun:
      return 'npm outdated --json';
    case PackageManager.pnpm:
      return 'pnpm outdated --json';
    default:
      return 'npm outdated --json';
  }
}

export function listCommand(project: Project): string {
  switch (project.packageManager) {
    case PackageManager.yarn:
      return project.isYarnV1() ? 'yarn list --json' : 'yarn info --json';
    case PackageManager.pnpm:
      return 'pnpm list --json';
    case PackageManager.bun:
      return 'npm list --json';
    default:
      return 'npm list --json';
  }
}

export function saveDevArgument(project: Project): string {
  switch (project.packageManager) {
    case PackageManager.yarn:
      return '--dev';
    default:
      return '--save-dev';
  }
}

export function installForceArgument(project: Project): string {
  switch (project.packageManager) {
    case PackageManager.yarn:
      return '';
    default:
      return '--force';
  }
}

export function npmInstall(name: string, ...args): string {
  const argList = args.join(' ').trim();

  switch (ionicState.repoType) {
    case MonoRepoType.npm:
      return `${pm(PMOperation.install, name)} ${argList} --workspace=${getMonoRepoFolder(
        ionicState.workspace,
        undefined,
      )}`;
    case MonoRepoType.yarn:
    case MonoRepoType.folder:
    case MonoRepoType.lerna:
    case MonoRepoType.pnpm:
      return InternalCommand.cwd + `${pm(PMOperation.install, name)} ${notForce(argList)}`;
    default:
      return `${pm(PMOperation.install, name)} ${notForce(argList)}`;
  }
}

function notForce(args: string): string {
  if (ionicState.packageManager !== PackageManager.yarn) return args;
  return args.replace('--force', '');
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
  const preop = !existsSync(nmf) && !project.isModernYarn() ? npmInstallAll() + ' && ' : '';

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
  if (getGlobalSetting(GlobalSetting.suggestNPMInstall) == 'no') return;

  const res = await window.showInformationMessage(
    `Would you like to install node modules for this project?`,
    'Yes',
    'No',
    'Never',
  );
  if (res == 'Never') {
    setGlobalSetting(GlobalSetting.suggestNPMInstall, 'no');
    return;
  }
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
    case PackageManager.bun:
      return bun(operation, name);
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

function bun(operation: PMOperation, name?: string): string {
  switch (operation) {
    case PMOperation.installAll:
      return 'bun install';
    case PMOperation.install:
      return `bun install ${name}  --save-exact`;
    case PMOperation.uninstall:
      return `bun uninstall ${name}`;
    case PMOperation.run:
      return `bun run ${name}`;
    case PMOperation.update:
      return `bun update`;
  }
}

interface NpxOptions {
  forceNpx?: boolean; // Will force to use npx instead of the package manager default
}

export function npx(project: Project, options?: NpxOptions): string {
  switch (project.packageManager) {
    case PackageManager.bun:
      return `${InternalCommand.cwd}bunx`;
    case PackageManager.pnpm:
      return `${InternalCommand.cwd}pnpm exec`;
    case PackageManager.yarn:
      if (options?.forceNpx && !project.isModernYarn()) {
        return `${InternalCommand.cwd}npx`;
      }
      if (exists('@yarnpkg/pnpify')) {
        return `${InternalCommand.cwd}yarn pnpify`;
      }
      return `${InternalCommand.cwd}yarn exec`;
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
