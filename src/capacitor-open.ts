import { Project } from './project';
import { MonoRepoType } from './monorepo';
import { exists } from './analyzer';
import { CapacitorPlatform } from './capacitor-platform';
import { InternalCommand } from './command-name';
import { useIonicCLI } from './capacitor-run';

/**
 * Capacitor open command
 * @param  {Project} project
 * @param  {CapacitorPlatform} platform ios or android
 * @returns string
 */
export function capacitorOpen(project: Project, platform: CapacitorPlatform): string {
  const ionicCLI = useIonicCLI();
  switch (project.repoType) {
    case MonoRepoType.none:
      return ionicCLI ? ionicCLIOpen(platform) : capCLIOpen(platform);
    case MonoRepoType.folder:
    case MonoRepoType.pnpm:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.npm:
      return InternalCommand.cwd + (ionicCLI ? ionicCLIOpen(platform) : capCLIOpen(platform));
    case MonoRepoType.nx:
      return nxOpen(project, platform);
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function capCLIOpen(platform: CapacitorPlatform): string {
  return `npx cap open ${platform}`;
}

function ionicCLIOpen(platform: CapacitorPlatform): string {
  return `npx ionic cap open ${platform}`;
}

function nxOpen(project: Project, platform: CapacitorPlatform): string {
  return `npx nx run ${project.monoRepo.name}:open:${platform}`;
}
