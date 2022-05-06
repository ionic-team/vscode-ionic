import * as fs from 'fs';
import * as path from 'path';

// The project is non-ionic:
// Run ionic init using the project name of the package.json and type of custom
// Create ionic:build if there is a build script

import { getOutputChannel } from './extension';
import { getRunOutput } from './utilities';

// Create ionic:serve if there is a serve script
export async function ionicInit(folder: string): Promise<boolean> {
  const channel = getOutputChannel();

  channel.appendLine('[Ionic] Creating Ionic project...');
  try {
    const filename = path.join(folder, 'package.json');
    const packageFile = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const name = packageFile.name;
    const cfg = path.join(folder, 'ionic.config.json');
    if (!fs.existsSync(cfg)) {
      const result = await getRunOutput(`npx ionic init "${name}" --type=custom`, folder);
    }
    if (packageFile.scripts?.build) {
      packageFile.scripts['ionic:build'] = 'npm run build';
    }
    if (packageFile.scripts?.serve) {
      packageFile.scripts['ionic:serve'] = 'npm run serve';
    } else if (packageFile.scripts?.start) {
      packageFile.scripts['ionic:serve'] = 'npm run start';
    }
    fs.writeFileSync(filename, JSON.stringify(packageFile, undefined, 2));
    addIonicConfigCapacitor(folder);
    channel.appendLine('[Ionic] Created Ionic Project');
    return true;
  } catch (err) {
    channel.appendLine('[Ionic] Unable to create Ionic project:' + err);
    return false;
  }
}

function addIonicConfigCapacitor(folder: string) {
  // This will add capacitor to integrations object of ionic.config.json
  // "capacitor": {}
  try {
    const filename = path.join(folder, 'ionic.config.json');
    if (fs.existsSync(filename)) {
      const ionicConfig = JSON.parse(fs.readFileSync(filename, 'utf8'));
      ionicConfig.integrations.capacitor = new Object();
      fs.writeFileSync(filename, JSON.stringify(ionicConfig, undefined, 2));
    }
  } catch {
    // Just continue
  }
}
