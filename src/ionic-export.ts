import { inspectProject, Project, ProjectSummary } from './project';

import { writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { PackageInfo } from './package-info';
import { getStringFrom, plural } from './utilities';
import { Recommendation } from './recommendation';
import { ExtensionContext, window } from 'vscode';

export async function ionicExport(project: Project, context: ExtensionContext): Promise<void> {
  let folder = project.projectFolder();
  if (project.monoRepo?.nodeModulesAtRoot) {
    folder = project.folder;
  }
  const summary: ProjectSummary = await inspectProject(folder, context, undefined);
  let txt = '';
  for (const libType of ['Capacitor Plugin', 'Plugin', 'Dependency']) {
    let lastScope = '';
    txt += `## ${plural(libType)}\n\n`;

    for (const library of Object.keys(summary.packages).sort()) {
      const pkg: PackageInfo = summary.packages[library];
      if (pkg.depType == libType) {
        const scope = getStringFrom(library, '@', '/');
        if (lastScope != scope) {
          txt += scope ? `### @${scope}\n` : `### Other Dependencies\n`;
        }

        txt += `- **${library.replace(`@${scope}/`, '')}@${pkg.version}**`;
        txt += pkg.current ? ` - (Latest ${pkg.latest})` : ``;

        const tip = getTip(library, summary.project.groups);
        if (tip) {
          txt += ` - ${tip.message}`;
        }
        txt += '\n';
        lastScope = scope;
      }
    }
  }

  txt += exportNamingStyles(summary.project.projectFolder());

  const filename = join(summary.project.projectFolder(), 'project-summary.md');
  writeFileSync(filename, txt);
  window.showInformationMessage(`Exported ${filename}`);
}

function exportNamingStyles(folder: string): string {
  const filenames = [];
  const baseFolder = join(folder, 'src');
  getAllFiles(baseFolder, filenames);
  let txt = '\n\n## Nonstandard naming\n';
  txt += 'The following files and folders do not follow the standard naming convention:\n\n';
  for (const filename of filenames) {
    const name = filename.replace(baseFolder, '');
    if (name.toLowerCase() != name) {
      txt += `- ${name}\n`;
    }
  }
  return txt;
}

function getAllFiles(folder: string, arrayOfFiles: Array<string>) {
  if (!existsSync(folder)) {
    return [];
  }
  const files = readdirSync(folder);
  arrayOfFiles = arrayOfFiles || [];

  for (const file of files) {
    if (statSync(join(folder, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(join(folder, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(join(folder, file));
    }
  }

  return arrayOfFiles;
}

function getTip(library: string, recommendations: Array<Recommendation>) {
  for (const parent of recommendations) {
    for (const recommendation of parent.children) {
      if (recommendation.tip?.relatedDependency == library) {
        return recommendation.tip;
      }
    }
  }
  return undefined;
}
