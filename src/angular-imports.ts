import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Range, TextDocument, Uri, WorkspaceEdit, commands, workspace } from 'vscode';
import { toPascalCase } from './utilities';
import { write, writeIonic } from './logging';
import { basename } from 'path';

export async function autoFixAngularImports(document: TextDocument, component: string): Promise<boolean> {
  // Validate that the file changed was a .html file that also has a .ts file which uses @ionic standalone
  if (!document.fileName.endsWith('.html')) return false;
  const tsFile = document.fileName.replace(new RegExp('.html$'), '.ts');
  if (!existsSync(tsFile)) return false;
  const edit = new WorkspaceEdit();
  const tsUri = Uri.file(tsFile);
  const tsDoc = await workspace.openTextDocument(tsUri);

  const tsText = readFileSync(tsFile, 'utf-8');
  const htmlText = document.getText();
  if (!tsText.includes(`'@ionic/angular/standalone'`)) return false;
  if (!component.startsWith('ion-')) return false;

  // Search for each Ionic Component in the template html and see if it is missing in the Typescript imports
  const components = [
    'ion-action-sheet',
    'ion-accordion',
    'ion-accordion-group',
    'ion-alert',
    'ion-badge',
    'ion-breadcrumb',
    'ion-button',
    'ion-ripple-effect',
    'ion-card',
    'ion-card-content',
    'ion-card-header',
    'ion-card-subtitle',
    'ion-card-title',
    'ion-checkbox',
    'ion-chip',
    'ion-app',
    'ion-content',
    'ion-datetime',
    'ion-datetime-button',
    'ion-picker',
    'ion-fab',
    'ion-fab-button',
    'ion-fab-list',
    'ion-grid',
    'ion-col',
    'ion-row',
    'ion-infinite-scroll',
    'ion-infinite-scroll-content',
    'ion-icon',
    'ion-input',
    'ion-textarea',
    'ion-item',
    'ion-item-divider',
    'ion-item-group',
    'ion-item-sliding',
    'ion-item-options',
    'ion-item-option',
    'ion-label',
    'ion-note',
    'ion-list',
    'ion-list-header',
    'ion-avatar',
    'ion-img',
    'ion-split-pane',
    'ion-modal',
    'ion-backdrop',
    'ion-nav',
    'ion-nav-link',
    'ion-popover',
    'ion-loading',
    'ion-progress-bar',
    'ion-skeleton-text',
    'ion-spinner',
    'ion-radio',
    'ion-radio-group',
    'ion-range',
    'ion-refresher',
    'ion-refresher-content',
    'ion-reorder',
    'ion-reorder-group',
    'ion-router',
    'ion-router-link',
    'ion-router-outlet',
    'ion-route',
    'ion-route-redirect',
    'ion-searchbar',
    'ion-segment',
    'ion-segment-button',
    'ion-tabs',
    'ion-tab',
    'ion-tab-bar',
    'ion-tab-button',
    'ion-toast',
    'ion-toggle',
    'ion-toolbar',
    'ion-header',
    'ion-footer',
    'ion-title',
    'ion-buttons',
    'ion-back-button',
    'ion-text',
  ];
  if (!components.includes(component)) {
    // Not a knowm Ionic Component
    return false;
  }

  let newTs = tsText;
  const imported = [];
  const htmlHasComponent = htmlText.includes(`<${component}`);
  const importName = toPascalCase(component);
  const tsHasImport = tsText.includes(importName);
  if (htmlHasComponent && !tsHasImport) {
    newTs = addImport(newTs, importName);
    imported.push(importName);
  }

  if (newTs !== tsText) {
    edit.replace(
      Uri.file(tsFile),
      new Range(tsDoc.lineAt(0).range.start, tsDoc.lineAt(tsDoc.lineCount - 1).range.end),
      newTs,
    );
    await workspace.applyEdit(edit);
    // Unfortunately you cannot call format document on anything other than the active document
    // commands.executeCommand('editor.action.formatDocument', Uri.file(tsFile));

    return true;
  }
  return false;
}

function addImport(ts: string, importName: string): string {
  // We need to look for import { IonText } from '@ionic/angular/standalone';
  // and add importName to the list
  ts = ts.replace(`} from '@ionic/angular/standalone'`, `,${importName} } from '@ionic/angular/standalone'`);
  ts = ts.replace(`} from "@ionic/angular/standalone"`, `,${importName} } from "@ionic/angular/standalone"`);
  const regEx = /,(?=\s+,)/;
  ts = ts.replace(regEx, '');
  ts = ts.replace(`imports: [`, `imports: [${importName}, `);
  return ts;
}
