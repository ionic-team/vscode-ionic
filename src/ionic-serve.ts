import { existsSync, readFileSync } from 'fs';
import { networkInterfaces } from 'os';

import { getConfigurationArgs } from './build-configuration';
import { InternalCommand } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { certPath } from './live-reload';
import { FrameworkType, MonoRepoType } from './monorepo';
import { npmRun, npx, preflightNPMCheck } from './node-commands';
import { Project } from './project';
import { liveReloadSSL } from './live-reload';
import { ExtensionSetting, getExtSetting, getSetting, setSetting, WorkspaceSetting } from './workspace-state';
import { getWebConfiguration, WebConfigSetting } from './web-configuration';
import { window, workspace } from 'vscode';
import { write, writeError } from './logging';
import { createServer } from 'http';
import { join } from 'path';

/**
 * Create the ionic serve command
 * @returns string
 */
export async function ionicServe(project: Project, dontOpenBrowser: boolean): Promise<string> {
  ionicState.lastRun = undefined;
  switch (project.repoType) {
    case MonoRepoType.none:
      return ionicCLIServe(project, dontOpenBrowser);
    case MonoRepoType.nx:
      return nxServe(project);
    case MonoRepoType.npm:
    case MonoRepoType.yarn:
    case MonoRepoType.lerna:
    case MonoRepoType.pnpm:
    case MonoRepoType.folder:
      return InternalCommand.cwd + (await ionicCLIServe(project, dontOpenBrowser));
    default:
      throw new Error('Unsupported Monorepo type');
  }
}

async function ionicCLIServe(project: Project, dontOpenBrowser: boolean): Promise<string> {
  const preop = preflightNPMCheck(project);
  const httpsForWeb = getSetting(WorkspaceSetting.httpsForWeb);
  const webConfig: WebConfigSetting = getWebConfiguration();
  const externalIP = !getExtSetting(ExtensionSetting.internalAddress);
  const defaultPort: number | undefined = workspace.getConfiguration('ionic').get('defaultPort');
  let serveFlags = '';
  if (webConfig == WebConfigSetting.editor || webConfig == WebConfigSetting.welcomeNoBrowser || dontOpenBrowser) {
    serveFlags += ' --no-open';
  } else {
    serveFlags += ' --open';
  }

  if (externalIP) {
    serveFlags += ` ${externalArg(project.frameworkType)}`;
  } else {
    serveFlags += ` ${internalArg(project.frameworkType)}`;
  }

  if (defaultPort) {
    const port = await findNextPort(defaultPort);
    serveFlags += ` --port=${port}`;
  }

  if (ionicState.project) {
    serveFlags += ` --project=${ionicState.project}`;
  }

  serveFlags += getConfigurationArgs(dontOpenBrowser);

  if (httpsForWeb) {
    serveFlags += ' --ssl';
    if (!existsSync(certPath('crt'))) {
      liveReloadSSL(project);
      return '';
    }
    serveFlags += ` --ssl-cert='${certPath('crt')}'`;
    serveFlags += ` --ssl-key='${certPath('key')}'`;
  }

  return `${preop}${npx(project.packageManager)} ${serveCmd(project)}${serveFlags}`;
}

function serveCmd(project: Project): string {
  switch (project.frameworkType) {
    case 'angular':
    case 'angular-standalone':
      return 'ng serve';
    case 'vue-vite':
    case 'react-vite':
      return 'vite';
    case 'react':
      return 'react-scripts start';
    case 'vue':
      return 'vue-cli-service serve';
    default: {
      const cmd = guessServeCommand(project);
      if (cmd) {
        return cmd;
      }
      writeError(`serve command is not know for this project type`);
    }
  }
}

function guessServeCommand(project: Project): string | undefined {
  const filename = join(project.projectFolder(), 'package.json');
  if (existsSync(filename)) {
    const packageFile = JSON.parse(readFileSync(filename, 'utf8'));
    if (packageFile.scripts['ionic:serve']) {
      return npmRun('ionic:serve');
    }
    if (packageFile.scripts?.serve) {
      return npmRun('serve');
    }
  }
  return undefined;
}
async function findNextPort(port: number): Promise<number> {
  let availablePort = port;
  while (await isPortInUse(availablePort)) {
    write(`Port ${availablePort} is in use.`);
    availablePort++;
  }
  return availablePort;
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port is currently in use
        resolve(true);
      } else {
        // Other error occurred
        resolve(false);
      }
    });

    server.once('listening', () => {
      // Close the server if listening doesn't fail
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

function internalArg(framework: FrameworkType): string {
  switch (framework) {
    case 'angular-standalone':
      return '';
    default:
      return '--host=localhost';
  }
}

function externalArg(framework: FrameworkType): string {
  switch (framework) {
    case 'angular-standalone':
      return '--host=0.0.0.0';
    default:
      return '--host=0.0.0.0';
  }
}

function nxServe(project: Project): string {
  let serveFlags = '';
  const externalIP = !getExtSetting(ExtensionSetting.internalAddress);
  if (externalIP) {
    const list = getAddresses();
    if (list.length == 1) {
      serveFlags += ` --host=${list[0]}`;
    } else {
      serveFlags += ' --host=0.0.0.0';
    }
  }
  return `${npx(project.packageManager)} nx serve ${project.monoRepo.name}${serveFlags}`;
}

export async function selectExternalIPAddress(): Promise<string> {
  const liveReload = getSetting(WorkspaceSetting.liveReload);
  const externalIP = !getExtSetting(ExtensionSetting.internalAddress);
  if (!externalIP && !liveReload) {
    return;
  }
  const list = getAddresses();
  if (list.length <= 1) {
    return;
  }
  const lastIPAddress = getSetting(WorkspaceSetting.lastIPAddress);
  for (const address of list) {
    if (address == lastIPAddress) {
      return lastIPAddress;
    }
  }
  const selected = await window.showQuickPick(list, {
    placeHolder: 'Select the external network address to use',
  });
  if (selected) {
    setSetting(WorkspaceSetting.lastIPAddress, selected);
  }
  return selected;
}

function getAddresses(): Array<string> {
  const nets = networkInterfaces();
  const result = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // Skip over link-local addresses (same as Ionic CLI)
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        result.push(net.address);
      }
    }
  }
  return result;
}
