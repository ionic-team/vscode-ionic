'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { reviewProject } from './project';
import { Recommendation } from './recommendation';
import { Context, VSCommand } from './context-variables';
import { starterProject } from './ionic-start';
import { isFolderBasedMonoRepo, MonoRepoProject, MonoRepoType } from './monorepo';
import { PackageManager } from './node-commands';
import { Tip } from './tip';
import { CapacitorPlatform } from './capacitor-platform';

interface IonicState {
  view: vscode.TreeView<any>;
  skipAuth: boolean;
  projects: Array<MonoRepoProject>;
  repoType: MonoRepoType;
  packageManager: PackageManager;
  workspace: string; // Monorepo workspace name
  context: vscode.ExtensionContext;
  shell?: string;
  projectsView: vscode.TreeView<any>;
  selectedAndroidDevice?: string;
  selectedIOSDevice?: string;
  selectedAndroidDeviceName?: string;
  selectedIOSDeviceName?: string;
  projectDirty?: boolean; // Was there a likely change in the project (ie file saved)
  syncDone: Array<string>; // Was a cap sync done for a particular platform
  outputIsFocused: boolean; // True if the output window is focused
  channelFocus: boolean; // Whether to focus the output window
  refreshDebugDevices: boolean; // Should we refresh the list of debuggable devices
  remoteLogging: boolean; // Whether remote logging is enabled
  hasNodeModules: boolean; // Whether node modules are installed
  configuration: string; // Build configuration
  project: string; // Angular project name
  nvm: string; // If .nvmrc is used will contain its contents
  rootFolder: string; // The folder to inspect
  runIOS: Tip;
  runAndroid: Tip;
  runWeb: Tip;
  lastRun: CapacitorPlatform;
}
export const ionicState: IonicState = {
  view: undefined,
  context: undefined,
  skipAuth: false,
  projects: [],
  projectsView: undefined,
  repoType: MonoRepoType.none,
  packageManager: PackageManager.npm,
  workspace: undefined,
  outputIsFocused: false,
  channelFocus: true,
  hasNodeModules: undefined,
  syncDone: [],
  refreshDebugDevices: false,
  remoteLogging: false,
  runIOS: undefined,
  runAndroid: undefined,
  runWeb: undefined,
  nvm: undefined,
  rootFolder: undefined,
  lastRun: undefined,
  configuration: undefined,
  project: undefined,
};

interface FolderInfo {
  packageJsonExists: boolean;
  folderBased: boolean;
  folder: string;
}

let folderInfoCache: FolderInfo = undefined;

export class IonicTreeProvider implements vscode.TreeDataProvider<Recommendation> {
  private _onDidChangeTreeData: vscode.EventEmitter<Recommendation | undefined | void> = new vscode.EventEmitter<
    Recommendation | undefined | void
  >();
  readonly onDidChangeTreeData: vscode.Event<Recommendation | undefined | void> = this._onDidChangeTreeData.event;

  selectedProject: string;

  constructor(private workspaceRoot: string | undefined, private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getParent(element: Recommendation) {
    return undefined;
  }

  getTreeItem(element: Recommendation): vscode.TreeItem {
    return element;
  }

  selectProject(project: string) {
    this.selectedProject = project;
    this.refresh();
  }

  getChildren(element?: Recommendation): Thenable<Recommendation[]> {
    if (!this.workspaceRoot) {
      vscode.commands.executeCommand(VSCommand.setContext, Context.noProjectFound, true);
      return Promise.resolve([]);
    }
    vscode.commands.executeCommand(VSCommand.setContext, Context.noProjectFound, false);

    if (element) {
      if (element.whenExpanded) {
        return element.whenExpanded();
      } else {
        return Promise.resolve(element.children);
      }
    } else {
      let folderInfo: FolderInfo = folderInfoCache;
      if (!folderInfo || folderInfo.folder != this.workspaceRoot || !folderInfo.packageJsonExists) {
        folderInfo = this.getFolderInfo(this.workspaceRoot);
        folderInfoCache = folderInfo;
      }
      if (folderInfo.packageJsonExists || folderInfo.folderBased) {
        return reviewProject(this.workspaceRoot, this.context, this.selectedProject);
      } else {
        return Promise.resolve(starterProject(this.workspaceRoot));
      }
    }
  }

  private getFolderInfo(folder: string): FolderInfo {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    const folders = isFolderBasedMonoRepo(this.workspaceRoot);
    const packageJsonExists = this.pathExists(packageJsonPath);
    const folderBased = folders.length > 0 && !packageJsonExists;

    return {
      packageJsonExists,
      folderBased,
      folder,
    };
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }

    return true;
  }
}
