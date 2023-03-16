import { existsSync } from 'fs';
import * as vscode from 'vscode';

import { exists, isLess } from './analyzer';
import { getConfigurationArgs } from './build-configuration';
import { CapacitorPlatform } from './capacitor-platform';
import { InternalCommand } from './command-name';
import { getOutputChannel, writeError } from './extension';
import { ionicBuild } from './ionic-build';
import { ionicState } from './ionic-tree-provider';
import { certPath, liveReloadSSL } from './live-reload';
import { MonoRepoType } from './monorepo';
import { npx, PackageManager, preflightNPMCheck } from './node-commands';
import { Project } from './project';
import { ExtensionSetting, getExtSetting, getSetting, WorkspaceSetting } from './workspace-state';

/**
 * Creates the command line to run for Capacitor
 * @param  {CapacitorPlatform} platform
 * @param  {Project} project
 * @returns string
 */
export function capacitorRun(project: Project, platform: CapacitorPlatform): string {
  let preop = '';
  let rebuilt = false;
  let noSync = false;

  // If the user modified something in the editor then its likely they need to rebuild the app before running
  if (ionicState.projectDirty) {
    const channel = getOutputChannel();
    channel.appendLine('[Ionic] Rebuilding as you changed your project...');
    preop = ionicBuild(project);
    rebuilt = true;
  } else {
    preop = preflightNPMCheck(project);
  }

  noSync = ionicState.syncDone.includes(platform);

  ionicState.refreshDebugDevices = true;
  ionicState.lastRun = platform;

  switch (project.repoType) {
    case MonoRepoType.none:
    case MonoRepoType.folder:
    case MonoRepoType.pnpm:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.npm:
      return preop + capRun(platform, project.repoType, rebuilt, noSync, project);
    case MonoRepoType.nx:
      return preop + nxRun(platform, project.repoType, rebuilt, noSync, project);
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

export function capacitorDevicesCommand(platform: CapacitorPlatform, packageManager: PackageManager): string {
  const ionic = useIonicCLI() ? 'ionic ' : '';
  return `${npx(packageManager)} ${ionic}cap run ${platform} --list`;
}

export function useIonicCLI(): boolean {
  if (exists('@capacitor/cli')) {
    return false;
  }
  return exists('@ionic/cli');
}

function capRun(
  platform: CapacitorPlatform,
  repoType: MonoRepoType,
  noBuild: boolean,
  noSync: boolean,
  project: Project
): string {
  let liveReload = getSetting(WorkspaceSetting.liveReload);
  const externalIP = !getExtSetting(ExtensionSetting.internalAddress);
  const httpsForWeb = getSetting(WorkspaceSetting.httpsForWeb);
  const prod: boolean = vscode.workspace.getConfiguration('ionic').get('buildForProduction');

  if (liveReload && project.repoType == MonoRepoType.npm) {
    writeError('Live Reload is not supported with npm workspaces. Ignoring the live reload option');
    liveReload = false;
  }
  let capRunFlags = liveReload ? ' --livereload' : '';

  if (liveReload && exists('@ionic-enterprise/auth') && isLess('@ionic-enterprise/auth', '3.9.4')) {
    capRunFlags = '';
    // @ionic-enterprise/auth gets a crypt error when running with an external IP address. So avoid the issue
    const channel = getOutputChannel();
    channel.appendLine(
      '[Ionic] Live Update was ignored as you have less than v3.9.4 of @ionic-enterprise/auth in your project'
    );
  }

  const ionic = useIonicCLI() || liveReload ? 'ionic ' : '';

  if (externalIP) {
    if (capRunFlags.length >= 0) capRunFlags += ' ';
    capRunFlags += '--external';
  }

  if (ionic != '' && prod) {
    if (capRunFlags.length >= 0) capRunFlags += ' ';
    capRunFlags += '--prod';
  }

  // Live reload clashes with --no-build
  if (noBuild && !liveReload) {
    if (capRunFlags.length >= 0) capRunFlags += ' ';
    capRunFlags += '--no-build';
  }

  if (noSync) {
    if (capRunFlags.length >= 0) capRunFlags += ' ';
    capRunFlags += '--no-sync';
  }

  capRunFlags += getConfigurationArgs();

  if (httpsForWeb) {
    if (capRunFlags.length >= 0) capRunFlags += ' ';
    capRunFlags += '--ssl';

    if (!existsSync(certPath('crt'))) {
      liveReloadSSL(project);
      return '';
    }
    capRunFlags += ` -- --ssl-cert='${certPath('crt')}'`;
    capRunFlags += ` --ssl-key='${certPath('key')}'`;
  }

  const pre =
    repoType == MonoRepoType.npm ||
    repoType == MonoRepoType.folder ||
    repoType == MonoRepoType.pnpm ||
    repoType == MonoRepoType.yarn ||
    repoType == MonoRepoType.lerna
      ? InternalCommand.cwd
      : '';

  return `${pre}${npx(project.packageManager)} ${ionic}cap run ${platform} --target=${
    InternalCommand.target
  } ${capRunFlags}`;
}

function nxRun(
  platform: CapacitorPlatform,
  repoType: MonoRepoType,
  noBuild: boolean,
  noSync: boolean,
  project: Project
): string {
  if (project.monoRepo?.isNXStandalone) {
    return capRun(platform, repoType, noBuild, noSync, project);
  }
  // Note: This may change, see: https://github.com/nxtend-team/nxtend/issues/490
  return `${npx(project.packageManager)} nx run ${project.monoRepo.name}:cap --cmd "run ${platform} --target=${
    InternalCommand.target
  }"`;
}
