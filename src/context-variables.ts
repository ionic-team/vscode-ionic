import { Project } from "./project";

export enum Context {
	// Whether the project has been inspected (true) or not (false)
	inspectedProject = 'inspectedProject',

	// Whether the user has clicked Login (true)
	isLoggingIn = 'isLoggingIn',

	// Whether the current user is not known (true)
	isAnonymous = 'isAnonymous',

	// VS Code hasnt opened a folder
	noProjectFound = 'noProjectFound'
}


export function PackageCacheOutdated(project: Project) {
	if (project?.monoRepo?.localPackageJson) {
		return 'npmOutdatedData_'+project.monoRepo.name;
	}
	return 'npmOutdatedData';
}

export function PackageCacheList(project: Project) {
	if (project?.monoRepo?.localPackageJson) {
		return 'npmListData_'+project.monoRepo.name;
	}
	return 'npmListData';
}

export function PackageCacheModified(project: Project) {
	if (project?.monoRepo?.localPackageJson) {
		return 'packagesModified_'+project.monoRepo.name;
	}
	return 'packagesModified';
}