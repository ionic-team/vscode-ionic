import { Range, TextDocument, Uri, workspace, WorkspaceEdit } from 'vscode';
import { Parser } from 'htmlparser2';
import { existsSync, readFileSync } from 'fs';
import { Project } from 'ts-morph';
import { ionicState } from './ionic-tree-provider';
import { join } from 'path';
import { writeError } from './logging';
import { exists } from './analyzer';

export async function autoFixOtherImports(document: TextDocument): Promise<boolean> {
  // Look for <ion-icon name="icon-name"></ion-icon> in file.html
  // Then inspect file.ts to see if it has an import for icon-name
  // If it does not then add an import
  try {
    if (!exists('@ionic/angular')) {
      return false; // Only needed for Angular
    }
    // Load node_modules/ionicons/icons/index.d.ts and verify that the icon exists
    const availableIcons = getAvailableIcons();
    const icons: string[] = [];
    const doc = new Parser({
      onopentag(name, attributes) {
        if (name == 'ion-icon') {
          if (attributes.name) {
            if (availableIcons.includes(camelize(attributes.name))) {
              if (!icons.includes(attributes.name)) {
                icons.push(attributes.name);
              }
            } else {
              if (availableIcons.length == 0) {
                icons.push(attributes.name); // Assume available
              } else {
                writeError(`Unknown ion-icon "${attributes.name}".`);
              }
            }
          }
        }
      },
    });
    doc.write(document.getText());
    if (icons.length == 0) {
      return false; // This may not be a template with icons
    }
    const tsFile = document.fileName.replace(new RegExp('.html$'), '.ts');
    if (existsSync(tsFile)) {
      await addIconsToCode(icons, tsFile);
    }
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function addIconsToCode(icons: string[], tsFile: string) {
  const tsDoc = await workspace.openTextDocument(Uri.file(tsFile));
  const tsText = tsDoc.getText();
  if (!tsText.includes('standalone: true')) {
    return false;
  }
  if (tsText.includes('IonicModule')) {
    // Its got the IonicModule kitchen sink
    return false;
  }
  let changed = false;
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(Uri.file(tsFile).fsPath);
  sourceFile.replaceWithText(tsText);
  const importDeclarations = sourceFile.getImportDeclarations();
  const addIcons = importDeclarations.find((d) => d.getModuleSpecifier().getText().includes('ionicons'));
  if (!addIcons) {
    // need to add import { addIcons } from 'ionicons';
    sourceFile.addImportDeclaration({
      namedImports: ['addIcons'],
      moduleSpecifier: 'ionicons',
    });
    changed = true;
  }

  const importIcons = importDeclarations.find((d) => d.getModuleSpecifier().getText().includes('ionicons/icons'));
  if (!importIcons) {
    for (const icon of icons) {
      sourceFile.addImportDeclaration({
        namedImports: [camelize(icon)],
        moduleSpecifier: 'ionicons/icons',
      });
      changed = true;
    }
  } else {
    for (const icon of icons) {
      const text = importIcons.getText();
      if (!text.includes(camelize(icon))) {
        importIcons.addNamedImport(camelize(icon));
        changed = true;
      }
    }
  }

  const componentClass = sourceFile
    .getClasses()
    .find((classDeclaration) =>
      classDeclaration.getDecorators().some((decorator) => decorator.getText().includes('@Component')),
    );

  for (const ctr of componentClass.getConstructors()) {
    for (const st of ctr.getStatements()) {
      if (st.getText().startsWith('addIcons(')) {
        const text = camelize(icons.join(','));
        const code = `addIcons({${text}});`;
        const before = st.getText().replace(/\s/g, '');

        st.replaceWithText(code);
        if (st.getText() != before) {
          changed = true;
        }
      }
    }
  }
  if (componentClass.getConstructors().length == 1) {
    const ctr = componentClass.getConstructors()[0];
    if (ctr.getStatements().length == 0 && icons.length > 0) {
      ctr.addStatements(`addIcons({${camelize(icons.join(','))}});`);
      changed = true;
    }
  }

  if (!changed) return;
  const edit = new WorkspaceEdit();
  edit.replace(
    Uri.file(tsFile),
    new Range(tsDoc.lineAt(0).range.start, tsDoc.lineAt(tsDoc.lineCount - 1).range.end),
    sourceFile.getText(),
  );
  await workspace.applyEdit(edit);
  await workspace.saveAll();
}

const camelize = (s: string) => s.replace(/-./g, (x) => x[1].toUpperCase());

function getAvailableIcons(): string[] {
  if (existsSync(ionicState.nodeModulesFolder)) {
    //node_modules/ionicons/icons/index.d.ts
    const filename = join(ionicState.nodeModulesFolder, 'ionicons/icons/index.d.ts');
    const icons: string[] = [];
    if (existsSync(filename)) {
      const txt = readFileSync(filename, 'utf8');
      const lines = txt.split('\n');

      for (const line of lines) {
        const icon = line.replace('export declare var ', '').replace(': string;', '').trim();
        icons.push(icon);
      }
    }
    return icons;
  }
  return [];
}
