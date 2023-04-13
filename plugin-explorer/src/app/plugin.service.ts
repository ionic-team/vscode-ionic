import { Injectable } from '@angular/core';
import { Plugin, PluginInfo, PluginSummary } from './plugin-summary';
import { capacitorFrom, capacitorTo } from './test-filter';

export enum PluginFilter {
  installed = 1,
  search = 2,
  official = 3,
}

@Injectable({
  providedIn: 'root',
})
export class PluginService {
  private summary: PluginSummary = { plugins: [] };
  private installed: any = {};
  private unknownPlugins: Plugin[] = [];

  public async get(url: string) {
    const response = await fetch(url);
    const data = await response.json();
    for (const plugin of data.plugins) {
      let scope = '';
      let name = plugin.name;
      if (plugin.name.startsWith('@')) {
        const tmp = plugin.name.split('/');
        scope = tmp[0];
        name = tmp[1];
      }
      const words = name.replace('/', '-').replaceAll('.', ' ').split('-');
      plugin.title = this.titleCase(
        words.filter((word: string) => word !== 'capacitor' && word !== 'cordova' && word !== 'plugin').join(' ')
      );
      const publishedMonths = this.calcChange(plugin.published);
      plugin.changed = this.changeInMonths(publishedMonths);
      plugin.tags = this.cleanupTags(plugin.success);
      plugin.rating = this.calculateRating(scope, plugin, publishedMonths);
      plugin.dailyDownloads = this.calculateDaily(plugin);
      //plugin.tags = [...plugin.tags, ...plugin.keywords];
    }
    this.summary = data;
  }

  public setInstalled(plugins: PluginInfo[]) {
    this.installed = {};
    for (const plugin of plugins) {
      this.installed[plugin.name] = plugin.version;
    }
  }

  public calculatedUnknownPlugins() {
    this.unknownPlugins = [];
    const names = [];
    for (const key of Object.keys(this.installed)) {
      names.push(key);
    }
    for (const plugin of this.summary.plugins) {
      const index = names.indexOf(plugin.name);
      if (index !== -1) {
        names.splice(index, 1);
      }
    }
    for (const name of names) {
      this.unknownPlugins.push({
        name: name,
        success: [],
        fails: [],
        version: this.installed[name],
        ratingInfo: '',
        changed: '',
        installed: true,
        versions: [],
        title: name,
        published: '',
        author: '',
        tags: [],
        rating: 0,
        dailyDownloads: '?',
      });
    }
  }

  public search(filters: PluginFilter[], terms: string, tests: string[], android: boolean, ios: boolean): Plugin[] {
    let count = 0;

    const list = this.summary.plugins.filter((plugin) => {
      try {
        let found = true;
        if (filters.includes(PluginFilter.search)) {
          found =
            plugin.name?.includes(terms) ||
            plugin.description?.includes(terms) ||
            plugin.keywords?.includes(terms) ||
            false;
        }
        if (filters.includes(PluginFilter.installed)) {
          found = found && !!this.installed[plugin.name];
        }
        if (filters.includes(PluginFilter.official)) {
          found = found && this.isOfficial(plugin.name);
        }

        found = found && this.passedPlatforms(android, ios, plugin.success);

        if (tests.length > 0) {
          found = found && this.passedTests(tests, plugin.success);
        }
        if (found) {
          count++;
          plugin.installed = this.installed[plugin.name];
        }
        return found && count <= 50;
      } catch (error) {
        console.error(error);
        return false;
      }
    });
    if (filters.includes(PluginFilter.installed)) {
      // Need to add any plugins that are installed but not indexed
      for (const plugin of this.unknownPlugins) {
        list.push(plugin);
      }
    }
    return list.sort((a, b) => this.sortFactor(b) - this.sortFactor(a));
  }

  private sortFactor(p: Plugin): number {
    return (this.isOfficial(p.name) ? 10000 : 0) + p.rating;
  }

  // Returns an amount of daily downloads: eg (10k, 100)
  private calculateDaily(plugin: Plugin): string {
    const daily = plugin.downloads ? Math.round(plugin.downloads / 31) : 0;
    if (daily > 1000) {
      return `${Math.round(daily / 1000)}k`;
    } else {
      return `${daily}`;
    }
  }

  private isOfficial(name: string): boolean {
    return name.startsWith('@capacitor/') || name.startsWith('@ionic-enterprise');
  }

  // Returns true if the plugin passed at least one test
  private passedTests(tests: string[], results: string[]): boolean {
    for (const test of tests) {
      if (results.includes(test)) return true;
    }
    return false;
  }

  // Returns true if the plugin passed at least one test for the platform
  private passedPlatforms(android: boolean, ios: boolean, results: string[]): boolean {
    console.log(android, ios, results);
    for (const result of results) {
      if (android && result.includes('android')) return true;
      if (ios && result.includes('ios')) return true;
    }
    return false;
  }

  private calcChange(published: string): number {
    const from = new Date(published);
    const months = this.monthDiff(from, new Date());
    return months;
  }

  private changeInMonths(months: number): string {
    if (months == 0) {
      return 'Updated Recently';
    } else if (months < 12) {
      return `${months} Months Ago`;
    } else {
      return `${Math.round(months / 12.0)} Years Ago`;
    }
  }

  private monthDiff(dateFrom: Date, dateTo: Date) {
    return dateTo.getMonth() - dateFrom.getMonth() + 12 * (dateTo.getFullYear() - dateFrom.getFullYear());
  }

  private sentence(current: string, info: string): string {
    if (current !== '') {
      return `${current}, ${info}`;
    } else {
      return info;
    }
  }

  private calculateRating(scope: string, plugin: Plugin, publishedMonths: number): number {
    let rating = 0;
    plugin.ratingInfo = '';
    const official = scope == '@capacitor' || scope == '@ionic-enterprise';
    // Must have github stars, be less than 12 months old, or an official plugin
    if ((plugin.stars && plugin.stars > 100 && publishedMonths < 13) || official) {
      rating++;
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Popular on Github');
    }

    if (publishedMonths >= 13) {
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Infrequently Updated');
    }

    // Has source in Github that has been updated
    if (plugin.updated && publishedMonths < 13) {
      rating++;
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Updated Frequently');
    }

    // Has npm downloads of > 1000 per month
    if (plugin.downloads && plugin.downloads > 1000) {
      rating++;
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Regularly Downloaded');
    } else {
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Infrequently Used');
    }

    // Has a source repo and isnt  version 0.x
    if (plugin.repo && !plugin.version.startsWith('0')) {
      rating++;
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Is Open Source');
    }

    if (plugin.version.startsWith('0')) {
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Is A Beta Release');
    }

    // If it doesnt build then rate it 0
    if (plugin.success.length == 0) {
      rating = 0;
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Does not compile');
    }

    if (official) {
      rating++;
    }
    return rating;
  }

  private titleCase(str: string) {
    const tmp = str.toLowerCase().split(' ');
    for (let i = 0; i < tmp.length; i++) {
      tmp[i] = tmp[i].charAt(0).toUpperCase() + tmp[i].slice(1);
    }
    return tmp.join(' ');
  }

  private cleanupTags(tags: string[]): string[] {
    const result = [];

    for (let v = capacitorFrom; v <= capacitorTo; v++) {
      if (tags.includes(`capacitor-ios-${v}`) && tags.includes(`capacitor-android-${v}`)) {
        result.push(`Capacitor ${v}`);
      }
    }

    if (tags.includes(`cordova-ios-6`) && tags.includes(`cordova-android-11`)) {
      result.push(`Cordova`);
    }
    return result;
  }
}
