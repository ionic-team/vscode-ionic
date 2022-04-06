import { npmInstall, npmUninstall } from './node-commands';
import { Project } from './project';
import { Tip, TipType } from './tip';

export function checkIonicNativePackages(packages, project: Project) {
  for (const library of Object.keys(packages)) {
    if (library.startsWith('@ionic-native/')) {
      const newLibrary = library.replace('@ionic-native', '@awesome-cordova-plugins');
      project.add(
        new Tip(
          library,
          'Migrate to @awesome-cordova-plugins',
          TipType.Idea,
          `@ionic-native migrated to @awesome-cordova-plugins in 2021. You can safely migrate from ${library} to ${newLibrary}`,
          npmInstall(newLibrary) + ' && ' + npmUninstall(library),
          `Replace ${library}`
        )
      );
    }
  }
}
