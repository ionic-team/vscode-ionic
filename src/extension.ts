'use strict';

import * as vscode from 'vscode';
import { IonicTreeProvider } from './ionicRecommendations';
import { Recommendation } from './recommendation';
import { Tip } from './tip';
import { CancelObject, run, getRunOutput, handleError } from './utilities';


let channel: vscode.OutputChannel = undefined;

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
				devices.push({ name: data[0].trim(), target: data[2].trim() });
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
	tip.commandTitle += ' on '+device?.name;
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

/**
 * Runs the command while showing a vscode window that can be cancelled
 * @param  {string|string[]} command Node command
 * @param  {string} rootPath path to run the command
 * @param  {IonicTreeProvider} ionicProvider? the provide which will be refreshed on completion
 * @param  {string} successMessage? Message to display if successful
 * @param  {string} title? Command title
 */
async function fixIssue(command: string | string[], rootPath: string, ionicProvider?: IonicTreeProvider, successMessage?: string, title?: string) {
	//Create output channel
	if (!channel) {
		channel = vscode.window.createOutputChannel("Ionic");
	}
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `${title ? title : command}`,
			cancellable: true,
		},
		async (progress, token) => {
			progress.report({
				message: `...`,
			});

			const cancelObject: CancelObject = { proc: undefined };

			const interval = setInterval(() => {
				// Kill the process if the user cancels				
				if (token.isCancellationRequested) {
					clearInterval(interval);
					cancelObject.proc.kill();
				}
			}, 1000);

			if (Array.isArray(command)) {
				for (const cmd of command) {
					channel.appendLine(cmd);
					await run(rootPath, cmd, channel, cancelObject);
				}
			} else {
				channel.appendLine(command);
				await run(rootPath, command, channel, cancelObject);
			}
			return true;
		}
	);
	if (ionicProvider) {
		ionicProvider.refresh();
	}
	if (successMessage) {
		vscode.window.showInformationMessage(`${successMessage}`);
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
		console.log(tip);
		const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
		if (!tip.command) {
			vscode.window.showInformationMessage(info, 'Ok');
		} else {
			const urlBtn = tip.url ? 'Info' : undefined;
			const selection = await vscode.window.showInformationMessage(info, urlBtn, tip.commandTitle);
			if (selection == tip.commandTitle) {
				fixIssue(tip.command, rootPath, ionicProvider, tip.commandSuccess, tip.commandTitle);
			}
			if (selection && selection == urlBtn) {
				vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
			}

		}
	});

	vscode.commands.registerCommand('ionic.run', async (tip: Tip) => {
		if (tip.command) {
			const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
			if (tip.command.indexOf('--list') !== -1) {
				const newCommand = await selectDevice(tip.command as string, rootPath, tip);
				if (newCommand) {
					fixIssue(newCommand, rootPath, undefined, undefined, tip.commandTitle);
				}
			} else {
				fixIssue(tip.command, rootPath, ionicProvider, undefined, tip.commandTitle);
			}
		}
	});
}