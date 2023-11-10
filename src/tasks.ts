import { ProgressLocation, window, CancellationToken } from 'vscode';
import { InternalCommand } from './command-name';
import { Context } from './context-variables';
import { ionicState } from './ionic-tree-provider';
import { clearOutput, write, writeIonic } from './logging';
import { Tip } from './tip';
import { channelShow, replaceAll, stopPublishing } from './utilities';

let runningOperations = [];
let runningActions: Array<Tip> = [];
let lastOperation: Tip;

export function getLastOperation(): Tip {
  return lastOperation;
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

export async function cancelLastOperation(): Promise<void> {
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

// If the task is already running then cancel it
export async function cancelIfRunning(tip: Tip): Promise<boolean> {
  if (isRunning(tip)) {
    await cancelRunning(tip);
    if (tip.data == Context.stop) {
      channelShow();
      return true; // User clicked stop
    }
  }
  return false;
}

export function finishCommand(tip: Tip) {
  runningOperations = runningOperations.filter((op: Tip) => {
    return !op.sameAs(tip);
  });
  runningActions = runningActions.filter((op: Tip) => {
    return !op.sameAs(tip);
  });
}

export function startCommand(tip: Tip, cmd: string, clear?: boolean) {
  if (tip.title) {
    const message = tip.commandTitle ? tip.commandTitle : tip.title;
    if (clear !== false) {
      clearOutput();
    }
    writeIonic(`${message}...`);
    let command = cmd;
    if (command?.includes(InternalCommand.cwd)) {
      command = command.replace(InternalCommand.cwd, '');
      if (ionicState.workspace) {
        write(`> Workspace: ${ionicState.workspace}`);
      }
    }
    write(`> ${replaceAll(command, InternalCommand.cwd, '')}`);
    channelShow();
  }
}

export function markActionAsRunning(tip: Tip) {
  runningActions.push(tip);
}

export function markOperationAsRunning(tip: Tip) {
  runningOperations.push(tip);
  lastOperation = tip;
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
  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `Task Queued: ${tip.title}`,
      cancellable: true,
    },
    async (progress, token: CancellationToken) => {
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
