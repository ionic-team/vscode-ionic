import { Project } from './project';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ignore } from './ignore';
import { npmInstall, npmRun } from './node-commands';
import { writeError, writeIonic } from './extension';
import { ExtensionContext, window } from 'vscode';
import { Tip } from './tip';

export async function integratePrettier(project: Project, tip: Tip, context: ExtensionContext) {
  try {
    const question = await window.showInformationMessage(
      'You can enforce coding standards during development using a standard set of ESLint and Prettier rules. Would you like to add this integration to your project?',
      'Yes',
      'No',
      'Ignore'
    );
    if (question == 'Ignore') {
      ignore(tip, context);
    }
    if (question != 'Yes') return;
    const huskyFolder = join(project.projectFolder(), '.husky');
    if (!existsSync(huskyFolder)) {
      mkdirSync(huskyFolder);
    }

    const script = `
	#!/bin/sh
	. "$(dirname "$0")/_/husky.sh"
	npx pretty-quick --staged	
	`;
    const huskyFile = join(huskyFolder, 'pre-commit');
    writeFileSync(huskyFile, script, 'utf-8');
    writeIonic(`Created the file ${huskyFile}`);
    await project.run2(npmInstall('@ionic/prettier-config', '--save-dev'));
    writeIonic(`Installed package @ionic/prettier-config`);
    await project.run2(npmInstall('@ionic/eslint-config', '--save-dev'));
    writeIonic(`Installed package @ionic/eslint-config`);
    await project.run2(npmInstall('husky', '--save-dev', '--save-exact'));
    writeIonic(`Installed package husky`);
    const filename = join(project.projectFolder(), 'package.json');
    const packageFile = JSON.parse(readFileSync(filename, 'utf8'));
    if (!packageFile.prettier) {
      packageFile['prettier'] = '@ionic/prettier-config';
    }
    if (!packageFile.eslintConfig) {
      packageFile['eslintConfig'] = { extends: '@ionic/eslint-config/recommended' };
    }
    if (!packageFile.scripts['lint-fix']) {
      // eslint-disable-next-line no-useless-escape
      packageFile.scripts['lint-fix'] = `eslint . --ext .ts --fix && prettier \"**/*.ts\" --write`;
    }
    writeFileSync(filename, JSON.stringify(packageFile, undefined, 2));
    writeIonic(`Created script called lint-fix in your package.json`);
    const response = await window.showInformationMessage(
      `ESLint and Prettier have been integrated and will enforce coding standards during development. Do you want to apply these standards to the code base now? (this will run '${npmRun(
        'lint-fix'
      )}' which may alter source code and report errors in your code)`,
      'Yes',
      'No'
    );
    if (response == 'No') {
      return;
    }
    await project.run2(npmRun('lint-fix'));
  } catch (err) {
    writeError(`Unable to integrate prettier and ESLint:` + err);
  }
}
