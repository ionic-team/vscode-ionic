import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { channelShow, run } from './utilities';
import { write, writeIonic } from './logging';
import { Tip, TipType } from './tip';
import { Project } from './project';
import { exists } from './analyzer';
import { CapacitorPlatform } from './capacitor-platform';
import { npmInstall, npmUninstall, npx } from './node-commands';
import { Context } from './context-variables';
import { join } from 'path';

export enum AssetType {
  splash = 'splash.png',
  splashDark = 'splash-dark.png',
  icon = 'icon.png',
  adaptiveForeground = 'icon-foreground.png',
  adaptiveBackground = 'icon-background.png',
}

export function addSplashAndIconFeatures(project: Project) {
  project.setSubGroup(
    `Splash Screen & Icon`,
    TipType.Media,
    'Allows setting of the Splash Screen and Icon. Clicking Rebuild will create assets for your iOS and Android native projects.',
    Context.rebuild
  ).tip = new Tip('Rebuild Assets', undefined).setAction(async () => {
    await runCapacitorAssets(project);
  });
  project.add(createFeature('Splash Screen', AssetType.splash, project));
  project.add(createFeature('Splash Screen Dark', AssetType.splashDark, project));
  project.add(createFeature('Icon', AssetType.icon, project));
  project.add(createFeature('Icon Foreground', AssetType.adaptiveForeground, project));
  project.add(createFeature('Icon Background', AssetType.adaptiveBackground, project));
  project.clearSubgroup();
}

function getAssetTipType(folder: string, filename: AssetType): TipType {
  const assetfilename = path.join(getResourceFolder(folder, filename), filename);
  if (fs.existsSync(assetfilename)) {
    return TipType.CheckMark;
  } else {
    return TipType.Warning;
  }
}

function createFeature(title: string, assetType: AssetType, project: Project): Tip {
  const tip = new Tip(title, undefined, getAssetTipType(project.projectFolder(), assetType));
  tip.setAction(setAssetResource, project, assetType);
  tip.setContextValue(Context.asset);
  const filename = path.join(getResourceFolder(project.projectFolder(), assetType), assetType);
  tip.setSecondCommand('Open Asset', filename);
  tip.tooltip = getAssetTooltip(project.projectFolder(), assetType);
  return tip;
}

function getResourceFolder(folder: string, filename: AssetType, createIfMissing?: boolean): string {
  let resourceFolder = path.join(folder, 'resources');
  if (createIfMissing && !fs.existsSync(resourceFolder)) {
    fs.mkdirSync(resourceFolder);
  }
  if (filename == AssetType.adaptiveBackground || filename == AssetType.adaptiveForeground) {
    resourceFolder = path.join(resourceFolder, 'android');
    if (createIfMissing && !fs.existsSync(resourceFolder)) {
      fs.mkdirSync(resourceFolder);
    }
  }
  return resourceFolder;
}

function getAssetTooltip(folder: string, filename: AssetType): string {
  switch (filename) {
    case AssetType.splash:
      return 'Your splash screen should be a 2732×2732px png file. It will be used as the original asset to create suitably sized splash screens for iOS and Android.';
      break;
    case AssetType.splashDark:
      return 'Your dark mode splash screen should be a 2732×2732px png file. It will be used as the original asset to create suitably sized dark mode splash screens for iOS and Android.';
      break;
    case AssetType.icon:
      return 'Your icon should be a 1024×1024px png file that does not contain transparency. It will be used as the original asset to create suitably sized icons for iOS and Android.';
      break;
    case AssetType.adaptiveForeground:
      return 'The icon should be at least 432x432 png file. It will be used as the original asset to create suitably sized adaptive icons for Android.';
      break;
    case AssetType.adaptiveBackground:
      return 'The icon should be at least 432x432 png file. It will be used as the original asset to create suitably sized adaptive icons for Android.';
      break;
  }
}

