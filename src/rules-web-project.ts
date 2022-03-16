import { Project } from "./project";
import { Tip, TipType } from "./tip";
import { asAppId } from "./utilities";

export function webProject(project: Project) {
	project.tip(new Tip(
		'Add Capacitor Integration', '', TipType.Capacitor, 'Integrate Capacitor with this project to make it native mobile.',
		[
			`npm install @capacitor/core`,
			`npm install @capacitor/cli --save-dev`,
			`npm install @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar --save-exact`,
			`npx cap init "${project.name}" "${asAppId(project.name)}"`
		],
		'Add Capacitor', 'Capacitor added to this project',
		'https://capacitorjs.com'
	));
}