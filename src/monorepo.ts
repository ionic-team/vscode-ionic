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
export function checkForMonoRepo(project: Project) {
	project.repoType = MonoRepoType.none;
	if (exists('@nrwl/cli')) {
		project.repoType = MonoRepoType.nx;
		const projects = getNXProjects(project);
		project.monoRepo = projects[0];
		ionicState.projects = projects;
		ionicState.projectsView.title = 'NX Projects';
		vscode.commands.executeCommand(CommandName.ProjectsRefresh);
	}
	vscode.commands.executeCommand('setContext', 'isMonoRepo', project.repoType !== MonoRepoType.none);
}