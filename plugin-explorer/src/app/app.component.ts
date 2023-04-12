import { Component, OnInit } from '@angular/core';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeLink,
  vsCodePanelView,
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
  vsCodeCheckbox()
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

  search() {
    this.terms = d('sch');
    const filters: PluginFilter[] = [];
    if (this.terms?.length > 0) {
      filters.push(PluginFilter.search);
      this.isInstalled = undefined;
    }
    this.listTitle = `No results shown`;

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

    this.plugins = this.pluginService.search(filters, this.terms, this.checkedTests());
    this.count = this.plugins.length;

    if (filters.includes(PluginFilter.search)) this.listTitle = `plugins related to '${this.terms}'`;

    if (this.count > 0) {
      this.listTitle = `${this.count} ${this.listTitle}`;
    }
  }

  private checkedTestsTitle(): string {
    let result: string[] = [];
    for (const testFilter of this.testFilters) {
      if (checked(testFilter.id)) {
        result = [...result, testFilter.name];
      }
    }
    return result.join(', ');
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
