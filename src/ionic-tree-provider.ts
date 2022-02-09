'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { reviewProject, starterProject } from './recommendations';
import { Recommendation } from './recommendation';

export class IonicTreeProvider implements vscode.TreeDataProvider<Recommendation> {
	private _onDidChangeTreeData: vscode.EventEmitter<Recommendation | undefined | void> = new vscode.EventEmitter<Recommendation | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Recommendation | undefined | void> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: string | undefined) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Recommendation): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Recommendation): Thenable<Recommendation[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		if (element) {
			return Promise.resolve(element.children);
		} else {
			const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
			if (this.pathExists(packageJsonPath)) {
				return reviewProject(this.workspaceRoot);
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


