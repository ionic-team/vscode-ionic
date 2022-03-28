import * as vscode from 'vscode';

import { findDevices, findWebViews, forwardDebugger, verifyAndroidDebugBridge } from './android-debug-bridge';
import { Device, WebView } from './android-debug-models';

export class AndroidDebugProvider implements vscode.DebugConfigurationProvider {
    public async resolveDebugConfiguration?(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration | null | undefined> {
        if (!debugConfiguration.type || !debugConfiguration.request || debugConfiguration.request !== "attach") {
            return null;
        }

        debugConfiguration.type = "pwa-chrome";

        await verifyAndroidDebugBridge();

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Window
        }, async (progress) => {
            let device: Device | undefined;
            let webView: WebView | undefined;

            progress.report({ message: "Connecting" });

            // Find the connected devices
            const devices = await findDevices();
            if (devices.length < 1) {
                vscode.window.showErrorMessage(`No devices found`);
                return undefined;
            }

            if (debugConfiguration.packageName) {
                const webViews = await withTimeoutRetries(debugConfiguration.connectTimeout ?? 0, 500, async () => {
                    // Find all devices that have the application running
                    const promises = devices.map(async (dev) => {
                        const webViews = await findWebViews(dev).catch((err: Error): WebView[] => {
                            vscode.window.showWarningMessage(err.message);
                            return [];
                        });
                        return webViews.find((el) => el.packageName === debugConfiguration.packageName);
                    });
                    const result = await Promise.all(promises);

                    const filtered = result.filter((el) => el ? true : false) as WebView[];
                    if (filtered.length < 1) {
                        return undefined;
                    }

                    return filtered;
                });

                if (!webViews || webViews.length < 1) {
                    vscode.window.showErrorMessage(`Webview is not running on a device`);
                    return undefined;
                }

                if (webViews.length === 1) {
                    device = webViews[0].device;
                    webView = webViews[0];
                } else {
                    return undefined;
                }
            } else {
                return undefined;
            }


            if (!webView) {
                const webViews = await withTimeoutRetries(debugConfiguration.connectTimeout ?? 1000, 1000, async () => {
                    // Find the running applications
                    const webViews = await findWebViews(device!);
                    if (webViews.length < 1) {
                        return undefined;
                    }

                    if (debugConfiguration.packageName) {
                        // Try to find the configured application
                        const filtered = webViews.filter((el) => el.packageName === debugConfiguration.packageName);
                        if (filtered.length < 1) {
                            return undefined;
                        }

                        return filtered;
                    } else {
                        return webViews;
                    }
                });

                if (!webViews || webViews.length < 1) {
                    vscode.window.showErrorMessage(`WebView not found`);
                    return undefined;
                }
                return undefined;
            }

            // Forward to the local port
            debugConfiguration.port = await forwardDebugger(webView, debugConfiguration.port);
            debugConfiguration.browserAttachLocation = "workspace";
            return debugConfiguration;
        });
    }
}

function withTimeoutRetries<T>(timeout: number, interval: number, func: () => Promise<T>): Promise<T> {
    const startTime = new Date().valueOf();
    const run = async (): Promise<T> => {
        const result = await func();
        if (result || startTime + timeout <= new Date().valueOf()) {
            return result;
        }

        await new Promise((resolve) => setTimeout(resolve, interval));

        return run();
    };
    return run();
}

async function findTask(name: string): Promise<vscode.Task | undefined> {
    const tasks = await vscode.tasks.fetchTasks();
    return tasks.find((task) => task.name === name);
}

async function executeTask(task: vscode.Task): Promise<boolean> {
    const activeTask = vscode.tasks.taskExecutions.find((t) => t.task.name === task.name);
    if (activeTask && activeTask.task.isBackground) {
        return true;
    }

    return new Promise((resolve, reject) => {
        let execution: vscode.TaskExecution | undefined;
        vscode.tasks.executeTask(task).then((exec) => {
            execution = exec;
        });

        if (task.isBackground) {
            resolve(true);
        } else {
            const endEvent = vscode.tasks.onDidEndTask((e) => {
                if (e.execution === execution) {
                    endEvent.dispose();

                    resolve(true);
                }
            });
        }
    });
}
