import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { getOutputChannel } from './extension';
import { npmInstall, outdatedCommand } from './node-commands';
import { NpmOutdatedDependency } from './npm-model';
import { Project } from './project';
import { getRunOutput, run, RunResults } from './utilities';
import * as vscode from 'vscode';

export async function updateMinorDependencies(project: Project, packages: object): Promise<void> {
  const channel = getOutputChannel();
  channel.appendLine(`[Ionic] Checking for minor updates for ${Object.keys(packages).length} dependencies`);
  const pkg = { dependencies: {}, name: 'tmp' };
  for (const library of Object.keys(packages).sort()) {
    pkg.dependencies[library] = `^${packages[library].version}`;
  }
  const tmpDir = mkdtempSync(join(tmpdir(), 'vscode.ionic.ext'));
  const tmpFile = join(tmpDir, 'package.json');
  writeFileSync(tmpFile, JSON.stringify(pkg, undefined, 2));
  const data = await getRunOutput(outdatedCommand(project), tmpDir);
  const out = JSON.parse(data);
  let count = 0;
  const updates = [];
  for (const library of Object.keys(packages).sort()) {
    const dep: NpmOutdatedDependency = out[library];
    if (packages[library].version !== dep.wanted) {
      channel.appendLine(`${library} ${packages[library].version} → ${dep.wanted}`);
      updates.push(`${library}@${dep.wanted}`);
      count++;
    }
  }
  rmSync(tmpFile);

  if (count == 0) {
    vscode.window.showInformationMessage('All dependencies are on the latest minor update.');
    return;
  }
  if (
    (await vscode.window.showInformationMessage(`Update all ${count} dependencies?`, 'Update', 'Cancel')) == 'Cancel'
  ) {
    return;
  }
  for (const update of updates) {
    const cmd = npmInstall(`${update}`);
    channel.appendLine(`> ${cmd}`);
    if (!(await run2(project, cmd))) {
      break;
    } else {
      channel.appendLine(`Updated ${update}`);
    }
  }
  vscode.window.showInformationMessage(`${count} Dependencies were updated.`);
}

async function run2(project: Project, command: string): Promise<boolean> {
  const channel = getOutputChannel();
  const result: RunResults = { output: '', success: false };
  await run(project.projectFolder(), command, channel, undefined, [], [], undefined, undefined, result, false);
  return result.success;
}
