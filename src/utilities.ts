import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export interface CancelObject {
	proc: child_process.ChildProcess;
}

export async function run(folder: string, command: string, channel: vscode.OutputChannel, cancelObject: CancelObject): Promise<void> {
	if (command == 'rem-cordova') {
		return removeCordovaFromPackageJSON(folder);
	}
	return new Promise((resolve, reject) => {
		console.log(`exec ${command} (${folder})`);
		const proc = child_process.exec(command, { cwd: folder }, (error: child_process.ExecException, stdout: string, stderror: string) => {
			if (error) {
				console.error(error);
			}

			if (!error) {
				resolve();
			} else {
				handleError(stderror);
				reject(command + ' Failed');
			}
		});
		proc.stdout.on('data', (data) => {
			channel.appendLine(data);
			channel.show();
		});
		proc.stderr.on('data', (data) => {
			channel.appendLine(data);
		});
		cancelObject.proc = proc;
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
		console.log(`${command}...`);
		child_process.exec(command, { cwd: folder }, (error: child_process.ExecException, stdout: string, stderror: string) => {
			if (stdout) {
				out += stdout;
			}
			if (!error) {
				resolve(out);
			} else {
				reject(stderror);
			}
		});
	});
}

export function getPackageJSON(folder: string): PackageFile {
	const filename = path.join(folder, 'package.json');
	return JSON.parse(fs.readFileSync(filename, 'utf8'));
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