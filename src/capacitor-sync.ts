import { Project } from './project';
import { MonoRepoType } from './monorepo';
import { exists, isGreaterOrEqual } from './analyzer';
import { InternalCommand } from './command-name';
import { npx, PackageManager, preflightNPMCheck } from './node-commands';
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
      return preop + (ionicCLI ? ionicCLISync(project.packageManager) : capCLISync(project.packageManager));
    case MonoRepoType.folder:
    case MonoRepoType.pnpm:
    case MonoRepoType.lerna:
    case MonoRepoType.yarn:
    case MonoRepoType.npm:
      return (
        InternalCommand.cwd +
        preop +
        (ionicCLI ? ionicCLISync(project.packageManager) : capCLISync(project.packageManager))
      );
    case MonoRepoType.nx:
      return preop + nxSync(project);
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

function capCLISync(packageManager: PackageManager): string {
  if (isGreaterOrEqual('@capacitor/cli', '4.1.0')) {
    return `${npx(packageManager)} cap sync --inline`;
  }
  return `${npx(packageManager)} cap sync${getConfigurationArgs()}`;
}

function ionicCLISync(packageManager: PackageManager): string {
  return `${npx(packageManager)} ionic cap sync --inline${getConfigurationArgs()}`;
}

function nxSync(project: Project): string {
  return `${npx(project.packageManager)} nx sync ${project.monoRepo.name}${getConfigurationArgs()}`;
}
