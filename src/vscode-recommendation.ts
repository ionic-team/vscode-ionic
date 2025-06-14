import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { commands, window } from 'vscode';

export async function checkRecommendedExtensions(folder: string): Promise<void> {
  const recFile = join(folder, '.vscode', 'extensions.json');
  if (existsSync(recFile)) {
    const data = readFileSync(recFile, 'utf8');
    const jsonData = JSON.parse(data);
    if (!data.includes('ionic.ionic')) {
      return;
    }
    jsonData.recommendations = jsonData.recommendations.filter((ext: string) => ext !== 'ionic.ionic');
    if (!data.includes('Webnative.webnative')) {
      jsonData.recommendations.push('Webnative.webnative');
    }
    writeFileSync(recFile, JSON.stringify(jsonData, null, 2), 'utf8');
    const res = await window.showInformationMessage(
      'The Ionic extension has been deprecated in favor of the Webnative extension. Install the extension?',
      'Get Extension',
      'OK',
    );
    if (res === 'Get Extension') {
      await commands.executeCommand('workbench.extensions.installExtension', 'webnative.webnative');
    }
  }
}
