import { Project } from './project';
import { MonoRepoType } from './monorepo';
import { exists } from './analyzer';
import { InternalCommand } from './command-name';
import { preflightNPMCheck } from './node-commands';

/**
 * Creates the capacitor sync command
 * @param  {Project} project
 * @returns string
 */
export function capacitorSync(project: Project): string {
  const preop = preflightNPMCheck(project);

  const ionicCLI = exists('@ionic/cli');
  switch (project.repoType) {
    case MonoRepoType.none:
      return preop + (ionicCLI ? capCLISync() : ionicCLISync());
    case MonoRepoType.folder:
    case MonoRepoType.pnpm:
    case MonoRepoType.npm:
      return InternalCommand.cwd + preop + (ionicCLI ? capCLISync() : ionicCLISync());
    case MonoRepoType.nx:
      return preop + nxSync(project);
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function capCLISync(): string {
  return `npx cap sync`;
}

function ionicCLISync(): string {
  return `npx ionic cap sync`;
}

function nxSync(project: Project): string {
  return `npx nx sync ${project.monoRepo.name}`;
}
