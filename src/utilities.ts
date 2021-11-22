import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export async function run(folder: string, command: string, channel: vscode.OutputChannel): Promise<void> {
	if (command == 'rem-cordova') {
		return removeCordovaFromPackageJSON(folder);
	}
	return new Promise((resolve, reject) => {
		console.log(`exec ${command} (${folder})`);
		child_process.exec(command, { cwd: folder }, (error: child_process.ExecException, stdout: string, stderror: string) => {
			if (stdout) {
				channel.appendLine(stdout);				
			}
			if (stderror) {
				console.error(stderror);
				channel.appendLine(stderror);
			}
			if (error) {
				console.error(error);
			}

			if (!error) {
				resolve();
			} else {
				vscode.window.showErrorMessage(stderror, 'Ok');
				reject(command + ' Failed');
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