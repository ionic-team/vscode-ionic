import { exists } from './analyzer';
import { CapacitorPlatform } from './capacitor-platform';
import { InternalCommand } from './command-name';
import { MonoRepoType } from './monorepo';
import { Project } from './project';

/**
 * Add a Capacitor Platform
 * @param  {Project} project
 * @param  {CapacitorPlatform} platform
 * @returns string
 */
export function capacitorAdd(project: Project, platform: CapacitorPlatform): string {
  const ionic = exists('@ionic/cli') ? 'ionic ' : '';
  switch (project.repoType) {
    case MonoRepoType.none:
      return `npx ${ionic}cap add ${platform}`;
    case MonoRepoType.npm:
    case MonoRepoType.folder:
      return `${InternalCommand.cwd}npx ${ionic}cap add ${platform}`;
    case MonoRepoType.nx:
      return nxAdd(project, platform);
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function nxAdd(project: Project, platform: CapacitorPlatform): string {
  return `npx nx run ${project.monoRepo.name}:add:${platform}`;
}
