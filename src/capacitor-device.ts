import * as vscode from 'vscode';
import { handleError } from './error-handler';
import { ionicState } from './ionic-tree-provider';

import { Tip } from './tip';
import { getRunOutput } from './utilities';

/**
 * Uses vscodes Quick pick dialog to allow selection of a device and
 * returns the command used to run on the selected device
 * @param  {string} command
 * @param  {string} rootPath
 */
export async function selectDevice(command: string, rootPath: string, tip: Tip): Promise<string> {
  const preselected = command.includes('android') ? ionicState.selectedAndroidDevice : ionicState.selectedIOSDevice;
  if (preselected) {
    return preselected;
  }
  let devices;
  await showProgress('Getting Devices...', async () => {
    devices = await getDevices(command, rootPath);
  });

  //const devices = await getDevices(command, rootPath);
  const names = devices.map((device) => device.name);
  if (names.length == 0) {
    return;
  }
  const selected = await vscode.window.showQuickPick(names, { placeHolder: 'Select a device to run application on' });
  const device = devices.find((device) => device.name == selected);
  if (!device) return;
  tip.commandTitle = device?.name;
  if (command.includes('android')) {
    ionicState.selectedAndroidDevice = device?.target;
    ionicState.selectedAndroidDeviceName = device?.name;
  } else {
    ionicState.selectedIOSDevice = device?.target;
    ionicState.selectedIOSDeviceName = device?.name;
  }
  return device?.target;
}

/**
 * Runs the command and obtains the stdout, parses it for the list of device names and target ids
 * @param  {string} command Node command which gathers device list
 * @param  {string} rootPath Path where the node command runs
 */
async function getDevices(command: string, rootPath: string) {
  try {
    const result = await getRunOutput(command, rootPath);

    const lines = result.split('\n');
    lines.shift(); // Remove the header
    const devices = [];
    for (const line of lines) {
      const data = line.split('|');
      if (data.length == 3) {
        const target = data[2].trim();
        if (target != '?') {
          devices.push({ name: data[0].trim() + ' ' + data[1].trim(), target: target });
        }
      } else {
        const device = parseDevice(line);
        if (device) {
          devices.push(device);
        }
      }
    }
    if (devices.length == 0) {
      vscode.window.showErrorMessage(`Unable to find any devices: ${result}`, 'OK');
    }
    return devices;
  } catch (error) {
    handleError(error, [], rootPath);
  }
}

function parseDevice(line: string) {
  try {
    const name = line.substring(0, line.indexOf('  ')).trim();
    line = line.substring(line.indexOf('  ')).trim();
    const args = line.replace('  ', '|').split('|');
    return { name: name + ' ' + args[0].trim(), target: args[1].trim() };
  } catch {
    return undefined;
  }
}

async function showProgress(message: string, func: () => Promise<any>) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `${message}`,
      cancellable: true,
    },
    async (progress, token) => {
      await func();
    }
  );
}
