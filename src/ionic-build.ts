import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Creates the ionic build command
 * @param  {string} folder
 * @returns string
 */
export function ionicBuild(folder: string): string {
	const buildForProduction = vscode.workspace.getConfiguration('ionic').get('buildForProduction');
	const buildFlags = buildForProduction ? ' --prod' : '';

	const nmf = path.join(folder, 'node_modules');
	const preop = (!fs.existsSync(nmf)) ? 'npm install && ' : '';
	return `${preop}npx ionic build${buildFlags}`;
}