import { Injectable } from '@angular/core';
import { Plugin, PluginSummary } from './plugin-summary';

@Injectable({
  providedIn: 'root',
})
export class PluginService {
  private summary: PluginSummary = { plugins: [] };

  constructor() {}

  async get(url: string) {
    const response = await fetch(url);
    const data = await response.json();
    for (let plugin of data.plugins) {
      let scope = '';
      let name = plugin.name;
      if (plugin.name.startsWith('@')) {
        const tmp = plugin.name.split('/');
        scope = tmp[0];
        name = tmp[1];
      }
      const words = name.replace('/', '-').split('-');
      plugin.title = this.titleCase(
        words.filter((word: string) => word !== 'capacitor' && word !== 'cordova' && word !== 'plugin').join(' ')
      );
      plugin.tags = plugin.success;
      if (!plugin.keywords) plugin.keywords = [];
      plugin.keywords = plugin.keywords.filter(
        (keyword: string) =>
          ![
            'cordova',
            'javascript',
            'mobile',
            'typescript',
            'plugin',
            'capacitor',
            'mobile',
            'ecosystem:cordova',
            'capacitor-plugin',
            'capacitor-plugins',
            'ios',
            'package',
            'cordova-windows',
            'cordova-browser',
            'csharp',
            'java',
            'library',
            'nodejs',
            'objective-c',
            'android',
            'cross-platform',
            'ionic',
            'capacitor-ios',
            'capacitor-android',
            'cordova-plugin',
            'native',
            'cordova-ios',
            'cordova-android',
          ].includes(keyword.toLowerCase())
      );
      plugin.tags.push.apply(plugin.tags, plugin.keywords);
    }
    this.summary = data;
  }

  search(terms: string): Plugin[] {
    let count = 0;
    return this.summary.plugins.filter((plugin) => {
      const found =
        plugin.name?.includes(terms) || plugin.description?.includes(terms) || plugin.keywords?.includes(terms);
      if (found) count++;
      return found && count < 50;
    });
  }

  private titleCase(str: string) {
    const tmp = str.toLowerCase().split(' ');
    for (var i = 0; i < tmp.length; i++) {
      tmp[i] = tmp[i].charAt(0).toUpperCase() + tmp[i].slice(1);
    }
    return tmp.join(' ');
  }
}
