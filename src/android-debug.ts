import * as vscode from 'vscode';
import { startSourceMapServer } from './source-map-server';

// The debug provider type for VS Code
export const AndroidDebugType = 'android-web';

export function debugAndroid(packageName: string, wwwFolder: string) {
  // Source maps are required for debugging. These are loaded from where the app is
  // loaded (eg http://localhost) so we're running a source map server to deliver them
  // An alternative includes inlining the source maps.

  // Inlining source maps:
  // https://github.com/ionic-team/ionic-framework/issues/16455#issuecomment-505397373

  // Solution: https://ionic.zendesk.com/hc/en-us/articles/5177027959319

  // See this location for options for debugging that are supported
  // https://github.com/microsoft/vscode-js-debug/blob/main/OPTIONS.md#pwa-chrome-attach

  // Note: options here include sourceMapPathOverrides and resolveSourceMapLocations both dont fix the
  // problem with source maps not being accessible to the debugger
  vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], {
    type: AndroidDebugType,
    name: 'Debug Android',
    request: 'attach',
    packageName: packageName,
    webRoot: '${workspaceFolder}',
  });

  startSourceMapServer(wwwFolder);
}
