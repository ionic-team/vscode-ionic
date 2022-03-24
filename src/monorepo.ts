import * as vscode from 'vscode';
import * as path from 'path';

import { exists } from "./analyzer";
import { CommandName } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { getNpmWorkspaceProjects } from './monorepos-npm';
import { getNXProjects } from './monorepos-nx';
import { Project } from "./project";

export interface MonoRepoProject {
	name: string;
	folder: string;
	localPackageJson?: boolean; // Is the package.json in the local project folder
}

export enum MonoRepoType {
	none,
	nx,
	turboRepo,
	pnpm,
	lerna,
	npm
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

	if (exists('@nrwl/cli')) {
		project.repoType = MonoRepoType.nx;
		projects = getNXProjects(project);
		ionicState.projects = projects;
		ionicState.projectsView.title = 'NX Projects';
		
	} else {
		// For npm workspaces check package.json
		if (project.workspaces?.length > 0) {
			projects = getNpmWorkspaceProjects(project);
			project.repoType = MonoRepoType.npm;
			ionicState.projects = projects;
			ionicState.projectsView.title = "Workspaces";
		}

	}
	if (projects?.length > 0) {
		const found = projects.find((project) => project.name == selectedProject);
		if (!found) {
			context.workspaceState.update('SelectedProject',projects[0]);
		}
		project.monoRepo = found ? found : projects[0];

		if (!project.monoRepo) {
			project.repoType = MonoRepoType.none;
			vscode.window.showErrorMessage('No mono repo projects found.');
		} else {
			ionicState.view.title = project.monoRepo.name;
			
			// npm workspaces uses the package.json of the local folder
			project.monoRepo.localPackageJson = (project.repoType == MonoRepoType.npm);

			vscode.commands.executeCommand(CommandName.ProjectsRefresh, project.monoRepo.name);
		}
	}
	ionicState.repoType = project.repoType;

	vscode.commands.executeCommand('setContext', 'isMonoRepo', project.repoType !== MonoRepoType.none);
}

export function getMonoRepoFolder(name: string): string {
	const found: MonoRepoProject = ionicState.projects.find((repo) => repo.name == name);	
	return found?.folder;
}

export function getPackageJSONFilename(rootFolder: string): string {
	switch (ionicState.repoType) {
		case MonoRepoType.npm: return path.join(getMonoRepoFolder(ionicState.workspace), 'package.json');
	}
    return path.join(rootFolder, 'package.json');
}