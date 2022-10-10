import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Recommendation } from './recommendation';
import { Tip, TipType } from './tip';
import { load, exists } from './analyzer';
import { fixIssue, isRunning } from './extension';
import { getGlobalIonicConfig, sendTelemetryEvents } from './telemetry';
import { ionicState } from './ionic-tree-provider';
import { Context, VSCommand } from './context-variables';
import { getRecommendations } from './recommend';
import { getIgnored } from './ignore';
import { CommandName, InternalCommand } from './command-name';
import { angularMigrate } from './rules-angular-migrate';
import { checkForMonoRepo, MonoRepoProject, MonoRepoType } from './monorepo';
import { CapacitorPlatform } from './capacitor-platform';
import { addCommand, npmInstall, npmUninstall, PackageManager } from './node-commands';
import { getCapacitorConfigWebDir } from './capacitor-configure';
import { ionicExport } from './ionic-export';

export class Project {
  name: string;
  type: string = undefined;
  isCapacitor: boolean;
  isCordova: boolean;
  workspaces: Array<string>;
  folder: string;
  modified: Date; // Last modified date of package.json
  group: Recommendation;
  subgroup: Recommendation;
  groups: Recommendation[] = [];
  ignored: Array<string>;

  // Mono repo Type (eg NX)
  public repoType: MonoRepoType;

  // Mono Repo Project selected
  public monoRepo: MonoRepoProject;

  constructor(_name: string) {
    this.name = _name;
  }

  public getIgnored(context: vscode.ExtensionContext) {
    this.ignored = getIgnored(context);
  }

  public getNodeModulesFolder(): string {
    let nmf = path.join(this.folder, 'node_modules');
    if (this.monoRepo?.localPackageJson) {
      nmf = path.join(this.monoRepo.folder, 'node_modules');
    }
    return nmf;
  }

  // Is the capacitor platform installed and does the project folder exists
  public hasCapacitorProject(platform: CapacitorPlatform) {
    return exists(`@capacitor/${platform}`) && fs.existsSync(path.join(this.projectFolder(), platform));
  }

  public hasACapacitorProject(): boolean {
    return this.hasCapacitorProject(CapacitorPlatform.ios) || this.hasCapacitorProject(CapacitorPlatform.android);
  }

  /**
   * This is the path the selected project (for monorepos) or the root folder
   */
  public projectFolder() {
    if (this.repoType == undefined) {
      return this.folder;
    }
    switch (this.repoType) {
      case MonoRepoType.none:
        return this.folder;
      case MonoRepoType.npm:
      case MonoRepoType.yarn:
      case MonoRepoType.lerna:
      case MonoRepoType.pnpm:
      case MonoRepoType.folder:
        return this.monoRepo.folder;
      default:
        return path.join(this.folder, this.monoRepo.folder);
    }
  }

  public setGroup(
    title: string,
    message: string,
    type?: TipType,
    expanded?: boolean,
    contextValue?: string
  ): Recommendation {
    // If the last group has no items in it then remove it (eg if there are no recommendations for a project)
    if (this.groups.length > 1 && this.groups[this.groups.length - 1].children.length == 0) {
      if (!this.groups[this.groups.length - 1].whenExpanded) {
        this.groups.pop();
      }
    }
    const r = new Recommendation(
      message,
      '',
      title,
      expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
    );
    if (contextValue) {
      r.setContext(contextValue);
    }
    r.children = [];
    r.setIcon('dependency');
    this.setIcon(type, r);
    this.group = r;
    this.groups.push(this.group);
    return r;
  }

  public note(title: string, message: string, url?: string, tipType?: TipType, description?: string) {
    const tip = new Tip(title, message, tipType, description, undefined, undefined, undefined, url);
    const r = new Recommendation(
      description ? description : message,
      message,
      title,
      vscode.TreeItemCollapsibleState.None,
      {
        command: CommandName.Fix,
        title: 'Information',
        arguments: [tip],
      },
      undefined
    );

    this.setIcon(tipType, r);

    this.group.children.push(r);
  }

