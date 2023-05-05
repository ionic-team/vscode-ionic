import { ionicState } from './ionic-tree-provider';
import { satisfies } from 'semver';
import { writeWarning } from './logging';
import { write } from './logging';
import { PackageManager } from './node-commands';
import { Project } from './project';
import { getRunOutput } from './utilities';

export async function checkPeerDependencies(
  project: Project,
  peerDependency: string,
  minVersion: string
): Promise<boolean> {
  if (ionicState.packageManager != PackageManager.npm) return true;
  const conflicts = await getDependencyConflicts(project.folder, peerDependency, minVersion);

  if (conflicts.length > 0) {
    writeWarning('The following dependencies need updating after migration');
    for (const conflict of conflicts) {
      write(conflict);
    }
  }
  return true;
}

async function getDependencyConflicts(folder: string, peerDependency: string, minVersion: string): Promise<string[]> {
  try {
    const list: string[] = [];
    const data = await getRunOutput(`npm ls --depth=1 --long --json`, folder);
    const deps = JSON.parse(data);
    for (const key of Object.keys(deps.dependencies)) {
      for (const peer of Object.keys(deps.dependencies[key].peerDependencies)) {
        const version = deps.dependencies[key].peerDependencies[peer];
        if (peer == peerDependency) {
          if (!satisfies(minVersion, version)) {
            // Migration will update capacitor plugins so leave them out
            if (!key.startsWith('@capacitor/')) {
              list.push(key);
            }
          }
        }
      }
    }
    return list;
  } catch (error) {
    writeWarning(`Unable to check for dependencies that may need updating after migration: ${error}`);
    return [];
  }
}
