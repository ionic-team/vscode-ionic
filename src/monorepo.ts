import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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

/**
 * Check to see if this is a monorepo and what type.
 * @param  {Project} project
 */
export async function checkForMonoRepo(project: Project, selectedProject: string, context: vscode.ExtensionContext) {
  project.repoType = MonoRepoType.none;
  if (!selectedProject) {
    selectedProject = context.workspaceState.get('SelectedProject');
  }
  let projects: Array<MonoRepoProject> = undefined;
  // Might be pnpm based
  const pw = path.join(project.folder, 'pnpm-workspace.yaml');
  const isPnpm = fs.existsSync(pw);

  if (exists('@nrwl/cli') || fs.existsSync(join(project.folder, 'nx.json'))) {
    project.repoType = MonoRepoType.nx;
    projects = await getNXProjects(project);
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
        const lerna = path.join(project.folder, 'lerna.json');
        if (fs.existsSync(lerna)) {
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
      context.workspaceState.update('SelectedProject', projects[0]);
    }
    project.monoRepo = found ? found : projects[0];

    if (!project.monoRepo) {
      project.repoType = MonoRepoType.none;
      vscode.window.showErrorMessage('No mono repo projects found.');
    } else {
      ionicState.view.title = project.monoRepo.name;

      project.monoRepo.localPackageJson = [
        MonoRepoType.npm,
        MonoRepoType.folder,
        MonoRepoType.yarn,
        MonoRepoType.lerna,
        MonoRepoType.pnpm,
      ].includes(project.repoType);

      // Is the node_modules folder kept only at the root of the mono repo
      project.monoRepo.nodeModulesAtRoot = [MonoRepoType.npm, MonoRepoType.nx].includes(project.repoType);

      vscode.commands.executeCommand(CommandName.ProjectsRefresh, project.monoRepo.name);
    }
  }
  ionicState.repoType = project.repoType;

  vscode.commands.executeCommand(VSCommand.setContext, Context.isMonoRepo, project.repoType !== MonoRepoType.none);
}

/**
 * Does it looks like there are subfolders with Ionic/web apps in them
 * @param  {string} rootFolder
 * @returns boolean
 */
export function isFolderBasedMonoRepo(rootFolder: string): Array<MonoFolder> {
  if (vscode.workspace.workspaceFolders.length > 1) {
    return vsCodeWorkSpaces();
  }
  const folders = fs
    .readdirSync(rootFolder, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name);
  const result = [];
  for (const folder of folders) {
    const packageJson = path.join(rootFolder, folder, 'package.json');
    if (fs.existsSync(packageJson)) {
      result.push({ name: folder, packageJson: packageJson, path: path.join(rootFolder, folder) });
    }
  }
  return result;
}

function vsCodeWorkSpaces(): Array<MonoFolder> {
  const result = [];
  for (const workspace of vscode.workspace.workspaceFolders) {
    const packageJson = path.join(workspace.uri.path, 'package.json');
    if (fs.existsSync(packageJson)) {
      result.push({ name: workspace.name, packageJson: packageJson, path: workspace.uri.path });
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
  return path.join(getLocalFolder(rootFolder), 'package.json');
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
  let hasIonicBasedProjects = false;
  for (const project of projects) {
    // Look for suitable dependencies: @ionic/*, @angular/*
    try {
      const pck = JSON.parse(fs.readFileSync(project.packageJson, 'utf8'));
      const isIonic = !!(
        pck?.dependencies?.['@ionic/vue'] ||
        pck?.dependencies?.['@ionic/angular'] ||
        pck?.dependencies?.['@ionic/react'] ||
        pck?.dependencies?.['@angular/core']
      );
      if (pck.dependencies) {
        result.push({ name: project.name, folder: project.path, isIonic: isIonic });
      }
      if (isIonic) {
        hasIonicBasedProjects = true;
      }
    } catch {
      //
    }
  }
  // if (!hasIonicBasedProjects) {
  //   return [];
  // }
  result = result.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
  return result;
}
