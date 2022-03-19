'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { reviewProject } from './project';
import { Recommendation } from './recommendation';
import { Context } from './context-variables';
import { starterProject } from './ionic-start';
import { MonoRepoProject } from './monorepo';

interface IonicState {
	view: vscode.TreeView<any>,
	skipAuth: boolean,
	projects: Array<MonoRepoProject>,
	projectsView: vscode.TreeView<any>

}
export const ionicState: IonicState = { view: undefined, skipAuth: false, projects: [], projectsView: undefined };

export class IonicTreeProvider implements vscode.TreeDataProvider<Recommendation> {
	private _onDidChangeTreeData: vscode.EventEmitter<Recommendation | undefined | void> = new vscode.EventEmitter<Recommendation | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Recommendation | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string | undefined, private context: vscode.ExtensionContext) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Recommendation): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Recommendation): Thenable<Recommendation[]> {
		if (!this.workspaceRoot) {
			vscode.commands.executeCommand('setContext', Context.noProjectFound, true);
			return Promise.resolve([]);
		}
		vscode.commands.executeCommand('setContext', Context.noProjectFound, false);

		if (element) {
			return Promise.resolve(element.children);
		} else {
			const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
			if (this.pathExists(packageJsonPath)) {
				return reviewProject(this.workspaceRoot, this.context);
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


