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

export interface MonoRepoProject {
  name: string;
  folder: string;
  localPackageJson?: boolean; // Is the package.json in the local project folder
  isIonic?: boolean; // Does it looks like an ionic project using @ionic/vue etc
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
export function checkForMonoRepo(project: Project, selectedProject: string, context: vscode.ExtensionContext) {
  project.repoType = MonoRepoType.none;
  if (!selectedProject) {
    selectedProject = context.workspaceState.get('SelectedProject');
  }
  let projects: Array<MonoRepoProject> = undefined;
  // Might be pnpm based
  const pw = path.join(project.folder, 'pnpm-workspace.yaml');
  const isPnpm = fs.existsSync(pw);

  if (exists('@nrwl/cli')) {
    project.repoType = MonoRepoType.nx;
    projects = getNXProjects(project);
    ionicState.projects = projects;
    ionicState.projectsView.title = 'NX Projects';
  } else if (project.workspaces?.length > 0 && !isPnpm) {
    // For npm workspaces check package.json
    projects = getNpmWorkspaceProjects(project);
    project.repoType = MonoRepoType.npm;
    if (ionicState.packageManager == PackageManager.yarn) {
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

      // npm workspaces uses the package.json of the local folder
      project.monoRepo.localPackageJson = [
        MonoRepoType.npm,
        MonoRepoType.folder,
        MonoRepoType.yarn,
        MonoRepoType.lerna,
        MonoRepoType.pnpm,
      ].includes(project.repoType);

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
export function isFolderBasedMonoRepo(rootFolder: string): Array<any> {
  const folders = fs
    .readdirSync(rootFolder, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name);
  const result = [];
  for (const folder of folders) {
    const packagejson = path.join(rootFolder, folder, 'package.json');
    if (fs.existsSync(packagejson)) {
      result.push({ name: folder, packageJson: packagejson, path: path.join(rootFolder, folder) });
    }
  }
  return result;
}

export function getMonoRepoFolder(name: string): string {
  const found: MonoRepoProject = ionicState.projects.find((repo) => repo.name == name);
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
      return getMonoRepoFolder(ionicState.workspace);
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
  if (!hasIonicBasedProjects) {
    return [];
  }
  result = result.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1));
  return result;
}
