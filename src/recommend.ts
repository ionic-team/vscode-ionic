
import * as vscode from 'vscode';

import { exists, isCapacitor, isCordova } from './analyzer';
import { reviewCapacitorConfig } from './capacitor-configure';
import { ionicBuild } from './ionic-build';
import { ionicServe } from './ionic-serve';
import { Project } from './project';
import { addSplashAndIconFeatures } from './splash-icon';
import { Tip, TipType } from './tip';
import { capacitorMigrationChecks as checkCapacitorMigrationRules } from './rules-capacitor-migration';
import { reviewPackages, reviewPluginProperties } from './process-packages';
import { capacitorDevicesCommand, capacitorRun } from './capacitor-run';
import { capacitorRecommendations, checkCapacitorRules } from './rules-capacitor';
import { checkCordovaRules } from './rules-cordova';
import { webProject } from './rules-web-project';
import { checkPackages } from './rules-packages';
import { checkDeprecatedPlugins } from './rules-deprecated-plugins';
import { capacitorSync } from './capacitor-sync';
import { capacitorOpen } from './capacitor-open';
import { CapacitorPlatform } from './capacitor-platform';
import { addScripts } from './scripts';
import { Context } from './context-variables';
import { ionicState } from './ionic-tree-provider';
import { getAndroidWebViewList } from './android-debug-list';
import { getDebugBrowserName } from './editor-preview';

export async function getRecommendations(project: Project, context: vscode.ExtensionContext, packages: any): Promise<void> {
	if (isCapacitor() && !isCordova()) {
		project.setGroup(`Capacitor`, 'Recommendations related to Capacitor', TipType.Capacitor, true);

		const hasCapIos = project.hasCapacitorProject(CapacitorPlatform.ios);
		const hasCapAndroid = project.hasCapacitorProject(CapacitorPlatform.android);
		const title = (ionicState.webDebugMode) ? 'Debug On Web' : 'Run On Web';
		const tooltip = (ionicState.webDebugMode) ? `Debug using ${getDebugBrowserName()}. The browser can be changed in Settings.` : 'Run a developement server and open using the default web browser';
		const type = (ionicState.webDebugMode) ? TipType.Debug : TipType.Run;
		project.add(
			new Tip(
				title, '', type, 'Serve', undefined, 'Running on Web', `Project Served`)
				.setDynamicCommand(ionicServe, project)
				.requestViewEditor()
				.setRunPoints([
					{ title: 'Building...', text: 'Generating browser application bundles' },
					{ title: 'Serving', text: 'Development server running' }
				])
				.canStop()
				.contextIf(Context.debugMode, false)
				.canAnimate()
				.setTooltip(tooltip)
		);
		// project.add(new Tip('View In Editor', '', TipType.Run, 'Serve', undefined, 'Running on Web', `Project Served`).setAction(viewInEditor, 'http://localhost:8100'));
		const runPoints = [
			{ text: 'ng run app:build', title: 'Building Web...' },
			{ text: 'capacitor run', title: 'Syncing...' },
			{ text: '✔ update ios', title: 'Building Native...' },
			{ text: '✔ update android', title: 'Building Native...' },
			{ text: 'Running Gradle build', title: 'Deploying...' },
			{ text: 'Running xcodebuild', title: 'Deploying...' },
			{ text: 'App deployed', title: 'Waiting for Code Changes' }
		];

		if (hasCapAndroid) {
			project.add(new Tip('Run On Android', '',  TipType.Run, 'Run', undefined, 'Running', 'Project is running')
				.showProgressDialog()
				.requestDeviceSelection()
				.setDynamicCommand(capacitorRun, project, CapacitorPlatform.android)
				.setSecondCommand('Getting Devices', capacitorDevicesCommand(CapacitorPlatform.android))
				.setData(project.projectFolder())
				.setRunPoints(runPoints)
			);
		}
		if (hasCapIos) {
			project.add(new Tip('Run On iOS', '', TipType.Run, 'Run', undefined, 'Running', 'Project is running')
				.showProgressDialog()
				.requestDeviceSelection()
				.setDynamicCommand(capacitorRun, project, CapacitorPlatform.ios)
				.setSecondCommand('Getting Devices', capacitorDevicesCommand(CapacitorPlatform.ios))
				.setData(project.projectFolder())
				.setRunPoints(runPoints)
			);
		}

		project.add(new Tip(
			'Build', '', TipType.Build, 'Build', undefined, 'Building', undefined)
			.setDynamicCommand(ionicBuild, project).setContextValue(Context.buildConfig));

		if (exists('@capacitor/core')) {
			project.add(new Tip(
				'Sync', '', TipType.Sync, 'Capacitor Sync', undefined, 'Syncing', undefined)
				.setDynamicCommand(capacitorSync, project)
			);
		}
		if (hasCapIos) {
			project.add(new Tip(
				'Open in Xcode', '', TipType.Edit, 'Opening Project in Xcode', undefined, 'Open Project in Xcode')
				.showProgressDialog()
				.setDynamicCommand(capacitorOpen, project, CapacitorPlatform.ios)
			);
		}
		if (hasCapAndroid) {
			project.add(new Tip(
				'Open in Android Studio', '', TipType.Edit, 'Opening Project in Android Studio', undefined, 'Open Android Studio')
				.showProgressDialog()
				.setDynamicCommand(capacitorOpen, project, CapacitorPlatform.android)
			);
		}

		const r = project.setGroup(`Debug`, 'Running Ionic applications you can debug', TipType.Debug, false);
		r.whenExpanded = async () => {
			return getAndroidWebViewList(hasCapAndroid);
		};
	}

	// Script Running	
	addScripts(project);

	if (isCapacitor() || project.hasACapacitorProject()) {
		// Capacitor Configure Features
		project.setGroup(`Configuration`, 'Configurations for native project. Changes made apply to both the iOS and Android projects', TipType.Capacitor, false);
		await reviewCapacitorConfig(project, context);

		// Splash Screen and Icon Features
		addSplashAndIconFeatures(project);
	}

	project.setGroup(
		`Recommendations`, `The following recommendations were made by analyzing the package.json file of your ${project.type} app.`, TipType.Idea, true);

	// General Rules around node modules (eg Jquery)
	checkPackages(project);

	// Deprecated plugins
	checkDeprecatedPlugins(project);

	if (isCordova()) {
		checkCordovaRules(project);
		checkCapacitorMigrationRules(packages, project);
	} else if (isCapacitor()) {
		checkCapacitorRules(project);
		project.tips(capacitorRecommendations(project));
	} else {
		// The project is not using Cordova or Capacitor
		webProject(project);
	}

	// Package Upgrade Features
	reviewPackages(packages, project);

	// Plugin Properties
	reviewPluginProperties(packages, project);

	// Support and Feedback
	project.setGroup(`Support`, 'Feature requests and bug fixes', TipType.Ionic, true);
	project.add(new Tip('Provide Feedback', '', TipType.Comment, undefined, undefined, undefined, undefined, `https://github.com/ionic-team/vscode-extension/issues`));
	project.add(new Tip('Settings', '', TipType.Settings));
}

