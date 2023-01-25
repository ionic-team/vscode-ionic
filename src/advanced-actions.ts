import { Project } from './project';
import * as vscode from 'vscode';
import { PackageManager } from './node-commands';
import { getRunOutput } from './utilities';
import { writeError, writeIonic } from './extension';

enum Features {
  migrateToPNPM = 'Migrate to PNPM',
  reinstallNodeModules = 'Reinstall Node Modules',
}

export async function advancedActions(project: Project) {
  const picks: Array<Features> = [];
  if (project.packageManager == PackageManager.npm) {
    picks.push(Features.migrateToPNPM);
    picks.push(Features.reinstallNodeModules);
  }
  const selection = await vscode.window.showQuickPick(picks, {});
  switch (selection) {
    case Features.migrateToPNPM:
      await runCommands(migrateToPNPM(), selection, project);
      break;
    case Features.reinstallNodeModules:
      await runCommands(reinstallNodeModules(), selection, project);
      break;
  }
}

function migrateToPNPM(): Array<string> {
  return ['pnpm -v', 'rm -rf node_modules', 'pnpm import', 'pnpm install', 'rm package-lock.json'];
}

function reinstallNodeModules(): Array<string> {
  return ['rm -rf node_modules', 'npm install'];
}

async function runCommands(commands: Array<string>, title: string, project: Project): Promise<void> {
  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title, cancellable: false },
      async () => {
        await run(commands, project.folder);
      }
    );

    writeIonic(`Completed ${title}`);
  } catch (err) {
    writeError(`Failed ${title}: ${err}`);
  }
}

async function run(commands: Array<string>, folder: string) {
  for (const command of commands) {
    writeIonic(command);
    try {
      const result = await getRunOutput(command, folder);
    } catch (err) {
      writeError(err);
      break;
    }
  }
}
