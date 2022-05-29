import * as child_process from 'child_process';
import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import { RunPoint, TipFeature } from './tip';
import { debugBrowser, viewInEditor } from './editor-preview';
import { handleError } from './error-handler';
import { ionicState, IonicTreeProvider } from './ionic-tree-provider';
import { getMonoRepoFolder, getPackageJSONFilename } from './monorepo';
import { InternalCommand } from './command-name';
import { exists } from './analyzer';
import { ionicInit } from './ionic-init';

export interface CancelObject {
  proc: child_process.ChildProcess;
  cancelled: boolean;
}

const opTiming = {};
let serverUrl = undefined;

export function estimateRunTime(command: string) {
  const idx = command.replace(InternalCommand.cwd, '');
  if (opTiming[idx]) {
    return opTiming[idx];
  } else {
    return undefined;
  }
}

function runOptions(command: string, folder: string, shell?: string) {
  const env = { ...process.env };
  const javaHome: string = vscode.workspace.getConfiguration('ionic').get('javaHome');

  // Cocoapods required lang set to en_US.UTF-8 (when capacitor sync or run ios is done)
  if (
    command.includes('sync') ||
    command.includes('capacitor init') ||
    command.includes('cap run ios') ||
    command.includes('cap add')
  ) {
    env.LANG = 'en_US.UTF-8';
  }

  if (javaHome) {
    env.JAVA_HOME = javaHome;
  } else if (!env.JAVA_HOME && process.platform !== 'win32') {
    const jhome = '/Applications/Android Studio.app/Contents/jre/Contents/Home';
    if (fs.existsSync(jhome)) {
      env.JAVA_HOME = jhome;
    }
  }

  return { cwd: folder, shell: shell ? shell : ionicState.shell, encoding: 'utf8', env: env };
}

export async function run(
  folder: string,
  command: string,
  channel: vscode.OutputChannel,
  cancelObject: CancelObject,
  features: Array<TipFeature>,
  runPoints: Array<RunPoint>,
  progress: any,
  ionicProvider?: IonicTreeProvider
): Promise<boolean> {
  if (command == InternalCommand.removeCordova) {
    return await removeCordovaFromPackageJSON(folder);
  }
  if (command == InternalCommand.ionicInit) {
    await ionicInit(folder);
    return false;
  }

  if (command.includes(InternalCommand.cwd)) {
    command = replaceAll(command, InternalCommand.cwd, '');
    // Change the work directory for monorepos as folder is the root folder
    folder = getMonoRepoFolder(ionicState.workspace);
  }
  command = qualifyCommand(command);

  let viewEditor = features.includes(TipFeature.debugOnWeb) || features.includes(TipFeature.viewInEditor);

  let logs: Array<string> = [];
  return new Promise((resolve, reject) => {
    const start_time = process.hrtime();
    const interval = setInterval(() => {
      if (cancelObject.cancelled) {
        clearInterval(interval);
        reject(`${command} Cancelled`);
      }
    }, 500);

    const proc = child_process.exec(
      command,
      runOptions(command, folder),
      async (error: child_process.ExecException, stdout: string, stderror: string) => {
        let retry = false;
        if (error) {
          console.error(error);
        }

        // Quirk of windows robocopy is that it logs errors/exit code on success
        if (!error || command.includes('robocopy')) {
          const end_time = process.hrtime(start_time);
          if (!cancelObject?.cancelled) {
            opTiming[command] = end_time[0]; // Number of seconds
          }

          // Allows handling of linting and tests
          retry = await handleError(undefined, logs, folder);
          clearInterval(interval);
          resolve(retry);
        } else {
          if (!cancelObject?.cancelled) {
            retry = await handleError(stderror, logs, folder);
          }
          clearInterval(interval);
          if (retry) {
            resolve(retry);
          } else {
            reject(`${command} Failed`);
          }
        }
      }
    );

    proc.stdout.on('data', (data) => {
      if (data) {
        const loglines = data.split('\n');
        logs = logs.concat(loglines);
        if (viewEditor) {
          if (data.includes('Local: http')) {
            serverUrl = getStringFrom(data, 'Local: ', '\n');
            const url = serverUrl;
            channel.appendLine(`[Ionic] Launching ${url}`);
            viewEditor = false;
            setTimeout(() => handleUrl(url, features), 500);
          } else if (data.includes('open your browser on')) {
            // Likely React
            serverUrl = getStringFrom(data, 'open your browser on ', ' **');
            const url = serverUrl;
            channel.appendLine(`[Ionic] Launching ${url}`);
            viewEditor = false;
            setTimeout(() => handleUrl(url, features), 500);
          } else if (data.includes('- Local:   ')) {
            // Likely Vue
            serverUrl = getStringFrom(data, 'Local: ', '\n');
            const url = serverUrl.trim();
            channel.appendLine(`[Ionic] Launching ${url}`);
            viewEditor = false;
            setTimeout(() => handleUrl(url, features), 500);
          }
        }

        // Based on found text logged change the progress message in the status bar
        if (runPoints) {
          for (const runPoint of runPoints) {
            if (data.includes(runPoint.text)) {
              progress.report({ message: runPoint.title });
              if (runPoint.refresh && ionicProvider) {
                ionicProvider.refresh();
              }
            }
          }
        }

        for (const logline of loglines) {
          if (logline.startsWith('[capacitor]')) {
            channel.appendLine(logline.replace('[capacitor]', ''));
          } else if (logline) {
            const nocolor = logline.replace(
              /[\033\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
              ''
            );
            channel.appendLine(nocolor);
          }
        }
        focusOutput(channel);
      }
    });

    proc.stderr.on('data', (data) => {
      channel.append(data);
      focusOutput(channel);
    });

    if (cancelObject) {
      cancelObject.proc = proc;
    }
  });
}

function handleUrl(url: string, features: Array<TipFeature>) {
  if (features.includes(TipFeature.viewInEditor)) {
    viewInEditor(url);
  } else {
    debugBrowser(url);
  }
}

/**
 * This ensures that the focus is not pushed to the output window while you are editing a document
 * @param  {vscode.OutputChannel} channel
 */
function focusOutput(channel: vscode.OutputChannel) {
  if (ionicState.outputIsFocused) return;
  channelShow(channel);
}

export function replaceAll(str: string, find: string, replace: string): string {
  return str.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
}

// This will use the local @ionic/cli from the extension if one is not installed locally
function qualifyCommand(command: string): string {
  if (command.startsWith('npx ionic')) {
    if (!exists('@ionic/cli')) {
      const cli = path.join(ionicState.context.extensionPath, 'node_modules/@ionic/cli/bin');
      if (fs.existsSync(cli)) {
        command = command.replace('npx ionic', 'node ' + path.join(cli, 'ionic'));
      }
    }
  }
  return command;
}

export async function openUri(uri: string): Promise<void> {
  if (uri?.includes('//')) {
    await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(uri));
  } else {
    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(uri));
  }
}