  setIcon(tipType: TipType, r: Recommendation) {
    switch (tipType) {
      case TipType.Error:
        r.setIcon('error');
        break;
      case TipType.Warning:
        r.setIcon('warning');
        break;
      case TipType.Idea:
        r.setIcon('lightbulb');
        break;
      case TipType.Files:
        r.setIcon('files');
        break;
      case TipType.Dependency:
        r.setIcon('dependency');
        break;
      case TipType.Box:
        r.setIcon('box');
        break;
      case TipType.Check:
        r.setIcon('checkbox');
        break;
      case TipType.Media:
        r.setIcon('file-media');
        break;
      case TipType.Cordova:
        r.setIcon('cordova');
        break;
      case TipType.Capacitor:
        r.setIcon('capacitor');
        break;
      case TipType.Ionic:
        r.setIcon('ionic');
        break;
      case TipType.Android:
        r.setIcon('android');
        break;
      case TipType.Comment:
        r.setIcon('comment');
        break;
      case TipType.Settings:
        r.setIcon('settings-gear');
        break;
      case TipType.Run:
        r.setIcon('run');
        break;
      case TipType.Debug:
        r.setIcon('debug-alt-small');
        break;
      case TipType.Link:
        r.setIcon('files');
        break;
      case TipType.None:
        break;
      case TipType.Add:
        r.setIcon('add');
        break;
      case TipType.Sync:
        r.setIcon('sync');
        break;
      case TipType.Build:
        r.setIcon('build');
        break;
      case TipType.Edit:
        r.setIcon('edit');
        break;
    }
  }

  private isIgnored(tip: Tip) {
    if (!tip) return true;
    const txt = `${tip.message}+${tip.title}`;
    if (!this.ignored) return false;
    return this.ignored.includes(txt);
  }

  public add(tip: Tip) {
    const r = this.asRecommendation(tip);
    if (!r) return;

    if (this.subgroup) {
      this.subgroup.children.push(r);
    } else {
      this.group.children.push(r);
    }
  }

  public asRecommendation(tip: Tip): Recommendation {
    if (this.isIgnored(tip)) return;

    let argsIsRecommendation = false;
    let cmd: vscode.Command = {
      command: CommandName.Fix,
      title: 'Fix',
      arguments: [tip],
    };

    if ([TipType.Run, TipType.Sync, TipType.Debug, TipType.Build, TipType.Edit].includes(tip.type) || tip.doRun) {
      cmd = {
        command: CommandName.Run,
        title: 'Run',
      };
      argsIsRecommendation = true;
    }

    if (tip.type == TipType.Link) {
      cmd = {
        command: CommandName.Link,
        title: 'Open',
        arguments: [tip],
      };
      tip.url = tip.description as string;
    }

    const tooltip = tip.tooltip ? tip.tooltip : tip.message;
    const r = new Recommendation(
      tooltip,
      tip.message,
      tip.title,
      vscode.TreeItemCollapsibleState.None,
      cmd,
      tip,
      tip.url
    );
    this.setIcon(tip.type, r);

    if (argsIsRecommendation) {
      r.command.arguments = [r];
    }

    if (tip.animates) {
      if (isRunning(tip)) {
        r.animate();
      }
    }

    // Context values are used for the when condition for vscode commands (see ionic.open in package.json)
    if (tip.contextValue) {
      r.setContext(tip.contextValue);
    }

    return r;
  }

  public addSubGroup(title: string, latestVersion: string) {
    let command: vscode.Command = undefined;

    let tip: Tip = undefined;
    if (title == 'angular') {
      // Option to upgrade with:
      // ng update @angular/cli@13 @angular/core@13 --allow-dirty
      tip = angularMigrate(latestVersion);
    } else {
      tip = new Tip('Upgrade All Packages', undefined, TipType.Run, undefined, undefined, 'Upgrade');
    }

    command = {
      command: CommandName.Idea,
      title: tip.title,
      arguments: [],
    };

    const r = new Recommendation(
      tip.title,
      undefined,
      '@' + title,
      vscode.TreeItemCollapsibleState.Expanded,
      command,
      tip
    );
    r.children = [];
    if (title == 'angular') {
      r.setContext(Context.lightbulb);
    } else {
      r.setContext(Context.lightbulb);
      r.tip.setDynamicCommand(this.updatePackages, r).setDynamicTitle(this.updatePackagesTitle, r);
    }

    this.group.children.push(r);
    this.subgroup = r;
  }

