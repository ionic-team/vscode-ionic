import { window } from 'vscode';
import { WorkspaceSetting, getSetting, setSetting } from './workspace-state';

// Feature Flags for experimental options
export const features = {
  debugAndroid: true, // Whether debugging for Android is turned on
  pluginExplorer: false, // Whether the plugin explorer is shown
};

export function showTips() {
  const shortcuts = '[shortcuts]';
  const tips = getSetting(WorkspaceSetting.tips);
  if (!tips?.includes(shortcuts)) {
    window.showInformationMessage('Ionic Tip: Press Alt+D to debug your app and Alt+R to run it!', 'OK');
    setSetting(WorkspaceSetting.tips, tips + shortcuts);
  }
}
