import { exists } from './analyzer';
import { CommandName } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { getNpmWorkspaceProjects } from './monorepos-npm';
import { getNXProjects } from './monorepos-nx';
import { Project } from './project';
import { Context, VSCommand } from './context-variables';
import { getPnpmWorkspaces } from './monorepos-pnpm';
import { PackageManager } from './node-commands';
import { getLernaWorkspaces } from './monorepos-lerna';
import { join } from 'path';
import { writeError, write } from './logging';
import { NpmDependency, NpmOutdatedDependency } from './npm-model';
import { ExtensionContext, commands, window, workspace } from 'vscode';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { QueueFunction, Tip, TipType } from './tip';
import { getRunOutput, openUri } from './utilities';

export interface MonoRepoProject {
  name: string;
  folder: string;
  localPackageJson?: boolean; // Is the package.json in the local project folder
  nodeModulesAtRoot?: boolean; // Is the node_modules folder at the root
  isIonic?: boolean; // Does it looks like an ionic project using @ionic/vue etc
  isNXStandalone?: boolean; // Is this a standalone NX Monorepo
}

export interface MonoFolder {
  name: string;
  packageJson: string;
  path: string;
}

export enum MonoRepoType {
  none,
  nx,
  turboRepo,
  pnpm,
  lerna,
  npm,
  yarn,
  folder,
}

export type FrameworkType = 'angular' | 'react' | 'vue' | 'react-vite' | 'vue-vite' | 'angular-standalone' | 'unknown';

/**
 * Check to see if this is a monorepo and what type.
 * @param  {Project} project
 */
export async function checkForMonoRepo(project: Project, selectedProject: string, context: ExtensionContext) {
  project.repoType = MonoRepoType.none;
  if (!selectedProject) {
    selectedProject = context.workspaceState.get('SelectedProject');
  }
  let projects: Array<MonoRepoProject> = undefined;
  // Might be pnpm based
  const pw = join(project.folder, 'pnpm-workspace.yaml');
  const isPnpm = existsSync(pw);

  if (exists('@nrwl/cli') || existsSync(join(project.folder, 'nx.json'))) {
    project.repoType = MonoRepoType.nx;
    projects = await getNXProjects(project);
    if (!projects) {
      projects = [];
    }
    if (projects.length == 0) {
      // Standalone nx project
      projects.push({ name: 'app', folder: '', nodeModulesAtRoot: true, isNXStandalone: true });
    }
    ionicState.projects = projects;
    ionicState.projectsView.title = 'NX Projects';
  } else if (project.workspaces?.length > 0 && !isPnpm) {
    // For npm workspaces check package.json
    projects = getNpmWorkspaceProjects(project);
    project.repoType = MonoRepoType.npm;
    if (project.packageManager == PackageManager.yarn) {
      project.repoType = MonoRepoType.yarn;
    }
    ionicState.projects = projects;
    ionicState.projectsView.title = 'Workspaces';
  } else {
    // See if it looks like a folder based repo
    projects = getFolderBasedProjects(project);

    if (projects?.length > 0 && !isPnpm) {
      project.repoType = MonoRepoType.folder;
      ionicState.projectsView.title = 'Projects';
    } else {
      if (isPnpm) {
        project.repoType = MonoRepoType.pnpm;
        projects = getPnpmWorkspaces(project);
        ionicState.projects = projects;
        ionicState.projectsView.title = 'Workspaces';
      } else {
        // Might be lerna based
        const lerna = join(project.folder, 'lerna.json');
        if (existsSync(lerna)) {
          project.repoType = MonoRepoType.lerna;
          projects = getLernaWorkspaces(project);
          ionicState.projects = projects;
          ionicState.projectsView.title = 'Workspaces';
        }
      }
    }
    ionicState.projects = projects;
  }
  if (projects?.length > 0) {
    const found = projects.find((project) => project.name == selectedProject);
    if (!found) {
      context.workspaceState.update('SelectedProject', projects[0].name);
    }
    project.monoRepo = found ? found : projects[0];

    if (!project.monoRepo) {
      project.repoType = MonoRepoType.none;
      window.showErrorMessage('No mono repo projects found.');
    } else {
      ionicState.view.title = project.monoRepo.name;

      //  // Switch to pnpm if needed
      //  const isPnpm = fs.existsSync(path.join(projects[0].folder, 'pnpm-lock.yaml'));
      //  if (isPnpm)project.repoType = MonoRepoType.pnpm;

      project.monoRepo.localPackageJson = [
        MonoRepoType.npm,
        MonoRepoType.folder,
        MonoRepoType.yarn,
        MonoRepoType.lerna,
        MonoRepoType.pnpm,
      ].includes(project.repoType);

      // Is the node_modules folder kept only at the root of the mono repo
      project.monoRepo.nodeModulesAtRoot = [MonoRepoType.npm, MonoRepoType.nx, MonoRepoType.yarn].includes(
        project.repoType,
      );

      commands.executeCommand(CommandName.ProjectsRefresh, project.monoRepo.name);
    }
  }
  ionicState.repoType = project.repoType;

  commands.executeCommand(VSCommand.setContext, Context.isMonoRepo, project.repoType !== MonoRepoType.none);
}

