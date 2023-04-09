import { vscode } from './vscode';

export enum MessageType {
  getPlugins = 'getPlugins',
  getInstalledDeps = 'getInstalledDeps',
}

export function sendMessage(command: MessageType, value: string) {
  vscode.postMessage({ command, text: value });
}
