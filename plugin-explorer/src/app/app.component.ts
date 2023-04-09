import { Component, OnInit } from '@angular/core';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeLink,
  vsCodePanelView,
  vsCodeTag,
  vsCodeTextField,
} from '@vscode/webview-ui-toolkit';
import { vscode } from './utilities/vscode';
import { PluginService } from './plugin.service';
import { Plugin } from './plugin-summary';
import { d } from './utilities/dom';
import { MessageType, sendMessage } from './utilities/messages';

// In order to use the Webview UI Toolkit web components they
// must be registered with the browser (i.e. webview) using the
// syntax below.
provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField(), vsCodePanelView(), vsCodeLink(), vsCodeTag());

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  plugins: Plugin[] = [];
  terms: string | undefined;
  count = 0;
  constructor(private pluginService: PluginService) {}

  async ngOnInit() {
    window.addEventListener('message', this.onMessage.bind(this));
    sendMessage(MessageType.getPlugins, '');
    sendMessage(MessageType.getInstalledDeps, '');
  }

  async onMessage(event: any) {
    switch (event.data.command) {
      case MessageType.getPlugins:
        await this.pluginService.get(event.data.uri);
        break;
      case MessageType.getInstalledDeps:
        this.pluginService.setInstalled(event.data.list);
        break;
    }
  }

  search() {
    this.terms = d('sch');
    this.plugins = this.pluginService.search(this.terms);
    this.count = this.plugins.length;
  }
}
