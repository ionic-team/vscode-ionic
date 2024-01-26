import { existsSync } from 'fs';
import { Range, TextDocument, Uri, WorkspaceEdit, workspace } from 'vscode';
import { toPascalCase } from './utilities';
import { IonicComponents } from './imports-auto-fix';

export async function autoFixAngularImports(document: TextDocument, component: string): Promise<boolean> {
  // Validate that the file changed was a .html file that also has a .ts file which uses @ionic standalone
  if (!document.fileName.endsWith('.html')) return false;
  const tsFile = document.fileName.replace(new RegExp('.html$'), '.ts');
  if (!existsSync(tsFile)) return false;
  const edit = new WorkspaceEdit();
  const tsDoc = await workspace.openTextDocument(Uri.file(tsFile));

  // const tsText = readFileSync(tsFile, 'utf-8');
  const tsText = tsDoc.getText();
  const htmlText = document.getText();

  if (!tsText.includes(`'@ionic/angular/standalone'`)) return false;
  if (!component.startsWith('ion-')) return false;

  if (!IonicComponents.includes(component)) {
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
