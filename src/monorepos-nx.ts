import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';

import { MonoRepoProject } from "./monorepo";
import { Project } from './project';

export interface NXWorkspace {
	projects: object;
}

/**
 * NX creates a workspace.json file containing the list of projects
 * This function returns it as a list
 * @param  {Project} project
 * @returns Array
 */
export function getNXProjects(project: Project): Array<MonoRepoProject> {
	const filename = path.join(project.folder, 'workspace.json');
	const result: Array<MonoRepoProject> = [];
	if (fs.existsSync(filename)) {
		const txt = fs.readFileSync(filename, 'utf-8');
		const projects = JSON.parse(txt).projects;
		for (const prj of Object.keys(projects)) {
			let folder = projects[prj];
			if (folder?.root) { // NX project can be a folder or an object with a root property specifying the folder
				folder = folder.root;
			}
			result.push({ name: prj, folder: folder });
		}
	} else {
		// workspace.json is optional. Just iterate through apps folder
		const folder = path.join(project.folder, 'apps');
		if (fs.existsSync(folder)) {
			const list = fs.readdirSync(folder, { withFileTypes: true });
			for (const item of list) {				
				if (item.isDirectory && !item.name.startsWith('.')) {
					result.push({ name: item.name, folder: path.relative(project.folder, join(folder, item.name)) });
				}
			}
		}
	}
	return result;
}