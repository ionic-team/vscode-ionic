'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';

import { Context } from './context-variables';
import { ionicLogin, ionicSignup } from './ionic-auth';
import { ionicState, IonicTreeProvider } from './ionic-tree-provider';
import { clearRefreshCache } from './process-packages';
import { Recommendation } from './recommendation';
import { installPackage } from './project';
import { Command, Tip } from './tip';
import { CancelObject, run, getRunOutput, estimateRunTime } from './utilities';
import { ignore } from './ignore';
import { handleError } from './error-handler';
import { CommandName } from './command-name';


let channel: vscode.OutputChannel = undefined;
let runningOperations = [];
export let lastOperation: Tip;

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
			} else {
				const device = parseDevice(line);
				if (device) {
					devices.push(device);
				}

			}
		}
		return devices;
	} catch (error) {
		handleError(error, [], rootPath);
	}
}

function parseDevice(line: string) {
	try {
		const name = line.substring(0, line.indexOf('  ')).trim();
		line = line.substring(line.indexOf('  ')).trim();
		const args = line.replace('  ', '|').split('|');
		return { name: name + ' ' + args[0].trim(), target: args[1].trim() };
	} catch
	{
		return undefined;
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
	tip.commandTitle = device?.name;
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
			result.push(command.replace(new RegExp('@app', 'g'), `${name.trim()}`));
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

export function isRunning(tip: Tip) {
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

function finishCommand(tip: Tip) {
	runningOperations = runningOperations.filter((op: Tip) => {
		return op.title != tip.title;
	});
}

function startCommand(tip: Tip, cmd: string) {
	if (tip.title) {
		const message = tip.commandTitle ? tip.commandTitle : tip.title;
		channel.appendLine(`[Ionic] ${message}...`);
		channel.appendLine(`> ${cmd}`);
		channel.show();
	}
}

export function getOutputChannel(): vscode.OutputChannel {
	if (!channel) {
		channel = vscode.window.createOutputChannel("Ionic");
	}
	return channel;
}

/**
 * Runs the command while showing a vscode window that can be cancelled
 * @param  {string|string[]} command Node command
 * @param  {string} rootPath path to run the command
 * @param  {IonicTreeProvider} ionicProvider? the provide which will be refreshed on completion
 * @param  {string} successMessage? Message to display if successful 
 */
export async function fixIssue(command: string | string[], rootPath: string, ionicProvider?: IonicTreeProvider, tip?: Tip, successMessage?: string) {
	const channel = getOutputChannel();
	const hasRunPoints = (tip && tip.runPoints && tip.runPoints.length > 0);

	if (command == Command.NoOp) return;

	// If the task is already running then cancel it
	if (isRunning(tip)) {
		await cancelRunning(tip);
	}

	runningOperations.push(tip);
	lastOperation = tip;
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
			let percentage = undefined;
			const interval = setInterval(() => {
				// Kill the process if the user cancels				
				if (token.isCancellationRequested || tip.cancelRequested) {
					tip.cancelRequested = false;
					channel.appendLine(`Canceled operation "${tip.title}"`);
					clearInterval(interval);
					finishCommand(tip);
					cancelObject.proc.kill();
					if (ionicProvider) {
						ionicProvider.refresh();
					}
				} else {
					if (increment && !hasRunPoints) {
						percentage += increment;
						if (percentage > 100) percentage = 100;
						progress.report({ message: `${parseInt(percentage)}%`, increment: increment });
					}
				}
			}, 1000);

			if (Array.isArray(command)) {
				try {
					for (const cmd of command) {
						startCommand(tip, cmd);
						await run(rootPath, cmd, channel, cancelObject, tip.doViewEditor, tip.runPoints, progress, ionicProvider);

					}
				} finally {
					finishCommand(tip);
				}
			} else {
				startCommand(tip, command);
				const secondsTotal = estimateRunTime(command);
				if (secondsTotal) {
					increment = 100.0 / secondsTotal;
					percentage = 0;
				}
				try {
					await run(rootPath, command, channel, cancelObject, tip.doViewEditor, tip.runPoints, progress, ionicProvider);
				} finally {
					finishCommand(tip);
				}
			}
			return true;
		}
	);
	if (ionicProvider) {
		ionicProvider.refresh();
	}
	if (successMessage) {
		channel.appendLine(successMessage);
	}
	if (tip.title) {
		channel.appendLine(`[Ionic] ${tip.title} Completed.`);
		channel.appendLine('');
		channel.show();
	}
}

export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;


	// let javaHome: string = vscode.workspace.getConfiguration('ionic').get('javaHome');
	// if (!javaHome || javaHome.length === 1) {
	// 	javaHome = process.env['JAVA_HOME'];

	// 	const jre = '/Applications/Android Studio.app/Contents/jre/Contents/Home';
	// 	if (fs.lstatSync(jre).isDirectory()) {
	// 		javaHome = jre;
	// 	}
	// 	vscode.workspace.getConfiguration('ionic').update('javaHome',javaHome, vscode.ConfigurationTarget.Global);		
	// }

	const ionicProvider = new IonicTreeProvider(rootPath, context);
	//vscode.window.registerTreeDataProvider('ionic', ionicProvider);
	const view = vscode.window.createTreeView('ionic', { treeDataProvider: ionicProvider });
	ionicState.view = view;

	vscode.commands.registerCommand(CommandName.Refresh, () => {
		clearRefreshCache(context);
		context.workspaceState.update('CapacitorProject', undefined);
		ionicProvider.refresh();
	});

	vscode.commands.registerCommand(CommandName.Add, async () => {
		await installPackage(context.extensionPath, rootPath);
		if (ionicProvider) {
			ionicProvider.refresh();
		}
	});

	vscode.commands.registerCommand(CommandName.SignUp, async () => {
		await ionicSignup(context.extensionPath, context);
		ionicProvider.refresh();
	});

	vscode.commands.registerCommand(CommandName.Login, async () => {
		await vscode.commands.executeCommand('setContext', Context.isLoggingIn, true);
		await ionicLogin(context.extensionPath, context);
		ionicProvider.refresh();
	});

	vscode.commands.registerCommand(CommandName.SkipLogin, async () => {
		ionicState.skipAuth = true;
		await vscode.commands.executeCommand('setContext', Context.inspectedProject, false);
		await vscode.commands.executeCommand('setContext', Context.isAnonymous, false);
		ionicProvider.refresh();
	});

	vscode.commands.registerCommand(CommandName.Open, async (recommendation: Recommendation) => {
		if (fs.existsSync(recommendation.tip.secondCommand)) {
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(recommendation.tip.secondCommand));
		}
	});

	vscode.commands.registerCommand(CommandName.Rebuild, async (recommendation: Recommendation) => {
		await recommendation.tip.executeAction();
		ionicProvider.refresh();
	});

	vscode.commands.registerCommand(CommandName.Fix, async (tip: Tip) => {
		await fix(tip, rootPath, ionicProvider, context);
	});

	vscode.commands.registerCommand(CommandName.Idea, async (r: Recommendation) => {
		await fix(r.tip, rootPath, ionicProvider, context);
	});

	vscode.commands.registerCommand(CommandName.Run, async (tip: Tip) => {
		tip.generateCommand();
		tip.generateTitle();
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

	vscode.commands.registerCommand(CommandName.Link, async (tip: Tip) => {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
	});
}

async function fix(tip: Tip, rootPath: string, ionicProvider: IonicTreeProvider, context: vscode.ExtensionContext): Promise<void> {
	tip.generateCommand();
	tip.generateTitle();
	if (tip.command) {
		const urlBtn = tip.url ? 'Info' : undefined;
		const msg = tip.message ? `: ${tip.message}` : '';
		const info = tip.description ? tip.description : `${tip.title}${msg}`;
		const ignoreTitle = tip.ignorable ? 'Ignore' : undefined;
		const selection = await vscode.window.showInformationMessage(info, urlBtn, ignoreTitle, tip.secondTitle, tip.commandTitle);
		if (selection && selection == tip.commandTitle) {
			fixIssue(tip.command, rootPath, ionicProvider, tip, tip.commandSuccess);
		}
		if (selection && selection == tip.secondTitle) {
			fixIssue(tip.secondCommand, rootPath, ionicProvider, tip);
		}
		if (selection && selection == urlBtn) {
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
		}
		if (selection && selection == ignoreTitle) {
			ignore(tip, context);
			if (ionicProvider) {
				ionicProvider.refresh();
			}
		}
	} else {
		await execute(tip);

		if (ionicProvider) {
			ionicProvider.refresh();
		}
	}
}

async function execute(tip: Tip): Promise<void> {
	await tip.executeAction();
	if (tip.title == 'Settings') {
		vscode.commands.executeCommand('workbench.action.openSettings', 'Ionic');
	} else if (tip.url) {
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
	}
}