/**
 * Does it looks like there are subfolders with Ionic/web apps in them
 * @param  {string} rootFolder
 * @returns boolean
 */
export function isFolderBasedMonoRepo(rootFolder: string): Array<MonoFolder> {
  if (workspace.workspaceFolders.length > 1) {
    return vsCodeWorkSpaces();
  }
  const folders = readdirSync(rootFolder, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name);
  const result = [];
  for (const folder of folders) {
    const packageJson = join(rootFolder, folder, 'package.json');
    if (existsSync(packageJson)) {
      result.push({ name: folder, packageJson: packageJson, path: join(rootFolder, folder) });
    }
  }
  return result;
}

function vsCodeWorkSpaces(): Array<MonoFolder> {
  const result = [];
  for (const ws of workspace.workspaceFolders) {
    const packageJson = join(ws.uri.path, 'package.json');
    if (existsSync(packageJson)) {
      result.push({ name: ws.name, packageJson: packageJson, path: ws.uri.path });
    }
  }
  return result;
}

export function getMonoRepoFolder(name: string, defaultFolder: string): string {
  const found: MonoRepoProject = ionicState.projects.find((repo) => repo.name == name);
  if (!found) {
    return defaultFolder;
  }
  return found?.folder;
}

export function getPackageJSONFilename(rootFolder: string): string {
  return join(getLocalFolder(rootFolder), 'package.json');
}

export function getLocalFolder(rootFolder: string): string {
  switch (ionicState.repoType) {
    case MonoRepoType.npm:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.folder:
      return getMonoRepoFolder(ionicState.workspace, rootFolder);
  }
  return rootFolder;
}

function getFolderBasedProjects(prj: Project): Array<MonoRepoProject> {
  const projects = isFolderBasedMonoRepo(prj.folder);
  let result: Array<MonoRepoProject> = [];
  let likelyFolderBasedMonoRepo = false;
  let exampleFolder = '';

  for (const project of projects) {
    const folderType = checkFolder(project.packageJson);
    if (folderType != FolderType.unknown) {
      result.push({ name: project.name, folder: project.path, isIonic: folderType == FolderType.hasIonic });
    }
    if (folderType == FolderType.hasIonic) {
      exampleFolder = project.path;
      likelyFolderBasedMonoRepo = true;
    }
  }
  if (!likelyFolderBasedMonoRepo) {
    return [];
  }
  const rootFolderType = checkFolder(join(prj.folder, 'package.json'));
  if (rootFolderType == FolderType.hasIonic) {
    // Its definitely an Ionic or Capacitor project in the root but we have sub folders that look like Ionic projects so throw error
    writeError(
      `This folder has Capacitor/Ionic dependencies but there are subfolders that do too which will be ignored (eg ${exampleFolder})`,
    );
    return [];
  }
  result = result.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
  if (rootFolderType == FolderType.hasDependencies) {
    result.unshift({ name: 'root', folder: prj.folder, isIonic: false });
  }
  return result;
}

// Yarn outdated returns invalid json in a visual format. This fixes it and returns it in something like npm outdated
export function fixYarnV1Outdated(data: string, packageManager: PackageManager): string {
  if (packageManager !== PackageManager.yarn) {
    return data;
  }
  const tmp = data.split('\n');
  if (tmp.length > 1) {
    return parseYarnFormat(tmp[1]);
  }
  return data;
}

