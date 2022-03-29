import * as fs from 'fs';
import * as path from 'path';
import { CommandName, InternalCommand } from './command-name';
import { MonoRepoType } from './monorepo';

import { npmInstall } from "./node-commands";
import { Project } from "./project";
import { Command, Tip, TipType } from "./tip";
import { asAppId } from "./utilities";

/**
 * Web projects are not using Capacitor or Cordova
 * @param  {Project} project
 */
export function webProject(project: Project) {
	let outFolder = 'www';

	// If there is a build folder and not a www folder then...
	if (!fs.existsSync(path.join(project.projectFolder(), 'www'))) {
		if (fs.existsSync(path.join(project.projectFolder(), 'build'))) {
			outFolder = 'build'; // use build folder (usually react)
		} else if (fs.existsSync(path.join(project.projectFolder(), 'dist'))) {
			outFolder = 'dist'; /// use dist folder (usually vue)
		}
	}
	
	const pre = (project.repoType != MonoRepoType.none) ? InternalCommand.cwd : '';

	project.tip(new Tip(
		'Add Capacitor Integration', '', TipType.Capacitor, 'Integrate Capacitor with this project to make it native mobile?',
		[
			npmInstall(`@capacitor/core`),
			npmInstall(`@capacitor/cli`),
			npmInstall(`@capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar`),
			`${pre}npx cap init "${project.name}" "${asAppId(project.name)}" --web-dir ${outFolder}`
		],
		'Add Capacitor', 'Capacitor added to this project',
		'https://capacitorjs.com'
	));
}