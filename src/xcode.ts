import { join } from 'path';
import { Project } from './project';
import { project } from 'xcode';
import * as plist from 'simple-plist';
import { existsSync, writeFileSync } from 'fs';
import { QueueFunction, Tip, TipType } from './tip';
import { ExtensionContext, window } from 'vscode';
import { writeError, writeIonic } from './logging';
import { exists } from './analyzer';
import { openUri, replaceAll } from './utilities';
import { privacyManifestRules } from './privacy-manifest';
import { LastManifestCheck } from './context-variables';
import { clearRefreshCache } from './process-packages';

interface XCProject {
  p: any;
  projectFolder: string;
  projectFilePath: string;
}

const oneHour = 60 * 1000 * 60;

export async function checkPrivacyManifest(project: Project, context: ExtensionContext): Promise<void> {
  const lastManifestCheck = getLastManifestCheck(context);
  if (lastManifestCheck < oneHour) {
    return;
  }
  const xc = await getXCProject(project);
  const pFiles = xc.p.pbxFileReferenceSection();
  const files = Object.keys(pFiles);
  const found = files.find((f) => pFiles[f].path?.includes('.xcprivacy'));
  if (found) {
    // Has a .xcprivacy file
    investigatePrivacyManifest(project, replaceAll(pFiles[found].path, '"', ''), context);
    setLastManifestCheck(context);
    return;
  }
  const title = 'Add Privacy Manifest';
  project.add(
    new Tip(title, '', TipType.Warning)
      .setQueuedAction(createPrivacyManifest, project, context)
      .setTooltip('A Privacy Manifest file is required by Apple when submitting your app to the App Store.')
      .canRefreshAfter()
      .canIgnore(),
  );
  setLastManifestCheck(context);
  return undefined;
}

function setLastManifestCheck(context: ExtensionContext) {
  context.workspaceState.update(LastManifestCheck, new Date().getTime());
}

function getLastManifestCheck(context: ExtensionContext): number {
  const v = parseInt(context.workspaceState.get(LastManifestCheck));
  return new Date().getTime() - (isNaN(v) ? 0 : v);
}
async function investigatePrivacyManifest(project: Project, filename: string, context: ExtensionContext) {
  const path = join(iosFolder(project), filename);
  if (!existsSync(path)) {
    writeError(`Unable to find privacy manifest file from XCode project: ${path}`);
    return;
  }
  try {
    const data = plist.readFileSync(path);
    for (const requirement of privacyManifestRules) {
      if (exists(requirement.plugin)) {
        if (!hasAPIType(data, requirement.category)) {
          project.add(
            new Tip(`Missing Privacy Manifest Category`, '', TipType.Error)
              .setQueuedAction(
                setPrivacyCategory,
                context,
                path,
                requirement.plugin,
                requirement.category,
                requirement.reasons,
                requirement.reasonUrl,
              )
              .setTooltip(`${requirement.plugin} requires that the privacy manifest specifies ${requirement.category}.`)
              .canRefreshAfter()
              .canIgnore(),
          );
        } else {
          const reasons = APITypeReason(data, requirement.category);
          if (!reasons || reasons.length == 0) {
            project.add(
              new Tip(`Missing Privacy Manifest Reason`, '', TipType.Error)
                .setQueuedAction(
                  setPrivacyCategory,
                  context,
                  path,
                  requirement.plugin,
                  requirement.category,
                  requirement.reasons,
                  requirement.reasonUrl,
                )
                .setTooltip(
                  `${requirement.plugin} requires that the privacy manifest has a reason for the category ${requirement.category}.`,
                )
                .canRefreshAfter()
                .canIgnore(),
            );
          }
        }
      }
    }
  } catch (e) {
    writeError(`Unable to parse plist file: ${path}: ${e}`);
  }
}

