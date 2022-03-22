import { exists, reviewPlugin } from "./analyzer";
import { reviewPluginsWithHooks } from "./process-packages";
import { Project } from "./project";
import { capacitorRecommendations } from './rules-capacitor';
import { Tip, TipType } from "./tip";


export function capacitorMigrationChecks(packages, project: Project) {
	const tips: Tip[] = [];
	project.setGroup(
		'Capacitor Migration',
		'Your Cordova application ' + project.name + ' can be migrated to Capacitor (see [guide](https://capacitorjs.com/docs/cordova/migrating-from-cordova-to-capacitor)). The following recommendations will help with the migration:',
		TipType.Capacitor, true
	);

	tips.push(...capacitorRecommendations(project));

	// Plugins with Hooks
	tips.push(...reviewPluginsWithHooks(packages));

	// Requires evaluation to determine compatibility
	tips.push(reviewPlugin('cordova-wheel-selector-plugin'));
	tips.push(reviewPlugin('cordova-plugin-secure-storage'));
	tips.push(reviewPlugin('newrelic-cordova-plugin'));

	if (exists('cordova-ios') || (exists('cordova-android') || (project.fileExists('config.xml')))) {
		const movecmd = process.platform === "win32" ? 'rename config.xml config.xml.bak' : 'mv config.xml config.xml.bak';
		tips.push(new Tip('Remove Cordova Project', '', TipType.Capacitor, 'Remove the Cordova integration',
			['npm uninstall cordova-ios', 'npm uninstall cordova-android', movecmd, 'rem-cordova'],
			'Remove Cordova', 'Removing Cordova', 'Successfully removed Cordova'));
	}
	project.tips(tips);
}
