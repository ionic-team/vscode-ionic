import { npmInstall, npmUninstall } from './node-commands';
import { Project } from './project';
import { Tip, TipType } from './tip';

export function checkIonicNativePackages(packages, project: Project) {
  for (const name of Object.keys(packages)) {
    if (name.startsWith('@ionic-native/')) {
      const replacement = name.replace('@ionic-native', '@awesome-cordova-plugins');
      if (name == '@ionic-native/unique-device-id' || name == '@ionic-native/contacts') {
        project.deprecatedPlugin(name, 'Its support was removed from @awesome-cordova-plugins');
      } else {
        replacePackage(project, name, replacement);
      }
    }
  }
}

function replacePackage(project: Project, name: string, replacement: string) {
  project.add(
    new Tip(
      name,
      'Migrate to @awesome-cordova-plugins',
      TipType.Idea,
      `@ionic-native migrated to @awesome-cordova-plugins in 2021. You can safely migrate from ${name} to ${replacement}`,
      npmInstall(replacement) + ' && ' + npmUninstall(name),
      `Replace ${name}`
    )
  );
}
