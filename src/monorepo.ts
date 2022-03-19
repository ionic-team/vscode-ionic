import * as vscode from 'vscode';

import { exists } from "./analyzer";
import { CommandName } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { getNXProjects } from './monorepos-nx';
import { Project } from "./project";

export interface MonoRepoProject {
	name: string;
	folder: string;
}

export enum MonoRepoType {
	none,
	nx,
	turboRepo,
	pnpm,
	lerna
}

/**
 * Check to see if this is a monorepo and what type.
 * @param  {Project} project
 */
export function checkForMonoRepo(project: Project, selectedProject: string) {
	project.repoType = MonoRepoType.none;
	if (exists('@nrwl/cli')) {
		project.repoType = MonoRepoType.nx;
		const projects = getNXProjects(project);
		const found = projects.find((project) => project.name == selectedProject);
		project.monoRepo = found ? found : projects[0];
		ionicState.projects = projects;
		ionicState.projectsView.title = 'NX Projects';
		if (!project.monoRepo) {
			project.repoType = MonoRepoType.none;
			vscode.window.showErrorMessage('NX found but no projects found.');
		} else {
		ionicState.view.title = project.monoRepo.name;
		vscode.commands.executeCommand(CommandName.ProjectsRefresh, project.monoRepo.name);
		}
	}
	vscode.commands.executeCommand('setContext', 'isMonoRepo', project.repoType !== MonoRepoType.none);
}