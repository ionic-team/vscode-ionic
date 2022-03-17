import * as vscode from 'vscode';
import { fixIssue } from './extension';
import { Tip } from './tip';
import { getRunOutput } from './utilities';

interface PackageInfo {
	name: string;
	version: string;
}
/**
 * Upgrade a package by allowing a user to select from the available versions
 * @param  {PackageInfo} info
 * @param  {string} folder
 */
export async function packageUpgrade(info: PackageInfo, folder: string) {
	const txt = await getRunOutput(`npm view ${info.name} versions --json`, folder);
	const versions: Array<string> = JSON.parse(txt).reverse();
	const idx = versions.findIndex((version) => info.version == version);
	versions.splice(idx,1);
	const selection = await vscode.window.showQuickPick(versions, { placeHolder: `Upgrade to version of ${info.name}` });
	if (!selection) return;
	
	const message = `Upgrade ${info.name} to ${selection}`;
	await fixIssue(
		`npm install ${info.name}@${selection} --save-exact`, folder, undefined,
		new Tip(message, undefined).showProgressDialog(), undefined, message
	);
}