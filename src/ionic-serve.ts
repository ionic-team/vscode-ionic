import { networkInterfaces } from 'os';
import * as vscode from 'vscode';

import { InternalCommand } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { MonoRepoType } from './monorepo';
import { preflightNPMCheck } from './node-commands';
import { Project } from './project';

/**
 * Create the ionic serve command
 * @returns string
 */
export function ionicServe(project: Project, dontOpenBrowser: boolean): string {
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
  const httpsForWeb = vscode.workspace.getConfiguration('ionic').get('httpsForWeb');
  const previewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
  const externalIP = vscode.workspace.getConfiguration('ionic').get('externalAddress');
  let serveFlags = '';
  if (previewInEditor || dontOpenBrowser) {
    serveFlags += ' --no-open';
  }
  if (httpsForWeb) {
    serveFlags += ' --ssl';
  }
  if (externalIP) {
    serveFlags += ' --external';
  }

  return `${preop}npx ionic serve${serveFlags}`;
}

function nxServe(project: Project): string {
  return `npx nx serve ${project.monoRepo.name}`;
}

export async function selectExternalIPAddress(): Promise<string> {
  const liveReload = vscode.workspace.getConfiguration('ionic').get('liveReload');
  const externalIP = vscode.workspace.getConfiguration('ionic').get('externalAddress');
  if (!externalIP && !liveReload) {
    return;
  }
  const list = getAddresses();
  if (list.length <= 1) {
    return;
  }
  const selected = await vscode.window.showQuickPick(list, {
    placeHolder: 'Select the external network address to use',
  });
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
