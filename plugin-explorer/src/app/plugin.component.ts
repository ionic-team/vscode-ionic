import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { Plugin } from './plugin-summary';
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
        <img [hidden]="hide" (error)="hide = true" class="author" alt="data.author" [src]="data.image" />
        <span style="top:55px" class="tooltiptext">{{ data.author }}</span>
      </div>
      <div class="panel2">
        <h2>{{ data.title }}</h2>
        <p class="subtitle">{{ data.name }} v{{ data.version }}</p>
        <p>{{ data.description }}.</p>
        <vscode-badge *ngFor="let tag of data.tags">{{ tag }}</vscode-badge>
        <br />
        <br />
        <vscode-button (click)="install()">Install</vscode-button>
      </div>
      <div class="side">
        <star class="tooltip" [rating]="data.rating">
          <span class="tooltiptext">{{ data.ratingInfo }}</span>
        </star>
        <p *ngIf="data.dailyDownloads !== '0'">{{ data.dailyDownloads }} Daily Downloads</p>
        <p>{{ data.changed }}</p>
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
    tags: [],
    rating: 1,
    changed: '',
    ratingInfo: '',
    dailyDownloads: '',
  };

  hide = false;

  public install() {
    vscode.postMessage({
      command: 'install',
      text: this.data.name,
    });
  }
}
