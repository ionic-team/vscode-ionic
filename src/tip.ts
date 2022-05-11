import { Context } from './context-variables';
import { isRunning } from './extension';

export enum TipFeature {
  viewInEditor,
  debugOnWeb,
}

export class Tip {
  public progressDialog: boolean;
  public doRun: boolean;
  public doRequestAppName: boolean;
  public doDeviceSelection: boolean;
  public cancelRequested: boolean;
  public animates: boolean;
  public stoppable: boolean;
  public secondCommand: string;
  public secondTitle: string;
  public tooltip: string;
  public runPoints: Array<RunPoint>;
  public contextValue?: string;
  public ignorable: boolean;
  public refresh: boolean; // Whether the tree provider is refresh after action is run
  public data?: any;
  public features: Array<TipFeature> = [];

  private onAction: (...args) => unknown;
  private onCommand: (...args) => string;
  private onTitle: (...args) => string;
  private actionArgs: any[];
  private titleArgs: any[];

  constructor(
    public title: string,
    public readonly message: string,
    public readonly type?: TipType,
    public readonly description?: string,
    public command?: string | string[],
    public commandTitle?: string,
    public readonly commandSuccess?: string,
    public url?: string,
    public commandProgress?: string
  ) {}

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

  setFeatures(features: Array<TipFeature>): Tip {
    for (const feature of features) {
      this.features.push(feature);
    }
    return this;
  }

  hasFeature(feature: TipFeature): boolean {
    return this.features.includes(feature);
  }

  canAnimate() {
    this.animates = true;
    return this;
  }

  setTooltip(tooltip: string) {
    this.tooltip = tooltip;
    return this;
  }

  public sameAs(tip: Tip): boolean {
    return this.title == tip.title && this.message == tip.message;
  }

  canStop() {
    if (isRunning(this)) {
      this.setContextValue(Context.stop);
    } else {
      this.stoppable = true;
    }
    return this;
  }

  contextIf(value: Context, running: boolean) {
    if (running && isRunning(this)) {
      this.setContextValue(value);
    } else if (!running && !isRunning(this)) {
      this.setContextValue(value);
    }
    return this;
  }

  canIgnore() {
    this.ignorable = true;
    return this;
  }

  canRefreshAfter() {
    this.refresh = true;
    return this;
  }

  // The action is executed when the user clicks the item in the treeview
  setAction(func: (...argsIn) => unknown, ...args) {
    this.onAction = func;
    this.actionArgs = args;
    return this;
  }

  // The action is executed when the user clicks the button called title
  setAfterClickAction(title: string, func: (...argsIn) => unknown, ...args) {
    this.commandTitle = title;
    this.command = Command.NoOp;
    this.onAction = func;
    this.actionArgs = args;
    return this;
  }

  setContextValue(contextValue: string) {
    this.contextValue = contextValue;
    return this;
  }

  public addActionArg(arg: string) {
    this.actionArgs.push(arg);
  }

  public actionArg(index: number) {
    return this.actionArgs[index];
  }

  setData(data: any) {
    this.data = data;
    return this;
  }

  setDynamicCommand(func: (...argsIn) => string, ...args) {
    this.onCommand = func;
    this.actionArgs = args;
    return this;
  }

  setDynamicTitle(func: (...argsIn) => string, ...args) {
    this.onTitle = func;
    this.titleArgs = args;
    return this;
  }

  setSecondCommand(title: string, command: string): Tip {
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

  async generateTitle() {
    if (this.onTitle) {
      this.title = this.onTitle(...this.titleArgs);
    }
  }
}

export enum Command {
  NoOp = ' ',
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
  Debug,
  None,
}

export interface RunPoint {
  text: string; // Search text in the log entry
  title: string; // Title used for progress
  refresh?: boolean; // Refresh the tree view
}