async function setPrivacyCategory(
  queueFunction: QueueFunction,
  context: ExtensionContext,
  privacyFilename: string,
  plugin: string,
  category: string,
  reasons: string[],
  reasonUrl: string,
): Promise<void> {
  const result = await window.showInformationMessage(
    `The Privacy Manifest file in your XCode project requires ${category} and a reason code for using it because ${plugin} uses this feature.`,
    'Docs',
    ...reasons,
    'Exit',
  );
  if (result === 'Docs') {
    openUri(reasonUrl);
    return;
  }
  if (result === 'Exit') {
    return;
  }
  queueFunction();

  const data: any = plist.readFileSync(privacyFilename);
  if (!data.NSPrivacyAccessedAPITypes) {
    data.NSPrivacyAccessedAPITypes = [];
  }
  const found = data.NSPrivacyAccessedAPITypes.find((t) => t.NSPrivacyAccessedAPIType == category);
  if (found) {
    if (!found.NSPrivacyAccessedAPITypeReasons) {
      found.NSPrivacyAccessedAPITypeReasons = [];
    }
    found.NSPrivacyAccessedAPITypeReasons.push(result);
  } else {
    data.NSPrivacyAccessedAPITypes.push({
      NSPrivacyAccessedAPIType: category,
      NSPrivacyAccessedAPITypeReasons: [result],
    });
  }
  plist.writeFileSync(privacyFilename, data);
  clearRefreshCache(context);
}

// name: eg NSPrivacyAccessedAPICategoryUserDefaults
// data
function hasAPIType(data: any, name: string): boolean {
  if (!data.NSPrivacyAccessedAPITypes || data.NSPrivacyAccessedAPITypes.length == 0) {
    return false;
  }
  const found = data.NSPrivacyAccessedAPITypes.find((t: any) => t.NSPrivacyAccessedAPIType == name);
  if (found) {
    return true;
  }
  return false;
}

function APITypeReason(data: any, name: string): string[] | undefined {
  if (!data.NSPrivacyAccessedAPITypes || data.NSPrivacyAccessedAPITypes.length == 0) {
    return;
  }
  const found = data.NSPrivacyAccessedAPITypes.find((t) => t.NSPrivacyAccessedAPIType == name);
  if (found) {
    return found.NSPrivacyAccessedAPITypeReasons ?? [];
  }
  return;
}

function XCodeProjFolder(project: Project): string {
  return join(iosFolder(project), 'App.xcodeproj');
}

function iosFolder(project: Project): string {
  return join(project.projectFolder(), 'ios', 'App');
}

async function getXCProject(project: Project): Promise<XCProject> {
  const projectFolder = XCodeProjFolder(project);
  const path = join(projectFolder, 'project.pbxproj');
  if (!existsSync(path)) {
    // iOS project not found
    return;
  }
  const p = await parse(path);
  return { projectFilePath: path, projectFolder, p };
}

async function createPrivacyManifest(queueFunction: QueueFunction, project: Project, context: ExtensionContext) {
  const result = await window.showInformationMessage(
    `A Privacy Manifest file is required by Apple when submitting your app to the App Store. Would you like to create one?`,
    'Yes',
    'More Information',
    'Exit',
  );
  if (result == 'More Information') {
    openUri('https://developer.apple.com/support/third-party-SDK-requirements/');
    return;
  }
  if (result !== 'Yes') {
    return;
  }
  queueFunction();

  try {
    const xc = await getXCProject(project);
    const filename = 'PrivacyInfo.xcprivacy';
    const path = writeManifestFile(iosFolder(project), filename);

    const res = xc.p.addPbxGroup([], 'Resources', undefined, undefined);

    const r3 = xc.p.getPBXGroupByKey('504EC2FB1FED79650016851F', 'PBXGroup');
    const r2 = xc.p.addResourceFile(filename, {}, res.uuid);
    r3.children.push({ value: r2.fileRef, comment: 'Resources' });
    writeFileSync(xc.projectFilePath, xc.p.writeSync());
    writeIonic('A privacy manifest file was added to your project.');
  } catch (e) {
    writeError(`Unable to create privacy manifest file: ${e}`);
  }
  clearRefreshCache(context);
}

function writeManifestFile(iosFolder: string, filename: string): string {
  const content = `<?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array/>
	<key>NSPrivacyCollectedDataTypes</key>
	<array/>
   </dict>
   </plist>`;
  const f = join(iosFolder, filename);
  writeFileSync(f, content);
  return f;
}

async function parse(path: string): Promise<any> {
  return new Promise((resolve) => {
    const p = project(path);
    p.parse((err: any) => {
      resolve(p);
    });
  });
}