async function setAssetResource(project: Project, filename: AssetType) {
  const folder = project.projectFolder();
  const title = getAssetTooltip(folder, filename);
  const buttonTitle = getAssetTipType(folder, filename) == TipType.Warning ? `Select File` : `Update File`;
  const selected = await vscode.window.showInformationMessage(title, buttonTitle);
  if (!selected) return;

  try {
    // Copy newfilename to resources/splash.png
    const resourceFolder = getResourceFolder(folder, filename, true);

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
      const adaptiveBackground = path.join(
        getResourceFolder(folder, AssetType.adaptiveBackground, true),
        AssetType.adaptiveBackground
      );
      const adaptiveForeground = path.join(
        getResourceFolder(folder, AssetType.adaptiveForeground, true),
        AssetType.adaptiveForeground
      );
      if (!fs.existsSync(adaptiveBackground)) {
        fs.copyFileSync(copyfilename, adaptiveBackground);
      }
      if (!fs.existsSync(adaptiveForeground)) {
        fs.copyFileSync(copyfilename, adaptiveForeground);
      }
    }

    await runCapacitorAssets(project);
  } catch (err) {
    vscode.window.showErrorMessage(`Operation failed ${err}`);
  }
}

function hasNeededAssets(folder: string): string {
  const icon = path.join(getResourceFolder(folder, AssetType.icon), AssetType.icon);
  const splash = path.join(getResourceFolder(folder, AssetType.splash), AssetType.splash);
  const splashDark = path.join(getResourceFolder(folder, AssetType.splashDark), AssetType.splashDark);

  if (!fs.existsSync(icon)) {
    return 'An icon needs to be specified next.';
  }
  if (!fs.existsSync(splash)) {
    return 'A splash screen needs to be specified next.';
  }
  if (!fs.existsSync(splashDark)) {
    return 'A dark mode splash screen needs to be specified next.';
  }
}

async function runCapacitorAssets(project: Project) {
  const hasCordovaRes = exists('@capacitor/assets');
  const ios = project.hasCapacitorProject(CapacitorPlatform.ios);
  const android = project.hasCapacitorProject(CapacitorPlatform.android);
  const pwa = exists('@angular/service-worker');
  const folder = project.projectFolder();
  const neededMessage = hasNeededAssets(folder);
  if (neededMessage) {
    await vscode.window.showInformationMessage(neededMessage, 'OK');
    return;
  }

  writeIonic('Generating Splash Screen and Icon Assets...');
  channelShow();
  await showProgress('Generating Splash Screen and Icon Assets', async () => {
    if (!hasCordovaRes) {
      writeIonic(`Installing @capacitor/assets temporarily...`);
      await run(folder, npmInstall('@capacitor/assets', '--save-dev'), undefined, [], undefined, undefined);
    }
    if (exists('cordova-res')) {
      await run(folder, npmUninstall('cordova-res'), undefined, [], undefined, undefined);
    }
    let cmd = '';
    if (ios) {
      cmd = `${npx(project.packageManager)} @capacitor/assets generate --ios`;
      write(`> ${cmd}`);
      await run(folder, cmd, undefined, [], undefined, undefined);
      addToGitIgnore(folder, 'resources/ios/**/*');
    }
    if (android) {
      cmd = `${npx(project.packageManager)} @capacitor/assets generate --android`;
      write(`> ${cmd}`);
      await run(folder, cmd, undefined, [], undefined, undefined);
      addToGitIgnore(folder, 'resources/android/**/*');
    }
    if (pwa) {
      cmd = `${npx(project.packageManager)} @capacitor/assets generate --pwa --pwaManifestPath 'src'`;
      write(`> ${cmd}`);
      await run(folder, cmd, undefined, [], undefined, undefined);
    }
  });

  writeIonic(`Removing @capacitor/assets...`);
  await run(folder, npmUninstall('@capacitor/assets'), undefined, [], undefined, undefined, undefined, undefined, true);

  writeIonic('Completed created Splash Screen and Icon Assets');
  channelShow();
}

function addToGitIgnore(folder: string, ignoreGlob: string) {
  const filename = join(folder, '.gitignore');
  if (fs.existsSync(filename)) {
    let txt = fs.readFileSync(filename, { encoding: 'utf-8' });
    const lines = txt.split('\n');
    if (!txt.includes(ignoreGlob)) {
      txt = txt + `\n${ignoreGlob}`;
      fs.writeFileSync(filename, txt);
    }
  }
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
