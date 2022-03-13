import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface ErrorLine {
	uri: string;
	error: string;
	line: number;
	position: number
}

export async function handleError(error: string, logs: Array<string>, folder: string): Promise<string> {


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

	const errors = extractErrors(error, logs);


	if (errors.length == 0) {
		vscode.window.showErrorMessage(errorMessage, 'Ok');
	} else {
		handleErrorLine(0, errors, folder);
	}
}

function extractErrors(errorText: string, logs: Array<string>): Array<ErrorLine> {
	const errors: Array<ErrorLine> = [];

	if (logs.length > 0) {
		// Look for code lines
		let line = undefined;
		for (const log of logs) {
			if (log.endsWith('.ts')) {
				line = log;
			} else {
				if (line) {
					const pos = parsePosition(log);
					const errormsg = extractErrorMessage(log);
					errors.push({ error: errormsg, uri: line, line: pos.line, position: pos.character });
					line = undefined;
					// Found an error to go to

				}
			}
		}
	}

	if (errors.length == 0) {
		const lines = errorText.split('\n');
		for (const line of lines) {
			if (line.startsWith('Error: ')) {
				try {
					// Parse an error like this one for the line, position and error message
					// Error: src/app/app.module.ts:18:3 - error TS2391: Function implementation is missing or not immediately following the declaration.
					const codeline = line.replace('Error: ', '').split(':')[0];
					const args = line.split(':');
					const linenumber = parseInt(args[2]) - 1;
					const position = parseInt(args[3].substring(0, args[3].indexOf(' ')) + 2) - 1;
					const errormsg = line.substring(line.indexOf('- ', codeline.length + 7));
					errors.push({ line: linenumber, position: position, uri: codeline, error: errormsg });
				} catch {
					// Couldnt parse the line. Continue
				}
			}
		}
	}
	return errors;
}

async function handleErrorLine(number: number, errors: Array<ErrorLine>, folder: string) {
	const msg = extractErrorMessage(errors[number].error);
	const nextButton = (number + 1 == errors.length) ? undefined : 'Next';
	const prevButton = (number == 0) ? undefined : 'Previous';
	const title = (errors.length > 1) ? `Error ${number + 1} of ${errors.length}: ` : '';
	vscode.window.showErrorMessage(`${title}${msg}`, prevButton, nextButton, 'Ok').then((result) => {
		if (result == 'Next') {
			handleErrorLine(number + 1, errors, folder);
			return;
		}
		if (result == 'Previous') {
			handleErrorLine(number - 1, errors, folder);
			return;
		}
	});
	let uri = errors[number].uri;
	if (!fs.existsSync(uri)) {
		// Might be a relative path
		if (fs.existsSync(path.join(folder, uri))) {
			uri = path.join(folder, uri);
		}
	}
	await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(uri));
	const myPos = new vscode.Position(errors[number].line, errors[number].position);
	vscode.window.activeTextEditor.selection = new vscode.Selection(myPos, myPos);
	vscode.commands.executeCommand('revealLine', { lineNumber: myPos.line, at: 'bottom' });
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