import * as vscode from 'vscode';

import { exists } from './analyzer';
import { getOutputChannel } from './extension';

export enum CapacitorPlatform {
	ios = 'ios',
	android = 'android'
}

/**
 * Creates the command line to run for Capacitor
 * @param  {CapacitorPlatform} platform
 * @returns string
 */
export function capRun(platform: CapacitorPlatform): string {
	const liveReload = vscode.workspace.getConfiguration('ionic').get('liveReload');
	const externalIP = vscode.workspace.getConfiguration('ionic').get('externalAddress');
	let capRunFlags = liveReload ? ' -l' : '';

	if (exists('@ionic-enterprise/auth') && liveReload) {
		capRunFlags = '';
		// @ionic-enterprise/auth gets a crypt error when running with an external IP address. So avoid the issue
		const channel = getOutputChannel();
		channel.appendLine('Note: Live Update was ignored as you have @ionic-enterprise/auth included in your project');
	}

	if (externalIP) {
		if (capRunFlags.length > 0) capRunFlags += ' ';
		capRunFlags += '--external';
	}

	return `npx ionic cap run ${platform}${capRunFlags} --list`;
}