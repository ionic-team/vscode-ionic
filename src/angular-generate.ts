import { Project } from './project';
import * as vscode from 'vscode';
import { getRunOutput, getStringFrom, openUri } from './utilities';
import { getOutputChannel, writeError, writeIonic } from './extension';
import { join } from 'path';
import { existsSync } from 'fs';

export async function angularGenerate(project: Project, angularType: string): Promise<void> {
  const name = await vscode.window.showInputBox({
    title: `New Angular ${angularType}`,
    placeHolder: `Enter name for new ${angularType}`,
  });

  if (!name || name.length < 1) return;

  // CREATE src/app/test2/test2.component.ts
  writeIonic(`Creating Angular ${angularType} named ${name}..`);
  const out = await getRunOutput(`npx ionic generate ${angularType} '${name}'`, project.projectFolder());
  const channel = getOutputChannel();
  channel.appendLine(out);
  const src = getStringFrom(out, 'CREATE ', '.ts');
  const path = join(project.projectFolder(), src + '.ts');
  if (!src || !existsSync(path)) {
    writeError(`Failed to create Angular ${angularType} named ${name}`);
  } else {
    writeIonic(`Created Angular ${angularType} named ${name}`);
    await openUri(path);
  }
}