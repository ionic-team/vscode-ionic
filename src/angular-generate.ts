import { Project } from './project';

import { getRunOutput, getStringFrom, openUri, replaceAll } from './utilities';
import { write, writeError, writeIonic } from './logging';
import { join } from 'path';
import { existsSync } from 'fs';
import { isGreaterOrEqual } from './analyzer';
import { window } from 'vscode';
import { QueueFunction } from './tip';

export async function angularGenerate(
  queueFunction: QueueFunction,
  project: Project,
  angularType: string,
): Promise<void> {
  let name = await window.showInputBox({
    title: `New Angular ${angularType}`,
    placeHolder: `Enter name for new ${angularType}`,
  });

  if (!name || name.length < 1) return;
  queueFunction();

  // CREATE src/app/test2/test2.component.ts
  try {
    let args = '';
    if (isGreaterOrEqual('@angular/core', '15.0.0')) {
      if (isGreaterOrEqual('@ionic/angular-toolkit', '8.1.0')) {
        if (angularType == 'page') {
          args += ' --standalone';
        }
      }
      if (isGreaterOrEqual('@ionic/angular-toolkit', '11.0.1')) {
        if (angularType == 'component') {
          args += ' --standalone';
        }
      }
    }
    name = replaceAll(name, ' ', '-').trim();
    writeIonic(`Creating Angular ${angularType} named ${name}..`);
    const out = await getRunOutput(`npx ionic generate ${angularType} ${name}${args}`, project.projectFolder());
    write(out);
    const src = getStringFrom(out, 'CREATE ', '.ts');
    const path = join(project.projectFolder(), src + '.ts');
    if (!src || !existsSync(path)) {
      writeError(`Failed to create Angular ${angularType} named ${name}`);
    } else {
      writeIonic(`Created Angular ${angularType} named ${name}`);
      await openUri(path);
    }
  } catch (err) {
    writeError(`Unable to generate Angular ${angularType} named ${name}: ${err}`);
  }
}
