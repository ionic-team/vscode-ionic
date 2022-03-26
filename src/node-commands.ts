import { InternalCommand } from "./command-name";
import { ionicState } from "./ionic-tree-provider";
import { MonoRepoType } from "./monorepo";
import { Project } from "./project";

export function outdatedCommand(project: Project): string {
	return 'npm outdated --json';
}

export function listCommand(project: Project): string {
	return 'npm list --json';
}

export function npmInstall(name: string, ...args): string {
	const argList = args.join(' ').trim();

	switch (ionicState.repoType) {
		case MonoRepoType.npm: return `npm install ${name} --save-exact ${argList} --workspace=${ionicState.workspace}`;
		case MonoRepoType.folder: return InternalCommand.cwd + `npm install ${name} --save-exact ${argList}`;
		default: return `npm install ${name} --save-exact ${argList}`;
	}
}

export function npmInstallAll(): string {
	switch (ionicState.repoType) {
		case MonoRepoType.folder: return InternalCommand.cwd + `npm install`;
		default: return `npm install`;
	}
}

export function npmUninstall(name: string): string {
	switch (ionicState.repoType) {
		case MonoRepoType.npm: return `npm uninstall ${name} --workspace=${ionicState.workspace}`;
		case MonoRepoType.folder: return `${InternalCommand.cwd}npm uninstall ${name}`;
		default: return `npm uninstall ${name}`;
	}
}

export function npmRun(name: string): string {
	switch (ionicState.repoType) {
		case MonoRepoType.npm: return `npm run ${name} --workspace=${ionicState.workspace}`;
		case MonoRepoType.folder: return `${InternalCommand.cwd}npm run ${name}`;
		default: return `npm run ${name}`;
	}
}