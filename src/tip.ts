export class Tip {
	public progressDialog: boolean;
	public doRun: boolean;
	public doRequestAppName: boolean;
	public doDeviceSelection: boolean;

	private onAction: (...args) => unknown;
	private actionArgs: any[];

	constructor(
		public readonly title: string,
		public readonly message: string,
		public readonly type?: TipType,
		public readonly description?: string,
		public readonly command?: string | string[],
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

	setAction(func: (...argsIn) => unknown, ...args) {
		this.onAction = func;
		this.actionArgs = args;
	}

	async executeAction() {
		if (this.onAction) {
			await this.onAction(...this.actionArgs);
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
	Sync,
	None
}