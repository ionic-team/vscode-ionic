import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { lastOperation } from './extension';
import { CommandName } from './command-name';

interface ErrorLine {
	uri: string;
	error: string;
	line: number;
	position: number
}

let currentErrorFilename: string;

// On Save Document event (singleton)
let onSave: vscode.Disposable;

export async function handleError(error: string, logs: Array<string>, folder: string): Promise<string> {
	if (error && error.includes('ionic: command not found')) {
		const selection = await vscode.window.showErrorMessage('The Ionic CLI is not installed. Get started by running npm install -g @ionic/cli at the terminal.', 'More Information');
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://ionicframework.com/docs/intro/cli#install-the-ionic-cli'));
		return;
	}
	let errorMessage = error;
	if (!errorMessage || error.length == 0) {
		if (logs.length > 0) {
			const txt = logs.find((log) => log.startsWith('[error]'));
			errorMessage = txt ? txt.replace('[error]', '') : undefined;
		}
	}

	const errors = extractErrors(error, logs, folder);

	if (errors.length == 0 && errorMessage) {
		vscode.window.showErrorMessage(errorMessage, 'Ok');
	} else {
		handleErrorLine(0, errors, folder);
		// When the user fixes the error and saves the file then re-run
		if (onSave) {
			onSave.dispose();
		}
		onSave = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
			if (document.fileName == currentErrorFilename) {
				onSave.dispose();
				const title = lastOperation.title;
				vscode.commands.executeCommand(CommandName.Run, lastOperation);
				vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: `Lets try to ${title} again...`,
						cancellable: false
					}, async () => {
						await timeout(3000); // Show the message for 3 seconds
					});
			}
		});
	}
}

