import * as vscode from "vscode";

// The debug provider type for VS Code
export const AndroidDebugType = "android-web";

export function debugAndroid(packageName: string) {
	vscode.debug.startDebugging(undefined, {
		type: AndroidDebugType,
		name: 'Debug Android',
		request: 'attach',
		packageName: packageName,
		webRoot: '${workspaceFolder}'
	});
}
