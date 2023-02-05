import { join } from 'path';
import * as vscode from 'vscode';
import { cancelLastOperation } from './extension';
import { ionicState } from './ionic-tree-provider';
import { debugSkipFiles, openUri } from './utilities';

interface device {
  name: string;
  width: number;
  height: number;
  type: string;
}

let qrPanel: vscode.WebviewPanel;

const devices: Array<device> = [
  { name: 'iPhone SE', width: 375, height: 667, type: 'ios' },
  { name: 'iPhone XR', width: 414, height: 896, type: 'ios' },
  { name: 'iPhone 12 Pro', width: 390, height: 844, type: 'ios' },
  { name: 'iPad Air', width: 820, height: 1180, type: 'ios' },
  { name: 'iPad Mini', width: 768, height: 1024, type: 'ios' },
  { name: 'Pixel 3', width: 393, height: 786, type: 'android' },
  { name: 'Pixel 5', width: 393, height: 851, type: 'android' },
  { name: 'Samsung Galaxy S8+', width: 360, height: 740, type: 'android' },
  { name: 'Samsung Galaxy S20 Ultra', width: 412, height: 915, type: 'android' },
  { name: 'Samsung Galaxy Tab S4', width: 712, height: 1138, type: 'android' },
];

export function viewInEditor(url: string, active?: boolean) {
  const panel = vscode.window.createWebviewPanel(
    'viewApp',
    'Preview',
    active ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside,
    {
      enableScripts: true,
    }
  );

  panel.webview.html = getWebviewContent(url);

  panel.webview.onDidReceiveMessage(async (message) => {
    const device = await selectMockDevice();
    panel.title = device.name;
    panel.webview.postMessage(device);
  });
}

export function closeWelcomePanel() {
  // If the panel already exists close and reopen
  if (qrPanel) {
    qrPanel.dispose();
  }
}

export function viewAsQR(localUrl: string, externalUrl: string) {
  // If the panel already exists close and reopen
  closeWelcomePanel();

  const panel = vscode.window.createWebviewPanel('viewApp', 'Ionic', vscode.ViewColumn.Active, {
    enableScripts: true,
  });

  const onDiskPath = vscode.Uri.file(join(ionicState.context.extensionPath, 'resources', 'qrious.min.js'));
  const qrSrc = panel.webview.asWebviewUri(onDiskPath);
  panel.webview.html = getWebviewQR(localUrl, externalUrl, qrSrc);

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message) {
      case 'editor':
        viewInEditor(localUrl, true);
        break;
      case 'debug':
        debugBrowser(localUrl, false);
        break;
      case 'browser':
        openUri(localUrl);
        break;
      case 'stop':
        stop(panel);
        break;
      default:
        vscode.window.showInformationMessage(message);
    }
  });
  qrPanel = panel;
}

async function stop(panel: vscode.WebviewPanel) {
  await cancelLastOperation();
  panel.dispose();
}

export function getDebugBrowserName(): string {
  const browser = vscode.workspace.getConfiguration('ionic').get('browser') as string;
  if (browser == 'pwa-msedge') return 'Microsoft Edge';
  if (browser == 'chrome') return 'Google Chrome';
  return browser;
}

export async function debugBrowser(url: string, stopWebServerAfter: boolean) {
  try {
    const browserType: string = vscode.workspace.getConfiguration('ionic').get('browser');
    const launchConfig: vscode.DebugConfiguration = {
      type: browserType,
      name: 'Debug Web',
      request: 'launch',
      url: url,
      webRoot: '${workspaceFolder}',
      skipFiles: debugSkipFiles(),
    };

    vscode.debug.onDidTerminateDebugSession(async (e) => {
      if (stopWebServerAfter) {
        // This stops the dev server
        await cancelLastOperation();
        // Switch back to Ionic View
        ionicState.view.reveal(undefined, { focus: true });
      }
    });

    await vscode.debug.startDebugging(undefined, launchConfig);
  } catch {
    //
  }
}

async function selectMockDevice(): Promise<device> {
  const selected = await vscode.window.showQuickPick(
    devices.map((device) => `${device.name} (${device.width} x ${device.height})`),
    { placeHolder: 'Select Emulated Device' }
  );
  if (!selected) return;
  return devices.find((device) => selected.startsWith(device.name));
}

function getWebviewQR(localUrl: string, externalUrl: string, qrSrc: vscode.Uri): string {
  const shortUrl = externalUrl.replace('https://', '').replace('http://', '');
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
    width: 100%;
    padding: 50px;
    display: flex;
    flex-direction: row;
  }
  .row {
    min-width: 280px;
    width: 280px;
    margin-right: 20px;
  }
  a {
    cursor: pointer;
  }
  </style>
  <body>
    <div class="container">
       <div class="row">
          <h2>Start</h2>
          <a onclick="action('browser')"><p>Open in Browser</p></a>
          <a onclick="action('editor')"><p>Open in Editor</p></a>
          <a onclick="action('debug')"><p>Debug in Browser</p></a>
          <a onclick="action('stop')"><p>Stop Web Server</p></a>
       </div>
       <div class="row">
          <h2>Preview</h2>
          <p>Scan this QR Code in the Capacitor Preview app or the Camera app of your phone.</p>
          <canvas id="qr"></canvas>
          <p>${shortUrl}</p>
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

function getWebviewContent(url: string): string {
  return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Preview App</title>
	</head>
	<script>
	const vscode = acquireVsCodeApi();
	const baseUrl = '${url}';

	window.addEventListener('message', event => {
		const device = event.data;		
		let newurl = baseUrl;
		if (device.type == 'ios') { newurl += '?ionic:mode=ios'; }
		document.getElementById('frame').src = newurl;
		document.getElementById('devFrame').style.width = device.width + 'px';
		document.getElementById('devFrame').style.height = (device.height + 50) + 'px';
		document.getElementById('frameContainer').style.height = device.height + 'px';
		console.log(device);
	});
	
	function change() {
	    vscode.postMessage({url: document.getElementById('frame').src});
	}
	</script>
	<body style="display: flex; align-items: center; justify-content: center; margin-top:20px;">
		<div id="devFrame" style="width: 375px; height: 717px; border: 2px solid #333; border-radius:10px; padding:10px; display: flex; align-items: center; flex-direction: column;">		   
		   <div id="frameContainer" style="width: 100%; height: 667px;">
		        <div onclick="change()"  style="border: 2px solid #333; width:5px; height: 70px; cursor: pointer; margin-top:20px; margin-left:-19px; position: absolute"></div>
				<iframe id="frame" src="${url}" width="100%" height="100%" frameBorder="0"></iframe>
		   </div>
		  <div style="width: 100%; height: 50px; display: flex; align-items: center; justify-content: space-between;">
      <div style="cursor: pointer; height: 25px; width:25px; padding:5px" onclick="history.back()"><svg viewBox="0 0 512 512"><path fill="none" stroke="#333" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M244 400L100 256l144-144M120 256h292"/></svg></div>
			<div style="background-color: #333; cursor: pointer; height: 25px; width:25px; border-radius:30px; padding:5px" onclick="document.getElementById('frame').src = '${url}'"></div>
      <div style="cursor: pointer; height: 25px; width:25px; padding:5px" onclick="change()"><svg fill="#333" viewBox="0 0 512 512"><circle cx="256" cy="256" r="48"/><circle cx="416" cy="256" r="48"/><circle cx="96" cy="256" r="48"/></svg></div>
      
		  </div>  
		 </div>
	</body>
	</html>`;
}
