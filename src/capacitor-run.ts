import * as vscode from 'vscode';

import { exists } from './analyzer';
import { CapacitorPlatform } from './capacitor-platform';
import { InternalCommand } from './command-name';
import { getOutputChannel } from './extension';
import { ionicBuild } from './ionic-build';
import { ionicState } from './ionic-tree-provider';
import { MonoRepoType } from './monorepo';
import { Project } from './project';



/**
 * Creates the command line to run for Capacitor
 * @param  {CapacitorPlatform} platform
 * @param  {Project} project
 * @returns string
 */
export function capacitorRun(project: Project, platform: CapacitorPlatform): string {
    let preop = '';

	// If the user modified something in the editor then its likely they need to rebuild the app before running
	if (ionicState.projectDirty) {
		const channel = getOutputChannel();
		channel.appendLine('[Ionic] Rebuilding as you changed your project...');
		preop = ionicBuild(project) + ' && ';		
	}

	switch (project.repoType) {
		case MonoRepoType.none:
		case MonoRepoType.folder:
		case MonoRepoType.npm: return preop + capRun(platform, project.repoType);
		case MonoRepoType.nx: return preop + nxRun(project, platform);
		default: throw new Error('Unsupported Monorepo type');
	}
}

export function capacitorDevicesCommand(platform: CapacitorPlatform): string {
	const ionic = exists('@ionic/cli') ? 'ionic ' : '';
	return `npx ${ionic}cap run ${platform} --list`;
}

function capRun(platform: CapacitorPlatform, repoType: MonoRepoType): string {
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

	const pre = (repoType == MonoRepoType.npm || repoType == MonoRepoType.folder) ? InternalCommand.cwd : '';
	const ionic = exists('@ionic/cli') ? 'ionic ' : '';
	return `${pre}npx ${ionic}cap run ${platform}${capRunFlags} --target=${InternalCommand.target}`;
}

function nxRun(project: Project, platform: CapacitorPlatform): string {
	// Note: This may change, see: https://github.com/nxtend-team/nxtend/issues/490
	return `npx nx run ${project.monoRepo.name}:cap --cmd "run ${platform} --target=${InternalCommand.target}"`;
}