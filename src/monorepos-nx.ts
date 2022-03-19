import * as fs from 'fs';
import * as path from 'path';

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
			result.push({ name: prj, folder: projects[prj] });
		}
	}
	return result;
}