import * as vscode from 'vscode';
import { ionicState } from './ionic-tree-provider';

interface device {
  name: string;
  width: number;
  height: number;
  type: string;
}

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

export function viewInEditor(url: string) {
  const previewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
  if (!previewInEditor) {
    return;
  }

  const panel = vscode.window.createWebviewPanel('viewApp', 'Preview', vscode.ViewColumn.Beside, {
    enableScripts: true,
  });

  panel.webview.html = getWebviewContent(url);

  panel.webview.onDidReceiveMessage(async (message) => {
    const device = await selectMockDevice();
    panel.webview.postMessage(device);
  });
}

export function getDebugBrowserName(): string {
  const browser = vscode.workspace.getConfiguration('ionic').get('browser') as string;
  if (browser == 'pwa-msedge') return 'Microsoft Edge';
  if (browser == 'chrome') return 'Google Chrome';
  return browser;
}

export function debugBrowser(url: string) {
  try {
    const browserType: string = vscode.workspace.getConfiguration('ionic').get('browser');
    const launchConfig: vscode.DebugConfiguration = {
      type: browserType,
      name: 'Debug Web',
      request: 'launch',
      url: url,
      webRoot: '${workspaceFolder}',
    };
    vscode.debug.startDebugging(undefined, launchConfig);
  } catch {
    //
  }
}

async function selectMockDevice(): Promise<device> {
  const selected = await vscode.window.showQuickPick(
    devices.map((device) => `${device.name} (${device.width} x ${device.height})`),
    { placeHolder: 'Select Emulated Device' }
  );
  return devices.find((device) => selected.startsWith(device.name));
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
		console.log(newurl);
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
		  <div style="width: 100%; height: 50px; display: flex; align-items: center; justify-content: center;">
			<div style="background-color: #333; cursor: pointer; height: 25px; width:25px; border-radius:30px; padding:5px" onclick="document.getElementById('frame').src = '${url}'"></div>
		  </div>  
		 </div>
	</body>
	</html>`;
}
