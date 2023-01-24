import { getPackageVersion } from './analyzer';
import { Tip, TipType } from './tip';
import { coerce } from 'semver';
import { npx } from './node-commands';
import { ionicState } from './ionic-tree-provider';

export function angularMigrate(latestVersion: string): Tip {
  const current = getPackageVersion('@angular/core');
  let latest = coerce(latestVersion);
  const next = current.major + 1;
  if (!latest) latest = current;
  if (!current) return;

  const title = latest.major == current.major ? `Update to latest v${latest.major}` : `Update to v${latest.major}`;

  const tip = new Tip(
    'Update Angular',
    'Updates your application and its dependencies to the latest version using "ng update". Make sure you have committed your code before trying an upgrade.',
    TipType.Run,
    undefined,
    `${npx(ionicState.packageManager)} ng update @angular/cli @angular/core --allow-dirty --force`,
    title,
    undefined,
    'https://angular.io/cli/update'
  ).showProgressDialog();

  // Upgrade option to next major
  if (next == latest.major) {
    // If we are 1 major version behind then update to latest same major (eg 12.0.1 -> 12.2.6)
    tip.setSecondCommand(
      `Update to latest v${current.major}`,
      `${npx(ionicState.packageManager)} ng update @angular/cli@${current.major} @angular/core@${
        current.major
      } --allow-dirty --force`
    );
  } else if (next <= latest.major) {
    // Upgrade to next major
    tip.setSecondCommand(
      `Update to v${next}`,
      `${npx(ionicState.packageManager)} ng update @angular/cli@${next} @angular/core@${next} --allow-dirty --force`
    );
  }
  return tip;
}
