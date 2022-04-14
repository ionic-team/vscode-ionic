import * as path from 'path';
import * as fs from 'fs';
import * as globule from 'globule';

import { MonoRepoProject } from './monorepo';
import { Project } from './project';

export function getPnpmWorkspaces(project: Project): Array<MonoRepoProject> {
  const pw = path.join(project.folder, 'pnpm-workspace.yaml');
  if (!fs.existsSync(pw)) {
    return [];
  }
  const yaml = fs.readFileSync(pw, { encoding: 'utf8' });
  try {
    const list = [];
    for (const line of yaml.split('\n')) {
      if (line.trim().startsWith('-')) {
        const folder = line.replace('-', '').trim();
        list.push(folder);
        // packages/*
        // '.'
        // */**
        // '!devtool/**'
        // '!docs/**'
        // '!examples/**'
      }
    }
    const folders = globule.find({ src: list, srcBase: project.folder });
    const repos: Array<MonoRepoProject> = [];
    for (const folder of folders) {
      repos.push({ folder: path.join(project.folder, folder), name: path.basename(folder) });
    }
    return repos;
  } catch (err) {
    console.error(err);
    return [];
  }
}
