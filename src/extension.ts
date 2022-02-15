'use strict';

import * as vscode from 'vscode';
import { IonicTreeProvider } from './ionic-tree-provider';
import { clearRefreshCache } from './process-packages';
import { Recommendation } from './recommendation';
import { installPackage } from './recommendations';
import { Tip, TipType } from './tip';
import { CancelObject, run, getRunOutput, handleError, estimateRunTime } from './utilities';


let channel: vscode.OutputChannel = undefined;
let runningOperations = [];

/**
 * Runs the command and obtains the stdout, parses it for the list of device names and target ids
 * @param  {string} command Node command which gathers device list
 * @param  {string} rootPath Path where the node command runs
 */
async function getDevices(command: string, rootPath: string) {
	try {
		const result = await getRunOutput(command, rootPath);

		const lines = result.split('\n');
		lines.shift(); // Remove the header
		const devices = [];
		for (const line of lines) {
			const data = line.split('|');
			if (data.length == 3) {
				const target = data[2].trim();
				if (target != '?') {
					devices.push({ name: data[0].trim() + ' ' + data[1].trim(), target: target });
				}
			}
		}
		return devices;
	} catch (error) {
		handleError(error);
	}
}

/**
 * Uses vscodes Quick pick dialog to allow selection of a device and
 * returns the command used to run on the selected device
 * @param  {string} command
 * @param  {string} rootPath
 */
async function selectDevice(command: string, rootPath: string, tip: Tip) {
	let devices;
	await showProgress('Getting Devices', async () => {
		devices = await getDevices(command, rootPath);
	});

	//const devices = await getDevices(command, rootPath);
	const names = devices.map(device => device.name);
	const selected = await vscode.window.showQuickPick(names, { placeHolder: 'Select a device to run application on' });
	const device = devices.find(device => device.name == selected);
	if (!device) return;
	tip.commandTitle = 'Running on ' + device?.name;
	return command.replace('--list', '--target=' + device?.target);
}

async function requestAppName(tip: Tip) {
	let name = await vscode.window.showInputBox({
		title: 'Name of the application',
		placeHolder: 'my-app',
		value: 'my-app'
	});
	if (name && name.length > 1) {
		const result = [];
		name = name.replace(/ /g, '-');
		for (const command of tip.command) {
			result.push(command.replace('@app', `${name.trim()}`));
		}
		return result;
	} else {
		return undefined;
	}
}

async function showProgress(message: string, func: () => Promise<any>) {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `${message}`,
			cancellable: true,
		},
		async (progress, token) => {
			await func();
		}
	);
}

function isRunning(tip: Tip) {
	const found = runningOperations.find((found) => { return found.title == tip.title; });
	return (found != undefined);
}

function cancelRunning(tip: Tip): Promise<void> {
	const found = runningOperations.find((found) => { return found.title == tip.title; });
	if (found) {
		found.cancelRequested = true;
	}
	return new Promise(resolve => setTimeout(resolve, 1000));
}

function completeOperation(tip: Tip) {
	runningOperations = runningOperations.filter((op: Tip) => {
		return op.title != tip.title;
	});
}

/**
 * Runs the command while showing a vscode window that can be cancelled
 * @param  {string|string[]} command Node command
 * @param  {string} rootPath path to run the command
 * @param  {IonicTreeProvider} ionicProvider? the provide which will be refreshed on completion
 * @param  {string} successMessage? Message to display if successful 
 */
