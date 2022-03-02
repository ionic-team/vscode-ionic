import * as child_process from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

export async function ionicLogin(folder: string) {
	const ifolder = path.join(folder, 'node_modules', '@ionic', 'cli', 'bin');
	const channel = vscode.window.createOutputChannel("Ionic");
	await run('npx ionic login', ifolder, channel);
}

export async function ionicSignup(folder: string) {
	const ifolder = path.join(folder, 'node_modules', '@ionic', 'cli', 'bin');
	const channel = vscode.window.createOutputChannel("Ionic");
	await run('npx ionic signup', ifolder, channel);
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