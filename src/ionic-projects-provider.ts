import * as vscode from 'vscode';
import { ionicState } from './ionic-tree-provider';
import { Recommendation } from './recommendation';

export class IonicProjectsreeProvider implements vscode.TreeDataProvider<Recommendation> {

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
		console.log(element);
		return Promise.resolve(this.projectList());
	}

	projectList(): Array<Recommendation> {
		const list = [];
		for (const project of ionicState.projects) {
			list.push(new Recommendation(undefined, undefined, project.name, vscode.TreeItemCollapsibleState.None));
		}
		return list;
	}
}