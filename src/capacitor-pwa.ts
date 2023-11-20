import { window } from 'vscode';
import { Project } from './project';
import { ActionResult } from './command-name';
import { ignore } from './ignore';
import { ionicState } from './ionic-tree-provider';
import { Tip } from './tip';
import { runCommands } from './advanced-actions';
import { npx } from './node-commands';

export async function integratePWA(project: Project, tip: Tip): Promise<void> {
  const result = await window.showInformationMessage(
    `Progressive Web Application (PWA) Integration - This will add @angular/pwa to your project and make changes in your project to make it a PWA (manifest file, splash screen and icon resources).`,
    'Apply Changes',
    'Ignore'
  );
  if (result == 'Ignore') {
    ignore(tip, ionicState.context);
    return;
  }
  if (!result) {
    return;
  }
  await runCommands(
    [`${npx(project.packageManager)} ng add @angular/pwa --defaults --skip-confirmation true`],
    'Adding @angular/pwa',
    project
  );
}
