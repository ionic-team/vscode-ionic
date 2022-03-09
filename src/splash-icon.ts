import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { run } from './utilities';
import { getOutputChannel } from './extension';

export enum AssetType {
	splash = 'splash.png',
	icon = 'icon.png',
	adaptiveForeground = 'icon-foreground.png',
	adaptiveBackground = 'icon-background.png',

}

export function getAssetTitle(folder: string, filename: AssetType): string {
	const assetfilename = path.join(getResourceFolder(folder, filename), filename);
	if (fs.existsSync(assetfilename)) {
		return filename;
	} else {
		return 'none';
	}
}

function getResourceFolder(folder: string, filename: AssetType): string {
	let resourceFolder = path.join(folder, 'resources');
	if (!fs.existsSync(resourceFolder)) {
		fs.mkdirSync(resourceFolder);
	}
	if (filename == AssetType.adaptiveBackground || filename == AssetType.adaptiveForeground) {
		resourceFolder = path.join(resourceFolder, 'android');
		if (!fs.existsSync(resourceFolder)) {
			fs.mkdirSync(resourceFolder);
		}
	}
	return resourceFolder;
}

export async function setAssetResource(folder: string, filename: AssetType, hasCordovaRes: boolean, ios: boolean, android: boolean) {
	const name = filename == AssetType.splash ? 'Splash Screen' : 'Icon';
	let title = undefined;
	switch (filename) {
		case AssetType.splash: title = 'The splash screen should be a 2732×2732px png file. It will be used as the original asset to create suitable splash screen assets for iOS and Android.'; break;
		case AssetType.icon: title = 'The icon should be a 1024×1024px png file. It will be used as the original asset to create suitable icon assets for iOS and Android.'; break;
		case AssetType.adaptiveForeground: title = 'The icon should be at least 432x432 png file. It will be used as the original asset to create suitable adaptive icons for Android.'; break;
		case AssetType.adaptiveBackground: title = 'The icon should be at least 432x432 png file. It will be used as the original asset to create suitable adaptive icons for Android.'; break;
	}
	const buttonTitle = (getAssetTitle(folder, filename) == 'none') ? `Select ${name} File` : `Update ${name} File`;
	const rebuildTitle = 'Rebuild';

	const selected = await vscode.window.showInformationMessage(title, rebuildTitle, buttonTitle);
	if (!selected) return;

	try {
		// Copy newfilename to resources/splash.png
		const resourceFolder = getResourceFolder(folder, filename);

		if (selected != rebuildTitle) {
			const files = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectMany: false });
			if (!files || files.length !== 1) return;
			const copyfilename = files[0].fsPath;

			if (path.extname(copyfilename) !== '.png') {
				vscode.window.showErrorMessage('The file must be a png');
				return;
			}

			const newfilename = path.join(resourceFolder, filename);
			fs.copyFileSync(copyfilename, newfilename);
			if (!fs.existsSync(newfilename)) {
				await vscode.window.showErrorMessage(`Unable to create ${newfilename}`);
				return;
			}

			// If its an icon file and no adaptive icons then use the icon
			if (filename == AssetType.icon) {
				const adaptiveBackground = path.join(getResourceFolder(folder, AssetType.adaptiveBackground), AssetType.adaptiveBackground);
				const adaptiveForeground = path.join(getResourceFolder(folder, AssetType.adaptiveForeground), AssetType.adaptiveForeground);
				if (!fs.existsSync(adaptiveBackground)) {
					fs.copyFileSync(copyfilename, adaptiveBackground);
				}
				if (!fs.existsSync(adaptiveForeground)) {
					fs.copyFileSync(copyfilename, adaptiveForeground);
				}
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