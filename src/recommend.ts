import * as vscode from 'vscode';

import { deprecatedPackages, exists } from './analyzer';
import { reviewCapacitorConfig } from './capacitor-configure';
import { ionicBuild } from './ionic-build';
import { ionicServe } from './ionic-serve';
import { Project } from './project';
import { addSplashAndIconFeatures } from './splash-icon';
import { RunPoint, Tip, TipFeature, TipType } from './tip';
import { capacitorMigrationChecks as checkCapacitorMigrationRules } from './rules-capacitor-migration';
import { reviewPackages, reviewPluginProperties } from './process-packages';
import { capacitorDevicesCommand, capacitorRun } from './capacitor-run';
import { capacitorRecommendations, checkCapacitorRules } from './rules-capacitor';
import { checkCordovaPlugins, checkCordovaRules } from './rules-cordova';
import { webProject } from './rules-web-project';
import { checkPackages, checkRemoteDependencies } from './rules-packages';
import { checkDeprecatedPlugins } from './rules-deprecated-plugins';
import { capacitorSync } from './capacitor-sync';
import { capacitorOpen } from './capacitor-open';
import { CapacitorPlatform } from './capacitor-platform';
import { addScripts } from './scripts';
import { Context } from './context-variables';
import { ionicState } from './ionic-tree-provider';
import { getAndroidWebViewList } from './android-debug-list';
import { getDebugBrowserName } from './editor-preview';
import { checkIonicNativePackages } from './rules-ionic-native';
import { startLogServer as startStopLogServer } from './log-server';
import { analyzeSize } from './analyze-size';

