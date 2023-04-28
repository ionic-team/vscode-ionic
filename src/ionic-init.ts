import * as fs from 'fs';
import * as path from 'path';

// The project is non-ionic:
// Run ionic init using the project name of the package.json and type of custom
// Create ionic:build if there is a build script

import { getRunOutput } from './utilities';
import { write, writeError, writeIonic } from './logging';

// Create ionic:serve if there is a serve script
export async function ionicInit(folder: string): Promise<boolean> {
  write('[Ionic] Creating Ionic project...');
  try {
    const filename = path.join(folder, 'package.json');
    const packageFile = JSON.parse(fs.readFileSync(filename, 'utf8'));
    verifyValidPackageJson(filename, packageFile);
    const name = packageFile.name;

    const cfg = path.join(folder, 'ionic.config.json');
    if (!fs.existsSync(cfg)) {
      const result = await getRunOutput(`npx ionic init "${name}" --type=custom`, folder);
    }
    if (packageFile.scripts?.build) {
      packageFile.scripts['ionic:build'] = 'npm run build';
    }

    // Typical for Vite
    if (packageFile.scripts?.dev) {
      packageFile.scripts['ionic:serve'] = 'npm run dev';
    }

    if (packageFile.scripts?.serve) {
      packageFile.scripts['ionic:serve'] = 'npm run serve';
    } else if (packageFile.scripts?.start) {
      packageFile.scripts['ionic:serve'] = 'npm run start';
    }
    fs.writeFileSync(filename, JSON.stringify(packageFile, undefined, 2));
    addIonicConfigCapacitor(folder);
    writeIonic('Created Ionic Project');
    return true;
  } catch (err) {
    writeError('Unable to create Ionic project:' + err);
    return false;
  }
}

/**
 * This will force package.json to have a name and version. Without this Ionic CLI will call the package.json malformed
 * @param  {string} filename
 * @param  {any} packages
 */
function verifyValidPackageJson(filename: string, packages: any) {
  if (!packages.name) {
    packages.name = 'my-app';
    fs.writeFileSync(filename, JSON.stringify(packages, null, 2));
  }
  if (!packages.version) {
    packages.version = '0.0.0';
    fs.writeFileSync(filename, JSON.stringify(packages, null, 2));
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
