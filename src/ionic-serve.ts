
import * as vscode from 'vscode';

/**
 * Create the ionic serve command
 * @returns string
 */
export function ionicServe(): string {
	const httpsForWeb = vscode.workspace.getConfiguration('ionic').get('httpsForWeb');
	const previewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
	let serveFlags = '';
	if (previewInEditor) {
		serveFlags += ' --no-open';
	}
	if (httpsForWeb) {
		serveFlags += ' --ssl';
	}
	return `npx ionic serve${serveFlags}`;
}