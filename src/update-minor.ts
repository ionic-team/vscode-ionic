import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { clearOutput, writeError, writeIonic } from './logging';
import { PackageManager, npmInstall, npmInstallAll, outdatedCommand } from './node-commands';
import { NpmOutdatedDependency } from './npm-model';
import { Project } from './project';
import { getRunOutput, run, RunResults, showProgress } from './utilities';

import { fixYarnGarbage } from './monorepo';
import { window } from 'vscode';

export async function updateMinorDependencies(project: Project, packages: object): Promise<void> {
  const channel = clearOutput();
  try {
    writeIonic(`Checking for minor updates for ${Object.keys(packages).length} dependencies`);
    const pkg = { dependencies: {}, name: 'tmp', license: 'MIT' };
    for (const library of Object.keys(packages).sort()) {
      pkg.dependencies[library] = `^${packages[library].version}`;
    }
    const tmpDir = mkdtempSync(join(tmpdir(), 'vscode.ionic.ext'));
    const tmpFile = join(tmpDir, 'package.json');
    writeFileSync(tmpFile, JSON.stringify(pkg, undefined, 2));

    if (project.packageManager == PackageManager.yarn) {
      writeIonic(`This may take a moment (as you are using yarn)`);
      await getRunOutput(npmInstallAll(), tmpDir);
    }
    let data = await getRunOutput(outdatedCommand(project.packageManager), tmpDir, undefined, true);
    data = fixYarnGarbage(data, project.packageManager);
    let count = 0;
    const updates = [];
    try {
      const out = JSON.parse(data);
      for (const library of Object.keys(packages).sort()) {
        const dep: NpmOutdatedDependency = out[library];
        if (dep && packages[library].version !== dep.wanted) {
          channel.appendLine(`${library} ${packages[library].version} → ${dep.wanted}`);
          updates.push(`${library}@${dep.wanted}`);
          count++;
        }
      }
    } catch {
      writeError(`${outdatedCommand(project.packageManager)} returned invalid json.`);
      writeError(data);
    }

    rmSync(tmpFile);

    if (count == 0) {
      const msg = 'All dependencies are on the latest minor update.';
      writeIonic(msg);
      window.showInformationMessage(msg, 'OK');
      return;
    }
    const result = await window.showInformationMessage(`Update all ${count} dependencies?`, 'Update', 'Cancel');
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
      window.showInformationMessage(`${updated}/${count} Dependencies were updated.`, 'Ok');
    });
  } catch (error) {
    writeError(error);
  }
}

async function run2(project: Project, command: string): Promise<boolean> {
  const result: RunResults = { output: '', success: false };
  try {
    await run(project.projectFolder(), command, undefined, [], [], undefined, undefined, result, false);
    return result.success;
  } catch {
    return false;
  }
}
