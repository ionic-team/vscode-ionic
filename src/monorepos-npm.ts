import * as fs from 'fs';
import * as path from 'path';

import { MonoRepoProject } from "./monorepo";
import { Project } from "./project";

/**
 * Get mono repo project list when using npm workspaces
 * @param  {Project} project
 * @returns Array of Mono Repo Projects
 */
export function getNpmWorkspaceProjects(project: Project): Array<MonoRepoProject> {
	const result: Array<MonoRepoProject> = [];
	for (const workspace of project.workspaces) {
		// workspace will be "apps/*""
		const folder = workspace.replace('*', '');
		const folderPath = path.join(project.folder, folder);
		for (const dir of fs.readdirSync(folderPath, { withFileTypes: true })) {
			if (dir.isDirectory()) {
				result.push({ name: dir.name, folder: path.join(folderPath, dir.name) });
			}
		}
	}
	return result;
}