import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { clearOutput, getOutputChannel, writeError, writeIonic } from './extension';
import { npmInstall, outdatedCommand } from './node-commands';
import { NpmOutdatedDependency } from './npm-model';
import { Project } from './project';
import { getRunOutput, run, RunResults, showProgress } from './utilities';
import * as vscode from 'vscode';

export async function updateMinorDependencies(project: Project, packages: object): Promise<void> {
  const channel = clearOutput();
  try {
    writeIonic(`Checking for minor updates for ${Object.keys(packages).length} dependencies`);
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
      if (dep && library == 'typescript') {
        dep.wanted = '4.8.4';
      }
      if (dep && packages[library].version !== dep.wanted) {
        channel.appendLine(`${library} ${packages[library].version} → ${dep.wanted}`);
        updates.push(`${library}@${dep.wanted}`);
        count++;
      }
    }
    rmSync(tmpFile);

    if (count == 0) {
      const msg = 'All dependencies are on the latest minor update.';
      writeIonic(msg);
      vscode.window.showInformationMessage(msg, 'Ok');
      return;
    }
    const result = await vscode.window.showInformationMessage(`Update all ${count} dependencies?`, 'Update', 'Cancel');
    if (!result || result == 'Cancel') return;

    let updated = 0;
    await showProgress('Updating Dependencies', async () => {
      for (const update of updates) {
        const cmd = npmInstall(`${update}`);
        channel.appendLine(`> ${cmd}`);
        if (!(await run2(project, cmd))) {
          channel.appendLine(`[Error] Failed to update ${update}`);
        } else {
          channel.appendLine(`Updated ${update}`);
          updated++;
        }
      }
      vscode.window.showInformationMessage(`${updated}/${count} Dependencies were updated.`, 'Ok');
    });
  } catch (error) {
    writeError(error);
  }
}

async function run2(project: Project, command: string): Promise<boolean> {
  const channel = getOutputChannel();
  const result: RunResults = { output: '', success: false };
  try {
    await run(project.projectFolder(), command, channel, undefined, [], [], undefined, undefined, result, false);
    return result.success;
  } catch {
    return false;
  }
}
