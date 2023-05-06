import { ionicState } from './ionic-tree-provider';
import { satisfies, gt } from 'semver';
import { writeError, writeWarning } from './logging';
import { write } from './logging';
import { PackageManager, npmInstall } from './node-commands';
import { getRunOutput, httpRequest, showProgress } from './utilities';

export interface PeerReport {
  // Dependencies that do not meet peer dependency requirements
  dependencies: string[];
  // Dependencies that do not have a version that can be updated to
  incompatible: string[];

  // Set of command to run to upgrade dependendencies that do not meet peer deps
  commands: string[];
}

/**
 * Check project for dependencies that do not meet peer dependency requirements
 * @param {string} peerDependency (eg @capacitor/core)
 * @param {string} minVersion (eg 5.0.0)
 * @returns {Promise<PeerReport>}
 */
export async function checkPeerDependencies(
  folder: string,
  peerDependency: string,
  minVersion: string
): Promise<PeerReport> {
  if (ionicState.packageManager != PackageManager.npm) return { dependencies: [], incompatible: [], commands: [] };
  const dependencies = await getDependencyConflicts(folder, peerDependency, minVersion);
  const conflicts = [];
  const commands = [];
  for (const dependency of dependencies) {
    const cmd = await findCompatibleVersion(dependency, peerDependency, minVersion, folder);
    if (!cmd) {
      conflicts.push(dependency);
    } else {
      commands.push(cmd);
    }
  }

  return { dependencies, incompatible: conflicts, commands };
}

async function getDependencyConflicts(folder: string, peerDependency: string, minVersion: string): Promise<string[]> {
  try {
    const list: string[] = [];
    const data = await getRunOutput(`npm ls --depth=1 --long --json`, folder, undefined, true);
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
    writeWarning(`Unable to check for dependencies that may need updating after migration.`);
    return [];
  }
}

/**
 * Find a version of a dependency that works with the peer dependency
 * @param {string} dependency (eg @capacitor-community/keep-awake)
 * @param {string} peerDependency (eg @capacitor/core)
 * @param {string} minVersion (eg 5.0.0)
 * @param {string} folder (path to run)
 * @returns {Promise<string>} A list of commands to run to install a compatible version (or undefined)
 */
async function findCompatibleVersion(
  dependency: string,
  peerDependency: string,
  minVersion: string,
  folder: string
): Promise<string> {
  const data = await getRunOutput(`npm view ${dependency} --json`, folder, undefined, true);
  const pck = JSON.parse(data);
  const latestPeer = pck.peerDependencies[peerDependency];
  console.log(dependency, latestPeer);
  if (latestPeer) {
    if (!satisfies(minVersion, latestPeer)) {
      writeError(
        `The latest version of ${dependency} (${pck.version}) does not work with ${peerDependency} version ${minVersion}.`
      );
      if (pck.bugs?.url) {
        writeWarning(`Recommendation: File an issue with the plugin author at: ${pck.bugs.url}`);
      }
    } else {
      // Latest version should work. Great! use it!
      write(
        `${dependency} will be updated to version ${pck.version} as it is compatible with ${peerDependency} v${minVersion}`
      );
      return npmInstall(`${dependency}@${pck.version}`, `--save-exact --force`);
    }
  } else {
    // No peer dependency so good!
    return;
  }
  return;
}

export async function findCompatibleVersion2(
  dependency: string,
  peerDependency: string,
  minVersion: string
): Promise<string> {
  let best: string;
  await showProgress(
    `Finding the best version of ${dependency} that works with ${peerDependency} v${minVersion}`,
    async () => {
      try {
        const pck = (await httpRequest('GET', 'registry.npmjs.org', `/${dependency}`)) as any;
        for (const version of Object.keys(pck.versions)) {
          if (pck.versions[version].peerDependencies) {
            const peerDep = pck.versions[version].peerDependencies[peerDependency];
            // Is it a real version (not nightly etc) and meets version
            if (!version.includes('-') && satisfies(minVersion, peerDep)) {
              if (!best || gt(version, best)) {
                best = version;
              }
            }
          }
        }
        if (!best) best = 'latest';
      } catch (error) {
        writeError(`Unable to search for a version of ${dependency} that works with ${peerDependency} v${minVersion}`);
        console.error(error);
        best = undefined;
      }
    }
  );
  return best;
}
