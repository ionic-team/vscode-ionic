
import * as vscode from 'vscode';
import * as path from 'path';
import { Tip } from './tip';

export class Recommendation extends vscode.TreeItem {
	public children: Recommendation[];
	private iconName: string;
	public whenExpanded: () => Promise<Array<Recommendation>>;

	constructor(
		public readonly tooltip: string,
		public readonly title: string,
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command,
		public tip?: Tip,
		public readonly url?: string
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.tooltip}`;
		this.description = this.title;
	}

	public setIcon(name: string) {
		this.iconName = name;
		this.iconPath = {
			light: path.join(__filename, '..', '..', 'resources', 'light', name + '.svg'),
			dark: path.join(__filename, '..', '..', 'resources', 'dark', name + '.svg')
		};
	}

	// Animinated icons need to have an equivalent filename with -anim that contains animated svg
	public animate() {
		this.setIcon(this.iconName + '-anim');		
	}

	public setContext(value: string) {
		this.contextValue = value;
	}

	iconPath = undefined;
	contextValue = 'recommendation';
}