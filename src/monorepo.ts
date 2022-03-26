import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { exists } from "./analyzer";
import { CommandName } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { getNpmWorkspaceProjects } from './monorepos-npm';
import { getNXProjects } from './monorepos-nx';
import { Project } from "./project";
import { Context, VSCommand } from './context-variables';

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
	npm,
	folder
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

	} else if (project.workspaces?.length > 0) {
		// For npm workspaces check package.jsonß
		projects = getNpmWorkspaceProjects(project);
		project.repoType = MonoRepoType.npm;
		ionicState.projects = projects;
		ionicState.projectsView.title = "Workspaces";
	} else {
		// See if it looks like a folder based repo
		projects = getFolderBasedProjects(project);
		if (projects?.length > 0) {
			project.repoType = MonoRepoType.folder;
			ionicState.projectsView.title = "Projects";
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
			project.monoRepo.localPackageJson = ([MonoRepoType.npm, MonoRepoType.folder].includes(project.repoType));

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
	const folders = fs.readdirSync(rootFolder, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => dir.name);
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
		case MonoRepoType.folder: return getMonoRepoFolder(ionicState.workspace);
	}
	return rootFolder;
}

function getFolderBasedProjects(prj: Project): Array<MonoRepoProject> {
	const projects = isFolderBasedMonoRepo(prj.folder);
	let result: Array<MonoRepoProject> = [];
	for (const project of projects) {
		// Look for suitable dependencies: @ionic/*, @angular/*
		try {
			const pck = JSON.parse(fs.readFileSync(project.packageJson, 'utf8'));
			if (pck?.dependencies?.['@ionic/vue'] ||
				pck?.dependencies?.['@ionic/angular'] ||
				pck?.dependencies?.['@ionic/react'] ||
				pck?.dependencies?.['@angular/core']
			) {
				result.push({ name: project.name, folder: project.path });
			}
		} catch {
			//
		}
	}
	result = result.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : -1);
	return result;
}