'use strict';

import * as vscode from 'vscode';
import { IonicTreeProvider } from './ionic-tree-provider';
import { Recommendation } from './recommendation';
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
					devices.push({ name: data[0].trim(), target: target });
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
	const selected = await vscode.window.showQuickPick(names);
	const device = devices.find(device => device.name == selected);
	if (!device) return;
	tip.commandTitle = 'Running on ' + device?.name;
	return command.replace('--list', '--target=' + device?.target);
}

async function showProgress(message: string, func: () => Promise<any>) {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Window,
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
async function fixIssue(command: string | string[], rootPath: string, ionicProvider?: IonicTreeProvider, tip?: Tip) {
	//Create output channel
	if (!channel) {
		channel = vscode.window.createOutputChannel("Ionic");
	}
	if (isRunning(tip)) {
		vscode.window.showInformationMessage(`The operation "${tip.title}" is already running. Click on the operation in the status bar to cancel it.`);
		return;
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
				if (token.isCancellationRequested) {
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
				for (const cmd of command) {
					channel.append(cmd);
					channel.show();
					await run(rootPath, cmd, channel, cancelObject);
				}
			} else {
				channel.append(command);
				channel.show();
				const secondsTotal = estimateRunTime(command);
				if (secondsTotal) {
					increment = 100.0 / secondsTotal;
				}
				await run(rootPath, command, channel, cancelObject);				
			}
			return true;
		}
	);
	completeOperation(tip);
	if (ionicProvider) {
		ionicProvider.refresh();
	}
	if (tip.commandSuccess) {
		vscode.window.showInformationMessage(`${tip.commandSuccess}`);
	}
}

export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	const ionicProvider = new IonicTreeProvider(rootPath);
	vscode.window.registerTreeDataProvider('ionic', ionicProvider);
	vscode.commands.registerCommand('ionic.refresh', () => ionicProvider.refresh());
	vscode.commands.registerCommand('ionic.add', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('ionic.edit', (node: Recommendation) => {
		const url = node.url ? node.url : `https://www.npmjs.com/package/${node.label}`;
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
	});

	vscode.commands.registerCommand('ionic.fix', async (tip: Tip) => {
		if (tip.command) {
			const urlBtn = tip.url ? 'Info' : undefined;
			const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
			const selection = await vscode.window.showInformationMessage(info, urlBtn, tip.commandTitle);
			if (selection == tip.commandTitle) {
				fixIssue(tip.command, rootPath, ionicProvider, tip);
			}
			if (selection && selection == urlBtn) {
				vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
			}
		} else {
			execute(tip);
		}
	});

	vscode.commands.registerCommand('ionic.run', async (tip: Tip) => {
		if (tip.command) {
			const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
			if (tip.command.indexOf('--list') !== -1) {
				const newCommand = await selectDevice(tip.command as string, rootPath, tip);
				if (newCommand) {
					fixIssue(newCommand, rootPath, undefined, tip);
				}
			} else {
				fixIssue(tip.command, rootPath, ionicProvider, tip);
			}
		} else {
			execute(tip);
		}

	});

	vscode.commands.registerCommand('ionic.link', async (tip: Tip) => {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
	});
}

function execute(tip: Tip) {
	if (tip.title == 'Settings') {
		vscode.commands.executeCommand('workbench.action.openSettings', 'Ionic');
	} else if (tip.url) {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
	}
}