  private updatePackages(r: Recommendation): string {
    let command = '';
    const addCmd = addCommand();
    for (const child of r.children) {
      // Command will be npm install @capacitor/android@3.4.3 --save-exact
      if ((child.tip.command as string).includes(addCmd)) {
        const npackage = (child.tip.command as string)
          .replace(addCmd + ' ', '')
          .replace(' --save-exact', '')
          .replace(InternalCommand.cwd, '');

        if (command != '') {
          command += ' ';
        }
        command += npackage.trim();
      }
    }
    return npmInstall(command);
  }

  private updatePackagesTitle(r: Recommendation): string {
    let title = '';
    const addCmd = addCommand();
    for (const child of r.children) {
      if ((child.tip.command as string).includes(addCmd)) {
        if (title != '') {
          title += ', ';
        }
        title += child.tip.description;
      }
    }
    return `${r.children.length} Packages: ${title}`;
  }

  public clearSubgroup() {
    this.subgroup = undefined;
  }

  public recommendReplace(name: string, title: string, message: string, description: string, replacement: string) {
    if (exists(name)) {
      this.add(
        new Tip(
          title,
          message,
          TipType.Warning,
          description,
          `${npmInstall(replacement)} && ${npmUninstall(name)}`,
          'Replace',
          `Replaced ${name} with ${replacement}`
        ).setRelatedDependency(name)
      );
    }
  }

  public recommendRemove(name: string, title: string, message: string, description?: string, url?: string) {
    if (exists(name)) {
      this.add(
        new Tip(
          title,
          message,
          TipType.Warning,
          description,
          npmUninstall(name),
          'Uninstall',
          `Uninstalled ${name}`,
          url
        )
          .canIgnore()
          .setRelatedDependency(name)
      );
    }
  }

  public recommendAdd(name: string, title: string, message: string, description: string, devDependency: boolean) {
    const flags = devDependency ? ' --save-dev' : undefined;
    this.add(
      new Tip(
        title,
        message,
        TipType.Warning,
        description,
        npmInstall(name, flags),
        'Install',
        `Installed ${name}`
      ).setRelatedDependency(name)
    );
  }

  public deprecatedPlugin(name: string, message: string, url?: string) {
    if (exists(name)) {
      this.note(
        name,
        `This plugin is deprecated. ${message}`,
        url,
        TipType.Warning,
        `The plugin ${name} is deprecated. ${message}`
      );
    }
  }

  public upgrade(name: string, title: string, message: string, fromVersion: string, toVersion: string) {
    if (exists(name)) {
      let extra = '';
      if (name == '@capacitor/core') {
        if (exists('@capacitor/ios')) {
          extra += ` @capacitor/ios@${toVersion}`;
        }
        if (exists('@capacitor/android')) {
          extra += ` @capacitor/android@${toVersion}`;
        }
      }
      this.add(
        new Tip(
          title,
          message,
          undefined,
          `Upgrade ${name} from ${fromVersion} to ${toVersion}`,
          npmInstall(`${name}@${toVersion}${extra}`),
          `Upgrade`,
          `${name} upgraded to ${toVersion}`,
          `https://www.npmjs.com/package/${name}`,
          `Upgrading ${name}`
        )
          .setSecondCommand(`Uninstall`, npmUninstall(name))
          .setContextValue(Context.upgrade)
          .setData({ name: name, version: fromVersion })
          .setTooltip(`${name} ${fromVersion}`)
      );
    }
  }

  public package(name: string, title: string, version: string) {
    if (exists(name)) {
      this.add(
        new Tip(
          title,
          version,
          undefined,
          `Uninstall ${name}`,
          npmUninstall(name),
          `Uninstall`,
          `${name} Uninstalled`,
          `https://www.npmjs.com/package/${name}`,
          `Uninstalling ${name}`
        )
          .setContextValue(Context.upgrade)
          .setData({ name: name, version: undefined })
          .setTooltip(`${name} ${version}`)
      );
    }
  }