export async function fixIssue(command: string | string[], rootPath: string, ionicProvider?: IonicTreeProvider, tip?: Tip, successMessage?: string) {
	//Create output channel
	if (!channel) {
		channel = vscode.window.createOutputChannel("Ionic");
	}
	if (isRunning(tip)) {
		await cancelRunning(tip);
		// vscode.window.showInformationMessage(`The operation "${tip.title}" is already running. Click on the operation in the status bar to cancel it.`);
		// return;
	}
	runningOperations.push(tip);
	const msg = tip.commandProgress ? tip.commandProgress : tip.commandTitle ? tip.commandTitle : command;
	await vscode.window.withProgress(
		{
			location: tip.progressDialog ? vscode.ProgressLocation.Notification : vscode.ProgressLocation.Window,
			title: `${msg}`,
			cancellable: true,
		},

		async (progress, token) => {
			const cancelObject: CancelObject = { proc: undefined };
			let increment = undefined;
			const interval = setInterval(() => {
				// Kill the process if the user cancels				
				if (token.isCancellationRequested || tip.cancelRequested) {
					tip.cancelRequested = false;
					channel.appendLine(`Canceled operation "${tip.title}"`);
					clearInterval(interval);
					completeOperation(tip);
					cancelObject.proc.kill();
				} else {
					if (increment) {
						progress.report({ increment: increment });
					}
				}
			}, 1000);

			if (Array.isArray(command)) {
				try {
					for (const cmd of command) {
						channel.appendLine(cmd);
						channel.show();

						await run(rootPath, cmd, channel, cancelObject, tip.doViewEditor);

					}
				} finally {
					completeOperation(tip);
				}
			} else {
				channel.appendLine(command);
				channel.show();
				const secondsTotal = estimateRunTime(command);
				if (secondsTotal) {
					increment = 100.0 / secondsTotal;
				}
				try {
					await run(rootPath, command, channel, cancelObject, tip.doViewEditor);
				} finally {
					completeOperation(tip);
				}
			}
			return true;
		}
	);
	if (ionicProvider) {
		ionicProvider.refresh();
	}
	if (successMessage) {
		vscode.window.showInformationMessage(successMessage);
	}
}

export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;


	let javaHome: string = vscode.workspace.getConfiguration('ionic').get('javaHome');
	if (!javaHome || javaHome.length === 1) {
		javaHome = process.env['JAVA_HOME'];
		vscode.workspace.getConfiguration('ionic').update('javaHome',javaHome, vscode.ConfigurationTarget.Global);		
	}

	const ionicProvider = new IonicTreeProvider(rootPath, context.extensionPath);
	vscode.window.registerTreeDataProvider('ionic', ionicProvider);
	vscode.commands.registerCommand('ionic.refresh', () => {
		clearRefreshCache();
		ionicProvider.refresh();
	});
	
	vscode.commands.registerCommand('ionic.add', async (tip: Tip) => {
		await installPackage(context.extensionPath, rootPath);
		if (ionicProvider) {
			ionicProvider.refresh();
		}
	});

	vscode.commands.registerCommand('ionic.edit', (node: Recommendation) => {
		const url = node.url ? node.url : `https://www.npmjs.com/package/${node.label}`;
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
	});

	vscode.commands.registerCommand('ionic.fix', async (tip: Tip) => {
		tip.generateCommand();
		if (tip.command) {
			const urlBtn = tip.url ? 'Info' : undefined;
			const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
			const selection = await vscode.window.showInformationMessage(info, urlBtn, tip.secondTitle, tip.commandTitle);
			if (selection == tip.commandTitle) {
				fixIssue(tip.command, rootPath, ionicProvider, tip, tip.commandSuccess);
			}
			if (selection == tip.secondTitle) {
				fixIssue(tip.secondCommand, rootPath, ionicProvider, tip);
			}
			if (selection && selection == urlBtn) {
				vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
			}
		} else {
			await execute(tip);

			if (ionicProvider) {
				ionicProvider.refresh();
			}
		}
	});

	vscode.commands.registerCommand('ionic.run', async (tip: Tip) => {
		tip.generateCommand();
		if (tip.command) {
			const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
			let command = tip.command;
			if (tip.doRequestAppName) {
				command = await requestAppName(tip);
			}
			if (tip.doDeviceSelection) {
				command = await selectDevice(tip.command as string, rootPath, tip);
			}
			if (command) {
				execute(tip);
				fixIssue(command, rootPath, ionicProvider, tip);
				return;
			}
		} else {
			execute(tip);
		}

	});

	vscode.commands.registerCommand('ionic.link', async (tip: Tip) => {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
	});
}

async function execute(tip: Tip) {
	await tip.executeAction();
	if (tip.title == 'Settings') {
		vscode.commands.executeCommand('workbench.action.openSettings', 'Ionic');
	} else if (tip.url) {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
	}
}