export function fixYarnOutdated(data: string, project: Project): string {
  /* npm outdated --json returns an object like this
  {
  "@angular/animations": {
    "wanted": "17.3.1",
    "latest": "17.3.1",
    "dependent": "cs-yarn4-test"
  },
  // yarn outdated --json returns an object like:
  [{"current":"17.3.1","latest":"17.3.2","name":"@angular/cli","severity":"patch","type":"devDependencies"},{"current":"7.8.1","latest":"7.8.2","name":"@ionic/angular","severity":"patch","type":"dependencies"},{"current":"7.3.0","latest":"7.3.1","name":"ionicons","severity":"patch","type":"dependencies"}]
  */
  if (data.startsWith(`Usage Error: Couldn't find a script named "outdated"`)) {
    project.setGroup('Extension', '', TipType.Ionic, true);
    project.tip(new Tip('Install yarn outdated plugin', '', TipType.Idea).setQueuedAction(installYarnPlugin, project));
    return;
  }
  const items = JSON.parse(data);
  const result = {};
  for (const item of items) {
    const dep: NpmOutdatedDependency = {
      current: item.current,
      wanted: item.latest,
      latest: item.latest,
      dependent: '',
      location: '',
    };
    result[item.name] = dep;
  }
  return JSON.stringify(result);
}

async function installYarnPlugin(queueFunction: QueueFunction, project: Project) {
  const response = await window.showInformationMessage(
    `The Yarn plugin called "Outdated" is required to find the latest versions of dependencies. Install it?`,
    'Yes',
    'More Information',
  );
  if (!response) {
    return;
  }
  if (response == 'More Information') {
    openUri('https://github.com/mskelton/yarn-plugin-outdated');
    return;
  }
  queueFunction();
  const url = project.yarnVersion?.startsWith('3')
    ? `yarn plugin import https://mskelton.dev/yarn-outdated/v3`
    : `yarn plugin import https://mskelton.dev/yarn-outdated/v4`;
  const result = await getRunOutput(url, project.projectFolder());
  write(result);
}

// Yarn list --json returns a NDJSON stream that needs to fixed
export function fixModernYarnList(data: string): string {
  const items = data.split('\n');
  if (items.length > 1) {
    //tmp[x].value = @angular-eslint/builder@npm:17.3.0
    //tmp[x].children.Version = 0.14.4
    const result = { dependencies: {} };
    for (const item of items) {
      if (item === '') break;

      const info = JSON.parse(item);
      const ldx = info.value.lastIndexOf('@');
      const name = info.value.substring(0, ldx);
      const dep: NpmDependency = {
        version: info.children.Version,
        resolved: '',
      };
      result.dependencies[name] = dep;
    }
    return JSON.stringify(result);
  }
  return data;
}

function parseYarnFormat(data: string): string {
  try {
    const out = JSON.parse(data);
    const result = {};
    if (out.data.body) {
      for (const item of out.data.body) {
        const dep: NpmOutdatedDependency = {
          current: item[1],
          wanted: item[2],
          latest: item[3],
          dependent: '',
          location: '',
        };
        result[item[0]] = dep;
      }
    }
    return JSON.stringify(result);
  } catch {
    return data;
  }
}

enum FolderType {
  hasDependencies,
  hasIonic,
  unknown,
}

function checkFolder(filename: string): FolderType {
  try {
    if (!existsSync(filename)) {
      return FolderType.unknown;
    }
    const pck = JSON.parse(readFileSync(filename, 'utf8'));
    const isIonic = !!(
      pck?.dependencies?.['@ionic/vue'] ||
      pck?.dependencies?.['@ionic/angular'] ||
      pck?.dependencies?.['@ionic/react'] ||
      pck?.dependencies?.['@capacitor/core'] ||
      pck?.dependencies?.['@capacitor/ios'] ||
      pck?.dependencies?.['@capacitor/android'] ||
      pck?.dependencies?.['@angular/core']
    );
    return isIonic ? FolderType.hasIonic : pck.dependencies ? FolderType.hasDependencies : FolderType.unknown;
  } catch {
    return FolderType.unknown;
  }
}
