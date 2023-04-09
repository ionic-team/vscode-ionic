import { Injectable } from '@angular/core';
import { Plugin, PluginInfo, PluginSummary } from './plugin-summary';

@Injectable({
  providedIn: 'root',
})
export class PluginService {
  private summary: PluginSummary = { plugins: [] };
  private installed: any = {};

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
      plugin.tags = [...plugin.tags, ...plugin.keywords];
    }
    this.summary = data;
  }

  public setInstalled(plugins: PluginInfo[]) {
    this.installed = {};
    for (const plugin of plugins) {
      this.installed[plugin.name] = plugin.version;
    }
  }

  public search(terms: string): Plugin[] {
    let count = 0;
    const found = this.summary.plugins.filter((plugin) => {
      const found =
        plugin.name?.includes(terms) || plugin.description?.includes(terms) || plugin.keywords?.includes(terms);
      if (found) count++;
      plugin.installed = this.installed[plugin.name];
      return found && count < 50;
    });
    return found.sort((a, b) => b.rating - a.rating);
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

    if (tags.includes(`capacitor-ios-3`) && tags.includes(`capacitor-android-3`)) {
      result.push(`Capacitor 3`);
    }
    if (tags.includes(`capacitor-ios-4`) && tags.includes(`capacitor-android-4`)) {
      result.push(`Capacitor 4`);
    }
    if (tags.includes(`capacitor-ios-5`) && tags.includes(`capacitor-android-5`)) {
      result.push(`Capacitor 5`);
    }
    if (tags.includes(`cordova-ios-6`) && tags.includes(`cordova-android-11`)) {
      result.push(`Cordova`);
    }
    return result;
  }
}
