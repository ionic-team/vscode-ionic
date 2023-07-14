import { ionicState } from './ionic-tree-provider';
import * as vscode from 'vscode';

export enum WorkspaceSetting {
  liveReload = 'liveReload',
  httpsForWeb = 'httpsForWeb',
  pluginDrift = 'pluginDrift', // Whether the user has been shown the plugin drift compared to NexusBrowser app
  webAction = 'webAction',
  logFilter = 'logFilter',
  tips = 'tipsShown',
  lastIPAddress = 'lastIPAddress',
  debugBrowser = 'debugBrowser',

  cocoaPods = 'cocoaPods2',
}

export enum ExtensionSetting {
  internalAddress = 'internalAddress',
  javaHome = 'javaHome',
}

export enum GlobalSetting {
  lastTipsShown = 'lastTipsShown',
  projectsFolder = 'projectsFolder',
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

export function getGlobalSetting(key: GlobalSetting): any {
  return ionicState.context.globalState.get(key);
}

export async function setGlobalSetting(key: GlobalSetting, value: any): Promise<void> {
  return await ionicState.context.globalState.update(key, value);
}