export async function getRecommendations(
  project: Project,
  context: vscode.ExtensionContext,
  packages: any
): Promise<void> {
  if (project.isCapacitor && !project.isCordova) {
    project.setGroup(`Run`, 'Options to run on various platforms', TipType.Ionic, true);

    const hasCapIos = project.hasCapacitorProject(CapacitorPlatform.ios);
    const hasCapAndroid = project.hasCapacitorProject(CapacitorPlatform.android);

    project.add(
      new Tip('Web', '', TipType.Run, 'Serve', undefined, 'Running on Web', `Project Served`)
        .setDynamicCommand(ionicServe, project, false)
        .requestIPSelection()
        .setFeatures([TipFeature.viewInEditor])
        .setRunPoints([
          { title: 'Building...', text: 'Generating browser application bundles' },
          { title: 'Serving', text: 'Development server running' },
        ])
        .canStop()
        .canAnimate()
        .setTooltip('Run a development server and open using the default web browser')
    );

    // project.add(new Tip('View In Editor', '', TipType.Run, 'Serve', undefined, 'Running on Web', `Project Served`).setAction(viewInEditor, 'http://localhost:8100'));
    const runPoints: Array<RunPoint> = [
      { text: 'Copying web assets', title: 'Copying...' },
      { text: 'ng run app:build', title: 'Building Web...' },
      { text: 'capacitor run', title: 'Syncing...' },
      { text: '✔ update ios', title: 'Building Native...' },
      { text: '✔ update android', title: 'Building Native...' },
      { text: 'Running Gradle build', title: 'Deploying...' },
      { text: 'Running xcodebuild', title: 'Deploying...' },
      { text: 'App deployed', title: 'Waiting for Code Changes', refresh: true },
    ];

    if (hasCapAndroid) {
      const title = ionicState.selectedAndroidDevice ? `${ionicState.selectedAndroidDeviceName}` : 'Android';
      project.add(
        new Tip(title, '', TipType.Run, 'Run', undefined, 'Running', 'Project is running')
          .requestDeviceSelection()
          .requestIPSelection()
          .setDynamicCommand(capacitorRun, project, CapacitorPlatform.android)
          .setSecondCommand('Getting Devices', capacitorDevicesCommand(CapacitorPlatform.android))
          .setData(project.projectFolder())
          .setRunPoints(runPoints)
          .canStop()
          .canAnimate()
          .canRefreshAfter()
          .setContextValue(Context.selectDevice)
      );
    }
    if (hasCapIos) {
      const title = ionicState.selectedIOSDevice ? `${ionicState.selectedIOSDeviceName}` : 'iOS';
      project.add(
        new Tip(title, '', TipType.Run, 'Run', undefined, 'Running', 'Project is running')
          .requestDeviceSelection()
          .requestIPSelection()
          .setDynamicCommand(capacitorRun, project, CapacitorPlatform.ios)
          .setSecondCommand('Getting Devices', capacitorDevicesCommand(CapacitorPlatform.ios))
          .setData(project.projectFolder())
          .setRunPoints(runPoints)
          .canStop()
          .canAnimate()
          .canRefreshAfter()
          .setContextValue(Context.selectDevice)
      );
    }

    const r = project.setGroup(
      'Debug',
      'Running Ionic applications you can debug',
      TipType.Ionic,
      ionicState.refreshDebugDevices,
      Context.refreshDebug
    );
    r.whenExpanded = async () => {
      return [
        project.asRecommendation(debugOnWeb(project)),
        ...(await getAndroidWebViewList(hasCapAndroid, project.getDistFolder())),
      ];
    };

    project.setGroup(`Capacitor`, 'Capacitor Features', TipType.Capacitor, true);
    project.add(
      new Tip('Build', '', TipType.Build, 'Build', undefined, 'Building', undefined)
        .setDynamicCommand(ionicBuild, project)
        .setContextValue(Context.buildConfig)
        .canStop()
        .canAnimate()
        .setTooltip('Builds the web project')
    );

    if (exists('@capacitor/core')) {
      project.add(
        new Tip('Sync', '', TipType.Sync, 'Capacitor Sync', undefined, 'Syncing', undefined)
          .setDynamicCommand(capacitorSync, project)
          .canStop()
          .canAnimate()
          .setTooltip(
            'Capacitor Sync copies the web app build assets to the native projects and updates native plugins and dependencies.'
          )
      );
    }
    if (hasCapIos) {
      project.add(
        new Tip('Open in Xcode', '', TipType.Edit, 'Opening Project in Xcode', undefined, 'Open Project in Xcode')
          .showProgressDialog()
          .setDynamicCommand(capacitorOpen, project, CapacitorPlatform.ios)
          .setTooltip('Opens the native iOS project in XCode')
      );
    }
    if (hasCapAndroid) {
      project.add(
        new Tip(
          'Open in Android Studio',
          '',
          TipType.Edit,
          'Opening Project in Android Studio',
          undefined,
          'Open Android Studio'
        )
          .showProgressDialog()
          .setDynamicCommand(capacitorOpen, project, CapacitorPlatform.android)
          .setTooltip('Opens the native Android project in Android Studio')
      );
    }
  }

  // Script Running
  addScripts(project);

  if (project.isCapacitor || project.hasACapacitorProject()) {
    // Capacitor Configure Features
    project.setGroup(
      `Configuration`,
      'Configurations for native project. Changes made apply to both the iOS and Android projects',
      TipType.Capacitor,
      false
    );
    await reviewCapacitorConfig(project, context);
  }

  if (project.isCapacitor) {
    // Splash Screen and Icon Features
    addSplashAndIconFeatures(project);
  }

  project.setGroup(
    `Recommendations`,
    `The following recommendations were made by analyzing the package.json file of your ${project.type} app.`,
    TipType.Idea,
    true
  );

  // General Rules around node modules (eg Jquery)
  checkPackages(project);

  // Deprecated removals
  for (const deprecated of deprecatedPackages(packages)) {
    project.recommendRemove(
      deprecated.name,
      deprecated.name,
      `${deprecated.name} is deprecated: ${deprecated.message}`
    );
  }

  checkRemoteDependencies(project);

  // Deprecated plugins
  checkDeprecatedPlugins(project);

  if (project.isCordova) {
    checkCordovaRules(project);
    checkCapacitorMigrationRules(packages, project);
  } else if (project.isCapacitor) {
    checkCapacitorRules(project);
    checkIonicNativePackages(packages, project);
    checkCordovaPlugins(packages, project);
    project.tips(capacitorRecommendations(project));
  } else {
    // The project is not using Cordova or Capacitor
    webProject(project);
  }

  // Package Upgrade Features
  reviewPackages(packages, project);

  // Plugin Properties
  reviewPluginProperties(packages, project);

  project.setGroup(`Settings`, 'Settings', TipType.Settings, false);
  project.add(externalAddress());
  project.add(liveReload());
  project.add(viewInEditor());

  // REMOTE LOGGING ENABLED ################
  //project.add(remoteLogging(project));

  project.add(new Tip('Advanced', '', TipType.Settings));

  // Support and Feedback
  project.setGroup(`Support`, 'Feature requests and bug fixes', TipType.Ionic, false);
  project.add(
    new Tip(
      'Provide Feedback',
      '',
      TipType.Comment,
      undefined,
      undefined,
      undefined,
      undefined,
      `https://github.com/ionic-team/vscode-extension/issues`
    )
  );

  project.add(new Tip('Project Statistics', '', TipType.Dependency).setAction(analyzeSize, project));

  project.add(
    new Tip(
      'Ionic Framework',
      '',
      TipType.Ionic,
      undefined,
      undefined,
      undefined,
      undefined,
      `https://ionicframework.com`
    )
  );
}

