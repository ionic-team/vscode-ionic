import { ionicState } from './ionic-tree-provider';

export enum WorkspaceSetting {
  liveReload = 'liveReload',
  externalAddress = 'externalAddress',
  httpsForWeb = 'httpsForWeb',
  previewInEditor = 'previewInEditor',
}

export function getSetting(key: WorkspaceSetting): any {
  return ionicState.context.workspaceState.get(key);
}

export async function setSetting(key: WorkspaceSetting, value: any): Promise<void> {
  await ionicState.context.workspaceState.update(key, value);
}
