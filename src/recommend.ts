import * as vscode from 'vscode';

import { deprecatedPackages, exists, isGreaterOrEqual } from './analyzer';
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
import { cmdCtrl, getRunOutput, showProgress } from './utilities';
import { startLogServer } from './log-server';
import { getConfigurationName } from './build-configuration';
import { liveReloadSSL } from './live-reload';
import { npmInstall, npmUninstall } from './node-commands';
import { writeIonic } from './extension';
import { capacitorBuild } from './capacitor-build';
import { getSetting, setSetting, WorkspaceSetting } from './workspace-state';

export async function getRecommendations(
  project: Project,
  context: vscode.ExtensionContext,
  packages: any
): Promise<void> {
  if (project.isCapacitor) {
    project.setGroup(`Run`, `Press ${cmdCtrl()}+R to run the last chosen platform or Web.`, TipType.Ionic, true);

    const hasCapIos = project.hasCapacitorProject(CapacitorPlatform.ios);
    const hasCapAndroid = project.hasCapacitorProject(CapacitorPlatform.android);

    const runWeb = new Tip('Web', '', TipType.Run, 'Serve', undefined, 'Running on Web', `Project Served`)
      .setDynamicCommand(ionicServe, project, false)
      .requestIPSelection()
      .setFeatures([TipFeature.viewInEditor])
      .setRunPoints([
        { title: 'Building...', text: 'Generating browser application bundles' },
        { title: 'Serving', text: 'Development server running' },
      ])
      .canStop()
      .canAnimate()
      .setTooltip('Run a development server and open using the default web browser');
    project.add(runWeb);
    ionicState.runWeb = runWeb;

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
      const runAndroid = new Tip(title, '', TipType.Run, 'Run', undefined, 'Running', 'Project is running')
        .requestDeviceSelection()
        .requestIPSelection()
        .setDynamicCommand(capacitorRun, project, CapacitorPlatform.android)
        .setSecondCommand('Getting Devices', capacitorDevicesCommand(CapacitorPlatform.android))
        .setData(project.projectFolder())
        .setRunPoints(runPoints)
        .canStop()
        .canAnimate()
        .canRefreshAfter()
        .setSyncOnSuccess(CapacitorPlatform.android)
        .setContextValue(Context.selectDevice);

      project.add(runAndroid);
      ionicState.runAndroid = runAndroid;
    }
    if (hasCapIos) {
      const title = ionicState.selectedIOSDevice ? `${ionicState.selectedIOSDeviceName}` : 'iOS';
      const runIos = new Tip(title, '', TipType.Run, 'Run', undefined, 'Running', 'Project is running')
        .requestDeviceSelection()
        .requestIPSelection()
        .setDynamicCommand(capacitorRun, project, CapacitorPlatform.ios)
        .setSecondCommand('Getting Devices', capacitorDevicesCommand(CapacitorPlatform.ios))
        .setData(project.projectFolder())
        .setRunPoints(runPoints)
        .canStop()
        .canAnimate()
        .canRefreshAfter()
        .setSyncOnSuccess(CapacitorPlatform.ios)
        .setContextValue(Context.selectDevice);
      project.add(runIos);
      ionicState.runIOS = runIos;
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
      new Tip('Build', getConfigurationName(), TipType.Build, 'Build', undefined, 'Building', undefined)
        .setDynamicCommand(ionicBuild, project)
        .setContextValue(Context.buildConfig)
        .canStop()
        .canAnimate()
        .setTooltip(
          hasCapIos || hasCapAndroid
            ? 'Builds the web project and copies to native platforms'
            : 'Builds the web project'
        )
    );

    if (hasCapIos || hasCapAndroid) {
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
    if (hasCapAndroid || hasCapIos) {
      // cap build was added in v4.4.0
      if (isGreaterOrEqual('@capacitor/core', '4.4.0')) {
        project.add(
          new Tip(
            'Prepare Release Build',
            '',
            TipType.Build,
            'Capacitor Build',
            undefined,
            'Preparing Release Build',
            undefined
          )
            .setAction(capacitorBuild, project)
            .canAnimate()
            .setTooltip('Prepares native binaries suitable for uploading to the App Store or Play Store.')
        );
      }
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
  project.add(useHttps(project));
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

  // Support tickets require Zendesk integration
  //project.add(new Tip('Ionic Support', '', TipType.Ionic).setAction(supportTicket, project));
}

async function supportTicket(project: Project): Promise<void> {
  const url =
    'https://ionic.zendesk.com/hc/en-us/requests/new?tf_subject=blar&tf_description=desc&tf_anonymous_requester_email=blar@blar.com';
  await vscode.env.openExternal(vscode.Uri.parse(url));
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
  const liveReload = getSetting(WorkspaceSetting.liveReload);
  return new Tip('Live Reload', undefined, liveReload ? TipType.Check : TipType.Box, undefined)
    .setTooltip('Live reload will refresh the app whenever source code is changed.')
    .setAction(toggleLiveReload, liveReload)
    .canRefreshAfter();
}

function useHttps(project: Project): Tip {
  if (!exists('@angular/core')) return;
  const useHttps = getSetting(WorkspaceSetting.httpsForWeb);
  return new Tip('Use HTTPS', undefined, useHttps ? TipType.Check : TipType.Box, undefined)
    .setTooltip('Use HTTPS when running with web or Live Reload.')
    .setAction(toggleHttps, useHttps, project)
    .canRefreshAfter();
}

function externalAddress(): Tip {
  if (!exists('@angular/core')) return;
  const externalIP = getSetting(WorkspaceSetting.externalAddress);
  return new Tip('External Address', undefined, externalIP ? TipType.Check : TipType.Box, undefined)
    .setTooltip(
      'Using an external IP Address allows you to navigate to your application from other devices on the network.'
    )
    .setAction(toggleExternalAddress, externalIP)
    .canRefreshAfter();
}

function viewInEditor(): Tip {
  const viewInEditor = getSetting(WorkspaceSetting.previewInEditor);
  return new Tip('View In Editor', undefined, viewInEditor ? TipType.Check : TipType.Box, undefined)
    .setTooltip('Whether the app will be previewed in VS Code rather than a web browser')
    .setAction(toggleViewInEditor, viewInEditor)
    .canRefreshAfter();
}

function toggleRemoteLogging(project: Project, current: boolean): Promise<void> {
  if (startLogServer(project.folder)) {
    ionicState.remoteLogging = !current;
  }
  return;
}

async function toggleLiveReload(current: boolean) {
  await setSetting(WorkspaceSetting.liveReload, !current);
}

async function toggleHttps(current: boolean, project: Project) {
  await setSetting(WorkspaceSetting.httpsForWeb, !current);
  if (!current) {
    await showProgress('Enabling HTTPS', async () => {
      writeIonic('Installing @jcesarmobile/ssl-skip');
      await getRunOutput(npmInstall('@jcesarmobile/ssl-skip'), project.folder);
      await liveReloadSSL(project);
    });
  } else {
    await showProgress('Disabling HTTPS', async () => {
      writeIonic('Uninstalling @jcesarmobile/ssl-skip');
      await getRunOutput(npmUninstall('@jcesarmobile/ssl-skip'), project.folder);
    });
  }
}

async function toggleExternalAddress(current: boolean) {
  await setSetting(WorkspaceSetting.externalAddress, !current);
}

async function toggleViewInEditor(current: boolean) {
  await setSetting(WorkspaceSetting.previewInEditor, !current);
}
