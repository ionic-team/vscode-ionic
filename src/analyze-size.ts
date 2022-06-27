import { getOutputChannel, writeIonic } from "./extension";
import { Project } from "./project";
import { openUri, run, RunResults, showProgress } from "./utilities";
import * as vscode from 'vscode';
import { join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { ionicBuild } from "./ionic-build";

/**
 * Generates a readable analysis of Javascript bundle sizes
 * Uses source-map-explorer on a production build of the app with source maps turned on
 * @param  {Project} project
 */
export async function analyzeSize(project: Project) {
	const channel = getOutputChannel();
	const dist = project.getDistFolder();
	showProgress('Generating Project Statistics', async () => {
		let previousValue;
		try {
			previousValue = enableSourceMaps(project);
			writeIonic('Building for production with Sourcemaps...');
			const cmd = ionicBuild(project, '--prod');
			await run2(project,
				`export NODE_OPTIONS="--max-old-space-size=8192" && ${cmd}`, undefined);

			writeIonic('Analysing Sourcemaps...');
			const result: RunResults = { output: '', success: undefined };
			await run2(project, `npx source-map-explorer ${dist}/**/*.js --json --exclude-source-map`, result);

			analyseResults(result.output, project.projectFolder());
			writeIonic('Launched project statistics window.');
		} finally {
			revertSourceMaps(project, previousValue);
		}
	});
}

/**
 * Enables the configuration for source maps in the projects configuration
 * @param  {Project} project
 * @returns string
 */
function enableSourceMaps(project: Project): string {
	try {
		const filename = join(project.folder, 'angular.json');
		let changeMade = false;
		if (existsSync(filename)) {
			const json = readFileSync(filename, 'utf-8');
			const config = JSON.parse(json);
			for (const prj of Object.keys(config.projects)) {
				if (config.projects[prj].architect?.build?.configurations?.production) {
					const previousValue = config.projects[prj].architect.build.configurations.production.sourceMap;
					if (previousValue == true) {
						// Great nothing to do, already enabled
						return previousValue;
					} else {
						config.projects[prj].architect.build.configurations.production.sourceMap = true;
						writeIonic(`Temporarily modified production sourceMap of ${prj} to true in angular.json`);
						changeMade = true;
					}
				}
			}
			if (changeMade) {
				writeFileSync(filename, JSON.stringify(config, null, 2));				
				return json;
			}
		}
	}
	catch {
		return undefined;
	}
	return undefined;
}

/**
 * Reverts the projects configuation back to its previous settings before source maps were turned on
 * @param  {Project} project
 * @param  {string} previousValue
 */
function revertSourceMaps(project: Project, previousValue: string) {
	if (previousValue == undefined) {
		return;
	}
	const filename = join(project.folder, 'angular.json');
	if (existsSync(filename)) {
		writeFileSync(filename, previousValue, {encoding: 'utf-8'});
	}
}

function htmlHead() {
	return `<!DOCTYPE html><html lang="en">
	<style>
	.bar-container {
		border: 2px solid var(--vscode-list-hoverBackground);
		width: 200px;
		height: 16px;
	}
	.bar-indent {
		border: 2px solid var(--vscode-list-hoverBackground);
		width: 180px;
		margin-left: 20px;
		height: 16px;
	}
	.bar { 
		height: 100%; 		
		background-color: var(--vscode-button-background);
	}
	.shade {
		color: var(--vscode-list-deemphasizedForeground);
	} 
	.row { display: flex } 
	.col { margin: 5px }
	.float {
		position: absolute;
		margin: 0;		
		padding: 0;
		padding-left: 10px;
	}
	.tooltip {
		position: relative;
		display: inline-block;
	  }
	.tooltip .tooltiptext {
		visibility: hidden;
		width: 200px;
		background-color: var(--vscode-editor-background);
		color: var(--vscode-editor-foreground);
		border: 1px solid var(--vscode-editor-foreground);
		text-align: center;
		padding: 5px 0;	   
		position: absolute;
		z-index: 1;
	  }
	.tooltip:hover .tooltiptext {
		visibility: visible;
	  }	  
	details { user-select: none; }
	details[open] summary span.icon {
		transform: rotate(180deg);
	  }
	summary {
		display: flex;
		cursor: pointer;
	  }
	.hover {
		cursor: pointer;
	}
	</style>
	<script>
	   const vscode = acquireVsCodeApi();
	   function send(message) {
		   console.log(message);
	       vscode.postMessage(message);
	   }	   
	</script>
	<body>`;
}

function analyseResults(json: string, folder: string) {
	const data: SizeResults = JSON.parse(json);
	let html = htmlHead();

	const ignoreList = ['[EOLs]'];
	let files: Array<FileInfo> = [];
	let largest = 0;
	let largestGroup = 0;
	const groups = {};
	const groupLargest = {};
	const groupCount = {};
	const groupFiles = {};
	for (const result of data.results) {
		for (const key of Object.keys(result.files)) {
			if (result.files[key].size > largest) {
				largest = result.files[key].size;
			}
		}
	}
	for (const result of data.results) {
		for (const key of Object.keys(result.files)) {
			if (!ignoreList.includes(key)) {
				const info = getInfo(key, result.files[key].size, result.bundleName);
				files.push(info);
				if (!groups[info.type]) {
					groups[info.type] = 0;
					groupLargest[info.type] = 0;
					groupCount[info.type] = 0;
					groupFiles[info.type] = [];
				}
				if (!groupFiles[info.type].includes(result.bundleName)) {
					groupFiles[info.type].push(result.bundleName);
				}
				groupCount[info.type] += 1;
				if (result.files[key].size > groupLargest[info.type]) {
					groupLargest[info.type] = result.files[key].size;
				}
				groups[info.type] = groups[info.type] + result.files[key].size;
			}
		}
	}
	for (const group of Object.keys(groups)) {
		if (groups[group] > largestGroup) {
			largestGroup = groups[group];
		}
	}
	files = files.sort((a, b) => {
		return cmp(groups[b.type], groups[a.type]) || cmp(b.size, a.size);
	});
	let lastType;
	html += `<h1>Bundle Analysis</h1>
	<p class="shade">Size of Javascript bundles for your code and 3rd party packages.</p>`;
	for (const file of files) {
		if (file.type != lastType) {
			if (lastType) {
				html += '</details>';
			}
			lastType = file.type;
			html += `<details><summary>
			<div class="row">
			   <div class="col">${graph(groups[lastType], largestGroup)}</div>
			   <p class="col tooltip">${lastType}
			      <span class="tooltiptext">${friendlySize(groups[lastType])} (${groupFiles[lastType].length} Files)</span>
			   </p>			
			</div>
			</summary>`;
		}
		if (groupCount[lastType] != 1) {
			html += `
		<div class="row">
		   <div class="col">${graph(file.size, groupLargest[file.type], true)}</div>
		   <p onclick="send('${file.filename}')" class="col tooltip shade hover">&nbsp;&nbsp;&nbsp;${file.name}
		      <span class="tooltiptext">${file.path}<br/>${file.size} bytes<br/>${file.bundlename}</span>
		   </p>
		   
		</div>`;
		}
	}
	html += '</details>';


	html += '</body></html>';
	const panel = vscode.window.createWebviewPanel('viewApp', 'Project Statistics', vscode.ViewColumn.Active, {
		enableScripts: true,
	});
	panel.webview.onDidReceiveMessage(async (filename) => {
		const path = join(folder, filename);
		openUri(path);
	});
	panel.webview.html = html;
}

function graph(size: number, largest: number, indent = false) {
	return `
	<div class="${indent ? 'bar-indent' : 'bar-container'}">
	<div class="bar" style="width:${size * 100 / largest}%">
	<p class="float">${friendlySize(size)}</p>
	</div>
	</div>`;
}

function cmp(a, b) {
	if (a > b) return +1;
	if (a < b) return -1;
	return 0;
}

function getInfo(fullname: string, size: number, bundlename: string): FileInfo {
	let url: URL;
	try {
		url = new URL(fullname);
	} catch {
		return { name: friendlyName(bundlename), type: friendlyType(fullname), path: fullname, size, bundlename, filename: bundlename };
	}
	let name = url.pathname;
	const filename = name.replace('webpack://', '.');

	if (name.startsWith('/node_modules/')) {
		name = name.replace('/node_modules/', '');
	}
	const names = name.split('/');
	const path = friendlyPath(names.join(' '));
	const type = friendlyType(url.pathname);
	name = friendlyName(names.pop(), path);
	return { name, path, type, size, bundlename, filename };
}

function friendlySize(size: number): string {
	if (size > 1000) {
		return Math.round(size / 1000.0).toString() + 'kb';
	} else {
		return '1kb';
	}
}

function friendlyType(name: string): string {
	let type = 'Your Code';
	if (name.startsWith('/node_modules/')) {
		type = '3rd Party';
	}
	if (name.includes('polyfills')) {
		type = 'Polyfills';
	}
	if (name.startsWith('/node_modules/core-js')) {
		type = 'Core JS';
	}
	if (name == '[unmapped]' || name == '[no source]') {
		return 'Without Source Code';
	}
	if (name.startsWith('/javascript/esm|')) {
		type = '3rd Party';
	}
	if (name.startsWith('/webpack/')) {
		return 'Webpack';
	}
	if (name.startsWith('/node_modules/@')) {
		const names = name.replace('/node_modules/@', '').split('/');
		type = names[0];
		if (names.length > 1) {
			type = names[0] + ' ' + names[1];
		}
	} else if (name.startsWith('/node_modules/rxjs')) {
		type = 'RxJS';
	}
	type = type.split('-').join(' ');
	return toTitleCase(type);
}

function friendlyName(name: string, path?: string): string {
	let result = name?.replace('.entry.js', '');
	result = result.split('-').join(' ');
	result = result.split('_').join(' ');
	result = result.split('.').join(' ');
	result = result.split('%20').join(' ');
	for (let i = 1; i < 9; i++) {
		if (result.endsWith(` ${i}`)) {
			result = result.replace(` ${i}`, '');
		}
		
	}
	// Ionic component
	if (result.startsWith('ion ')) {
		result = result.replace('ion ', '');
		if (result && result[result.length - 2] == '_') {
			result = result.substring(0, result.length - 2); // gets rid of _2, _3 etc
		}
		result += ' Component';
	}
	result = result.replace(' dist', '');

	if (result.endsWith(' js')) {
		result = result.replace(' js', '');
	} else if (result.endsWith(' ts')) {
		result = result.replace(' ts', '');
	} else if (result.endsWith(' mjs')) {
		result = result.replace(' mjs', '');
	}

	if (result == 'index' || result == 'runtime') {
		result = path;
	} else {
		if (path?.startsWith('Moment Locale')) {
			result = path;
		}
	}

	return toTitleCase(result);
}

function toTitleCase(text: string) {
	return text.replace(
		/\w\S*/g,
		(txt: string) => {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		}
	);
}

function friendlyPath(path: string): string {
	path = path.replace('fesm2020', '');
	path = path.replace('fesm2015', '');
	path = path.replace('dist ngx', '');
	path = path.replace('dist esm', '');
	path = path.replace('index.js', '');
	path = path.replace('_lib', '');
	path = path.replace(' esm', '');
	path = path.replace(' dist', '');
	path = path.replace('.js', '');
	path = path.replace('@capacitor', 'Capacitor');
	path = path.split('-').join(' ');

	if (path == '@ionic core dist esm') {
		return 'Ionic Framework';
	} else if (path == '@ionic core dist esm polyfills') {
		return 'Ionic Framework Polyfills';
	} else if (path.startsWith('@ionic-enterprise')) {
		path = path.replace('@ionic-enterprise', 'Ionic Enterprise');
	} else if (path.startsWith('@angular')) {
		path = path.replace('@angular', 'Angular');
	}
	if (path.startsWith('rxjs')) {
		return 'RxJS';
	}
	if (path == 'webpack runtime') {
		return 'Webpack';
	}
	path = path.replace('__ivy_ngcc__', '');
	return toTitleCase(path).trim();
}


async function run2(project: Project, command: string, output: RunResults): Promise<boolean> {
	const channel = getOutputChannel();
	return await run(project.projectFolder(), command, channel, undefined, [], [], undefined, undefined, output, true);
}

interface FileInfo {
	name: string;
	path: string;
	type: string;
	size: number;
	bundlename: string;
	filename: string;
}

export interface SizeResults {
	results: SizeResult[];
}

export interface SizeResult {
	bundleName: string
	totalBytes: number
	mappedBytes: number
	eolBytes: number
	sourceMapCommentBytes: number
	files: any
}