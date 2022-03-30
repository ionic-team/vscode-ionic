import { Project } from './project';

export enum Context {
  // Whether the project has been inspected (true) or not (false)
  inspectedProject = 'inspectedProject',

  // Whether the user has clicked Login (true)
  isLoggingIn = 'isLoggingIn',

  // Whether the current user is not known (true)
  isAnonymous = 'isAnonymous',

  // VS Code hasnt opened a folder
  noProjectFound = 'noProjectFound',

  // Used for splash screen assets that can be viewed
  asset = 'asset',

  // The panel for monorepo projects
  isMonoRepo = 'isMonoRepo',

  // A scope that can be upgraded
  upgrade = 'upgrade',

  // Upgrade options
  lightbulb = 'lightbulb',

  // Stop option
  stop = 'stop',

  // Build configuration
  buildConfig = 'buildConfig',

  // Run or Debug
  debugMode = 'debugMode',

  // Device selection
  selectDevice = 'selectDevice',

  // Shell (eg /bin/zsh)
  shell = 'shell',
}

// Commands from vs code
export enum VSCommand {
  setContext = 'setContext',
}

export function PackageCacheOutdated(project: Project) {
  if (project?.monoRepo?.localPackageJson) {
    return 'npmOutdatedData_' + project.monoRepo.name;
  }
  return 'npmOutdatedData';
}

export function PackageCacheList(project: Project) {
  if (project?.monoRepo?.localPackageJson) {
    return 'npmListData_' + project.monoRepo.name;
  }
  return 'npmListData';
}

export function CapProjectCache(project: Project) {
  if (project?.monoRepo?.localPackageJson) {
    return 'CapacitorProject_' + project.monoRepo.name;
  }
  return 'CapacitorProject';
}

export function PackageCacheModified(project: Project) {
  if (project?.monoRepo?.localPackageJson) {
    return 'packagesModified_' + project.monoRepo.name;
  }
  return 'packagesModified';
}
