import { Recommendation } from "./recommendation";
import { Project } from "./project";
import { Tip, TipType } from "./tip";
import { getRunOutput } from "./utilities";

/**
 * Creates ionic start commands
 * @param  {string} folder
 * @returns Promise
 */
export async function starterProject(folder: string): Promise<Recommendation[]> {
	const project: Project = new Project('New Project');

	const out = await getRunOutput('ionic start -l', folder);
	const projects = parseIonicStart(out);
	let type = undefined;
	for (const starter of projects) {
		if (type != starter.type) {
			type = starter.type;
			project.setGroup(`New ${type} Project`, '', TipType.Ionic, false);
		}

		project.add(new Tip(
			`${starter.name}`,
			`${starter.description}`,
			TipType.Run,
			'Create Project',
			[`ionic start @app ${starter.name} --capacitor`,
			process.platform === "win32" ? `robocopy @app . /MOVE /E /NFL /NDL /NJH /NJS /nc /ns /np` : `mv @app/{,.[^.]}* . && rmdir @app`,
			],
			'Creating Project',
			'Project Created').requestAppName().showProgressDialog());
	}
	return project.groups;
}

function parseIonicStart(text: string): Array<any> {
	const lines = text.split('\n');
	let type = undefined;
	let result = [];
	for (const line of lines) {
		if (line.includes('--type=')) {
			const t = line.split('=');
			type = t[1].replace(')', '');
			switch (type) {
				case 'ionic-angular': type = 'Angular'; break;
				case 'react': type = 'React'; break;
				case 'vue': type = 'Vue'; break;
			}
		}
		if (line.includes('|')) {
			const t = line.split('|');
			const name = t[0].trim();
			const description = t[1].trim();
			if (name != 'name') {
				result.push({ type: type, name: name, description: description });
			}
		}
	}
	result = result.filter((project) => { return (project.type != 'ionic1') && (project.type != 'angular'); });
	return result;
}