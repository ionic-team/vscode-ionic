'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import { Context, VSCommand } from './context-variables';
import { ionicLogin, ionicSignup } from './ionic-auth';
import { ionicState, IonicTreeProvider } from './ionic-tree-provider';
import { clearRefreshCache } from './process-packages';
import { Recommendation } from './recommendation';
import { installPackage, reviewProject } from './project';
import { Command, Tip, TipFeature, TipType } from './tip';
import { CancelObject, run, estimateRunTime, channelShow, openUri, stopPublishing, replaceAll } from './utilities';
import { ignore } from './ignore';
import { ActionResult, CommandName, InternalCommand } from './command-name';
import { packageUpgrade } from './rules-package-upgrade';
import { IonicProjectsreeProvider } from './ionic-projects-provider';
import { buildConfiguration } from './build-configuration';
import { webConfiguration } from './web-configuration';
import { selectDevice } from './capacitor-device';
import { getLocalFolder } from './monorepo';
import { androidDebugUnforward } from './android-debug-bridge';
import { AndroidDebugProvider } from './android-debug-provider';
import { IonicDevServerProvider } from './ionic-devserver-provider';
import { AndroidDebugType } from './android-debug';
import { CapacitorPlatform } from './capacitor-platform';
import { kill } from './process-list';
import { selectExternalIPAddress } from './ionic-serve';
import { advancedActions } from './advanced-actions';
import { PluginExplorerPanel } from './plugin-explorer';
import { features } from './features';

let channel: vscode.OutputChannel = undefined;
let runningOperations = [];
let runningActions: Array<Tip> = [];
export let lastOperation: Tip;

async function requestAppName(tip: Tip, path: string) {
  const suggestion = suggestName(path);
  let name = await vscode.window.showInputBox({
    title: 'Internal name of the application',
    placeHolder: suggestion,
    value: suggestion,
    validateInput: (value: string) => {
      const regexp = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
      if (!regexp.test(value)) {
        return 'The name cannot contain spaces, some characters and should be lowercase';
      }
      return null;
    },
  });
  if (name && name.length > 1) {
    const result = [];
    name = name.replace(/ /g, '-');
    let packageId = name.replace(/ /g, '.').replace(/-/g, '.');
    if (!packageId.includes('.')) {
      packageId = `ionic.${packageId}`;
    }
    for (const command of tip.command) {
      result.push(
        command
          .replace(new RegExp('@app', 'g'), `${name.trim()}`)
          .replace(new RegExp('@package-id', 'g'), `${packageId.trim()}`)
      );
    }
    return result;
  } else {
    return undefined;
  }
}

function suggestName(path: string): string {
  let name = 'my-app';
  try {
    let tmp = path.split('/');
    if (tmp.length == 0) {
      tmp = path.split('\\');
    }
    if (tmp.length > 0) {
      name = tmp[tmp.length - 1];
      name = replaceAll(name, ' ', '-').toLowerCase().trim();
    }
  } catch {
    name = 'my-app';
  }
  return name;
}

export function isRunning(tip: Tip) {
  const found: Tip = runningOperations.find((found) => {
    return found.sameAs(tip);
  });
  if (found == undefined) {
    const foundAction: Tip = runningActions.find((found) => {
      return found.sameAs(tip);
    });
    return foundAction != undefined;
  }
  return found != undefined;
}

export async function cancelLastOperation() {
  if (!lastOperation) return;
  if (!isRunning(lastOperation)) return;
  await cancelRunning(lastOperation);
}

