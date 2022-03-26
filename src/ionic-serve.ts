
import * as vscode from 'vscode';

import { InternalCommand } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { MonoRepoType } from './monorepo';
import { Project } from './project';

/**
 * Create the ionic serve command
 * @returns string
 */
export function ionicServe(project: Project, browser: string): string {
	switch (project.repoType) {
		case MonoRepoType.none: return ionicCLIServe(project);		
		case MonoRepoType.nx: return nxServe(project);
		case MonoRepoType.npm:
		case MonoRepoType.folder: return InternalCommand.cwd + ionicCLIServe(project);
		default: throw new Error('Unsupported Monorepo type');
	}

}

function ionicCLIServe(project: Project): string {
	const httpsForWeb = vscode.workspace.getConfiguration('ionic').get('httpsForWeb');
	const previewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
	let serveFlags = '';
	if (previewInEditor || ionicState.debugMode) {
		serveFlags += ' --no-open';
	}
	if (httpsForWeb) {
		serveFlags += ' --ssl';
	}

	return `npx ionic serve${serveFlags}`;
}

function nxServe(project: Project): string {
	return `npx nx serve ${project.monoRepo.name}`;
}