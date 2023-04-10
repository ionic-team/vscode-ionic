import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn, ExtensionContext } from 'vscode';
import { PluginSummary } from './plugin-summary';
import { httpRequest, showProgress } from './utilities';
import { existsSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { npmInstall, npmUninstall } from './node-commands';
import { getOutputChannel } from './extension';
import { run } from './utilities';
import { ProjectSummary, inspectProject } from './project';
import { PackageInfo } from './package-info';

interface Dependency {
  name: string;
  version: string;
}

enum MessageType {
  getPlugins = 'getPlugins',
  getInstalledDeps = 'getInstalledDeps',
  install = 'install',
  uninstall = 'uninstall',
}

export class PluginExplorerPanel {
  public static currentPanel: PluginExplorerPanel | undefined;
  private readonly panel: WebviewPanel;
  private disposables: Disposable[] = [];
  private path: string;

  private constructor(panel: WebviewPanel, extensionUri: Uri, path: string, context: ExtensionContext) {
    this.panel = panel;
    this.path = path;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.html = this.getWebviewContent(this.panel.webview, extensionUri);
    this.setWebviewMessageListener(this.panel.webview, extensionUri, path, context);
  }

  public static init(extensionUri: Uri, path: string, context: ExtensionContext) {
    if (PluginExplorerPanel.currentPanel) {
      // If the webview panel already exists reveal it
      PluginExplorerPanel.currentPanel.panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        'pluginExplorer',
        // Panel title
        'Plugins',
        ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            Uri.joinPath(extensionUri, 'out'),
            Uri.joinPath(extensionUri, 'plugin-explorer', 'build'),
          ],
        }
      );

      PluginExplorerPanel.currentPanel = new PluginExplorerPanel(panel, extensionUri, path, context);
    }
  }

  public dispose() {
    PluginExplorerPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private getWebviewContent(webview: Webview, extensionUri: Uri) {
    const stylesUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'styles.css']);
    const runtimeUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'runtime.js']);
    const polyfillsUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'polyfills.js']);
    const scriptUri = getUri(webview, extensionUri, ['plugin-explorer', 'build', 'main.js']);

    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <!--<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">-->
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Plugins</title>
        </head>
        <body>
          <app-root></app-root>
          <script type="module" nonce="${nonce}" src="${runtimeUri}"></script>
          <script type="module" nonce="${nonce}" src="${polyfillsUri}"></script>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  private setWebviewMessageListener(webview: Webview, extensionUri: Uri, path: string, context: ExtensionContext) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        const text = message.text;
        switch (command) {
          case MessageType.install: {
            // Code that should run in response to the hello message command
            this.install(text);
            break;
          }
          case MessageType.uninstall: {
            this.uninstall(text);
            break;
          }
          case MessageType.getInstalledDeps: {
            const list = await getInstalledDeps(path, context);
            webview.postMessage({ command, list });
            break;
          }
          case MessageType.getPlugins: {
            const list = await getInstalledDeps(path, context);
            webview.postMessage({ command: MessageType.getInstalledDeps, list });
            const uri = await fetchPluginData(webview, extensionUri);
            webview.postMessage({ command, uri: `${uri}` });
            break;
          }
        }
      },
      undefined,
      this.disposables
    );
  }

  async install(plugin: string) {
    this.dispose();
    const channel = getOutputChannel();
    const cmd = npmInstall(plugin);
    await showProgress(`Installing ${plugin}`, async () => {
      channel.clear();
      channel.appendLine(`> ${cmd}`);
      await run(this.path, cmd, channel, undefined, [], [], undefined, undefined, undefined, false);
    });
  }

  async uninstall(plugin: string) {
    this.dispose();
    const channel = getOutputChannel();
    const cmd = npmUninstall(plugin);
    await showProgress(`Uninstalling ${plugin}`, async () => {
      channel.clear();
      channel.appendLine(`> ${cmd}`);
      await run(this.path, cmd, channel, undefined, [], [], undefined, undefined, undefined, false);
    });
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

async function getInstalledDeps(path: string, context: ExtensionContext): Promise<Dependency[]> {
  const summary: ProjectSummary = await inspectProject(path, context, undefined);
  const dependencies: Dependency[] = [];
  for (const libType of ['Capacitor Plugin', 'Plugin']) {
    for (const library of Object.keys(summary.packages).sort()) {
      const pkg: PackageInfo = summary.packages[library];
      if (pkg.depType == libType) {
        dependencies.push({ name: library, version: pkg.version });
      }
    }
  }
  return dependencies;
}

async function fetchPluginData(webview: Webview, extensionUri: Uri): Promise<Uri> {
  const path = join(extensionUri.fsPath, 'plugin-explorer', 'build', 'plugins.json');

  // Download plugin data again if we havent before or its been 24 hours
  if (!existsSync(path) || ageInHours(path) > 24) {
    //const url = `https://webnative-plugins.netlify.app/detailed-plugins.json`;
    const json = (await httpRequest('GET', 'webnative-plugins.netlify.app', '/detailed-plugins.json')) as PluginSummary;
    writeFileSync(path, JSON.stringify(json));
  }
  return getUri(webview, extensionUri, ['plugin-explorer', 'build', 'plugins.json']);
}

function ageInHours(path: string): number {
  const info = statSync(path);
  const d = new Date(info.mtime);
  const n = new Date();
  return (n.getTime() - d.getTime()) / 3600000;
}