function cancelRunning(tip: Tip): Promise<void> {
  const found: Tip = runningOperations.find((found) => {
    return found.sameAs(tip);
  });
  if (found) {
    found.cancelRequested = true;
    console.log('Found task to cancel...');
    if (tip.description == 'Serve') {
      stopPublishing();
    }
  }
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

export function finishCommand(tip: Tip) {
  runningOperations = runningOperations.filter((op: Tip) => {
    return !op.sameAs(tip);
  });
  runningActions = runningActions.filter((op: Tip) => {
    return !op.sameAs(tip);
  });
}

function startCommand(tip: Tip, cmd: string, clear?: boolean) {
  if (tip.title) {
    const message = tip.commandTitle ? tip.commandTitle : tip.title;
    if (clear !== false) {
      channel.clear();
    }
    channel.appendLine(`[Ionic] ${message}...`);
    let command = cmd;
    if (command?.includes(InternalCommand.cwd)) {
      command = command.replace(InternalCommand.cwd, '');
      if (ionicState.workspace) {
        channel.appendLine(`> Workspace: ${ionicState.workspace}`);
      }
    }
    channel.appendLine(`> ${command}`);
    channelShow(channel);
  }
}

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('Ionic');
    channel.show();
  }
  return channel;
}

export function clearOutput(): vscode.OutputChannel {
  const channel = getOutputChannel();
  channel.clear();
  channel.show();
  return channel;
}

export function writeIonic(message: string) {
  const channel = getOutputChannel();
  channel.appendLine(`[Ionic] ${message}`);
}

export function writeError(message: string) {
  const channel = getOutputChannel();
  channel.appendLine(`[error] ${message}`);
}

export function writeWarning(message: string) {
  const channel = getOutputChannel();
  channel.appendLine(`[warning] ${message}`);
}

