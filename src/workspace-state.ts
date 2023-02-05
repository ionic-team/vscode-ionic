import { ionicState } from './ionic-tree-provider';
import * as vscode from 'vscode';

export enum WorkspaceSetting {
  liveReload = 'liveReload',
  httpsForWeb = 'httpsForWeb',
  previewInEditor = 'previewInEditor',
  previewQR = 'previewQR',
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
