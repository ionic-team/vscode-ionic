import { ionicState } from "./ionic-tree-provider";
import { MonoRepoType } from "./monorepo";
import { Project } from "./project";

export function outdatedCommand(project: Project): string {
	return 'npm outdated --json';
}

export function listCommand(project: Project): string {
	return 'npm list --json';
}

// The folder than contains node_modules
export function nmFolder(project: Project): string {
	switch (project.repoType) {
		case MonoRepoType.npm: return project.folder;
	}
}

export function npmInstall(name: string, ...args): string {
	const argList = args.join(' ').trim();

	switch (ionicState.repoType) {
		case MonoRepoType.npm: return `npm install ${name} --save-exact ${argList} --workspace=${ionicState.workspace}`;
		default: return `npm install ${name} --save-exact ${argList}`;
	}
}

export function npmUninstall(name: string): string {
	switch (ionicState.repoType) {
		case MonoRepoType.npm: return `npm uninstall ${name} --workspace=${ionicState.workspace}`;
		default: return `npm uninstall ${name}`;
	}
}

export function npmRun(name: string): string {
	switch (ionicState.repoType) {
		case MonoRepoType.npm: return `npm run ${name} --workspace=${ionicState.workspace}`;
		default: return `npm run ${name}`;
	}
}