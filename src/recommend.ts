
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
import { CapacitorPlatform, capRun } from './capacitor-run';
import { capacitorRecommendations, checkCapacitorRules } from './rules-capacitor';
import { checkCordovaRules } from './rules-cordova';
import { webProject } from './rules-web-project';
import { checkPackages } from './rules-packages';
import { checkDeprecatedPlugins } from './rules-deprecated-plugins';

export async function getRecommendations(project: Project, context: vscode.ExtensionContext, packages: any): Promise<void> {
	if (isCapacitor() && !isCordova()) {
		project.setGroup(`Capacitor`, 'Recommendations related to Capacitor', TipType.Capacitor, true);

		const hasCapIos = exists('@capacitor/ios');
		const hasCapAndroid = exists('@capacitor/android');
		project.add(
			new Tip(
				'Run On Web', '', TipType.Run, 'Serve', undefined, 'Running on Web', `Project Served`)
				.setDynamicCommand(ionicServe)
				.requestViewEditor()
				.setRunPoints([
					{ title: 'Building...', text: 'Generating browser application bundles' },
					{ title: 'Serving', text: 'Development server running', refresh: true }
				])
				.canAnimate()
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
			project.add(new Tip('Run On Android', '', TipType.Run, 'Run', undefined, 'Running', 'Project is running')
				.showProgressDialog()
				.requestDeviceSelection()
				.setDynamicCommand(capRun, CapacitorPlatform.android)
				.setRunPoints(runPoints)
			);
		}
		if (hasCapIos) {
			project.add(new Tip('Run On iOS', '', TipType.Run, 'Run', undefined, 'Running', 'Project is running')
				.showProgressDialog()
				.requestDeviceSelection()
				.setDynamicCommand(capRun, CapacitorPlatform.ios)
				.setRunPoints(runPoints)
			);
		}

		project.add(new Tip('Build', '', TipType.Build, 'Build', undefined, 'Building', undefined).setDynamicCommand(ionicBuild, project.folder));
		const ionic = exists('@ionic/cli') ? 'ionic ' : '';
		if (exists('@capacitor/core')) {
			project.add(new Tip('Sync', '', TipType.Sync, 'Capacitor Sync', `npx ${ionic}cap sync`, 'Syncing', undefined));
		}
		if (hasCapIos) {
			project.add(new Tip('Open in Xcode', '', TipType.Edit, 'Opening Project in Xcode', `npx ${ionic}cap open ios`, 'Opening Project in Xcode').showProgressDialog());
		}
		if (hasCapAndroid) {
			project.add(new Tip('Open in Android Studio', '', TipType.Edit, 'Opening Project in Android Studio', `npx ${ionic}cap open android`, 'Open Android Studio').showProgressDialog());
		}
	}

	// Script Running
	project.setGroup(`Scripts`, ``, TipType.Files, false);
	project.addScripts();

	if (isCapacitor()) {
		// Capacitor Configure Features
		project.setGroup(`Configuration`, 'Configurations for native project', TipType.Capacitor, false);
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