function timeout(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function extractErrors(errorText: string, logs: Array<string>, folder: string): Array<ErrorLine> {
	const errors: Array<ErrorLine> = [];

	if (logs.length > 0) {
		// Look for code lines
		let line = undefined; // Lint style errors
		let rcline = undefined; // React style Typescript errors
		let vueline = undefined; // Vue style errors
		let tsline = undefined; // Vue style typescript error
		let javaLine = undefined; // Java style errors
		let jasmineLine = undefined; // Jasmine test errors
		for (let log of logs) {
			if (log.startsWith('[capacitor]')) {
				log = log.replace('[capacitor]', '').trim();
			}
			// Lint style errors, ESLint style errors
			if (log.endsWith('.ts') || log.endsWith('.tsx')) {
				line = log;
			} else {
				if (line) {
					const error = extractErrorLineFrom(log, line);
					if (error) {
						errors.push(error);
					} else {
						line = undefined;
					}
				}
			}

			// React style errors
			if (log.startsWith('TypeScript error in ')) {
				rcline = log;
			} else {
				if (rcline) {
					errors.push(extractTypescriptErrorFrom(rcline, log.trim()));
					rcline = undefined;
				}
			}

			// Vue style typescript error
			if (log.includes('error  in ')) {
				tsline = log;
			} else {
				if (tsline) {
					if (log.trim().length > 0) {
						errors.push(extractVueTypescriptErrorFrom(tsline, log.trim()));
						tsline = undefined;
					}
				}
			}

			// React synax error
			// SyntaxError: /Users/damian/Code/demo-intune-react/src/pages/Login.tsx: 'await' is only allowed within async functions and at the top levels of modules. (29:19)
			if (log.startsWith('SyntaxError:')) {
				errors.push(extractSyntaxError(log));
			}

			// Java errors
			if (log.includes('error:') && log.includes(folder)) {
				javaLine = log;
			} else {
				if (javaLine) {
					errors.push(extractJavaError(javaLine, log));
					javaLine = undefined;
				}
			}

			// Jasmine errors
			if (log.includes('Error:') && !log.includes(folder)) {
				jasmineLine = log;
			} else {
				if (jasmineLine) {
					if (!log.includes('<Jasmine>')) {
						// First stack line: eg at UserContext.<anonymous> (src/app/app.component.spec.ts:20:17)
						errors.push(extractJasmineError(jasmineLine, log));
						jasmineLine = undefined;
					}

				}
			}

			if (log.endsWith('.vue')) {
				vueline = log;
			} else {
				if (vueline) {
					errors.push(extractVueErrorFrom(vueline, log.trim()));
					vueline = undefined;
				}
			}
		}
	}

	if (errors.length == 0 && errorText) {
		const lines = errorText.split('\n');
		let fail: string;
		for (const line of lines) {
			if (line.startsWith('Error: ')) {
				errors.push(extractErrorFrom(line));
			}
			if (line.startsWith('FAIL')) {
				fail = line;

			} else {
				if (fail) {
					errors.push(extractJestErrorFrom(fail, line));
					fail = undefined;
				}
			}
		}
	}
	return errors;
}

// Parse an error like this one for the line, position and error message
// Error: src/app/app.module.ts:18:3 - error TS2391: Function implementation is missing or not immediately following the declaration.
function extractErrorFrom(line: string): ErrorLine {
	try {
		const codeline = line.replace('Error: ', '').split(':')[0];
		const args = line.split(':');
		const linenumber = parseInt(args[2]) - 1;
		const position = parseInt(args[3].substring(0, args[3].indexOf(' ')) + 2) - 1;
		const errormsg = line.substring(line.indexOf('- ', codeline.length + 7) + 2);
		return { line: linenumber, position: position, uri: codeline, error: errormsg };
	} catch {
		// Couldnt parse the line. Continue
	}
}

function extractJestErrorFrom(line: string, testError: string): ErrorLine {
	try {
		const filename = line.replace('FAIL ', '').trim();
		testError = testError.replace('  ● ', '');
		return { line: 0, position: 0, uri: filename, error: testError };
	} catch {
		// Couldnt parse the line. Continue
	}
}

// Parse an error like:
// "  13:1  error blar"
function extractErrorLineFrom(msg: string, filename: string): ErrorLine {
	const pos = parsePosition(msg);
	const errormsg = extractErrorMessage(msg);
	if (!errormsg || errormsg.length == 0) {
		return;
	}
	return { error: errormsg, uri: filename, line: pos.line, position: pos.character };
}

// Parse an error like this one for the line, position and error message
// /Users/damian/Code/blank12/android/app/src/main/java/io/ionic/starter/MainActivity.java:5: error: cannot find symbol
// public class MainActivity extends BridgeActivity2 {}
function extractJavaError(line1: string, line2: string): ErrorLine {
	try {
		const args = line1.split(' error: ');
		const filename = args[0].split(':')[0].trim();
		const linenumber = parseInt(args[0].split(':')[1]) - 1;
		return { uri: filename, line: linenumber, position: 0, error: args[1].trim() + ' ' + line2.trim() };
	}
	catch {
		return;
	}
}

// Parse an error like this one for the line, position and error message
// Error: Expected AppComponent({ __ngContext__: [ null, TView({ type: 0, bluepr ... to be falsy.
// 	    at UserContext.<anonymous> (src/app/app.component.spec.ts:20:17)
function extractJasmineError(line1: string, line2: string): ErrorLine {
	try {
		let txt = line1.replace('Error: ', '');
		if (txt.length > 100) {
			txt = txt.substring(0, 80) + '...' + txt.substring(txt.length - 16, txt.length);
		}
		const place = line2.substring(line2.indexOf('(') + 1);
		const args = place.split(':');
		const filename = args[0];
		const linenumber = parseInt(args[1]) - 1;
		const position = parseInt(args[2].replace(')', '')) - 1;
		return { uri: filename, line: linenumber, position: position, error: txt };
	} catch {
		return;
	}
}

async function handleErrorLine(number: number, errors: Array<ErrorLine>, folder: string) {
	if (!errors[number]) return;
	const nextButton = (number + 1 == errors.length) ? undefined : 'Next';
	const prevButton = (number == 0) ? undefined : 'Previous';
	const title = (errors.length > 1) ? `Error ${number + 1} of ${errors.length}: ` : '';
	vscode.window.showErrorMessage(`${title}${errors[number].error}`, prevButton, nextButton, 'Ok').then((result) => {
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
	currentErrorFilename = uri;
	if (fs.existsSync(uri) && !fs.lstatSync(uri).isDirectory()) {
		await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(uri));
		const myPos = new vscode.Position(errors[number].line, errors[number].position);
		vscode.window.activeTextEditor.selection = new vscode.Selection(myPos, myPos);
		vscode.commands.executeCommand('revealLine', { lineNumber: myPos.line, at: 'bottom' });		
	} else {
		console.warn(`${uri} not found`);
	}
}

// Extract error message from a line error line:
// eg "  13:1  error blar"
// return "blar"
function extractErrorMessage(msg: string): string {
	try {
		const pos = parsePosition(msg);
		if (pos.line > 0 || pos.character > 0) {
			msg = msg.trim();
			msg = msg.substring(msg.indexOf('  ')).trim();
			if (msg.startsWith('error')) {
				msg = msg.replace('error', '');
				return msg.trim();
			} else if (msg.startsWith('warning')) {
				msg = msg.replace('warning', '');
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


// Extract code filename, line number, position
// TypeScript error in /Users/damian/Code/demo-intune-react/src/components/ExploreContainer.tsx(5,7):
function extractTypescriptErrorFrom(msg: string, errorText: string): ErrorLine {
	try {
		msg = msg.replace('TypeScript error in ', '');
		const filename = msg.substring(0, msg.lastIndexOf('('));
		const args = msg.substring(msg.lastIndexOf('(') + 1).split(',');
		const linenumber = parseInt(args[0]);
		const position = parseInt(args[1].replace('):', ''));
		return { line: linenumber, position: position, error: errorText, uri: filename };
	} catch
	{
		return;
	}
}

// Extract code filename, line number, position
//  error  in src/router/index.ts:35:12
// TS2552: Cannot find name 'createWebHistory2'. Did you mean 'createWebHistory'?
function extractVueTypescriptErrorFrom(msg: string, errorText: string): ErrorLine {
	try {
		msg = msg.replace(' error  in ', '');
		const filename = msg.substring(0, msg.indexOf(':'));
		const args = msg.substring(msg.indexOf(':') + 1).split(':');
		const linenumber = parseInt(args[0]);
		const position = parseInt(args[1]);
		return { line: linenumber, position: position, error: errorText, uri: filename };
	} catch
	{
		return;
	}
}

// Extract code filename, line number, position
// /Users/damian/Code/blank-vue2/src/components/ExploreContainer.vue
//  15:12  error  The "bnlar" property should be a constructor  vue/require-prop-type-constructor
function extractVueErrorFrom(filename: string, msg: string): ErrorLine {
	return extractErrorLineFrom(msg, filename);
}


// Extract code filename, line number, position
// SyntaxError: /Users/damian/Code/demo-intune-react/src/pages/Login.tsx: 'await' is only allowed within async functions and at the top levels of modules. (29:19)
function extractSyntaxError(msg: string): ErrorLine {
	try {
		msg = msg.replace('SyntaxError: ', '');
		const filename = msg.substring(0, msg.indexOf(':'));
		const args = msg.substring(msg.lastIndexOf('(') + 1).split(':');
		const linenumber = parseInt(args[0]);
		const position = parseInt(args[1].replace(')', ''));
		let errorText = msg.substring(msg.indexOf(':') + 1);
		errorText = errorText.substring(0, errorText.lastIndexOf('(')).trim();
		return { line: linenumber, position: position, error: errorText, uri: filename };
	} catch
	{
		return;
	}
}