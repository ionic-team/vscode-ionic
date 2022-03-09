export class Tip {
	public progressDialog: boolean;
	public doRun: boolean;
	public doRequestAppName: boolean;
	public doDeviceSelection: boolean;
	public doViewEditor: boolean;
	public cancelRequested: boolean;
	public secondCommand: string;
	public secondTitle: string;
	public tooltip: string;
	public runPoints: Array<RunPoint>;
	public contextValue?: string;

	private onAction: (...args) => unknown;
	private onCommand: (...args) => string;
	private actionArgs: any[];

	constructor(
		public readonly title: string,
		public readonly message: string,
		public readonly type?: TipType,
		public readonly description?: string,
		public command?: string | string[],
		public commandTitle?: string,
		public readonly commandSuccess?: string,
		public url?: string,
		public commandProgress?: string
	) { }

	showProgressDialog() {
		this.progressDialog = true;
		return this;
	}

	performRun() {
		this.doRun = true;
		return this;
	}

	requestAppName() {
		this.doRequestAppName = true;
		return this;
	}

	requestDeviceSelection() {
		this.doDeviceSelection = true;
		return this;
	}

	requestViewEditor() {
		this.doViewEditor = true;
		return this;
	}

	setAction(func: (...argsIn) => unknown, ...args) {
		this.onAction = func;
		this.actionArgs = args;
		return this;
	}

	setContextValue(contextValue: string) {
		this.contextValue = contextValue;
		return this;
	}

	setDynamicCommand(func: (...argsIn) => string, ...args) {
		this.onCommand = func;
		this.actionArgs = args;
		return this;
	}

	setSecondCommand(title: string, command: string) : Tip {
		this.secondCommand = command;
		this.secondTitle = title;
		return this;
	}

	setRunPoints(runPoints: Array<RunPoint>): Tip {
		this.runPoints = runPoints;
		return this;
	}

	async executeAction() {
		if (this.onAction) {
			await this.onAction(...this.actionArgs);
		}
	}

	async generateCommand() {
		if (this.onCommand) {
			this.command = this.onCommand(...this.actionArgs);
		}
	}
}

export enum TipType {
	Build,
	Error,
	Edit,
	Warning,
	Idea,
	Capacitor,
	Cordova,
	Ionic,
	Run,
	Link,
	Android,
	Vue,
	Angular,
	React,
	Comment,
	Settings,
	Files,
	Sync,
	Add,
	Media,
	None
}

export interface RunPoint {
	text: string; // Search text in the log entry
	title: string; // Title used for progress
}