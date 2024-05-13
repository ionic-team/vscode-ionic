import { Uri, Webview, commands, window } from 'vscode';
import { Context, VSCommand } from './context-variables';
import { CommandName } from './command-name';
import { ionicState } from './ionic-tree-provider';
import { join } from 'path';
import { debugBrowser, viewInEditor } from './editor-preview';
import { httpRequest, openUri } from './utilities';
import { write, writeError, writeWarning } from './logging';
import { inspectProject, ProjectSummary } from './project';
import { PackageInfo } from './package-info';
import { getSetting, setSetting, WorkspaceSetting } from './workspace-state';
import { coerce } from 'semver';

export function qrView(externalUrl: string) {
  commands.executeCommand(VSCommand.setContext, Context.isDevServing, true);
  commands.executeCommand(CommandName.ViewDevServer, externalUrl);
}

export function qrWebView(webview: Webview, externalUrl: string): string | undefined {
  const onDiskPath = Uri.file(join(ionicState.context.extensionPath, 'resources', 'qrious.min.js'));
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
        window.showInformationMessage(message);
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

    const summary: ProjectSummary = await inspectProject(ionicState.rootFolder, ionicState.context, undefined);
    for (const libType of ['Capacitor Plugin', 'Plugin']) {
      for (const library of Object.keys(summary.packages).sort()) {
        const pkg: PackageInfo = summary.packages[library];
        if (pkg.depType == libType) {
          if (versions[library]) {
            if (versions[library] != pkg.version) {
              const projectv = coerce(pkg.version);
              const browserv = coerce(versions[library]);
              if (projectv.major != browserv.major) {
                writeWarning(
                  `Your project has v${pkg.version} of ${library} but Nexus Browser has v${versions[library]}`,
                );
              } else {
                write(
                  `[info] Your project has v${pkg.version} of ${library} but Nexus Browser has v${versions[library]}`,
                );
              }
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
      window.showWarningMessage(
        `Your project uses the plugin ${problem} which is not in the Nexus Browser app, so you may have issues related to its functionality.`,
        'Dismiss',
      );
    } else if (problems > 0) {
      writeWarning(
        `Your project has these plugins: ${pluginList.join(
          ', ',
        )} but Nexus Browser does not. You can suggest adding these here: https://github.com/ionic-team/vscode-ionic/issues/91`,
      );
      window.showWarningMessage(
        `Your project has ${problems} plugins that are not in the Nexus Browser app, so you may have issues related to functionality that relies on those plugins.`,
        'Dismiss',
      );
    }
  } catch (err) {
    writeError(err);
  } finally {
    setSetting(WorkspaceSetting.pluginDrift, 'shown');
  }
}

function getWebviewQR(shortUrl: string, externalUrl: string, qrSrc: Uri): string {
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
