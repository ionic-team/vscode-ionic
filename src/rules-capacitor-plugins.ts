import { isGreaterOrEqual, isLess } from './analyzer';
import { showOutput, writeIonic } from './logging';
import { Project } from './project';
import { QueueFunction, Tip, TipType } from './tip';
import { window } from 'vscode';
import { PackageFile, getPackageJSON, replaceStringIn, showProgress } from './utilities';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { getPackageJSONFilename } from './monorepo';
import { npmInstallAll } from './node-commands';
import { join } from 'path';

export function checkCapacitorPluginMigration(project: Project) {
  if (isGreaterOrEqual('@capacitor/core', '4.0.0') && isLess('@capacitor/core', '5.0.0')) {
    // Capacitor 4 to 5 plugin migration
    project.add(
      new Tip('Migrate Plugin to Capacitor 5', undefined, TipType.Error).setQueuedAction(
        migratePluginToCapacitor5,
        project,
      ),
    );
  }
}

async function migratePluginToCapacitor5(queueFunction: QueueFunction, project: Project) {
  const txt = 'Migrate Plugin';
  const res = await window.showInformationMessage(
    `Your Capacitor 4 plugin can be migrated to Capacitor 5.`,
    txt,
    'Exit',
  );
  if (!res || res != txt) return;

  queueFunction();
  showOutput();

  await showProgress('Migrating Plugin...', async () => {
    await project.run2('npx @capacitor/plugin-migration-v4-to-v5@latest', false);
    const msg = `Plugin has been migrated. Please read migration docs and verify your plugin before publishing.`;
    writeIonic(msg);
    window.showInformationMessage(msg, 'OK');
  });
}
