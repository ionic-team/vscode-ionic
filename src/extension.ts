'use strict';

import * as vscode from 'vscode';
import { DepNodeProvider } from './ionicRecommendations';
import { Recommendation } from './recommendation';
import { Tip } from './tip';
import { run } from './utilities';


let channel: vscode.OutputChannel = undefined;

async function fixIssue(command: string | string[], rootPath: string, ionicProvider?: DepNodeProvider, successMessage?: string) {
	//Create output channel
	if (!channel) {
		channel = vscode.window.createOutputChannel("Ionic");
	}

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `${command}`,
			cancellable: false,
		},
		async (progress, token) => {
			progress.report({
				message: `...`,
			});

			if (Array.isArray(command)) {
				for (const cmd of command) {
					channel.appendLine(cmd);
					await run(rootPath, cmd, channel);
				}
			} else {
				channel.appendLine(command);
				await run(rootPath, command, channel);
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

	const ionicProvider = new DepNodeProvider(rootPath);
	vscode.window.registerTreeDataProvider('ionicRecommendations', ionicProvider);
	vscode.commands.registerCommand('ionicRecommendations.refreshEntry', () => ionicProvider.refresh());
	vscode.commands.registerCommand('ionicRecommendations.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('ionicRecommendations.editEntry', (node: Recommendation) => {
		const url = node.url ? node.url : `https://www.npmjs.com/package/${node.label}`;
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
	});

	vscode.commands.registerCommand('ionicRecommendations.fixIssue', async (tip: Tip) => {
		console.log(tip);
		const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
		if (!tip.command) {
			vscode.window.showInformationMessage(info, 'Ok');
		} else {
			const urlBtn = tip.url ? 'Info' : undefined;
			const selection = await vscode.window.showInformationMessage(info, urlBtn, tip.commandTitle);			
			if (selection == tip.commandTitle) {
				fixIssue(tip.command, rootPath, ionicProvider, tip.commandSuccess);
			}
			if (selection && selection == urlBtn) {
				vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(tip.url));
			}

		}
	});

	vscode.commands.registerCommand('ionicRecommendations.run', async (tip: Tip) => {
		if (tip.command) {
			const info = tip.description ? tip.description : `${tip.title}: ${tip.message}`;
			fixIssue(tip.command, rootPath);
		}
	});
}