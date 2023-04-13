import { Component, OnInit } from '@angular/core';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeLink,
  vsCodePanelView,
  vsCodeProgressRing,
  vsCodeTag,
  vsCodeTextField,
} from '@vscode/webview-ui-toolkit';
import { PluginFilter, PluginService } from './plugin.service';
import { Plugin } from './plugin-summary';
import { checked, d } from './utilities/dom';
import { MessageType, sendMessage } from './utilities/messages';
import { TestFilter, getTestFilters } from './test-filter';

// In order to use the Webview UI Toolkit web components they
// must be registered with the browser (i.e. webview) using the
// syntax below.
provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeTextField(),
  vsCodePanelView(),
  vsCodeLink(),
  vsCodeTag(),
  vsCodeCheckbox(),
  vsCodeProgressRing()
);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  plugins: Plugin[] = [];
  terms = '';
  listTitle = '';
  isInstalled: string | undefined = 'true';
  testFilters: TestFilter[] = getTestFilters();

  count = 0;
  busy = true;
  private searchedPlugin: Plugin | undefined; // Found from search

  constructor(private pluginService: PluginService) {}

  async ngOnInit() {
    window.addEventListener('message', this.onMessage.bind(this));
    sendMessage(MessageType.getPlugins, '');
  }

  async onMessage(event: any) {
    switch (event.data.command) {
      case MessageType.getPlugins:
        await this.pluginService.get(event.data.uri);
        this.pluginService.calculatedUnknownPlugins();
        this.search();
        this.busy = false;
        break;
      case MessageType.getPlugin:
        this.searchedPlugin = event.data.data;
        // Add to the list of displayed plugins if found
        if (this.plugins.length > 0 && this.searchedPlugin) {
          this.searchedPlugin.title = this.pluginService.getTitle(this.searchedPlugin.name);
          this.searchedPlugin.dailyDownloads = '0';
          this.plugins.push(this.searchedPlugin);
        }
        break;
      case MessageType.getInstalledDeps:
        this.pluginService.setInstalled(event.data.list);
        break;
    }
  }
  change() {
    setTimeout(() => {
      this.search();
    }, 1);
  }

  search(): void {
    this.terms = d('sch');
    this.searchedPlugin = undefined;
    sendMessage(MessageType.getPlugin, this.terms);
    const filters: PluginFilter[] = [];
    if (this.terms?.length > 0) {
      filters.push(PluginFilter.search);
      this.isInstalled = undefined;
    }
    this.listTitle = `Plugins`;

    if (checked('installed') && this.isInstalled) {
      filters.push(PluginFilter.installed);
      this.listTitle = 'Installed Plugins';
    }
    if (checked('official')) {
      filters.push(PluginFilter.official);
      this.listTitle = 'Official Plugins';
    }

    const checkedTestsTitle = this.checkedTestsTitle();
    if (checkedTestsTitle != '') {
      this.listTitle = `Plugins that work with ${checkedTestsTitle}`;
    }

    this.plugins = this.pluginService.search(
      filters,
      this.terms,
      this.checkedTests(),
      checked('android'),
      checked('ios')
    );
    if (this.searchedPlugin) {
      this.plugins.push(this.searchedPlugin);
    }
    this.count = this.plugins.length;

    if (filters.includes(PluginFilter.search)) this.listTitle += ` related to '${this.terms}'`;

    if (this.count > 0) {
      this.listTitle = `${this.count == 50 ? 'Top ' : ''}${this.count} ${this.listTitle}`;
    } else {
      this.listTitle = 'No results shown';
    }
  }

  private checkedTestsTitle(): string {
    let result: string[] = [];
    for (const testFilter of this.testFilters) {
      if (checked(testFilter.id)) {
        result = [...result, testFilter.name];
      }
    }
    return result.join(' or ');
  }

  private checkedTests(): string[] {
    let result: string[] = [];
    for (const testFilter of this.testFilters) {
      if (checked(testFilter.id)) {
        result = [...result, ...testFilter.list];
      }
    }
    return result;
  }
}
