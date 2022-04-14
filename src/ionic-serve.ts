import * as vscode from 'vscode';

import { InternalCommand } from './command-name';
import { MonoRepoType } from './monorepo';
import { preflightNPMCheck } from './node-commands';
import { Project } from './project';

/**
 * Create the ionic serve command
 * @returns string
 */
export function ionicServe(project: Project, dontOpenBrowser: boolean): string {
  switch (project.repoType) {
    case MonoRepoType.none:
      return ionicCLIServe(project, dontOpenBrowser);
    case MonoRepoType.nx:
      return nxServe(project);
    case MonoRepoType.npm:
    case MonoRepoType.pnpm:
    case MonoRepoType.folder:
      return InternalCommand.cwd + ionicCLIServe(project, dontOpenBrowser);
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function ionicCLIServe(project: Project, dontOpenBrowser: boolean): string {
  const preop = preflightNPMCheck(project);
  const httpsForWeb = vscode.workspace.getConfiguration('ionic').get('httpsForWeb');
  const previewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
  let serveFlags = '';
  if (previewInEditor || dontOpenBrowser) {
    serveFlags += ' --no-open';
  }
  if (httpsForWeb) {
    serveFlags += ' --ssl';
  }

  return `${preop}npx ionic serve${serveFlags}`;
}

function nxServe(project: Project): string {
  return `npx nx serve ${project.monoRepo.name}`;
}
