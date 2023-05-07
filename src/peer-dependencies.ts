import { ionicState } from './ionic-tree-provider';
import { satisfies, gt } from 'semver';
import { writeError, writeWarning } from './logging';
import { PackageManager, npmInstall } from './node-commands';
import { getRunOutput, httpRequest } from './utilities';
import { getPackageVersion } from './analyzer';

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
    const version = await findCompatibleVersion2(dependency, peerDependency, minVersion);
    if (version == 'latest') {
      conflicts.push(dependency);
    } else {
      const command = npmInstall(`${dependency}@${version}`, `--force`);
      commands.push(command);
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

async function getNPMInfoFor(dependency: string): Promise<any> {
  try {
    const pck = (await httpRequest('GET', 'registry.npmjs.org', `/${dependency}`)) as any;
    pck.latestVersion = pck['dist-tags']?.latest;
    return pck;
  } catch (error) {
    // This can happen if the package is not public
    const data = await getRunOutput(`npm view ${dependency} --json`, ionicState.rootFolder, undefined, true);
    const pck = JSON.parse(data);
    pck.latestVersion = pck.version;
    pck.versions[pck.latestVersion] = { peerDependencies: pck.peerDependencies };

    // NOTE: We're only looking at the latest version in this situation. This means that if your
    // project is 2 versions behind on Capacitor that it wouldnt find the right version
    return pck;
  }
}
/**
 * Finds the latest release version of the plugin that is compatible with peer dependencies.
 * If hasPeer is supplied then it will look for a version that passes with that peer and version
 *
 */
export async function findCompatibleVersion2(
  dependency: string,
  hasPeer?: string,
  hasPeerVersion?: string
): Promise<string> {
  let best: string;
  let incompatible = false;
  try {
    const pck = await getNPMInfoFor(dependency);
    const latestVersion = pck.latestVersion;
    for (const version of Object.keys(pck.versions)) {
      if (pck.versions[version].peerDependencies) {
        for (const peerDependency of Object.keys(pck.versions[version].peerDependencies)) {
          const peerVersion = pck.versions[version].peerDependencies[peerDependency];
          const current = getPackageVersion(peerDependency);
          let meetsNeeds = satisfies(current, peerVersion);

          if (hasPeer) {
            if (hasPeer == peerDependency) {
              meetsNeeds = satisfies(hasPeerVersion, peerVersion);
            } else {
              meetsNeeds = false;
            }
          }
          // Is it a real version (not nightly etc) and meets version and we have the package
          if (!version.includes('-') && meetsNeeds) {
            if (!best || gt(version, best)) {
              best = version;
            }
          } else {
            if (hasPeer) {
              if (hasPeer == peerDependency && version == latestVersion) {
                writeError(
                  `The latest version of ${dependency} (${version}) does not work with ${peerDependency} ${hasPeerVersion}.`
                );
                incompatible = true;

                if (pck.bugs?.url) {
                  writeWarning(`Recommendation: File an issue with the plugin author at: ${pck.bugs.url}`);
                }
              }
            } else {
              if (version == latestVersion && !best && current) {
                writeWarning(`${dependency} requires ${peerDependency} ${peerVersion} but you have ${current}`);
                incompatible = true;
              }
            }
          }
        }
      }
    }
    if (!best) {
      best = incompatible ? 'latest' : latestVersion;
    }
  } catch (error) {
    writeError(`Unable to search for a version of ${dependency} that works in your project`);
    console.error(error);
    best = undefined;
  }
  return best;
}
