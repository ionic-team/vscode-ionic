export class Tip {
	constructor(
		public readonly title: string,
		public readonly message: string,
		public readonly type?: TipType,
		public readonly description?: string,
		public readonly command?: string | string[],
		public readonly commandTitle?: string,
		public readonly commandSuccess?: string,
		public url?: string
	) { }	
}

export enum TipType {
	Error,
	Warning,
	Idea,
	Capacitor,
	Cordova,
	Ionic,
	Run,
	Android
}