
import * as vscode from 'vscode';
import * as path from 'path';
import { Tip } from './tip';

export class Recommendation extends vscode.TreeItem {
	public children: Recommendation[];

	constructor(
		public readonly tooltip: string,
		public readonly title: string,
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command,
		public readonly tip?: Tip,
		public readonly url?: string
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.tooltip}`;
		this.description = this.title;
	}

	public iconDependency() {
		this.setIcon('dependency');
	}

	public iconCapacitor() {
		this.setIcon('capacitor');
	}

	public iconCordova() {
		this.setIcon('cordova');
	}

	public iconIonic() {
		this.setIcon('ionic');
	}

	public iconAndroid() {
		this.setIcon('android');
	}

	public iconReplace() {
		this.setIcon('files');
	}

	public iconRun() {
		this.setIcon('run');
	}

	public iconError() {
		this.setIcon('error');
	}

	public iconWarning() {
		this.setIcon('warning');
	}

	public iconIdea() {
		this.setIcon('lightbulb');
	}

	public iconComment() {
		this.setIcon('comment');
	}

	private setIcon(name: string) {
		this.iconPath = {
			light: path.join(__filename, '..', '..', 'resources', 'light', name + '.svg'),
			dark: path.join(__filename, '..', '..', 'resources', 'dark', name + '.svg')
		};
	}

	iconPath = undefined;
	contextValue = 'recommendation';
}