import * as fs from 'fs';

import { Project } from './project';
import { Command, Tip, TipType } from './tip';
import { exists, isGreaterOrEqual, remotePackages, warnMinVersion } from './analyzer';
import { npmInstallAll } from './node-commands';

/**
 * General Rules for packages like momentjs, jquery, etc
 * @param  {Project} project
 */
export function checkPackages(project: Project) {
  const nmf = project.getNodeModulesFolder();
  if (!fs.existsSync(nmf)) {
    project.add(
      new Tip(
        'Install Node Modules',
        '',
        TipType.Idea,
        'Install Node Modules',
        npmInstallAll(),
        'Installing Node Modules...'
      )
        .performRun()
        .showProgressDialog()
    );
  }

  // Replace momentjs with date-fns
  project.recommendReplace(
    'moment',
    `momentjs`,
    `Migrate the deprecated moment.js to date-fns`,
    `Migrate away from the deprecated library moment. A good replacement is date-fns which is significantly smaller and built for modern tooling (https://date-fns.org/)`,
    'date-fns'
  );

  // Remove jquery
  project.recommendRemove(
    'jquery',
    'jQuery',
    `Refactor your code to remove the dependency on jquery. Much of the API for Jquery is now available in browsers and often Jquery code conflicts with code written in your framework of choice.`
  );

  project.recommendRemove(
    'protractor',
    `Protractor`,
    `Your project has a dependency on Protractor whose development is slated to end December 2022. Consider migrating to a different E2E Testing solution.`,
    undefined,
    'https://docs.cypress.io/guides/migrating-to-cypress/protractor'
    //`Your project has a dependency on Protractor whose development is [slated to end December 2022](https://github.com/angular/protractor/issues/5502). Consider migrating to a different E2E Testing solution.`,
  );

  // node-sass deprecated and not required
  project.recommendRemove(
    'node-sass',
    'node-sass',
    `The dependency node-sass is deprecated and should be removed from package.json.`
  );

  // Ionic 3+
  if (exists('ionic-angular')) {
    project.note(
      '@ionic/angular',
      'Your Ionic project should be migrated to @ionic/angular version 5 or higher',
      'https://ionicframework.com/docs/reference/migration#migrating-from-ionic-3-0-to-ionic-4-0'
    );
  }

  // Angular 10 is in LTS until December 2021
  project.tip(
    warnMinVersion(
      '@angular/core',
      '10.0.0',
      '. Your version is no longer supported.',
      'https://angular.io/guide/releases#support-policy-and-schedule'
    )
  );
  if (isGreaterOrEqual('@angular/core', '11.0.0')) {
    project.checkNotExists(
      'codelyzer',
      'Codelyzer was popular in Angular projects before version 11 but has been superceded by angular-eslint. You can remove this dependency.'
    );
  }
  if (exists('@ionic/angular')) {
    project.checkNotExists(
      'ionicons',
      'The @ionic/angular packages includes icons so the "ionicons" package is not required.'
    );
  }
}

export function checkRemoteDependencies(project: Project) {
  // Look for dependencies that come from github etc
  const packages = remotePackages();
  if (packages.length > 0) {
    project.add(
      new Tip(
        'Remote Dependencies',
        `Your project uses remote dependencies that can change at any time.`,
        TipType.Warning,
        `Using dependencies from locations like github or http mean that no 2 builds are guaranteed to produce the same binary. These packages should use versioned dependencies: ${packages.join(
          ', '
        )}`,
        Command.NoOp
      ).canIgnore()
    );
  }
}
