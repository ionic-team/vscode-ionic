import { Project } from './project';
import { MonoRepoType } from './monorepo';
import { exists } from './analyzer';
import { InternalCommand } from './command-name';

/**
 * Creates the capacitor sync command
 * @param  {Project} project
 * @returns string
 */
export function capacitorSync(project: Project): string {
  const ionicCLI = exists('@ionic/cli');
  switch (project.repoType) {
    case MonoRepoType.none:
      return ionicCLI ? capCLISync() : ionicCLISync();
    case MonoRepoType.folder:
    case MonoRepoType.npm:
      return InternalCommand.cwd + (ionicCLI ? capCLISync() : ionicCLISync());
    case MonoRepoType.nx:
      return nxSync(project);
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
