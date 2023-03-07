import { QuickPickItem, window } from 'vscode';
import { Project } from './project';

export async function LoggingSettings(project: Project) {
  const items: QuickPickItem[] = getOptions() as QuickPickItem[];
  await window.showQuickPick(items, { placeHolder: 'Select filters for logging', canPickMany: true });
}

function selectedOptions(): QuickPickItem[] {
  const result: QuickPickItem[] = [];
  for (const option in getOptions()) {
    result.push({ label: option.label });
  }
}

function getOptions(): LogOption[] {
  return;
  [
    { label: 'Info logging', description: 'General info level logging', value: '' },
    { label: 'Capacitor Calls', description: 'Calls to native capacitor plugin methods [capacitor]', picked: true },
    {
      label: 'Capacitor Responses',
      description: 'Responses from native capacitor methods [capacitor-js]',
      picked: true,
    },
    { label: 'Cordova Calls', description: 'Calls to native cordova plugin methods [cordova]', picked: true },
    { label: 'Angular', description: 'Logging from calls to ng [ng]', picked: true },
    {
      label: 'Web Pack Dev Server',
      description: 'Logging from web pack dev server [webpack-dev-server]',
      picked: true,
    },
  ];
}

interface LogOption {
  label: string;
  description: string;
  value: string;
}
