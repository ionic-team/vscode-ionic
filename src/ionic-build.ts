import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Project } from './project';
import { MonoRepoType } from './monorepo';

/**
 * Creates the ionic build command
 * @param  {Project} project
 * @returns string
 */
export function ionicBuild(project: Project): string {
	// For convenience, check if npm install was done and do it
	const nmf = path.join(project.folder, 'node_modules');
	const preop = (!fs.existsSync(nmf)) ? 'npm install && ' : '';

	const prod: boolean = vscode.workspace.getConfiguration('ionic').get('buildForProduction');	
	switch (project.repoType) {
		case MonoRepoType.none: return `${preop}${ionicCLIBuild(prod)}`;
		case MonoRepoType.nx: return `${preop}${nxBuild(prod, project)}`;
		default: throw new Error('Unsupported Monorepo type');
	}
}

function ionicCLIBuild(prod: boolean): string {
	let cmd = `npx ionic build`;
	if (prod) {
		cmd += ' --prod';
	}
	return cmd;
}

function nxBuild(prod: boolean, project: Project): string {
	let cmd = `npx nx build ${project.monoRepo.name}`;
	if (prod) {
		cmd += ' --configuration=production';
	}
	return cmd;
}