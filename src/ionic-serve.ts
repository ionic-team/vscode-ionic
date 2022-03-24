
import * as vscode from 'vscode';
import { InternalCommand } from './command-name';
import { MonoRepoType } from './monorepo';
import { Project } from './project';

/**
 * Create the ionic serve command
 * @returns string
 */
export function ionicServe(project: Project): string {
	switch (project.repoType) {
		case MonoRepoType.none: return ionicCLIServe();
		case MonoRepoType.npm: return InternalCommand.cwd + ionicCLIServe();
		case MonoRepoType.nx: return nxServe(project);
		default: throw new Error('Unsupported Monorepo type');
	}

}

function ionicCLIServe(): string {
	const httpsForWeb = vscode.workspace.getConfiguration('ionic').get('httpsForWeb');
	const previewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
	let serveFlags = '';
	if (previewInEditor) {
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