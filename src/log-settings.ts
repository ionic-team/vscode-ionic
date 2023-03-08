import { QuickPickItem, window } from 'vscode';
import { Project } from './project';
import { getSetting, setSetting, WorkspaceSetting } from './workspace-state';

export async function LoggingSettings(project: Project) {
  const items: QuickPickItem[] = selectedOptions();
  const result = await window.showQuickPick(items, {
    placeHolder: 'Select log types to report to the output window',
    canPickMany: true,
  });
  if (!result) return;
  const list = result.map((item: any) => item.value);
  const selections = [];
  for (const option of getOptions()) {
    if (!list.includes(option.value)) {
      selections.push(option.value);
    }
  }
  setSetting(WorkspaceSetting.logFilter, selections);
}

function selectedOptions(): QuickPickItem[] {
  const result: QuickPickItem[] = [];
  const filter = getSetting(WorkspaceSetting.logFilter);
  for (const option of getOptions()) {
    const choice: QuickPickItem = option as QuickPickItem;
    choice.picked = !filter || !filter.includes(option.value);
    result.push(choice);
  }
  return result;
}

function getOptions(): LogOption[] {
  return [
    { label: 'Info logging', description: 'General info level logging', value: '' },
    {
      label: 'Capacitor Calls',
      description: 'Calls to native capacitor plugin methods [capacitor]',
      value: '[capacitor]',
    },
    {
      label: 'Capacitor Responses',
      description: 'Responses from native capacitor methods [capacitor-js]',
      value: '[capacitor-js]',
    },
    { label: 'Cordova Calls', description: 'Calls to native cordova plugin methods [cordova]', value: '[cordova]' },
    { label: 'Angular', description: 'Logging from calls to ng [ng]', value: '[ng]' },
    {
      label: 'Webpack Dev Server',
      description: 'Logging from web pack dev server [webpack-dev-server]',
      value: '[webpack-dev-server]',
    },
  ];
}

interface LogOption {
  label: string;
  description: string;
  value: string;
}
