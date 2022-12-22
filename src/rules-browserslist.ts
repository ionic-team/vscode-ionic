import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { Project } from './project';
import { Tip, TipType } from './tip';
import { writeError } from './extension';
import { openUri } from './utilities';
import { ionicState } from './ionic-tree-provider';
import { ignore } from './ignore';

export function checkBrowsersList(project: Project) {
  try {
    let name = 'browserslist';
    let filename = path.join(project.folder, name);
    if (!fs.existsSync(filename)) {
      name = '.browserslistrc';
      filename = path.join(project.folder, name);
    }
    if (!fs.existsSync(filename)) {
      return;
    }
    let lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
    lines = lines.map((line) => line.trim());

    if (
      (lines.includes('> 0.5%') &&
        lines.includes('last 2 versions') &&
        lines.includes('Firefox ESR') &&
        lines.includes('not dead')) ||
      lines.includes('last 1 Chrome version')
    ) {
      const title = 'Fix Browser Support';
      const message = `${name} contains entries that prevent support on older devices.`;
      project.add(
        new Tip(title, message, TipType.Warning).setAction(fixFile, name, filename, title, message).canIgnore()
      );
    }
  } catch (e) {
    writeError(e);
  }
}

async function fixFile(name: string, filename: string, title: string, message: string) {
  const choice = await vscode.window.showWarningMessage(
    `${name} contains entries that prevent support on older devices (run npx browserslist). This is typically caused by missed steps during upgrade of an Ionic Project. Do you want to replace with a good set of defaults?`,
    'Open File',
    'View Coverage',
    'Replace with Defaults',
    'Ignore'
  );
  if (!choice) {
    return;
  }

  try {
    if (choice == 'Ignore') {
      ignore(new Tip(title, message), ionicState.context);
      return;
    }
    const txt = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
    const lines = txt.map((line) => line.trim());
    const replace = [];

    if (choice == 'Open File') {
      openUri(filename);
      return;
    }
    if (choice == 'View Coverage') {
      const list = [];
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const arg = line.split('#')[0];
          list.push(arg);
        }
      }
      openUri(`https://browsersl.ist/#q=${encodeURIComponent(list.join(','))}`);
      return;
    }

    for (const line of lines) {
      if (!line || line.startsWith('#')) {
        replace.push(line);
      }
    }

    replace.push('Chrome >=60');
    replace.push('ChromeAndroid >=60');
    replace.push('Firefox >=63');
    replace.push('Edge >=79');
    replace.push('Safari >=13');
    replace.push('iOS >=13');

    fs.writeFileSync(filename, replace.join('\n'));
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to fix ${name}: ${err}`);
  }
}
