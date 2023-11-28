import * as path from 'path';
import { exists } from './analyzer';
import { InternalCommand } from './command-name';
import { MonoRepoType } from './monorepo';

import { npmInstall, npx } from './node-commands';
import { Project } from './project';
import { Tip, TipType } from './tip';
import { asAppId } from './utilities';
import { checkCapacitorPluginMigration } from './rules-capacitor-plugins';
import { existsSync } from 'fs';

/**
 * Web projects are not using Capacitor or Cordova
 * @param  {Project} project
 */
export function webProject(project: Project) {
  let outFolder = 'www';

  // If there is a build folder and not a www folder then...
  if (!existsSync(path.join(project.projectFolder(), 'www'))) {
    if (existsSync(path.join(project.projectFolder(), 'build')) || exists('react')) {
      outFolder = 'build'; // use build folder (usually react)
    } else if (existsSync(path.join(project.projectFolder(), 'dist')) || exists('vue')) {
      outFolder = 'dist'; /// use dist folder (usually vue)
    }
  }

  const pre = project.repoType != MonoRepoType.none ? InternalCommand.cwd : '';

  if (project.isCapacitorPlugin) {
    checkCapacitorPluginMigration(project);
  }

  if (!project.isCapacitorPlugin) {
    project.tip(
      new Tip(
        'Add Capacitor Integration',
        '',
        TipType.Capacitor,
        'Integrate Capacitor with this project to make it native mobile?',
        [
          npmInstall(`@capacitor/core`),
          npmInstall(`@capacitor/cli`),
          npmInstall(`@capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar`),
          `${pre}${npx(project.packageManager)} capacitor init "${project.name}" "${asAppId(
            project.name
          )}" --web-dir ${outFolder}`,
          InternalCommand.ionicInit,
        ],
        'Add Capacitor',
        'Capacitor added to this project',
        'https://capacitorjs.com'
      )
    );
  }
}
