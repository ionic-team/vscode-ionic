import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { Plugin } from './plugin-info';
import { NgFor, NgIf } from '@angular/common';
import { StarComponent } from './star.component';
import { vscode } from './utilities/vscode';

@Component({
  standalone: true,
  selector: 'plugin',
  imports: [NgFor, NgIf, StarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ['./plugin.component.css'],
  template: `
    <div class="px-group">
      <div class="prof tooltip">
        <img [hidden]="hide" (error)="hide = true" class="author" alt="data.author?.name" [src]="data.image" />
        <span style="top:55px" class="tooltiptext">{{ data.author?.name ? data.author.name : data.author }}</span>
      </div>
      <div class="panel2">
        <h2>{{ data.title }}</h2>
        <p class="subtitle">{{ data.name }} v{{ data.version }}</p>
        <div class="tooltip">
          <span class="tooltiptext wide-tip">{{ data.tagInfo }}</span>
          <vscode-badge *ngFor="let tag of data.tags">{{ tag }}</vscode-badge>
        </div>
        <p>{{ data.description }}</p>

        <br />
        <vscode-button *ngIf="data.installed == data.version" disabled>Up To Date</vscode-button>
        <vscode-button *ngIf="data.installed !== data.version" (click)="install()">{{
          data.installed ? 'Update' : 'Install'
        }}</vscode-button>
        <vscode-button *ngIf="data.installed" (click)="uninstall()">Uninstall</vscode-button>
      </div>
      <div class="side">
        <star class="tooltip" [rating]="data.rating">
          <span class="tooltiptext">{{ data.ratingInfo }}</span>
        </star>
        <p *ngIf="data.dailyDownloads !== '0'">{{ data.dailyDownloads }} Downloads Daily</p>
        <p>{{ data.changed }}</p>
        <p>License: {{ data.license }}</p>
        <vscode-link [href]="'https://www.npmjs.com/package/' + data.name">More Information</vscode-link><br />
        <vscode-link *ngIf="data.repo && data.updated" [href]="data.repo">Source Code</vscode-link
        ><br *ngIf="data.repo && data.updated" />
        <vscode-link *ngIf="data.bugs" [href]="data.bugs">Report Issue</vscode-link>
      </div>
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
    license: '',
    tags: [],
    platforms: [],
    rating: 1,
    changed: '',
    ratingInfo: '',
    tagInfo: '',
    installed: '',
    dailyDownloads: '',
  };

  hide = false;

  public install() {
    vscode.postMessage({
      command: 'install',
      text: this.data.name,
    });
  }

  public uninstall() {
    vscode.postMessage({
      command: 'uninstall',
      text: this.data.name,
    });
  }
}
