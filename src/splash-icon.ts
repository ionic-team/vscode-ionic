import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { run } from './utilities';
import { getOutputChannel } from './extension';

export enum AssetType {
	splash = 'splash.png',
	icon = 'icon.png'
}

export function getAssetTitle(folder: string, filename: AssetType): string {
	const resourceFolder = path.join(folder, 'resources');
	const assetfilename = path.join(resourceFolder, filename);
	if (fs.existsSync(assetfilename)) {
		return filename;
	} else {
		return 'none';
	}
}

export async function setAssetResource(folder: string, filename: AssetType, hasCordovaRes: boolean, ios: boolean, android: boolean) {
	const name = filename == AssetType.splash ? 'Splash Screen' : 'Icon';
	const title = filename == AssetType.splash ?
		'The splash screen should be a 2732×2732px png file. It will be used used as the original asset to create suitable splash screen assets for iOS and Android.' :
		'The icon should be a 1024×1024px png file. It will be used used as the original asset to create suitable icon assets for iOS and Android.';
	const buttonTitle = (getAssetTitle(folder, filename) == 'none') ? `Select ${name} File` : `Update ${name} File`;
	const rebuildTitle = 'Rebuild';

	const selected = await vscode.window.showInformationMessage(title, rebuildTitle, buttonTitle);
	if (!selected) return;

	try {
		// Copy newfilename to resources/splash.png
		const resourceFolder = path.join(folder, 'resources');

		if (selected != rebuildTitle) {
			const files = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectMany: false });
			if (!files || files.length !== 1) return;
			const copyfilename = files[0].fsPath;

			if (path.extname(copyfilename) !== '.png') {
				vscode.window.showErrorMessage('The file must be a png');
				return;
			}
			if (!fs.existsSync(resourceFolder)) {
				fs.mkdirSync(resourceFolder);
			}
			const newfilename = path.join(resourceFolder, filename);
			fs.copyFileSync(copyfilename, newfilename);
			if (fs.existsSync(newfilename)) {
				await vscode.window.showErrorMessage(`Unable to create ${newfilename}`);
				return;
			}
		}

		await runCordovaRes(folder, hasCordovaRes, ios, android);
	} catch (err) {
		vscode.window.showErrorMessage(`Operation failed ${err}`);
	}
}

async function runCordovaRes(folder: string, hasCordovaRes: boolean, ios: boolean, android: boolean) {
	const channel = getOutputChannel();
	if (!hasCordovaRes) {
		channel.appendLine('[Ionic] Installing Asset Generator...');
		await run(folder, 'npm install cordova-res --save-dev --save-exact', channel, undefined, false, undefined, undefined);
	}
	if (ios) {
		channel.appendLine('[Ionic] Generating iOS Assets...');
		await run(folder, 'npx cordova-res ios --skip-config --copy', channel, undefined, false, undefined, undefined);
	}
	if (android) {
		channel.appendLine('[Ionic] Generating Android Assets...');
		await run(folder, 'npx cordova-res android --skip-config --copy', channel, undefined, false, undefined, undefined);
	}

	// TODO: cordova-res errors if files exist due to copy function in @ionic/utils-fs (which also eats error)
	channel.appendLine('[Ionic] Completed created Splash Screen and Icon Assets');
}