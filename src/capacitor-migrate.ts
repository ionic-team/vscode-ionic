import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as vscode from 'vscode';
import { exists, getAllPackageNames } from './analyzer';
import { getOutputChannel, writeError, writeIonic } from './extension';
import { npmInstall } from './node-commands';
import { Project } from './project';
import { run, setAllStringIn, setStringIn, showProgress } from './utilities';

export async function migrateCapacitor(project: Project, currentVersion: string) {
	const coreVersion = '4.0.0-beta.1';
	const pluginVersion = '4.0.0-beta.0';

	const daysLeft = daysUntil(new Date('11/01/2022'));
	let warning = `Google Play Store requires a minimum target of SDK 31 by 1st November 2022`;
	if (daysLeft > 0) {
		warning += ` (${daysLeft} days left)`;
	}
	const result = await vscode.window.showInformationMessage(
		`Capacitor 4 sets a deployment target of iOS 13 and Android 12 (SDK 32). ${warning}`, 'Migrate to v4 Beta');
	if (!result) {
		return;
	}

	await showProgress(`Migrating to Capacitor ${coreVersion}`, async () => {
		try {
			await run2(project,
				install(['@capacitor/core', '@capacitor/cli', '@capacitor/ios', '@capacitor/android'], coreVersion, pluginVersion)
			);
			// Set deployment target to 13.0
			updateFile(project, join('ios', 'App', 'App.xcodeproj', 'project.pbxproj'), 'IPHONEOS_DEPLOYMENT_TARGET = ', ';', '13.0');

			// Update Podfile to 13.0
			updateFile(project, join('ios', 'App', 'Podfile'), `platform :ios, '`, `'`, '13.0');

			// Remove touchesBegan
			updateFile(project, join('ios', 'App', 'App', 'AppDelegate.swift'), `override func touchesBegan`, `}`);

			// Variables gradle
			const variables = {
				minSdkVersion: 22,
				androidxActivityVersion: '1.4.0',
				androidxAppCompatVersion: '1.4.1',
				androidxCoordinatorLayoutVersion: '1.2.0',
				androidxCoreVersion: '1.7.0',
				androidxFragmentVersion: '1.4.1',
				junitVersion: '4.13.2',
				androidxJunitVersion: '1.1.3',
				androidxEspressoCoreVersion: '3.4.0'
			};

			for (const variable of Object.keys(variables)) {
				if (!updateFile(project, join('android', 'variables.gradle'), `${variable} = '`, `'`, variables[variable], true)) {
					updateFile(project, join('android', 'variables.gradle'), `${variable} = `, `\n`, variables[variable], true);
				}
			}
			vscode.window.showInformationMessage(`Migration to Capacitor ${coreVersion} is complete. Sync and run your project to test!`, 'OK');
		} catch (err) {
			writeError(`Failed to migrate: ${err}`);
		}
	});
}

function updateFile(project: Project, filename: string, textStart: string, textEnd: string, replacement?: string, skipIfNotFound?: boolean): boolean {
	const path = join(project.folder, filename);
	if (existsSync(path)) {
		let txt;
		try {
			txt = readFileSync(path, 'utf-8');
		} catch (err) {
			writeError(`Unable to read ${filename}. Verify it is not already open. ${err}`);
			return;
		}
		if (txt.includes(textStart)) {
			if (replacement) {
				txt = setAllStringIn(txt, textStart, textEnd, replacement);
				writeFileSync(path, txt, { encoding: 'utf-8' });
			} else {
				// Replacing in code so we need to count the number of brackets to find the end of the function in swift
				const lines = txt.split('\n');
				let replaced = '';
				let keep = true;
				let brackets = 0;
				for (const line of lines) {
					if (line.includes(textStart)) {
						keep = false;
					}
					if (!keep) {
						brackets += (line.match(/{/g) || []).length;
						brackets -= (line.match(/}/g) || []).length;
						if (brackets == 0) {
							keep = true;
						}
					} else {
						replaced += line + '\n';
					}
				}
				writeFileSync(path, replaced, { encoding: 'utf-8' });
			}
			const message = replacement ? `${textStart} => ${replacement}` : '';
			writeIonic(`Sucessfully migrated ${filename} ${message}.`);
			return true;
		} else if (!skipIfNotFound) {
			writeError(`Unable to find "${textStart}" in ${filename}. Try updating it manually`);
		}
	} else {
		writeError(`Unable to find ${filename} to migrate. Try updating it manually`);
	}
	return false;
}

function install(libs: Array<string>, version: string, pluginVerison: string): string {
	let result = '';
	for (const lib of libs) {
		if (exists(lib)) {
			result += `${lib}@${version} `;
		}
	}

	// Migrate any capacitor plugins to 4.x
	for (const lib of getAllPackageNames()) {
		if (!libs.includes(lib) && lib.startsWith('@capacitor')) {
			result += `${lib}@${pluginVerison} `;
		}
	}
	return npmInstall(result.trim());
}

async function run2(project: Project, command: string): Promise<boolean> {
	const channel = getOutputChannel();
	return await run(project.projectFolder(), command, channel, undefined, [], [], undefined, undefined);
}

function daysUntil(date_1: Date) {
	const date_2 = new Date();
	const difference = date_1.getTime() - date_2.getTime();
	return Math.ceil(difference / (1000 * 3600 * 24));
}