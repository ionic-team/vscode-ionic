import { Project } from './project';
import { MonoRepoType } from './monorepo';
import { exists, isGreaterOrEqual } from './analyzer';
import { InternalCommand } from './command-name';
import { preflightNPMCheck } from './node-commands';
import { getConfigurationArgs } from './build-configuration';
import { useIonicCLI } from './capacitor-run';

/**
 * Creates the capacitor sync command
 * @param  {Project} project
 * @returns string
 */
export function capacitorSync(project: Project): string {
  const preop = preflightNPMCheck(project);

  const ionicCLI = useIonicCLI();
  switch (project.repoType) {
    case MonoRepoType.none:
      return preop + (ionicCLI ? ionicCLISync() : capCLISync());
    case MonoRepoType.folder:
    case MonoRepoType.pnpm:
    case MonoRepoType.lerna:
    case MonoRepoType.yarn:
    case MonoRepoType.npm:
      return InternalCommand.cwd + preop + (ionicCLI ? ionicCLISync() : capCLISync());
    case MonoRepoType.nx:
      return preop + nxSync(project);
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function capCLISync(): string {
  if (isGreaterOrEqual('@capacitor/cli', '4.1.0')) {
    return `npx cap sync --inline`;
  }
  return `npx cap sync${getConfigurationArgs()}`;
}

function ionicCLISync(): string {
  return `npx ionic cap sync --inline${getConfigurationArgs()}`;
}

function nxSync(project: Project): string {
  return `npx nx sync ${project.monoRepo.name}${getConfigurationArgs()}`;
}
