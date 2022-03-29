import * as child_process from "child_process";
import * as path from "path";
import * as vscode from 'vscode';
import * as os from "os";
import { AdbOptions, Device, DeviceState, ForwardedSocket, ForwardOptions, Package, Process, ShellOptions, UnforwardOptions, WebView, WebViewType } from "./android-debug-models";
import { ionicState } from "./ionic-tree-provider";

const forwardedSockets: ForwardedSocket[] = [];

export async function androidDebugUnforward(): Promise<void> {
	// Swtich back to Ionic View
	ionicState.view.reveal(undefined, {focus: true});
	
	const promises: Promise<any>[] = [];

	for (const socket of forwardedSockets) {
		const promise = unforward({
			executable: getAdbExecutable(),
			arguments: getAdbArguments(),
			local: socket.local
		});
		promises.push(promise.catch(() => { /* Ignore */ }));
	}

	await Promise.all(promises);

	forwardedSockets.splice(0);
}

export async function forwardDebugger(application: WebView, port?: number): Promise<number> {
	if (port) {
		const idx = forwardedSockets.findIndex((el) => el.local === `tcp:${port}`);
		if (idx >= 0) {
			forwardedSockets.splice(idx, 1);

			try {
				await unforward({
					executable: getAdbExecutable(),
					arguments: getAdbArguments(),
					local: `tcp:${port}`
				});
			} catch {
				// Ignore
			}
		}
	}

	const socket = await forward({
		executable: getAdbExecutable(),
		arguments: getAdbArguments(),
		serial: application.device.serial,
		local: `tcp:${port || 0}`,
		remote: `localabstract:${application.socket}`
	});

	forwardedSockets.push(socket);

	return parseInt(socket.local.substr(4), 10);
}

export async function findDevices(): Promise<Device[]> {
	return await devices({
		executable: getAdbExecutable(),
		arguments: getAdbArguments()
	});
}

export async function verifyAndroidDebugBridge(): Promise<void> {
	try {
		await version({
			executable: getAdbExecutable(),
			arguments: getAdbArguments()
		});
	} catch (err: unknown) {
		if ((err as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
			throw new Error("Cant find ADB executable.");
		}

		throw err;
	}
}


function adb(options: AdbOptions, ...args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		let outBuff = Buffer.alloc(0);
		let errBuff = Buffer.alloc(0);

		const process = child_process.spawn(options.executable, [...options.arguments, ...args]);

		process.stdout.on("data", (data) => {
			outBuff = Buffer.concat([outBuff, Buffer.from(data)]);
		});
		process.stderr.on("data", (data) => {
			errBuff = Buffer.concat([errBuff, Buffer.from(data)]);
		});

		process.on("error", (err) => {
			reject(err);
		});
		process.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(errBuff.toString("utf8")));
			}

			resolve(outBuff.toString("utf8"));
		});
	});
}

async function version(options: AdbOptions): Promise<string> {
	return await adb(options, "version");
}

async function devices(options: AdbOptions): Promise<Device[]> {
	const output = await adb(options, "devices", "-l");

	const result: Device[] = [];

	const regex = /^([a-zA-Z0-9_-]+(?:\s?[.a-zA-Z0-9_-]+)?(?::\d{1,})?)\s+(device|connecting|offline|unknown|bootloader|recovery|download|unauthorized|host|no permissions)(?:\s+usb:([^:]+))?(?:\s+product:([^:]+))?(?:\s+model:([\S]+))?(?:\s+device:([\S]+))?(?:\s+features:([^:]+))?(?:\s+transport_id:([^:]+))?$/gim;
	let match: any[];
	while ((match = regex.exec(output)) !== null) {
		result.push({
			serial: match[1],
			state: match[2] as DeviceState,
			usb: match[3],
			product: match[4],
			model: match[5],
			device: match[6],
			features: match[7],
			transportId: match[8]
		});
	}

	return result;
}

export async function findWebViews(device: Device): Promise<WebView[]> {
	const [
		sockets,
		processes,
		packages
	] = await Promise.all([
		getSockets(device.serial),
		getProcesses(device.serial),
		getPackages(device.serial)
	]);

	const result: WebView[] = [];

	for (const socket of sockets) {
		let type: WebViewType;
		let packageName: string | undefined;
		let versionName: string | undefined;

		if (socket === "chrome_devtools_remote") {
			type = WebViewType.chrome;
			packageName = "com.android.chrome";
		} else if (socket.startsWith("webview_devtools_remote_")) {
			type = WebViewType.webview;

			const pid = parseInt(socket.substr(24), 10);
			if (!isNaN(pid)) {
				const process = processes.find((el) => el.pid === pid);
				if (process) {
					packageName = process.name;
				}
			}
		} else if (socket.endsWith("_devtools_remote")) {
			type = WebViewType.crosswalk;
			packageName = socket.substring(0, socket.length - 16) || undefined;
		} else {
			type = WebViewType.unknown;
		}

		if (packageName) {
			const aPackage = packages.find((el) => el.packageName === packageName);
			if (aPackage) {
				versionName = aPackage.versionName;
			}
		}

		result.push({
			device: device,
			socket: socket,
			type: type,
			packageName: packageName,
			versionName: versionName
		});
	}

	return result;
}

async function shell(options: ShellOptions): Promise<string> {
	return await adb(options, "-s", options.serial, "shell", options.command);
}

