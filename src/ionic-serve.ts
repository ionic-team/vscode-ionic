import { existsSync } from 'fs';
import { networkInterfaces } from 'os';

import { getConfigurationArgs } from './build-configuration';
import { InternalCommand } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { certPath } from './live-reload';
import { MonoRepoType } from './monorepo';
import { npx, preflightNPMCheck } from './node-commands';
import { Project } from './project';
import { liveReloadSSL } from './live-reload';
import { ExtensionSetting, getExtSetting, getSetting, setSetting, WorkspaceSetting } from './workspace-state';
import { getWebConfiguration, WebConfigSetting } from './web-configuration';
import { window, workspace } from 'vscode';

/**
 * Create the ionic serve command
 * @returns string
 */
export async function ionicServe(project: Project, dontOpenBrowser: boolean): Promise<string> {
  ionicState.lastRun = undefined;
  switch (project.repoType) {
    case MonoRepoType.none:
      return ionicCLIServe(project, dontOpenBrowser);
    case MonoRepoType.nx:
      return nxServe(project);
    case MonoRepoType.npm:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.pnpm:
    case MonoRepoType.folder:
      return InternalCommand.cwd + ionicCLIServe(project, dontOpenBrowser);
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function ionicCLIServe(project: Project, dontOpenBrowser: boolean): string {
  const preop = preflightNPMCheck(project);
  const httpsForWeb = getSetting(WorkspaceSetting.httpsForWeb);
  const webConfig: WebConfigSetting = getWebConfiguration();
  const externalIP = !getExtSetting(ExtensionSetting.internalAddress);
  const defaultPort = workspace.getConfiguration('ionic').get('defaultPort');
  let serveFlags = '';
  if (webConfig == WebConfigSetting.editor || webConfig == WebConfigSetting.welcomeNoBrowser || dontOpenBrowser) {
    serveFlags += ' --no-open';
  }

  if (externalIP) {
    serveFlags += ' --external';
  }
  if (defaultPort && defaultPort !== 8100) {
    serveFlags += ` --port=${defaultPort}`;
  }

  if (ionicState.project) {
    serveFlags += ` --project=${ionicState.project}`;
  }

  serveFlags += getConfigurationArgs(dontOpenBrowser);

  if (httpsForWeb) {
    serveFlags += ' --ssl';
    if (!existsSync(certPath('crt'))) {
      liveReloadSSL(project);
      return '';
    }
    serveFlags += ` -- --ssl-cert='${certPath('crt')}'`;
    serveFlags += ` --ssl-key='${certPath('key')}'`;
  }

  return `${preop}${npx(project.packageManager)} ionic serve${serveFlags}`;
}

function nxServe(project: Project): string {
  let serveFlags = '';
  const externalIP = !getExtSetting(ExtensionSetting.internalAddress);
  if (externalIP) {
    const list = getAddresses();
    if (list.length == 1) {
      serveFlags += ` --host=${list[0]}`;
    } else {
      serveFlags += ' --host=0.0.0.0';
    }
  }
  return `${npx(project.packageManager)} nx serve ${project.monoRepo.name}${serveFlags}`;
}

export async function selectExternalIPAddress(): Promise<string> {
  const liveReload = getSetting(WorkspaceSetting.liveReload);
  const externalIP = !getExtSetting(ExtensionSetting.internalAddress);
  if (!externalIP && !liveReload) {
    return;
  }
  const list = getAddresses();
  if (list.length <= 1) {
    return;
  }
  const lastIPAddress = getSetting(WorkspaceSetting.lastIPAddress);
  for (const address of list) {
    if (address == lastIPAddress) {
      return lastIPAddress;
    }
  }
  const selected = await window.showQuickPick(list, {
    placeHolder: 'Select the external network address to use',
  });
  if (selected) {
    setSetting(WorkspaceSetting.lastIPAddress, selected);
  }
  return selected;
}

function getAddresses(): Array<string> {
  const nets = networkInterfaces();
  const result = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // Skip over link-local addresses (same as Ionic CLI)
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        result.push(net.address);
      }
    }
  }
  return result;
}
