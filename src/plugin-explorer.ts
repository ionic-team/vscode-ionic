import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn } from 'vscode';
import { PluginSummary } from './plugin-summary';
import { httpRequest } from './utilities';
import { writeIonic } from './extension';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { npmInstall } from './node-commands';
import { ionicState } from './ionic-tree-provider';
import { getOutputChannel } from './extension';
import { run } from './utilities';

export class PluginExplorerPanel {
  public static currentPanel: PluginExplorerPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];

  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
    this._setWebviewMessageListener(this._panel.webview, extensionUri);
  }

  public static render(extensionUri: Uri) {
    if (PluginExplorerPanel.currentPanel) {
      // If the webview panel already exists reveal it
      PluginExplorerPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        'pluginExplorer',
        // Panel title
        'Plugins',
        // The editor column the panel should be displayed in
        ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `plugin-explorer/build` directories
          localResourceRoots: [
            Uri.joinPath(extensionUri, 'out'),
            Uri.joinPath(extensionUri, 'plugin-explorer', 'build'),
          ],
        }
      );

      PluginExplorerPanel.currentPanel = new PluginExplorerPanel(panel, extensionUri);
    }
  }

  public dispose() {
    PluginExplorerPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
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

  private _setWebviewMessageListener(webview: Webview, extensionUri: Uri) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        const text = message.text;
        writeIonic(`Plugin Explorer: ${command}`);
        switch (command) {
          case 'install': {
            // Code that should run in response to the hello message command
            this.install(text);
            break;
          }
          case 'getPlugins': {
            const uri = await fetchPluginData(webview, extensionUri);
            webview.postMessage({ command, uri: `${uri}` });
            break;
          }
        }
      },
      undefined,
      this._disposables
    );
  }

  async install(plugin: string) {
    this.dispose();
    const channel = getOutputChannel();
    const cmd = npmInstall(plugin);
    channel.clear();
    channel.appendLine(`> ${cmd}`);
    await run(ionicState.rootFolder, cmd, channel, undefined, [], [], undefined, undefined, undefined, false);
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

async function fetchPluginData(webview: Webview, extensionUri: Uri): Promise<Uri> {
  const path = join(extensionUri.fsPath, 'plugin-explorer', 'build', 'plugins.json');
  if (!existsSync(path)) {
    //const url = `https://webnative-plugins.netlify.app/detailed-plugins.json`;
    const json = (await httpRequest('GET', 'webnative-plugins.netlify.app', '/detailed-plugins.json')) as PluginSummary;
    writeIonic(`Read ${json.plugins.length} plugins.`);
    writeFileSync(path, JSON.stringify(json));
  }
  return getUri(webview, extensionUri, ['plugin-explorer', 'build', 'plugins.json']);
}
