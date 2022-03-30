import { getPackageVersion } from './analyzer';
import { Project } from './project';
import { Tip, TipType } from './tip';
import { coerce, compare, lt, gte, lte } from 'semver';

export function angularMigrate(latestVersion: string): Tip {
  const current = getPackageVersion('@angular/core');
  let latest = coerce(latestVersion);
  const next = current.major + 1;
  if (!latest) latest = current;
  if (!current) return;

  const tip = new Tip(
    'Upgrade Angular',
    'Updates your application and its dependencies to the latest version using "ng update". Make sure you have committed your code before trying an upgrade.',
    TipType.Run,
    undefined,
    'npx ng update @angular/cli @angular/core --allow-dirty --force',
    `Upgrade to v${latest.major}`,
    undefined,
    'https://angular.io/cli/update'
  ).showProgressDialog();

  // Upgrade option to next major
  if (next == latest.major) {
    // If we are 1 major version behind then update to latest same major (eg 12.0.1 -> 12.2.6)
    tip.setSecondCommand(
      `Upgrade to latest v${current.major}`,
      `npx ng update @angular/cli@${current.major} @angular/core@${current.major} --allow-dirty --force`
    );
  } else if (next <= latest.major) {
    // Upgrade to next major
    tip.setSecondCommand(
      `Upgrade to v${next}`,
      `npx ng update @angular/cli@${next} @angular/core@${next} --allow-dirty --force`
    );
  }
  return tip;
}
