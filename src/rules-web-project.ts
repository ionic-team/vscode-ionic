import { npmInstall } from "./node-commands";
import { Project } from "./project";
import { Tip, TipType } from "./tip";
import { asAppId } from "./utilities";

/**
 * Web projects are not using Capacitor or Cordova
 * @param  {Project} project
 */
export function webProject(project: Project) {
	project.tip(new Tip(
		'Add Capacitor Integration', '', TipType.Capacitor, 'Integrate Capacitor with this project to make it native mobile?',
		[
			npmInstall(`@capacitor/core`),
			npmInstall(`@capacitor/cli`),
			npmInstall(`@capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar`),
			`npx cap init "${project.name}" "${asAppId(project.name)}"`
		],
		'Add Capacitor', 'Capacitor added to this project',
		'https://capacitorjs.com'
	));
}