export function markActionAsRunning(tip: Tip) {
  runningActions.push(tip);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queueEmpty(): boolean {
  if (runningActions.length == 0) return true;
  if (runningActions.length == 1 && runningActions[0].isNonBlocking()) return true;
  return false;
}

export async function waitForOtherActions(tip: Tip): Promise<boolean> {
  let cancelled = false;
  if (queueEmpty()) return false;
  if (tip.willNotWait()) return false;
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Task Queued: ${tip.title}`,
      cancellable: true,
    },
    async (progress, token: vscode.CancellationToken) => {
      while (!queueEmpty() && !cancelled) {
        await delay(500);

        if (token.isCancellationRequested) {
          cancelled = true;
        }
      }
    }
  );
  return cancelled;
}

export function markActionAsCancelled(tip: Tip) {
  runningActions = runningActions.filter((op: Tip) => {
    return !op.sameAs(tip);
  });
}

/**
 * Runs the command while showing a vscode window that can be cancelled
 * @param  {string|string[]} command Node command
 * @param  {string} rootPath path to run the command
 * @param  {IonicTreeProvider} ionicProvider? the provide which will be refreshed on completion
 * @param  {string} successMessage? Message to display if successful
 */
export async function fixIssue(
  command: string | string[],
  rootPath: string,
  ionicProvider?: IonicTreeProvider,
  tip?: Tip,
  successMessage?: string,
  title?: string
) {
  const channel = getOutputChannel();
  const hasRunPoints = tip && tip.runPoints && tip.runPoints.length > 0;

  if (command == Command.NoOp) {
    await tip.executeAction();
    ionicProvider?.refresh();
    return;
  }

  // If the task is already running then cancel it
  if (isRunning(tip)) {
    await cancelRunning(tip);
    if (tip.data == Context.stop) {
      channelShow(channel);
      return; // User clicked stop
    }
  }

  runningOperations.push(tip);
  lastOperation = tip;
  let msg = tip.commandProgress ? tip.commandProgress : tip.commandTitle ? tip.commandTitle : command;
  if (title) msg = title;
  let failed = false;
  await vscode.window.withProgress(
    {
      location: tip.progressDialog ? vscode.ProgressLocation.Notification : vscode.ProgressLocation.Window,
      title: `${msg}`,
      cancellable: true,
    },

    async (progress, token: vscode.CancellationToken) => {
      const cancelObject: CancelObject = { proc: undefined, cancelled: false };
      let increment = undefined;
      let percentage = undefined;

      const interval = setInterval(async () => {
        // Kill the process if the user cancels
        if (token.isCancellationRequested || tip.cancelRequested) {
          tip.cancelRequested = false;
          channel.appendLine(`[Ionic] Stopped "${tip.title}"`);
          if (tip.features.includes(TipFeature.welcome)) {
            vscode.commands.executeCommand(CommandName.hideDevServer);
          }

          if (tip.title.toLowerCase() == CapacitorPlatform.ios) {
            ionicState.selectedIOSDeviceName = '';
          }
          if (tip.title.toLowerCase() == CapacitorPlatform.android) {
            ionicState.selectedAndroidDeviceName = '';
          }

          channelShow(channel);
          clearInterval(interval);
          finishCommand(tip);
          cancelObject.cancelled = true;

          console.log(`Killing process ${cancelObject.proc.pid}`);
          await kill(cancelObject.proc, rootPath);
          if (ionicProvider) {
            ionicProvider.refresh();
          }
        } else {
          if (increment && !hasRunPoints) {
            percentage += increment;
            const msg = percentage > 100 ? ' ' : `${parseInt(percentage)}%`;
            progress.report({ message: msg, increment: increment });
          }
        }
      }, 1000);

      const commands = Array.isArray(command) ? command : [command];

      let clear = true;
      for (const cmd of commands) {
        startCommand(tip, cmd, clear);
        clear = false;
        const secondsTotal = estimateRunTime(cmd);
        if (secondsTotal) {
          increment = 100.0 / secondsTotal;
          percentage = 0;
        }
        try {
          let retry = true;
          while (retry) {
            try {
              retry = await run(
                rootPath,
                cmd,
                channel,
                cancelObject,
                tip.features,
                tip.runPoints,
                progress,
                ionicProvider,
                undefined,
                undefined,
                tip.data
              );
            } catch (err) {
              retry = false;
              failed = true;
              writeError(err);
            }
          }
        } finally {
          finishCommand(tip);
        }
      }
      return true;
    }
  );
  if (ionicProvider) {
    ionicProvider.refresh();
  }
  if (successMessage) {
    channel.appendLine(successMessage);
  }
  if (tip.title) {
    if (failed) {
      writeError(`${tip.title} Failed.`);
    } else {
      writeIonic(`${tip.title} Completed.`);
    }
    channel.appendLine('');
    channelShow(channel);
  }

  if (tip.syncOnSuccess) {
    if (!ionicState.syncDone.includes(tip.syncOnSuccess)) {
      ionicState.syncDone.push(tip.syncOnSuccess);
    }
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  // Ionic Tree View
  const ionicProvider = new IonicTreeProvider(rootPath, context);
  const view = vscode.window.createTreeView('ionic-tree', { treeDataProvider: ionicProvider });

  // Project List Panel
  const ionicProjectsProvider = new IonicProjectsreeProvider(rootPath, context);
  const projectsView = vscode.window.createTreeView('ionic-zprojects', { treeDataProvider: ionicProjectsProvider });

  // Dev Server Running Panel
  const ionicDevServerProvider = new IonicDevServerProvider(rootPath, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ionic-devserver', ionicDevServerProvider, {
      webviewOptions: { retainContextWhenHidden: false },
    })
  );

  ionicState.view = view;
  ionicState.projectsView = projectsView;
  ionicState.context = context;

  ionicState.shell = context.workspaceState.get(Context.shell);
  const shellOverride: string = vscode.workspace.getConfiguration('ionic').get('shellPath');
  if (shellOverride && shellOverride.length > 0) {
    ionicState.shell = shellOverride;
  }

  trackProjectChange();

  vscode.commands.registerCommand(CommandName.Refresh, () => {
    clearRefreshCache(context);
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.Add, async () => {
    if (features.pluginExplorer) {
      await reviewProject(rootPath, context, context.workspaceState.get('SelectedProject'));
      PluginExplorerPanel.init(context.extensionUri, rootPath, context);
    } else {
      await installPackage(context.extensionPath, rootPath);
      if (ionicProvider) {
        ionicProvider.refresh();
      }
    }
  });

  vscode.commands.registerCommand(CommandName.Stop, async (recommendation: Recommendation) => {
    recommendation.tip.data = Context.stop;
    await fixIssue(undefined, context.extensionPath, ionicProvider, recommendation.tip);
    recommendation.setContext(undefined);
  });

  vscode.commands.registerCommand(CommandName.SignUp, async () => {
    await ionicSignup(context.extensionPath, context);
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.Upgrade, async (recommendation: Recommendation) => {
    await packageUpgrade(recommendation.tip.data, getLocalFolder(rootPath));
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.Login, async () => {
    await vscode.commands.executeCommand(VSCommand.setContext, Context.isLoggingIn, true);
    await ionicLogin(context.extensionPath, context);
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.RefreshDebug, async () => {
    ionicState.refreshDebugDevices = true;
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.SelectAction, async (r: Recommendation) => {
    await advancedActions(r.getData());
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.WebConfig, async (r: Recommendation) => {
    webConfiguration(r.tip.actionArg(0));
  });

  vscode.commands.registerCommand(CommandName.BuildConfig, async (r: Recommendation) => {
    const config = await buildConfiguration(context.extensionPath, context, r.tip.actionArg(0));
    if (!config) return;
    if (config != 'default') {
      r.tip.addActionArg(`--configuration=${config}`);
    }
    ionicState.configuration = config;
    runAction(r.tip, ionicProvider, rootPath);
  });

  vscode.commands.registerCommand(CommandName.PluginExplorer, async () => {
    await reviewProject(rootPath, context, context.workspaceState.get('SelectedProject'));
    PluginExplorerPanel.init(context.extensionUri, rootPath, context);
  });

  vscode.commands.registerCommand(CommandName.SkipLogin, async () => {
    ionicState.skipAuth = true;
    await vscode.commands.executeCommand(VSCommand.setContext, Context.inspectedProject, false);
    await vscode.commands.executeCommand(VSCommand.setContext, Context.isAnonymous, false);
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.Open, async (recommendation: Recommendation) => {
    if (fs.existsSync(recommendation.tip.secondCommand)) {
      openUri(recommendation.tip.secondCommand);
    }
  });

  vscode.commands.registerCommand(CommandName.RunIOS, async (recommendation: Recommendation) => {
    let runInfo = ionicState.runWeb;
    switch (ionicState.lastRun) {
      case CapacitorPlatform.android:
        runInfo = ionicState.runAndroid;
        break;
      case CapacitorPlatform.ios:
        runInfo = ionicState.runIOS;
        break;
    }
    if (runInfo) {
      runAction(runInfo, ionicProvider, rootPath);
    }
  });
  vscode.commands.registerCommand(CommandName.Rebuild, async (recommendation: Recommendation) => {
    await recommendation.tip.executeAction();
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.Function, async (recommendation: Recommendation) => {
    await recommendation.tip.executeAction();
  });

  vscode.commands.registerCommand(CommandName.Fix, async (tip: Tip) => {
    await fix(tip, rootPath, ionicProvider, context);
  });

  // The project list panel needs refreshing
  vscode.commands.registerCommand(CommandName.ProjectsRefresh, async (project: string) => {
    ionicProjectsProvider.refresh(project);
  });

  // User selected a project from the list (monorepo)
  vscode.commands.registerCommand(CommandName.ProjectSelect, async (project: string) => {
    context.workspaceState.update('SelectedProject', project);
    ionicProvider.selectProject(project);
  });

  vscode.commands.registerCommand(CommandName.Idea, async (t: Tip | Recommendation) => {
    if (!t) return;
    // If the user clicks the light bulb it is a Tip, if they click the item it is a recommendation
    const tip: Tip = (t as Recommendation).tip ? (t as Recommendation).tip : (t as Tip);
    await fix(tip, rootPath, ionicProvider, context);
  });

  vscode.commands.registerCommand(CommandName.Run, async (r: Recommendation) => {
    runAction(r.tip, ionicProvider, rootPath);
  });

  vscode.commands.registerCommand(CommandName.SelectDevice, async (r: Recommendation) => {
    if (r.tip.actionArg(1) == CapacitorPlatform.android) {
      ionicState.selectedAndroidDevice = undefined;
      ionicState.selectedAndroidDeviceName = undefined;
    } else {
      ionicState.selectedIOSDevice = undefined;
      ionicState.selectedIOSDeviceName = undefined;
    }
    runAction(r.tip, ionicProvider, rootPath, CommandName.SelectDevice);
  });

  vscode.commands.registerCommand(CommandName.Link, async (tip: Tip) => {
    await openUri(tip.url);
  });

  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(AndroidDebugType, new AndroidDebugProvider())
  );
  context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(androidDebugUnforward));
}

function trackProjectChange() {
  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    ionicState.projectDirty = true;
  });

  vscode.window.onDidChangeVisibleTextEditors((e: Array<any>) => {
    let outputIsFocused = false;
    for (const d of e) {
      if ((d as any)?.document?.uri?.scheme == 'output') {
        outputIsFocused = true;
      }
    }
    ionicState.outputIsFocused = outputIsFocused;
  });
}

async function runAction(tip: Tip, ionicProvider: IonicTreeProvider, rootPath: string, srcCommand?: CommandName) {
  if (await waitForOtherActions(tip)) {
    return; // Canceled
  }
  if (tip.stoppable) {
    markActionAsRunning(tip);
    ionicProvider.refresh();
  }
  tip.generateCommand();
  tip.generateTitle();
  if (tip.command) {
    let command = tip.command;
    if (tip.doRequestAppName) {
      command = await requestAppName(tip, rootPath);
    }
    if (tip.doIpSelection) {
      const host = await selectExternalIPAddress();
      if (host) {
        command = (tip.command as string) + ` --public-host=${host}`;
      }
    }
    if (tip.doDeviceSelection) {
      const target = await selectDevice(tip.secondCommand as string, tip.data, tip, srcCommand);
      if (!target) {
        markActionAsCancelled(tip);
        ionicProvider.refresh();
        return;
      }
      command = (command as string).replace(InternalCommand.target, target);
    }
    if (command) {
      execute(tip, ionicState.context);
      fixIssue(command, rootPath, ionicProvider, tip);
      return;
    }
  } else {
    execute(tip, ionicState.context);
    if (tip.refresh) {
      ionicProvider.refresh();
    }
  }
}

async function fix(
  tip: Tip,
  rootPath: string,
  ionicProvider: IonicTreeProvider,
  context: vscode.ExtensionContext
): Promise<void> {
  if (await waitForOtherActions(tip)) {
    return; // Canceled
  }
  tip.generateCommand();
  tip.generateTitle();
  if (tip.command) {
    const urlBtn = tip.url ? 'Info' : undefined;
    const msg = tip.message ? `: ${tip.message}` : '';
    const info = tip.description ? tip.description : `${tip.title}${msg}`;
    const ignoreTitle = tip.ignorable ? 'Ignore' : undefined;
    const selection = await vscode.window.showInformationMessage(
      info,
      urlBtn,
      ignoreTitle,
      tip.secondTitle,
      tip.commandTitle
    );
    if (selection && selection == tip.commandTitle) {
      fixIssue(tip.command, rootPath, ionicProvider, tip, tip.commandSuccess);
    }
    if (selection && selection == tip.secondTitle) {
      fixIssue(tip.secondCommand, rootPath, ionicProvider, tip, undefined, tip.secondTitle);
    }
    if (selection && selection == urlBtn) {
      openUri(tip.url);
    }
    if (selection && selection == ignoreTitle) {
      ignore(tip, context);
      if (ionicProvider) {
        ionicProvider.refresh();
      }
    }
  } else {
    await execute(tip, context);

    if (ionicProvider) {
      ionicProvider.refresh();
    }
  }
}

async function execute(tip: Tip, context: vscode.ExtensionContext): Promise<void> {
  const result: ActionResult = (await tip.executeAction()) as ActionResult;
  if (result == ActionResult.Ignore) {
    ignore(tip, context);
  }
  if (tip.url) {
    await openUri(tip.url);
  }
}
