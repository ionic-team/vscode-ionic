import * as vscode from 'vscode';

import { exists } from './analyzer';
import { CapacitorPlatform } from './capacitor-platform';
import { getOutputChannel } from './extension';
import { MonoRepoType } from './monorepo';
import { Project } from './project';
import { Command } from './tip';



/**
 * Creates the command line to run for Capacitor
 * @param  {CapacitorPlatform} platform
 * @param  {Project} project
 * @returns string
 */
export function capacitorRun(project: Project, platform: CapacitorPlatform): string {
	switch (project.repoType) {
		case MonoRepoType.none: return capRun(platform);
		case MonoRepoType.nx: return nxRun(project, platform);
		default: throw new Error('Unsupported Monorepo type');
	}	
}

export function capacitorDevicesCommand(platform: CapacitorPlatform): string {
	const ionic = exists('@ionic/cli') ? 'ionic ': '';
	return `npx ${ionic}cap run ${platform} --list`;
}

function capRun(platform: CapacitorPlatform): string {
	const liveReload = vscode.workspace.getConfiguration('ionic').get('liveReload');
	const externalIP = vscode.workspace.getConfiguration('ionic').get('externalAddress');
	let capRunFlags = liveReload ? ' -l' : '';

	if (exists('@ionic-enterprise/auth') && liveReload) {
		capRunFlags = '';
		// @ionic-enterprise/auth gets a crypt error when running with an external IP address. So avoid the issue
		const channel = getOutputChannel();
		channel.appendLine('[Ionic] Live Update was ignored as you have @ionic-enterprise/auth included in your project');
	}

	if (externalIP) {
		if (capRunFlags.length >= 0) capRunFlags += ' ';
		capRunFlags += '--external';
	}

	const ionic = exists('@ionic/cli') ? 'ionic ': '';
	return `npx ${ionic}cap run ${platform}${capRunFlags} --target=`;
}

function nxRun(project: Project, platform: CapacitorPlatform): string {
	return `npx nx run ${project.monoRepo.name}:run --configuration=${platform} --target=`;
}