async function forward(options: ForwardOptions): Promise<ForwardedSocket> {
	const output = await adb(options, "-s", options.serial, "forward", options.local, options.remote);

	if (options.local === "tcp:0") {
		return {
			local: `tcp:${parseInt(output.trim(), 10)}`,
			remote: options.remote
		};
	} else {
		return {
			local: options.local,
			remote: options.remote
		};
	}
}

async function unforward(options: UnforwardOptions): Promise<void> {
	await adb(options, "forward", "--remove", options.local);
}

function getAdbArguments(): string[] {
	const adbArgs = vscode.workspace.getConfiguration("ionic").get<string[]>("adbArgs");

	if (adbArgs) {
		return adbArgs;
	} else {
		return [];
	}
}

function getAdbExecutable(): string {
	const adbPath = vscode.workspace.getConfiguration("ionic").get<string>("adbPath");

	if (adbPath) {
		return resolvePath(adbPath);
	} else {
		return "adb";
	}
}

function resolvePath(from: string): string {
	const substituted = from.replace(
		/(?:^(~|\.{1,2}))(?=\/)|\$(\w+)/g,
		(_, tilde?: string, env?: string) => {
			// $HOME/adb -> /Users/<user>/adb
			if (env) return process.env[env] ?? "";

			// ~/adb -> /Users/<user>/adb
			if (tilde === "~") return os.homedir();

			const fsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (!fsPath) return "";

			// ./adb -> <workspace>/adb
			if (tilde === ".") return fsPath;

			// ../adb -> <workspace>/../adb
			if (tilde === "..") return fsPath + "/..";

			return "";
		}
	);

	if (substituted.includes("/")) {
		// Resolve the path if it contains a path seperator.
		return path.resolve(substituted);
	} else {
		// Otherwise we treat it as a command that exists in PATH.
		return substituted;
	}
}

async function getSockets(serial: string): Promise<string[]> {
	const output = await shell({
		executable: getAdbExecutable(),
		arguments: getAdbArguments(),
		serial: serial,
		command: "cat /proc/net/unix"
	});

	/**
	 * Parse 'cat /proc/net/unix' output which on Android looks like this:
	 *
	 * Num               RefCount Protocol Flags    Type St Inode Path
	 * 0000000000000000: 00000002 00000000 00010000 0001 01 27955 /data/fpc/oem
	 * 0000000000000000: 00000002 00000000 00010000 0001 01  3072 @chrome_devtools_remote
	 *
	 * We need to find records with paths starting from '@' (abstract socket)
	 * and containing the channel pattern ("_devtools_remote").
	 */

	const result: string[] = [];

	for (const line of output.split(/[\r\n]+/g)) {
		const columns = line.split(/\s+/g);
		if (columns.length < 8) {
			continue;
		}

		if (columns[3] !== "00010000" || columns[5] !== "01") {
			continue;
		}

		const colPath = columns[7];
		if (!colPath.startsWith("@") || !colPath.includes("_devtools_remote")) {
			continue;
		}

		result.push(colPath.substr(1));
	}

	return result;
}

async function getProcesses(serial: string): Promise<Process[]> {
	const output = await shell({
		executable: getAdbExecutable(),
		arguments: getAdbArguments(),
		serial: serial,
		command: "ps"
	});

	/**
	 * Parse 'ps' output which on Android looks like this:
	 *
	 * USER       PID  PPID      VSZ     RSS  WCHAN  ADDR  S  NAME
	 * root         1     0    24128    1752  0         0  S  init
	 * u0_a100  22100  1307  1959228  128504  0         0  S  com.android.chrome
	 */

	const result: Process[] = [];

	for (const line of output.split(/[\r\n]+/g)) {
		const columns = line.split(/\s+/g);
		if (columns.length < 9) {
			continue;
		}

		const pid = parseInt(columns[1], 10);
		if (isNaN(pid)) {
			continue;
		}

		result.push({
			pid: pid,
			name: columns[8]
		});
	}

	return result;
}

async function getPackages(serial: string): Promise<Package[]> {
	const output = await shell({
		executable: getAdbExecutable(),
		arguments: getAdbArguments(),
		serial: serial,
		command: "dumpsys package packages"
	});

	/**
	 * Parse 'dumpsys package packages' output which on Android looks like this:
	 *
	 * Packages:
	 *   Package [com.android.chrome] (76d4737):
	 *     userId=10100
	 *     pkg=Package{3e86c27 com.android.chrome}
	 *     codePath=/data/app/com.android.chrome-MMpc6mFfM3KpEYJ7RaZaTA==
	 *     resourcePath=/data/app/com.android.chrome-MMpc6mFfM3KpEYJ7RaZaTA==
	 *     legacyNativeLibraryDir=/data/app/com.android.chrome-MMpc6mFfM3KpEYJ7RaZaTA==/lib
	 *     primaryCpuAbi=armeabi-v7a
	 *     secondaryCpuAbi=arm64-v8a
	 *     versionCode=344009152 minSdk=24 targetSdk=28
	 *     versionName=68.0.3440.91
	 */

	const result: Package[] = [];

	let packageName: string | undefined;

	for (const line of output.split(/[\r\n]+/g)) {
		const columns = line.trim().split(/\s+/g);

		if (!packageName) {
			if (columns[0] === "Package") {
				packageName = columns[1].substring(1, columns[1].length - 1);
			}
		} else {
			if (columns[0].startsWith("versionName=")) {
				result.push({
					packageName: packageName,
					versionName: columns[0].substr(12)
				});

				packageName = undefined;
			}
		}
	}

	return result;
}