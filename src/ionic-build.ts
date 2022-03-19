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
	const buildForProduction = vscode.workspace.getConfiguration('ionic').get('buildForProduction');
	const buildFlags = buildForProduction ? ' --prod' : '';

	const nmf = path.join(project.folder, 'node_modules');
	const preop = (!fs.existsSync(nmf)) ? 'npm install && ' : '';
	switch (project.repoType) {
		case MonoRepoType.none : return `${preop}npx ionic build${buildFlags}`;
		case MonoRepoType.nx : return `${preop}npx nx build ${project.monoRepo.name}`;
		default: throw new Error('Unsupported Monorepo type');

	}
}