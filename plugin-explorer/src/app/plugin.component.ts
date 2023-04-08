import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { Plugin } from './plugin-summary';
import { NgFor, NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'plugin',
  imports: [NgFor, NgIf],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ['./plugin.component.css'],
  template: `
    <div class="group">
      <img [hidden]="hide" (error)="hide = true" class="profile" alt="data.author" [src]="data.image" />
      <div class="panel2">
        <h2>{{ data.title }}</h2>
        <p class="subtitle">{{ data.name }}</p>
        <p>{{ data.description }}.</p>
        <vscode-badge *ngFor="let tag of data.tags">{{ tag }}</vscode-badge>
        <br />
        <br />
        <vscode-button (click)="install()">Install</vscode-button>
      </div>
      <div class="side"></div>
    </div>
  `,
})
export class PluginComponent {
  @Input() data: Plugin = {
    name: '',
    version: '',
    success: [],
    fails: [],
    versions: [],
    author: '',
    published: '',
    title: '',
    tags: [],
  };

  hide: boolean = false;

  public install() {}
}
