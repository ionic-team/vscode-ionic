'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { reviewProject } from './project';
import { Recommendation } from './recommendation';
import { Context, VSCommand } from './context-variables';
import { starterProject } from './ionic-start';
import { isFolderBasedMonoRepo, MonoRepoProject, MonoRepoType } from './monorepo';

interface IonicState {
	view: vscode.TreeView<any>,
	skipAuth: boolean,
	projects: Array<MonoRepoProject>,
	repoType: MonoRepoType,
	workspace: string,
	projectsView: vscode.TreeView<any>,
	webDebugMode: boolean,
	selectedAndroidDevice?: string,
	selectedIOSDevice?: string

}
export const ionicState: IonicState = { view: undefined, skipAuth: false, projects: [], projectsView: undefined, repoType: MonoRepoType.none, workspace: undefined, webDebugMode: false };

export class IonicTreeProvider implements vscode.TreeDataProvider<Recommendation> {
	private _onDidChangeTreeData: vscode.EventEmitter<Recommendation | undefined | void> = new vscode.EventEmitter<Recommendation | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Recommendation | undefined | void> = this._onDidChangeTreeData.event;

	selectedProject: string;

	constructor(private workspaceRoot: string | undefined, private context: vscode.ExtensionContext) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getParent(element: Recommendation) {
		return undefined;
	}

	getTreeItem(element: Recommendation): vscode.TreeItem {
		return element;
	}

	selectProject(project: string) {
		this.selectedProject = project;
		this.refresh();
	}

	getChildren(element?: Recommendation): Thenable<Recommendation[]> {
		if (!this.workspaceRoot) {
			vscode.commands.executeCommand(VSCommand.setContext, Context.noProjectFound, true);
			return Promise.resolve([]);
		}
		vscode.commands.executeCommand(VSCommand.setContext, Context.noProjectFound, false);

		if (element) {
			if (element.whenExpanded) {
				return element.whenExpanded();
			} else {
				return Promise.resolve(element.children);
			}
		} else {
			const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
			const folderBased = isFolderBasedMonoRepo(this.workspaceRoot).length > 0;
			if (this.pathExists(packageJsonPath) || folderBased) {
				return reviewProject(this.workspaceRoot, this.context, this.selectedProject);
			} else {
				return Promise.resolve(starterProject(this.workspaceRoot));
			}
		}
	}

	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}