export function debugSkipFiles(): string {
  try {
    let debugSkipFiles: string = vscode.workspace.getConfiguration('ionic').get('debugSkipFiles');
    if (!debugSkipFiles) {
      return undefined;
    }
    if (debugSkipFiles.includes("'")) {
      debugSkipFiles = debugSkipFiles.replace(/'/g, '"');
    }
    const list = JSON.parse(debugSkipFiles);
    if (!Array.isArray(list)) {
      throw new Error('debugSkipFiles not a valid array');
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Unable to parse debugSkipFiles variable. Ensure it is a valid JSON array. ${error}`
    );
    return undefined;
  }
}

export async function getRunOutput(command: string, folder: string, shell?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = '';
    command = qualifyCommand(command);
    child_process.exec(
      command,
      runOptions(command, folder, shell),
      (error: child_process.ExecException, stdout: string, stderror: string) => {
        if (stdout) {
          out += stdout;
        }
        if (!error) {
          resolve(out);
        } else {
          if (stderror) {
            console.error(stderror);
            reject(stderror);
          } else {
            // This is to fix a bug in npm outdated where it returns an exit code when it succeeds
            resolve(out);
          }
        }
      }
    );
  });
}

export function channelShow(channel: vscode.OutputChannel) {
  if (ionicState.channelFocus) {
    channel.show();
    ionicState.channelFocus = false;
  }
}

export function getPackageJSON(folder: string): PackageFile {
  const filename = getPackageJSONFilename(folder);
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

export function getStringFrom(data: string, start: string, end: string): string {
  const foundIdx = data.lastIndexOf(start);
  if (foundIdx == -1) {
    return undefined;
  }
  const idx = foundIdx + start.length;
  return data.substring(idx, data.indexOf(end, idx));
}

export function setStringIn(data: string, start: string, end: string, replacement: string): string {
  const foundIdx = data.lastIndexOf(start);
  if (foundIdx == -1) {
    return data;
  }
  const idx = foundIdx + start.length;
  return data.substring(0, idx) + replacement + data.substring(data.indexOf(end, idx));
}

export function replaceStringIn(data: string, start: string, end: string, replacement: string): string {
  const foundIdx = data.lastIndexOf(start);
  if (foundIdx == -1) {
    return data;
  }
  const idx = foundIdx;
  return data.substring(0, idx) + replacement + data.substring(data.indexOf(end, idx) + end.length);
}

export function generateUUID(): string {
  return new Date().getTime().toString(36) + Math.random().toString(36).slice(2);
}
/**
 * Given user input convert to a usuable app identifier
 * @param  {string} name
 * @returns string
 */
export function asAppId(name: string): string {
  if (!name) return 'Unknown';
  name = name.split('-').join('.');
  name = name.split(' ').join('.');
  if (!name.includes('.')) {
    name = 'com.' + name; // Must have at least a . in the name
  }
  return name;
}

export interface PackageFile {
  name: string;
  displayName: string;
  description: string;
  version: string;
  scripts: Record<string, unknown>;
}

export async function showMessage(message: string, ms: number) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: message,
      cancellable: false,
    },
    async () => {
      await timeout(ms); // Show the message for 3 seconds
    }
  );
}

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeCordovaFromPackageJSON(folder: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const filename = path.join(folder, 'package.json');
      const packageFile = JSON.parse(fs.readFileSync(filename, 'utf8'));
      packageFile.cordova = undefined;
      fs.writeFileSync(filename, JSON.stringify(packageFile, undefined, 2));

      // Also replace cordova in ionic.config.json
      const ifilename = path.join(folder, 'ionic.config.json');
      if (fs.existsSync(ifilename)) {
        const ionicConfig = JSON.parse(fs.readFileSync(ifilename, 'utf8'));
        if (ionicConfig.integrations.cordova) {
          delete ionicConfig.integrations.cordova;
          ionicConfig.integrations.capacitor = new Object();
        }
        fs.writeFileSync(ifilename, JSON.stringify(ionicConfig, undefined, 2));
      }
      resolve(false);
    } catch (err) {
      reject(err);
    }
  });
}
