// vsCode Ionic Command Names match to the strings in package.json
export enum CommandName {
	Run = 'ionic.runapp',
	Fix = 'ionic.fix',
	Link = 'ionic.link',
	Idea = 'ionic.lightbulb',
	Refresh = 'ionic.refresh',
	Add = 'ionic.add',
	SignUp = 'ionic.signUp',
	Login = 'ionic.login',
	Stop = 'ionic.stop',
	Rebuild = 'ionic.rebuild',
	Function = 'ionic.function',
	Open = 'ionic.open',
	SkipLogin = 'ionic.skipLogin',
	Upgrade = 'ionic.upgrade',
	ProjectsRefresh = 'ionic.projectRefresh',
	ProjectSelect = 'ionic.projectSelect',
	BuildConfig = 'ionic.buildConfig',
	DebugMode = 'ionic.debugMode',
	RunMode = 'ionic.runMode'
}

export enum InternalCommand {
	cwd = '[@cwd]', // Used to change the working directory for a commmand if we are in a monorepo
	target = '[@target]', // Used to change the target to the device selected
	removeCordova = 'rem-cordova' // Will remove cordova from the projcet
}