  public checkNotExists(library: string, message: string) {
    if (exists(library)) {
      this.add(
        new Tip(
          library,
          message,
          TipType.Error,
          undefined,
          npmUninstall(library),
          'Uninstall',
          `Uninstalled ${library}`
        ).setRelatedDependency(library)
      );
    }
  }

  public tip(tip: Tip) {
    if (tip) {
      this.add(tip);
    }
  }

  public tips(tips: Tip[]) {
    for (const tip of tips) {
      this.tip(tip);
    }
  }

  public fileExists(filename: string): boolean {
    return fs.existsSync(path.join(this.projectFolder(), filename));
  }

  public getDistFolder(): string {
    return getCapacitorConfigWebDir(this.projectFolder());
  }
}

function checkNodeVersion() {
  try {
    const v = process.version.split('.');
    const major = parseInt(v[0].substring(1));
    if (major < 13) {
      vscode.window.showErrorMessage(
        `This extension requires a minimum version of Node 14. ${process.version} is not supported.`,
        'OK'
      );
    }
  } catch {
    // Do nothing
  }
}

export async function installPackage(extensionPath: string, folder: string) {
  let items: Array<vscode.QuickPickItem> = [];
  const filename = path.join(extensionPath, 'resources', 'packages.json');
  items = JSON.parse(fs.readFileSync(filename) as any);
  items.map((item) => {
    item.description = item.detail;
    item.detail = undefined;
  });
  //const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a package to install' });
  const selected = await vscode.window.showInputBox({ placeHolder: 'Enter package name to install' });
  if (!selected) return;

  if (selected == 'export') {
    ionicExport(folder, ionicState.context);
    return;
  }

  await fixIssue(
    npmInstall(selected),
    folder,
    undefined,
    new Tip(
      `Install ${selected}`,
      undefined,
      TipType.Run,
      undefined,
      undefined,
      `Installing ${selected}`,
      `Installed ${selected}`
    ).showProgressDialog()
  );
}

export interface ProjectSummary {
  project: Project;
  packages: any;
}

export async function reviewProject(
  folder: string,
  context: vscode.ExtensionContext,
  selectedProject: string
): Promise<Recommendation[]> {
  const summary = await inspectProject(folder, context, selectedProject);
  if (!summary || !summary.project) return [];
  return summary.project.groups;
}

export async function inspectProject(
  folder: string,
  context: vscode.ExtensionContext,
  selectedProject: string
): Promise<ProjectSummary> {
  const startedOp = Date.now();
  vscode.commands.executeCommand(VSCommand.setContext, Context.inspectedProject, false);
  vscode.commands.executeCommand(VSCommand.setContext, Context.isLoggingIn, false);

  const project: Project = new Project('My Project');
  project.folder = folder;
  setPackageManager(folder);
  let packages = await load(folder, project, context);
  ionicState.view.title = project.name;
  project.type = project.isCapacitor ? 'Capacitor' : project.isCordova ? 'Cordova' : 'Other';

  const gConfig = getGlobalIonicConfig();

  if (!gConfig['user.id'] && !ionicState.skipAuth) {
    vscode.commands.executeCommand(VSCommand.setContext, Context.isAnonymous, true);
    return undefined;
  } else {
    vscode.commands.executeCommand(VSCommand.setContext, Context.isAnonymous, false);
  }

  checkForMonoRepo(project, selectedProject, context);

  if (project.monoRepo?.localPackageJson) {
    packages = await load(project.monoRepo.folder, project, context);
  }

  sendTelemetryEvents(folder, project, packages, context);

  checkNodeVersion();
  project.getIgnored(context);

  await getRecommendations(project, context, packages);

  vscode.commands.executeCommand(VSCommand.setContext, Context.inspectedProject, true);

  console.log(`Analysed Project in ${Date.now() - startedOp}ms`);
  return { project, packages };
}

function setPackageManager(folder: string) {
  ionicState.packageManager = PackageManager.npm;
  const yarnLock = path.join(folder, 'yarn.lock');
  const pnpmLock = path.join(folder, 'pnpm-lock.yaml');
  if (fs.existsSync(yarnLock)) {
    ionicState.packageManager = PackageManager.yarn;
  } else if (fs.existsSync(pnpmLock)) {
    ionicState.packageManager = PackageManager.pnpm;
  }
}
