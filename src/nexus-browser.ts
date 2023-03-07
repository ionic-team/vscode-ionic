import * as vscode from 'vscode';
import { commands } from 'vscode';
import { Context, VSCommand } from './context-variables';
import { CommandName } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { join } from 'path';
import { debugBrowser, viewInEditor } from './editor-preview';
import { httpRequest, openUri } from './utilities';
import { getOutputChannel, writeError, writeIonic, writeWarning } from './extension';
import { inspectProject, ProjectSummary } from './project';
import { PackageInfo } from './package-info';
import { getSetting, setSetting, WorkspaceSetting } from './workspace-state';

export function qrView(externalUrl: string) {
  commands.executeCommand(VSCommand.setContext, Context.isDevServing, true);
  commands.executeCommand(CommandName.ViewDevServer, externalUrl);
}

export function qrWebView(webview: vscode.Webview, externalUrl: string): string | undefined {
  const onDiskPath = vscode.Uri.file(join(ionicState.context.extensionPath, 'resources', 'qrious.min.js'));
  webview.options = { enableScripts: true };
  const qrSrc = webview.asWebviewUri(onDiskPath);
  if (getSetting(WorkspaceSetting.pluginDrift) !== 'shown') {
    troubleshootPlugins();
  }
  if (!externalUrl) {
    webview.html = '';
    return undefined;
  }
  const shortUrl = externalUrl?.replace('https://', '').replace('http://', '');
  webview.html = getWebviewQR(shortUrl, externalUrl, qrSrc);
  webview.onDidReceiveMessage(async (message) => {
    switch (message) {
      case 'troubleshoot':
        troubleshootPlugins();
        break;
      case 'editor':
        viewInEditor(externalUrl, false);
        break;
      case 'debug':
        debugBrowser(externalUrl, false);
        break;
      case 'browser':
        openUri(externalUrl);
        break;
      case 'stop':
        //stop(panel);
        break;
      default:
        vscode.window.showInformationMessage(message);
    }
  });
  return shortUrl;
}

export async function troubleshootPlugins() {
  try {
    // Download https://nexusbrowser.com/assets/app-data.json which is the list of plugins included in nexus browser app
    const data = (await httpRequest('GET', 'nexusbrowser.com', '/assets/app-data.json')) as Plugins;
    const versions = {};
    // These plugins wont matter if they are not in the Nexus Browser
    const unimportant = ['cordova-plugin-ionic'];
    for (const plugin of data.plugins) {
      versions[plugin.name] = plugin.version;
    }
    let problems = 0;
    let problem = '';
    const pluginList = [];
    const channel = getOutputChannel();

    const summary: ProjectSummary = await inspectProject(ionicState.rootFolder, ionicState.context, undefined);
    for (const libType of ['Capacitor Plugin', 'Plugin']) {
      for (const library of Object.keys(summary.packages).sort()) {
        const pkg: PackageInfo = summary.packages[library];
        if (pkg.depType == libType) {
          if (versions[library]) {
            if (versions[library] != pkg.version) {
              channel.appendLine(
                `Your project has ${versions[library]}${library} but Nexus Browser has ${pkg.version}`
              );
            }
          } else if (!unimportant.includes(library)) {
            pluginList.push(library);
            problem = library;
            problems++;
          }
        }
      }
    }
    if (problems == 1) {
      vscode.window.showWarningMessage(
        `Your project uses the plugin ${problem} which is not in the Nexus Browser app, so you may have issues related to its functionality.`,
        'Dismiss'
      );
    } else if (problems > 0) {
      writeWarning(
        `Nexus Browser does not have the following plugins: ${pluginList.join(
          ', '
        )}. You can suggest adding one of these plugins here: https://github.com/ionic-team/vscode-extension/issues/91`
      );
      vscode.window.showWarningMessage(
        `Your project has ${problems} plugins that are not in the Nexus Browser app, so you may have issues related to functionality that relies on those plugins.`,
        'Dismiss'
      );
    }
  } catch (err) {
    writeError(err);
  } finally {
    setSetting(WorkspaceSetting.pluginDrift, 'shown');
  }
}

function getWebviewQR(shortUrl: string, externalUrl: string, qrSrc: vscode.Uri): string {
  externalUrl = `https://nexusbrowser.com/` + encodeURIComponent(shortUrl);
  return `
	<!DOCTYPE html>
	<html>
	<script src="${qrSrc}"></script>
	<script>
	  const vscode = acquireVsCodeApi();
	  function action(msg) {
		  vscode.postMessage(msg);
		}
	</script>
	<style>
	.container {
	  padding-top: 20px;
	  width: 100%;    
	  display: flex;
	  flex-direction: column;
	}
	p { 
	  text-align: center;
	  line-height: 1.5;
	}
	i { 
	  opacity: 0.5; 
	  font-style: normal; }
	.row {
	  //min-width: 280px;
	  width: 100%;//280px;
	  margin-right: 20px;
	  text-align: center; 
	}
	a {
	  cursor: pointer;
	}
	</style>
	<body>
	  <div class="container">
		 <div class="row">          
			<canvas id="qr"></canvas>          
			<p>Use <a href="https://capacitor.nexusbrowser.com">Nexus Browser</a> to test your app which is running at <i>${shortUrl}</i> <a onclick="action('troubleshoot')"><sup>•</sup></a></p>
		 </div>
	  </div>    
	  <script>
	  const qr = new QRious({
		background: 'transparent',
		foreground: '#888',
		element: document.getElementById('qr'),
		size: 150,
		value: '${externalUrl}'
	  });
	  </script>
	</body>
	</html>
	`;
}

interface Plugins {
  plugins: Plugin[];
}
interface Plugin {
  name: string;
  version: string;
}
