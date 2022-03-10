import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { run } from './utilities';
import { getOutputChannel } from './extension';
import { Tip, TipType } from './tip';
import { Project } from './project';
import { exists } from './analyzer';

export enum AssetType {
	splash = 'splash.png',
	icon = 'icon.png',
	adaptiveForeground = 'icon-foreground.png',
	adaptiveBackground = 'icon-background.png',
}

export function addSplashAndIconFeatures(project: Project) {
	project.setGroup(`Splash Screen & Icon`, '', TipType.Media, false, 'rebuild').tip = new Tip('Rebuild Assets',undefined).setAction(
		async () => {
			await runCordovaRes(project.folder);
		}
	);
	project.add(createFeature('Splash Screen', AssetType.splash, project));
	project.add(createFeature('Icon', AssetType.icon, project));
	project.add(createFeature('Icon Foreground', AssetType.adaptiveForeground, project));
	project.add(createFeature('Icon Background', AssetType.adaptiveBackground, project));
}

function getAssetTipType(folder: string, filename: AssetType): TipType {
	const assetfilename = path.join(getResourceFolder(folder, filename), filename);
	if (fs.existsSync(assetfilename)) {
		return TipType.None;
	} else {
		return TipType.Warning;
	}
}

function createFeature(title: string, assetType: AssetType, project: Project): Tip {
	const tip = new Tip(title, undefined, getAssetTipType(project.folder, assetType));
	tip.setAction(setAssetResource, project.folder, assetType);
	tip.setContextValue('asset');
	const filename = path.join(getResourceFolder(project.folder, assetType), assetType);
	tip.setSecondCommand('Open Asset', filename);
	tip.tooltip = getAssetTooltip(project.folder, assetType);
	return tip;
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

function getAssetTooltip(folder: string, filename: AssetType): string {
	switch (filename) {
		case AssetType.splash: return 'Your splash screen should be a 2732×2732px png file. It will be used as the original asset to create suitably sized splash screens for iOS and Android.'; break;
		case AssetType.icon: return 'Your icon should be a 1024×1024px png file that does not contain transparency. It will be used as the original asset to create suitably sized icons for iOS and Android.'; break;
		case AssetType.adaptiveForeground: return 'The icon should be at least 432x432 png file. It will be used as the original asset to create suitably sized adaptive icons for Android.'; break;
		case AssetType.adaptiveBackground: return 'The icon should be at least 432x432 png file. It will be used as the original asset to create suitably sized adaptive icons for Android.'; break;
	}
}

async function setAssetResource(folder: string, filename: AssetType) {
	const title = getAssetTooltip(folder, filename);
	const buttonTitle = (getAssetTipType(folder, filename) == TipType.Warning) ? `Select File` : `Update File`;
	const selected = await vscode.window.showInformationMessage(title, buttonTitle);
	if (!selected) return;

	try {
		// Copy newfilename to resources/splash.png
		const resourceFolder = getResourceFolder(folder, filename);


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


		await runCordovaRes(folder);
	} catch (err) {
		vscode.window.showErrorMessage(`Operation failed ${err}`);
	}
}

function hasNeededAssets(folder: string): string {
	const icon = path.join(getResourceFolder(folder, AssetType.icon), AssetType.icon);
	const splash = path.join(getResourceFolder(folder, AssetType.splash), AssetType.splash);
	if (!fs.existsSync(icon) || (!fs.existsSync(splash))) {
		return 'The Splash screen and icon need to be set before you can rebuild generated assets.';
	}

	if (!fs.existsSync(icon)) {
		return 'An icon needs to be specified next.';
	}
	if (!fs.existsSync(splash)) {
		return 'A splash screen needs to be specified next.';
	}
}

async function runCordovaRes(folder: string) {
	const hasCordovaRes = exists('cordova-res');
	const ios = exists('@capacitor/ios');
	const android = exists('@capacitor/android');
	const neededMessage = hasNeededAssets(folder);
	if (neededMessage) {
		await vscode.window.showInformationMessage(neededMessage);
		return;
	}

	const channel = getOutputChannel();
	channel.appendLine('[Ionic] Generating Splash Screen and Icon Assets...');
	channel.show();
	await showProgress('Generating Splash Screen and Icon Assets',
		async () => {
			if (!hasCordovaRes) {
				await run(folder, 'npm install cordova-res --save-dev --save-exact', channel, undefined, false, undefined, undefined);
			}
			if (ios) {
				await run(folder, 'npx cordova-res ios --skip-config --copy', channel, undefined, false, undefined, undefined);
			}
			if (android) {
				await run(folder, 'npx cordova-res android --skip-config --copy', channel, undefined, false, undefined, undefined);
			}

		});
	channel.appendLine('[Ionic] Completed created Splash Screen and Icon Assets');
	channel.show();
}

async function showProgress(message: string, func: () => Promise<any>) {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `${message}`,
			cancellable: false,
		},
		async (progress, token) => {
			await func();
		}
	);
}