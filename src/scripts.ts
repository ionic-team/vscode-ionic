import { MonoRepoType } from "./monorepo";
import { Project } from "./project";
import { Tip, TipType } from "./tip";
import { getPackageJSON, PackageFile } from "./utilities";

// Look in package.json for scripts and add options to execute
export function addScripts(project: Project) {
	project.setGroup(`Scripts`, ``, TipType.Files, false);
	const packages: PackageFile = getPackageJSON(project.folder);
	for (const script of Object.keys(packages.scripts)) {
		project.add(new Tip(script, '', TipType.Run, '', `npm run ${script}`, `Running ${script}`, `Ran ${script}`));
	}

	if (project.repoType == MonoRepoType.nx) {
		addNXScripts(['build', 'test', 'lint', 'e2e'], project);
	}
}

function addNXScripts(names: Array<string>, project: Project) {
	for (const name of names) {
		project.add(new Tip(`${project.monoRepo.name} ${name}`, '', TipType.Run, '', `nx run ${project.monoRepo.name}:${name}`, `Running ${name}`, `Ran ${name}`));
	}
}