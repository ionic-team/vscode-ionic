import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Recommendation } from './recommendation';
import { Tip, TipType } from './tip';
import { load, isCapacitor, exists } from './analyzer';
import { getPackageJSON, PackageFile } from './utilities';
import { fixIssue } from './extension';
import { getGlobalIonicConfig, sendTelemetryEvents } from './telemetry';
import { ionicState } from './ionic-tree-provider';
import { Context } from './context-variables';
import { getRecommendations } from './recommend';
import { excludeIgnoredTips, getIgnored } from './ignore';

export class Project {
	name: string;
	type: string = undefined;
	folder: string;
	modified: Date; // Last modified date of package.json
	group: Recommendation;
	subgroup: Recommendation;
	groups: Recommendation[] = [];
	ignored: Array<string>;

	constructor(_name: string) {
		this.name = _name;
	}

	public getIgnored(context: vscode.ExtensionContext) {
		this.ignored = getIgnored(context);
	}

	public setGroup(title: string, message: string, type?: TipType, expanded?: boolean, contextValue?: string): Recommendation {

		// If the last group has no items in it then remove it (eg if there are no recommendations for a project)
		if (this.groups.length > 1 && this.groups[this.groups.length - 1].children.length == 0) {
			this.groups.pop();
		}
		const r = new Recommendation(message, '', title, expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
		if (contextValue) {
			r.setContext(contextValue);
		}
		r.children = [];
		r.setIcon('dependency');
		this.setIcon(type, r);
		this.group = r;
		this.groups.push(this.group);
		return r;
	}

	// Look in package.json for scripts and add options to execute
	public addScripts() {
		const packages: PackageFile = getPackageJSON(this.folder);
		for (const script of Object.keys(packages.scripts)) {
			this.add(new Tip(script, '', TipType.Run, '', `npm run ${script}`, `Running ${script}`, `Ran ${script}`));
		}
	}

	public note(title: string, message: string, url?: string, tipType?: TipType, description?: string) {
		const tip = new Tip(title, message, tipType, description, undefined, undefined, undefined, url);
		const r = new Recommendation(description ? description : message, message, title, vscode.TreeItemCollapsibleState.None,
			{
				command: 'ionic.fix',
				title: 'Information',
				arguments: [tip]
			}, undefined);

		this.setIcon(tipType, r);

		this.group.children.push(r);
	}

	setIcon(tipType: TipType, r: Recommendation) {
		switch (tipType) {
			case TipType.Error: r.setIcon('error'); break;
			case TipType.Warning: r.setIcon('warning'); break;
			case TipType.Idea: r.setIcon('lightbulb'); break;
			case TipType.Files: r.setIcon('files'); break;
			case TipType.Media: r.setIcon('file-media'); break;
			case TipType.Cordova: r.setIcon('cordova'); break;
			case TipType.Capacitor: r.setIcon('capacitor'); break;
			case TipType.Ionic: r.setIcon('ionic'); break;
			case TipType.Android: r.setIcon('android'); break;
			case TipType.Comment: r.setIcon('comment'); break;
			case TipType.Settings: r.setIcon('settings-gear'); break;
			case TipType.Run: r.setIcon('run'); break;
			case TipType.Link: r.setIcon('files'); break;
			case TipType.None: break;
			case TipType.Add: r.setIcon('add'); break;
			case TipType.Sync: r.setIcon('sync'); break;
			case TipType.Build: r.setIcon('build'); break;
			case TipType.Edit: r.setIcon('edit'); break;
		}
	}

	private isIgnored(tip: Tip) {
		if (!tip) return true;
		const txt = `${tip.message}+${tip.title}`;
		if (!this.ignored) return false;
		return (this.ignored.includes(txt));
	}

	public add(tip: Tip) {
		if (this.isIgnored(tip)) return;

		let cmd: vscode.Command = {
			command: 'ionic.fix',
			title: 'Fix',
			arguments: [tip]
		};

		if ([TipType.Run, TipType.Sync, TipType.Build, TipType.Edit].includes(tip.type) || tip.doRun) {
			cmd = {
				command: 'ionic.runapp',
				title: 'Run',
				arguments: [tip]
			};
		}

		if (tip.type == TipType.Link) {
			cmd = {
				command: 'ionic.link',
				title: 'Open',
				arguments: [tip]
			};
			tip.url = tip.description as string;
		}

		const tooltip = tip.tooltip ? tip.tooltip : tip.message;
		const r = new Recommendation(tooltip, tip.message, tip.title, vscode.TreeItemCollapsibleState.None, cmd, tip, tip.url);
		this.setIcon(tip.type, r);

		// Context values are used for the when condition for vscode commands (see ionic.open in package.json)
		if (tip.contextValue) {
			r.setContext(tip.contextValue);
		}

		if (this.subgroup) {
			this.subgroup.children.push(r);
		} else {
			this.group.children.push(r);
		}
	}

	public addSubGroup(title: string) {
		let command: vscode.Command = undefined;
		let tooltip: string = undefined;
		let tip: Tip = undefined;
		if (title == 'angular') {

			// Option to upgrade with: 
			// ng update @angular/cli@13 @angular/core@13 --allow-dirty
			command = {
				command: 'ionic.lightbulb',
				title: 'Upgrade Angular',
				arguments: []
			};
			tooltip = 'Upgrade Angular';
			tip = new Tip('Upgrade Angular', 'Updates your application and its dependencies to the latest version using "ng update". Make sure you have committed your code before trying an upgrade.', 
			TipType.Run, undefined, 'ng update @angular/cli @angular/core --allow-dirty --force', 'Upgrade', undefined, 'https://angular.io/cli/update');
		}
		const r = new Recommendation(tooltip, undefined, '@' + title, vscode.TreeItemCollapsibleState.Expanded, command, tip);
		r.children = [];
		if (title == 'angular') {
			r.setContext('lightbulb');
		}

		this.group.children.push(r);
		this.subgroup = r;
	}

	public clearSubgroup() {
		this.subgroup = undefined;
	}

	public recommendReplace(name: string, title: string, message: string, description: string, replacement: string) {
		if (exists(name)) {
			this.add(new Tip(title, message, TipType.Warning, description, `npm install ${replacement} && npm uninstall ${name}`, 'Replace', `Replaced ${name} with ${replacement}`));
		}
	}

	public recommendRemove(name: string, title: string, message: string, description?: string, url?: string) {
		if (exists(name)) {
			this.add(new Tip(title, message, TipType.Warning, description, `npm uninstall ${name}`, 'Uninstall', `Uninstalled ${name}`, url).canIgnore());
		}
	}

	public recommendAdd(name: string, title: string, message: string, description?: string) {
		this.add(new Tip(title, message, TipType.Warning, description, `npm install ${name}`, 'Install', `Installed ${name}`));
	}

	public deprecatedPlugin(name: string, message: string, url?: string) {
		if (exists(name)) {
			this.note(
				name,
				`This plugin is deprecated. ${message}`,
				url,
				TipType.Warning,
				`The plugin ${name} is deprecated. ${message}`
			);
		}
	}

	public upgrade(name: string, title: string, message: string, fromVersion: string, toVersion: string) {
		if (exists(name)) {
			let extra = '';
			if (name == '@capacitor/core') {
				if (exists('@capacitor/ios')) {
					extra += ` @capacitor/ios@${toVersion}`;
				}
				if (exists('@capacitor/android')) {
					extra += ` @capacitor/android@${toVersion}`;
				}
			}
			this.add(new Tip(
				title,
				message,
				undefined,
				`Upgrade ${name} from ${fromVersion} to ${toVersion}`,
				`npm install ${name}@${toVersion}${extra} --save-exact`,
				`Upgrade`,
				`${name} upgraded to ${toVersion}`,
				`https://www.npmjs.com/package/${name}`,
				`Upgrading ${name}`
			).setSecondCommand(`Uninstall`, `npm uninstall ${name}`));
		}
	}

	public package(name: string, title: string, message: string) {
		if (exists(name)) {
			this.add(new Tip(
				title,
				message,
				undefined,
				`Uninstall ${name}`,
				`npm uninstall ${name}`,
				`Uninstall`,
				`${name} Uninstalled`,
				`https://www.npmjs.com/package/${name}`,
				`Uninstalling ${name}`
			));
		}
	}

	public checkNotExists(library: string, message: string) {
		if (exists(library)) {
			this.add(new Tip(library, message, TipType.Error, undefined, `npm uninstall ${library}`, 'Uninstall', `Uninstalled ${library}`));
		}
	}

	public tip(tip: Tip) {
		if (tip) {
			this.add(tip);
		}
	}

	public tips(tips: Tip[]) {
		for (const tip of tips) {
			this.tip(tip);
		}
	}

	public fileExists(filename: string): boolean {
		return fs.existsSync(path.join(this.folder, filename));
	}
}



function checkNodeVersion() {
	try {
		const v = process.version.split('.');
		const major = parseInt(v[0].substring(1));
		if (major < 13) {
			vscode.window.showErrorMessage(`This extension requires a minimum version of Node 14. ${process.version} is not supported.`, 'OK');
		}
	} catch {
		// Do nothing
	}
}

export async function installPackage(extensionPath: string, folder: string) {
	let items: Array<vscode.QuickPickItem> = [];
	const filename = path.join(extensionPath, 'resources', 'packages.json');
	items = JSON.parse(fs.readFileSync(filename) as any);
	items.map(item => { item.description = item.detail; item.detail = undefined; });
	//const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a package to install' });
	const selected = await vscode.window.showInputBox({ placeHolder: 'Enter package name to install' });
	if (!selected) return;
	await fixIssue(`npm install ${selected}`, folder, undefined,
		new Tip(`Install ${selected}`, undefined, TipType.Run, undefined, undefined,
			`Installing ${selected}`,
			`Installed ${selected}`).showProgressDialog());
}

export async function reviewProject(folder: string, context: vscode.ExtensionContext): Promise<Recommendation[]> {
	vscode.commands.executeCommand('setContext', Context.inspectedProject, false);
	vscode.commands.executeCommand('setContext', Context.isLoggingIn, false);

	const project: Project = new Project('My Project');
	const packages = await load(folder, project, context);
	ionicState.view.title = project.name;
	project.type = isCapacitor() ? 'Capacitor' : 'Cordova';
	project.folder = folder;

	const gConfig = getGlobalIonicConfig();

	if (!gConfig['user.id'] && !ionicState.skipAuth) {
		vscode.commands.executeCommand('setContext', Context.isAnonymous, true);
		return undefined;
	} else {
		vscode.commands.executeCommand('setContext', Context.isAnonymous, false);
	}

	sendTelemetryEvents(folder, project, packages, context);

	checkNodeVersion();
	project.getIgnored(context);

	await getRecommendations(project, context, packages);

	vscode.commands.executeCommand('setContext', Context.inspectedProject, true);
	return project.groups;
}