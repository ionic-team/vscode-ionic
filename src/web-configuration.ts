import * as vscode from 'vscode';
import { Project } from './project';
import { getSetting, setSetting, WorkspaceSetting } from './workspace-state';

export enum WebConfigSetting {
  welcome = 'Show Development Server Page',
  browser = 'Open Web Browser',
  editor = 'Open App in Editor',
}

export function getWebConfiguration(): WebConfigSetting {
  const setting = getSetting(WorkspaceSetting.webAction);
  if (setting) {
    return setting;
  } else {
    return WebConfigSetting.welcome;
  }
}

export async function webConfiguration(project: Project): Promise<string | undefined> {
  const setting = getSetting(WorkspaceSetting.webAction);
  const configs = [
    check(WebConfigSetting.welcome, setting),
    check(WebConfigSetting.browser, setting),
    check(WebConfigSetting.editor, setting),
  ];

  const selection = await vscode.window.showQuickPick(configs, {
    placeHolder: 'Select the default action when running for web',
  });
  if (selection) {
    setSetting(WorkspaceSetting.webAction, selection);
  }
  return selection;
}

function check(msg: string, setting: string): string {
  if (msg === setting) {
    return msg + ` $(check)`;
  }
  return msg;
}
