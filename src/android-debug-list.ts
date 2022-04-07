import * as vscode from 'vscode';
import { debugAndroid } from './android-debug';
import { findDevices, findWebViews } from './android-debug-bridge';
import { Device, WebView } from './android-debug-models';
import { CommandName } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { Recommendation } from './recommendation';
import { Tip, TipType } from './tip';

export async function getAndroidWebViewList(hasCapacitorAndroid: boolean): Promise<Recommendation[]> {
  if (ionicState.refreshDebugDevices) {
    ionicState.refreshDebugDevices = false;
  }
  if (!hasCapacitorAndroid) {
    return [];
  }

  const result: Array<Recommendation> = [];
  const devices = await findDevices();
  for (const device of devices) {
    const webviews = await findWebViews(device!);
    for (const webview of webviews) {
      const r = new Recommendation(
        `Debug ${webview.packageName} ${webview.versionName} on running Android device ${device.product}`,
        `(${device.product})`,
        `${webview.packageName}`,
        vscode.TreeItemCollapsibleState.None,
        getCommand(),
        undefined
      );
      r.setIcon('debug');
      r.tip = new Tip(undefined, undefined, TipType.Run).setAction(debug, device, webview);
      r.command.arguments = [r];
      result.push(r);
    }
    if (webviews.length == 0) {
      const r = new Recommendation(
        'test',
        'No Web View',
        device.product,
        vscode.TreeItemCollapsibleState.None,
        getCommand(),
        undefined
      );
      r.setIcon('android');
      result.push(r);
    }
  }
  return result;
}

function debug(device: Device, webview: WebView) {
  debugAndroid(webview.packageName);
}

function getCommand(): vscode.Command {
  return {
    command: CommandName.Function,
    title: 'Open',
  };
}
