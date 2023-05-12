import { Component, OnInit } from '@angular/core';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeLink,
  vsCodePanelView,
  vsCodeProgressRing,
  vsCodeTag,
  vsCodeRadio,
  vsCodeRadioGroup,
  vsCodeTextField,
} from '@vscode/webview-ui-toolkit';
import { PluginFilter, PluginService } from './plugin.service';
import { Plugin } from './plugin-info';
import { checked, d, setChecked } from './utilities/dom';
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
  vsCodeRadio(),
  vsCodeRadioGroup(),
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
  assetsUri = '';
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
        this.assetsUri = event.data.assetsUri;
        this.pluginService.calculatedUnknownPlugins();
        this.search();
        this.busy = false;
        break;
      case MessageType.getPlugin:
        if (!event.data || !event.data.data || !event.data.data.name) break;
        this.searchedPlugin = event.data.data;
        // Add to the list of displayed plugins if found
        if (this.searchedPlugin) {
          this.searchedPlugin.title = this.pluginService.getTitle(this.searchedPlugin.name);
          this.searchedPlugin.dailyDownloads = '0';
          this.searchedPlugin.ratingInfo = 'This dependency was found on npmjs.com and has not been tested yet.';
          this.plugins.push(this.searchedPlugin);
          if (this.plugins.length == 1) {
            this.listTitle = `Found "${this.searchedPlugin.name}" on npmjs.com`;
          }
          console.log(`Added plugin from search`, event.data);
        }
        break;
      case MessageType.chooseVersion:
        this.search();
        break;
      case MessageType.getInstalledDeps:
        this.pluginService.setInstalled(event.data.list);
        break;
    }
  }
  change() {
    setTimeout(() => {
      this.search();
    }, 100);
  }

  // User checked Official plugins
  changeOfficial() {
    setChecked('installed', false);
    this.change();
  }

  search(): void {
    this.terms = d('sch');
    this.searchedPlugin = undefined;
    const filters: PluginFilter[] = [];
    if (this.terms?.length > 0) {
      filters.push(PluginFilter.search);
      setChecked('installed', false);
    }
    this.listTitle = `Plugins`;

    if (checked('installed')) {
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

    const android = checked('android');
    const ios = checked('ios');
    const both = checked('both');
    const any = checked('any');

    this.plugins = this.pluginService.search(filters, this.terms, this.checkedTests(), android, ios, both, any);
    this.count = this.plugins.length;

    if (filters.includes(PluginFilter.search)) this.listTitle += ` related to '${this.terms}'`;
    if (android && !ios) this.listTitle += ` that work on Android`;
    if (!android && ios) this.listTitle += ` that work on iOS`;
    if (both) this.listTitle += ` that work on iOS and Android`;

    if (this.count > 0) {
      this.listTitle = `${this.count == 50 ? 'First ' : ''}${this.count} ${this.listTitle}`;
    } else {
      this.listTitle = 'No results shown';
    }
    if (this.terms) {
      console.log(`Send request for ${this.terms}`);
      sendMessage(MessageType.getPlugin, this.terms);
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
