import { ionicState } from './ionic-tree-provider';
import * as vscode from 'vscode';

export enum WorkspaceSetting {
  liveReload = 'liveReload',
  httpsForWeb = 'httpsForWeb',
  pluginDrift = 'pluginDrift', // Whether the user has been shown the plugin drift compared to NexusBrowser app
  webAction = 'webAction',
  logFilter = 'logFilter',
  cocoaPods = 'cocoaPods2',
}

export enum ExtensionSetting {
  internalAddress = 'internalAddress',
  javaHome = 'javaHome',
}

export function getSetting(key: WorkspaceSetting): any {
  return ionicState.context.workspaceState.get(key);
}

export async function setSetting(key: WorkspaceSetting, value: any): Promise<void> {
  await ionicState.context.workspaceState.update(key, value);
}

export function getExtSetting(key: ExtensionSetting): any {
  return vscode.workspace.getConfiguration('ionic').get(key);
}
