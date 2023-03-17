import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import { writeError } from './extension';
import { ionicState } from './ionic-tree-provider';

import { MonoRepoProject } from './monorepo';
import { Project } from './project';
import { getRunOutput } from './utilities';

export interface NXWorkspace {
  projects: object;
}

let nxProjectFolder: string = undefined;
/**
 * NX creates a workspace.json file containing the list of projects
 * This function returns it as a list
 * @param  {Project} project
 * @returns Array
 */
export async function getNXProjects(project: Project): Promise<Array<MonoRepoProject>> {
  // Do we return the list of projects we've already cached
  if (ionicState.projects?.length > 0 && nxProjectFolder == project.folder) {
    return ionicState.projects;
  }

  const filename = path.join(project.folder, 'workspace.json');
  let result: Array<MonoRepoProject> = [];
  if (fs.existsSync(filename)) {
    result = getNXProjectFromWorkspaceJson(filename);
  } else {
    result = await getNXProjectsFromNX(project);
    if (result.length == 0) {
      result = getNXProjectsByFolder(project);
    }
  }
  nxProjectFolder = project.folder;
  return result;
}

// npx nx print-affected --type=app --all
async function getNXProjectsFromNX(project: Project): Promise<MonoRepoProject[]> {
  const result: MonoRepoProject[] = [];
  const txt = await getRunOutput(`npx nx print-affected --type=app --all`, project.folder);
  const projects = JSON.parse(txt).projects;
  for (const prj of projects) {
    const folder = join(project.folder, 'apps', prj);
    if (fs.existsSync(folder)) {
      result.push({ name: prj, folder });
    } else {
      writeError(`The NX project "${prj}" does not exist at ${folder}`);
    }
  }
  return result;
}

function getNXProjectFromWorkspaceJson(filename: string): MonoRepoProject[] {
  const result: Array<MonoRepoProject> = [];
  const txt = fs.readFileSync(filename, 'utf-8');
  const projects = JSON.parse(txt).projects;
  for (const prj of Object.keys(projects)) {
    let folder = projects[prj];
    if (folder?.root) {
      // NX project can be a folder or an object with a root property specifying the folder
      folder = folder.root;
    }
    result.push({ name: prj, folder: folder });
  }
  return result;
}

function getNXProjectsByFolder(project: Project): MonoRepoProject[] {
  const result: Array<MonoRepoProject> = [];
  // workspace.json is optional. Just iterate through apps folder
  const folder = path.join(project.folder, 'apps');
  if (fs.existsSync(folder)) {
    const list = fs.readdirSync(folder, { withFileTypes: true });
    for (const item of list) {
      if (item.isDirectory && !item.name.startsWith('.')) {
        result.push({ name: item.name, folder: path.relative(project.folder, join(folder, item.name)) });
      }
    }
    return result;
  }
}
