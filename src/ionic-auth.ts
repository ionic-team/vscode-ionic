import * as child_process from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

import { Context } from './context-variables';
import { ionicState } from './ionic-tree-provider';
import { sendTelemetryEvent, TelemetryEventType } from './telemetry';

export async function ionicLogin(folder: string, context: vscode.ExtensionContext) {
	const ifolder = path.join(folder, 'node_modules', '@ionic', 'cli', 'bin');
	const channel = vscode.window.createOutputChannel("Ionic");
	try {		
		await run(`node ionic login`, ifolder, channel);
		sendTelemetryEvent(folder, TelemetryEventType.Login, context);
	} catch (err) {
		vscode.window.showErrorMessage(err);
		ionicState.skipAuth = true;
		await vscode.commands.executeCommand('setContext', Context.isAnonymous, false);
	}
}

export async function ionicSignup(folder: string, context: vscode.ExtensionContext) {
	const ifolder = path.join(folder, 'node_modules', '@ionic', 'cli', 'bin');
	const channel = vscode.window.createOutputChannel("Ionic");
	await run('npx ionic signup', ifolder, channel);
	sendTelemetryEvent(folder, TelemetryEventType.SignUp, context);
}

async function run(command: string, folder: string, channel: vscode.OutputChannel): Promise<string> {
	return new Promise((resolve, reject) => {
		let out = '';
		const cmd = child_process.exec(command, { cwd: folder }, (error: child_process.ExecException, stdout: string, stderror: string) => {
			if (stdout) {
				out += stdout;
				channel.append(out);
			}
			if (!error) {
				channel.append(out);
				resolve(out);
			} else {
				if (stderror) {
					reject(stderror);
				} else {
					resolve(out);
				}
			}
		});
		cmd.stdin.pipe(process.stdin);
	});
}