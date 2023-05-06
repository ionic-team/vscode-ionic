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
  private latest: any = {};
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
      plugin.title = this.getTitle(name);
      const publishedMonths = this.calcChange(plugin.published);
      plugin.changed = this.changeInMonths(publishedMonths);
      plugin.tags = this.cleanupTags(plugin.success);
      if (plugin.platforms.length == 1) {
        if (plugin.platforms.includes('android')) {
          plugin.tags.push('Android Only');
        } else if (plugin.platforms.includes('ios')) {
          plugin.tags.push('iOS Only');
        }
      }
      plugin.tagInfo = `Version ${plugin.version} builds with ${this.prettify(
        plugin.success
      )}.\n\n Failed on ${this.prettify(plugin.fails)}`;
      plugin.rating = this.calculateRating(scope, plugin, publishedMonths);
      plugin.dailyDownloads = this.calculateDaily(plugin);
      if (plugin.license?.length > 20) {
        plugin.license = plugin.license.substring(0, 20) + '...';
      }
      //plugin.tags = [...plugin.tags, ...plugin.keywords];
    }
    this.summary = data;
  }

  private prettify(tests: string[]): string {
    const res: string[] = [];
    for (const test of tests) {
      res.push(
        test
          .replace('capacitor-', 'Capacitor ')
          .replace('cordova-', 'Cordova ')
          .replace('ios-', 'IOS ')
          .replace('android-', 'Android ')
      );
    }
    return res.join(', ');
  }

  public getTitle(name: any): string {
    const words = name.replace('/', '-').replaceAll('.', ' ').split('-');
    return this.titleCase(
      words.filter((word: string) => word !== 'capacitor' && word !== 'cordova' && word !== 'plugin').join(' ')
    );
  }

  public setInstalled(plugins: PluginInfo[]) {
    this.installed = {};
    for (const plugin of plugins) {
      this.installed[plugin.name] = plugin.version;
      this.latest[plugin.name] = plugin.latest;
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
        tagInfo: '',
        changed: '',
        installed: this.installed[name],
        license: '',
        versions: [],
        platforms: [],
        title: name,
        published: '',
        author: '',
        tags: [],
        rating: 0,
        dailyDownloads: '?',
      });
    }
  }

  public search(
    filters: PluginFilter[],
    terms: string,
    tests: string[],
    android: boolean,
    ios: boolean,
    both: boolean,
    any: boolean
  ): Plugin[] {
    let count = 0;

    const list = this.summary.plugins.filter((plugin) => {
      try {
        let found = true;
        if (filters.includes(PluginFilter.search)) {
          found =
            plugin.name?.includes(terms) ||
            plugin.title?.includes(terms) ||
            plugin.description?.includes(terms) ||
            plugin.keywords?.includes(terms) ||
            false;
          console.log(found);
        }
        if (filters.includes(PluginFilter.installed)) {
          found = found && !!this.installed[plugin.name];
        }
        if (filters.includes(PluginFilter.official)) {
          found = found && this.isOfficial(plugin.name);
        }

        found = found && this.passedPlatforms(android, ios, both, any, plugin);

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

      // Latest versions come from the extension
      for (const plugin of list) {
        const latest = this.latest[plugin.name];
        if (latest) {
          plugin.version = latest;
        }
      }
    }
    return list.sort((a, b) => this.sortFactor(b) - this.sortFactor(a));
  }

  private sortFactor(p: Plugin): number {
    return this.boost(p.name) + p.rating;
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

  // We rate @capacitor first then @ionic-enterprise
  private boost(name: string): number {
    return (name.startsWith('@capacitor/') ? 100000 : 0) + (name.startsWith('@ionic-enterprise') ? 10000 : 0);
  }

  // Returns true if the plugin passed at least one test
  private passedTests(tests: string[], results: string[]): boolean {
    for (const test of tests) {
      if (results.includes(test)) return true;
    }
    return false;
  }

  // Returns true if the plugin passed at least one test for the platform
  private passedPlatforms(android: boolean, ios: boolean, both: boolean, any: boolean, plugin: Plugin): boolean {
    if (any) return true;
    if (android && plugin.platforms.includes('android')) return true;
    if (ios && plugin.platforms.includes('ios')) return true;
    if (both && plugin.platforms.length == 2) return true;
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
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Possibly Unmaintained');
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
    } else if (!plugin.repo) {
      plugin.ratingInfo = this.sentence(plugin.ratingInfo, 'Is Closed Source / Commercial');
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
      rating = 5; // Assume awesomeness
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

  // Given a set of tags for successful tests (eg capacitor-ios-4)
  // Return user friendly names to indicate compatibility (eg Capacitor 4)
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
