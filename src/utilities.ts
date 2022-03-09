import * as child_process from 'child_process';
import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import { RunPoint } from './tip';
import { viewInEditor } from './editor-preview';

export interface CancelObject {
	proc: child_process.ChildProcess;
}

const opTiming = {};
let serverUrl = undefined;

export function estimateRunTime(command: string) {
	if (opTiming[command]) {
		return opTiming[command];
	} else {
		return undefined;
	}
}

function runOptions(command: string, folder: string) {
	const env = { ...process.env };
	const javaHome: string = vscode.workspace.getConfiguration('ionic').get('javaHome');

	// Cocoapods required lang set to en_US.UTF-8 (when capacitor sync or run ios is done)
	if (command.includes('sync') || command.includes('cap run ios')) {
		env.LANG = 'en_US.UTF-8';
	}
	if (javaHome) {
		env.JAVA_HOME = javaHome;
	}

	return { cwd: folder, encoding: 'utf8', env: env };
}

export async function run(folder: string, command: string, channel: vscode.OutputChannel, cancelObject: CancelObject, viewEditor: boolean, runPoints: Array<RunPoint>, progress: any): Promise<void> {
	if (command == 'rem-cordova') {
		return removeCordovaFromPackageJSON(folder);
	}
	return new Promise((resolve, reject) => {
		console.log(`exec ${command} (${folder})`);
		const start_time = process.hrtime();
		const proc = child_process.exec(command, runOptions(command, folder), (error: child_process.ExecException, stdout: string, stderror: string) => {
			if (error) {
				console.error(error);
			}

			// Quirk of windows robocopy is that it logs errors/exit code on success
			if (!error || (command.includes('robocopy'))) {
				const end_time = process.hrtime(start_time);
				opTiming[command] = end_time[0]; // Number of seconds
				resolve();
			} else {
				handleError(stderror);
				reject(`${command} Failed`);
			}
		});
		proc.stdout.on('data', (data) => {
			if (data) {
				if (viewEditor) {
					if (data.includes('Local: http')) {
						serverUrl = getStringFrom(data, 'Local: ', '\n');
						const url = serverUrl;
						channel.appendLine(`Launching editor for ${url}`);
						viewEditor = false;
						setTimeout(() => viewInEditor(url), 500);
					}
				}

				// Based on found text logged change the progress message in the status bar
				if (runPoints) {
					for (const runPoint of runPoints) {
						if (data.includes(runPoint.text)) {
							progress.report({ message: runPoint.title });
						}
					}
				}
			}

			channel.append(data);
			channel.show();
		});
		proc.stderr.on('data', (data) => {
			channel.append(data);
			channel.show();
		});
		if (cancelObject) {
			cancelObject.proc = proc;
		}
	});
}

export async function handleError(error: string): Promise<string> {
	if (error.includes('ionic: command not found')) {
		const selection = await vscode.window.showErrorMessage('The Ionic CLI is not installed. Get started by running npm install -g @ionic/cli at the terminal.', 'More Information');
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://ionicframework.com/docs/intro/cli#install-the-ionic-cli'));
		return;
	}
	vscode.window.showErrorMessage(error, 'Ok');
}

export async function getRunOutput(command: string, folder: string): Promise<string> {
	return new Promise((resolve, reject) => {
		let out = '';
		child_process.exec(command, runOptions(command, folder), (error: child_process.ExecException, stdout: string, stderror: string) => {
			if (stdout) {
				out += stdout;
			}
			if (!error) {
				resolve(out);
			} else {
				if (stderror) {
					reject(stderror);
				} else {
					// This is to fix a bug in npm outdated where it returns an exit code when it succeeds
					resolve(out);
				}
			}
		});
	});
}

export function getPackageJSON(folder: string): PackageFile {
	const filename = path.join(folder, 'package.json');
	return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

export function getStringFrom(data: string, start: string, end: string): string {
	const foundIdx = data.lastIndexOf(start);
	if (foundIdx == -1) {
		return undefined;
	}
	const idx = foundIdx + start.length;
	return data.substring(
		idx,
		data.indexOf(end, idx)
	);
}

export function setStringIn(data: string, start: string, end: string, replacement: string): string {
	const foundIdx = data.lastIndexOf(start);
	if (foundIdx == -1) {
		return data;
	}
	const idx = foundIdx + start.length;
	return data.substring(0, idx) + replacement + data.substring(data.indexOf(end, idx));
}


export function generateUUID(): string {
	return (new Date()).getTime().toString(36) + Math.random().toString(36).slice(2);
}

export interface PackageFile {
	name: string;
	displayName: string;
	description: string;
	version: string;
	scripts: Record<string, unknown>;
}

function removeCordovaFromPackageJSON(folder: string): Promise<void> {
	return new Promise((resolve, reject) => {
		try {
			const filename = path.join(folder, 'package.json');
			const packageFile = JSON.parse(fs.readFileSync(filename, 'utf8'));
			packageFile.cordova = undefined;
			fs.writeFileSync(filename, JSON.stringify(packageFile, undefined, 2));
			resolve();
		} catch (err) {
			reject(err);
		}
	});
}