import { Project } from './project';
import { MonoRepoType } from './monorepo';
import { ionicState } from './ionic-tree-provider';
import { InternalCommand } from './command-name';
import { npx, preflightNPMCheck } from './node-commands';
import { exists } from './analyzer';
import { CapacitorPlatform } from './capacitor-platform';
import { getConfigurationArgs } from './build-configuration';
import { workspace } from 'vscode';

/**
 * Creates the ionic build command
 * @param  {Project} project
 * @returns string
 */
export function ionicBuild(project: Project, configurationArg?: string, platform?: CapacitorPlatform): string {
  const preop = preflightNPMCheck(project);

  ionicState.projectDirty = false;

  const prod: boolean = workspace.getConfiguration('ionic').get('buildForProduction');
  let args = configurationArg ? configurationArg : '';
  if (ionicState.project) {
    args += ` --project=${ionicState.project}`;
  }
  const additionalArgs = getConfigurationArgs(false);
  if (additionalArgs) {
    args += additionalArgs;
  }
  switch (project.repoType) {
    case MonoRepoType.none:
      return `${preop}${ionicCLIBuild(prod, project, args, platform)}`;
    case MonoRepoType.npm:
      return `${InternalCommand.cwd}${preop}${ionicCLIBuild(prod, project, args, platform)}`;
    case MonoRepoType.nx:
      return `${preop}${nxBuild(prod, project, args)}`;
    case MonoRepoType.folder:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.pnpm:
      return `${InternalCommand.cwd}${preop}${ionicCLIBuild(prod, project, args, platform)}`;
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function ionicCLIBuild(
  prod: boolean,
  project: Project,
  configurationArg?: string,
  platform?: CapacitorPlatform
): string {
  let cmd = `${npx(project.packageManager)} ionic build`;
  if (configurationArg) {
    cmd += ` ${configurationArg}`;
  } else if (prod) {
    cmd += ' --prod';
  }
  if (platform || exists('@capacitor/ios') || exists('@capacitor/android')) {
    cmd += ` && ${npx(project.packageManager)} cap copy`;
    if (platform) cmd += ` ${platform}`;
  }
  return cmd;
}

function nxBuild(prod: boolean, project: Project, configurationArg?: string): string {
  let cmd = `${npx(project.packageManager)} nx build ${project.monoRepo.name}`;
  if (configurationArg) {
    cmd += ` ${configurationArg}`;
  } else if (prod) {
    cmd += ' --configuration=production';
  }
  return cmd;
}
