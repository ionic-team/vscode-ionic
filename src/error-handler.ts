import * as vscode from 'vscode';

interface ErrorLine {
	uri: string;
	error: string;
}

export async function handleError(error: string, logs: Array<string>): Promise<string> {
	const errors: Array<ErrorLine> = [];

	if (error.includes('ionic: command not found')) {
		const selection = await vscode.window.showErrorMessage('The Ionic CLI is not installed. Get started by running npm install -g @ionic/cli at the terminal.', 'More Information');
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://ionicframework.com/docs/intro/cli#install-the-ionic-cli'));
		return;
	}
	let errorMessage = error;
	if (!errorMessage || error.length == 0) {
		if (logs.length > 0) {
			const txt = logs.find((log) => log.startsWith('[error]'));
			errorMessage = txt.replace('[error]', '');
		}
	}

	if (logs.length > 0) {
		// Look for code lines
		let line = undefined;
		for (const log of logs) {
			if (log.endsWith('.ts')) {
				line = log;
			} else {
				if (line) {
					errors.push({ error: log, uri: line });
					line = undefined;
					// Found an error to go to

				}
			}
		}
	}

	if (errors.length == 0) {
		vscode.window.showErrorMessage(errorMessage, 'Ok');
	} else {
		handleErrorLine(0, errors);
	}
}

async function handleErrorLine(number: number, errors: Array<ErrorLine>) {
	const msg = extractErrorMessage(errors[number].error);
	const nextButton = (number + 1 == errors.length) ? undefined : 'Next';
	const prevButton = (number == 0) ? undefined : 'Previous';
	const title = (errors.length > 1) ? `Error ${number + 1} of ${errors.length}: ` : '';
	vscode.window.showErrorMessage(`${title}${msg}`, prevButton, nextButton, 'Ok').then((result) => {
		if (result == 'Next') {
			handleErrorLine(number + 1, errors);
			return;
		}
		if (result == 'Previous') {
			handleErrorLine(number - 1, errors);
			return;
		}
	});
	await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(errors[number].uri));
	const myPos = parsePosition(errors[number].error);
	vscode.window.activeTextEditor.selection = new vscode.Selection(myPos, myPos);
	vscode.commands.executeCommand('revealLine', { lineNumber: 12, at: 'bottom' });
}

// Given "  13:1  error blar" return "blar"
function extractErrorMessage(msg: string): string {
	try {
		const pos = parsePosition(msg);
		if (pos.line > 0 || pos.character > 0) {
			msg = msg.trim();
			msg = msg.substring(msg.indexOf('  ')).trim();
			if (msg.startsWith('error')) {
				msg = msg.replace('error', '');
				return msg.trim();
			}
		}
	} catch
	{
		return msg;
	}
	return msg;
}

// Given "  13:1  error blar" return positon 12, 0
function parsePosition(msg: string): vscode.Position {
	msg = msg.trim();
	if (msg.indexOf('  ') > -1) {
		const pos = msg.substring(0, msg.indexOf('  '));
		if (pos.indexOf(':') > -1) {
			try {
				const args = pos.split(':');
				return new vscode.Position(parseInt(args[0]) - 1, parseInt(args[1]) - 1);
			} catch {
				return new vscode.Position(0, 0);
			}
		}
	}
	return new vscode.Position(0, 0);
}