// vsCode Ionic Command Names match to the strings in package.json
export enum CommandName {
  Run = 'ionic-official.runapp',
  Fix = 'ionic-official.fix',
  Link = 'ionic-official.link',
  Idea = 'ionic-official.lightbulb',
  Refresh = 'ionic-official.refresh',
  Add = 'ionic-official.add',
  SignUp = 'ionic-official.signUp',
  Login = 'ionic-official.login',
  Stop = 'ionic-official.stop',
  Rebuild = 'ionic-official.rebuild',
  RefreshDebug = 'ionic-official.refreshDebug',
  Function = 'ionic-official.function',
  Open = 'ionic-official.open',
  SkipLogin = 'ionic-official.skipLogin',
  Upgrade = 'ionic-official.upgrade',
  ProjectsRefresh = 'ionic-official.projectRefresh',
  ProjectSelect = 'ionic-official.projectSelect',
  BuildConfig = 'ionic-official.buildConfig',
  WebConfig = 'ionic-official.webConfig',
  SelectAction = 'ionic-official.selectAction',
  DebugMode = 'ionic-official.debugMode',
  RunMode = 'ionic-official.runMode',
  SelectDevice = 'ionic-official.selectDevice',
  RunIOS = 'ionic-official.run',
  ViewDevServer = 'ionic-official.viewDevServer', // View the dev server window
  hideDevServer = 'ionic-official.hideDevServer', // Hide the dev server window
}

export enum InternalCommand {
  cwd = '[@cwd]', // Used to change the working directory for a commmand if we are in a monorepo
  target = '[@target]', // Used to change the target to the device selected
  removeCordova = 'rem-cordova', // Will remove cordova from the project
  ionicInit = '[@ionic-init]', // Will call ionic init if ionic.config.json is missing
}

export enum ActionResult {
  None = '',
  Ignore = 'ignore',
}
