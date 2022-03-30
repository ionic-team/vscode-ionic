'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';

import { Context, VSCommand } from './context-variables';
import { ionicLogin, ionicSignup } from './ionic-auth';
import { ionicState, IonicTreeProvider } from './ionic-tree-provider';
import { clearRefreshCache } from './process-packages';
import { Recommendation } from './recommendation';
import { installPackage } from './project';
import { Command, Tip } from './tip';
import { CancelObject, run, estimateRunTime } from './utilities';
import { ignore } from './ignore';
import { CommandName, InternalCommand } from './command-name';
import { packageUpgrade } from './rules-package-upgrade';
import { IonicProjectsreeProvider } from './ionic-projects-provider';
import { buildConfiguration } from './build-configuration';
import { selectDevice } from './capacitor-device';
import { getLocalFolder } from './monorepo';
import { androidDebugUnforward } from './android-debug-bridge';
import { AndroidDebugProvider } from './android-debug-provider';
import { AndroidDebugType } from './android-debug';
import { CapacitorPlatform } from './capacitor-platform';

let channel: vscode.OutputChannel = undefined;
let runningOperations = [];
export let lastOperation: Tip;

async function requestAppName(tip: Tip) {
  let name = await vscode.window.showInputBox({
    title: 'Internal name of the application',
    placeHolder: 'my-app',
    value: 'my-app',
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
    for (const command of tip.command) {
      result.push(command.replace(new RegExp('@app', 'g'), `${name.trim()}`));
    }
    return result;
  } else {
    return undefined;
  }
}

export function isRunning(tip: Tip) {
  const found = runningOperations.find((found) => {
    return found.title == tip.title;
  });
  return found != undefined;
}

function cancelRunning(tip: Tip): Promise<void> {
  const found = runningOperations.find((found) => {
    return found.title == tip.title;
  });
  if (found) {
    found.cancelRequested = true;
  }
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

function finishCommand(tip: Tip) {
  runningOperations = runningOperations.filter((op: Tip) => {
    return op.title != tip.title;
  });
}

function startCommand(tip: Tip, cmd: string, ionicProvider: IonicTreeProvider) {
  if (tip.title) {
    const message = tip.commandTitle ? tip.commandTitle : tip.title;
    channel.appendLine(`[Ionic] ${message}...`);
    let command = cmd;
    if (command?.includes(InternalCommand.cwd)) {
      command = command.replace(InternalCommand.cwd, '');
      channel.appendLine(`> Workspace: ${ionicState.workspace}`);
    }
    channel.appendLine(`> ${command}`);
    channel.show();
  }
}

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('Ionic');
  }
  return channel;
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
      channel.show();
      return; // User clicked stop
    }
  }

  runningOperations.push(tip);
  lastOperation = tip;
  let msg = tip.commandProgress ? tip.commandProgress : tip.commandTitle ? tip.commandTitle : command;
  if (title) msg = title;
  await vscode.window.withProgress(
    {
      location: tip.progressDialog ? vscode.ProgressLocation.Notification : vscode.ProgressLocation.Window,
      title: `${msg}`,
      cancellable: true,
    },

    async (progress, token) => {
      const cancelObject: CancelObject = { proc: undefined, cancelled: false };
      let increment = undefined;
      let percentage = undefined;
      const interval = setInterval(() => {
        // Kill the process if the user cancels
        if (token.isCancellationRequested || tip.cancelRequested) {
          tip.cancelRequested = false;
          channel.appendLine(`[Ionic] Stopped "${tip.title}"`);
          channel.show();
          clearInterval(interval);
          finishCommand(tip);
          cancelObject.cancelled = true;
          cancelObject.proc.kill();
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

      if (Array.isArray(command)) {
        try {
          for (const cmd of command) {
            startCommand(tip, cmd, ionicProvider);
            await run(rootPath, cmd, channel, cancelObject, tip.doViewEditor, tip.runPoints, progress, ionicProvider);
          }
        } finally {
          finishCommand(tip);
        }
      } else {
        startCommand(tip, command, ionicProvider);
        const secondsTotal = estimateRunTime(command);
        if (secondsTotal) {
          increment = 100.0 / secondsTotal;
          percentage = 0;
        }
        try {
          let retry = true;
          while (retry) {
            retry = await run(
              rootPath,
              command,
              channel,
              cancelObject,
              tip.doViewEditor,
              tip.runPoints,
              progress,
              ionicProvider
            );
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
    channel.appendLine(`[Ionic] ${tip.title} Completed.`);
    channel.appendLine('');
    channel.show();
  }
}

export function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  const ionicProvider = new IonicTreeProvider(rootPath, context);
  const ionicProjectsProvider = new IonicProjectsreeProvider(rootPath, context);
  const projectsView = vscode.window.createTreeView('ionic-projects', { treeDataProvider: ionicProjectsProvider });
  ionicState.projectsView = projectsView;
  const view = vscode.window.createTreeView('ionic', { treeDataProvider: ionicProvider });
  ionicState.view = view;

  trackProjectChange();

  vscode.commands.registerCommand(CommandName.Refresh, () => {
    clearRefreshCache(context);
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.Add, async () => {
    await installPackage(context.extensionPath, rootPath);
    if (ionicProvider) {
      ionicProvider.refresh();
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

  vscode.commands.registerCommand(CommandName.BuildConfig, async (r: Recommendation) => {
    const config = await buildConfiguration(context.extensionPath, context, r.tip.actionArg(0));
    if (!config) return;
    r.tip.addActionArg(`--configuration=${config}`);
    runAction(r, ionicProvider, rootPath);
  });

  vscode.commands.registerCommand(CommandName.DebugMode, async (r: Recommendation) => {
    ionicState.webDebugMode = true;
    await vscode.commands.executeCommand(VSCommand.setContext, Context.debugMode, true);
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.RunMode, async (r: Recommendation) => {
    ionicState.webDebugMode = false;
    await vscode.commands.executeCommand(VSCommand.setContext, Context.debugMode, false);
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.SkipLogin, async () => {
    ionicState.skipAuth = true;
    await vscode.commands.executeCommand(VSCommand.setContext, Context.inspectedProject, false);
    await vscode.commands.executeCommand(VSCommand.setContext, Context.isAnonymous, false);
    ionicProvider.refresh();
  });

  vscode.commands.registerCommand(CommandName.Open, async (recommendation: Recommendation) => {
    if (fs.existsSync(recommendation.tip.secondCommand)) {
      vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(recommendation.tip.secondCommand));
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

  vscode.commands.registerCommand(CommandName.Idea, async (r: Recommendation) => {
    await fix(r.tip, rootPath, ionicProvider, context);
  });

  vscode.commands.registerCommand(CommandName.Run, async (r: Recommendation) => {
    runAction(r, ionicProvider, rootPath);
  });

  vscode.commands.registerCommand(CommandName.SelectDevice, async (r: Recommendation) => {
    if (r.tip.actionArg(1) == CapacitorPlatform.android) {
      ionicState.selectedAndroidDevice = undefined;
      ionicState.selectedAndroidDeviceName = undefined;
    } else {
      ionicState.selectedIOSDevice = undefined;
      ionicState.selectedIOSDeviceName = undefined;
    }
    runAction(r, ionicProvider, rootPath);
  });

  vscode.commands.registerCommand(CommandName.Link, async (tip: Tip) => {
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
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

async function runAction(r: Recommendation, ionicProvider: IonicTreeProvider, rootPath: string) {
  const tip = r.tip;
  if (tip.stoppable) {
    ionicProvider.refresh();
  }
  tip.generateCommand();
  tip.generateTitle();
  if (tip.command) {
    const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
    let command = tip.command;
    if (tip.doRequestAppName) {
      command = await requestAppName(tip);
    }
    if (tip.doDeviceSelection) {
      const target = await selectDevice(tip.secondCommand as string, tip.data, tip);
      if (!target) {
        return;
      }
      command = (tip.command as string).replace(InternalCommand.target, target);
    }
    if (command) {
      execute(tip);
      fixIssue(command, rootPath, ionicProvider, tip);
      return;
    }
  } else {
    execute(tip);
  }
}
async function fix(
  tip: Tip,
  rootPath: string,
  ionicProvider: IonicTreeProvider,
  context: vscode.ExtensionContext
): Promise<void> {
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
      vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
    }
    if (selection && selection == ignoreTitle) {
      ignore(tip, context);
      if (ionicProvider) {
        ionicProvider.refresh();
      }
    }
  } else {
    await execute(tip);

    if (ionicProvider) {
      ionicProvider.refresh();
    }
  }
}

async function execute(tip: Tip): Promise<void> {
  await tip.executeAction();
  if (tip.title == 'Settings') {
    vscode.commands.executeCommand('workbench.action.openSettings', 'Ionic');
  } else if (tip.url) {
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
  }
}