function debugOnWeb(project: Project): Tip {
  return new Tip('Web', `(${getDebugBrowserName()})`, TipType.Debug, 'Serve', undefined, 'Debugging', `Project Served`)
    .setDynamicCommand(ionicServe, project, true)
    .setFeatures([TipFeature.debugOnWeb])
    .setRunPoints([
      { title: 'Building...', text: 'Generating browser application bundles' },
      { title: 'Serving', text: 'Development server running' },
    ])
    .canStop()
    .canAnimate()
    .setTooltip(`Debug using ${getDebugBrowserName()}. The browser can be changed in Settings.`);
}

function remoteLogging(project: Project): Tip {
  return new Tip('Remote Logging', undefined, ionicState.remoteLogging ? TipType.Check : TipType.Box, undefined)
    .setTooltip('Captures console logs from the device and displays in the output window')
    .setAction(toggleRemoteLogging, project, ionicState.remoteLogging)
    .canRefreshAfter();
}

function liveReload(): Tip {
  const liveReload = vscode.workspace.getConfiguration('ionic').get('liveReload');
  return new Tip('Live Reload', undefined, liveReload ? TipType.Check : TipType.Box, undefined)
    .setTooltip('Live reload will refresh the app whenever source code is changed.')
    .setAction(toggleLiveReload, liveReload)
    .canRefreshAfter();
}

function externalAddress(): Tip {
  const externalIP = vscode.workspace.getConfiguration('ionic').get('externalAddress');
  return new Tip('External Address', undefined, externalIP ? TipType.Check : TipType.Box, undefined)
    .setTooltip(
      'Using an external IP Address allows you to navigate to your application from other devices on the network.'
    )
    .setAction(toggleExternalAddress, externalIP)
    .canRefreshAfter();
}

function viewInEditor(): Tip {
  const viewInEditor = vscode.workspace.getConfiguration('ionic').get('previewInEditor');
  return new Tip('View In Editor', undefined, viewInEditor ? TipType.Check : TipType.Box, undefined)
    .setTooltip('Whether the app will be previewed in VS Code rather than a web browser')
    .setAction(toggleViewInEditor, viewInEditor)
    .canRefreshAfter();
}

function toggleRemoteLogging(project: Project, current: boolean) {
  if (startStopLogServer(project.folder)) {
    ionicState.remoteLogging = !current;
  }
}

async function toggleLiveReload(current: boolean) {
  await vscode.workspace.getConfiguration('ionic').update('liveReload', !current);
}

async function toggleExternalAddress(current: boolean) {
  await vscode.workspace.getConfiguration('ionic').update('externalAddress', !current);
}

async function toggleViewInEditor(current: boolean) {
  await vscode.workspace.getConfiguration('ionic').update('previewInEditor', !current);
}
