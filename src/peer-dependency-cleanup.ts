import { window } from 'vscode';
import { getAllPackageNames, getPackageVersion, load } from './analyzer';
import { ionicState } from './ionic-tree-provider';
import { write } from './logging';
import { DependencyVersion, PeerReport, checkPeerDependencies } from './peer-dependencies';
import { Project, inspectProject } from './project';
import { showProgress } from './utilities';

export async function peerDependencyCleanup(project: Project): Promise<void> {
  let report: PeerReport;
  await showProgress(`Checking dependencies in your project...`, async () => {
    // Need to reload dependency list
    await inspectProject(ionicState.rootFolder, ionicState.context, undefined);

    const dependencies = getAllPackageNames();
    const list: DependencyVersion[] = [];
    for (const dependency of dependencies) {
      const versionInfo = getPackageVersion(dependency);
      list.push({ name: dependency, version: versionInfo.version });
    }

    report = await checkPeerDependencies(project.projectFolder(), list, []);
  });
  //write(JSON.stringify(report, undefined, 2));
  if (report.commands.length == 0) {
    write(`There are no dependency conflicts.`);
    return;
  }
  write('');
  if (
    (await window.showWarningMessage(
      `There ${isAre(report.commands.length)} ${report.commands.length} dependency conflict${plural(
        report.commands.length,
      )} that can be resolved. Would you like to fix these?`,
      'Yes',
      'No',
    )) != 'Yes'
  ) {
    return;
  }
  for (const cmd of report.commands) {
    write(`> ${cmd}`);
    await project.run2(cmd, true);
  }
  write(`${report.commands.length} dependency conflict${plural(report.commands.length)} resolved.`);
}

function isAre(count: number): string {
  return count == 1 ? 'is' : 'are';
}

function plural(count: number): string {
  return count > 1 ? 's' : '';
}
