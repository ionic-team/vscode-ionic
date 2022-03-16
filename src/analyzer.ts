'use strict';

import { coerce, compare, lt, gte, lte } from 'semver';
import * as fs from 'fs';
import { parse } from 'fast-xml-parser';
import * as vscode from 'vscode';

import {
	writeConsistentVersionError,
	writeMinVersionError,
	writeMinVersionWarning,
	error,
	libString,
	writeConsistentVersionWarning
} from './messages';
import { processPackages } from './process-packages';
import { Command, Tip, TipType } from './tip';
import { Project } from './project';

let packageFile;
let allDependencies;
let cordovaConfig;
let androidManifest;

function processConfigXML(folder: string) {
	const configXMLFilename = `${folder}/config.xml`;
	const config = { preferences: {}, androidPreferences: {}, iosPreferences: {}, plugins: {} };
	if (fs.existsSync(configXMLFilename)) {
		const xml = fs.readFileSync(configXMLFilename, 'utf8');
		const json = parse(xml, { ignoreNameSpace: true, arrayMode: true, parseNodeValue: true, parseAttributeValue: true, ignoreAttributes: false });

		const widget = json.widget[0];
		if (widget.preference) {
			for (const pref of widget.preference) {
				config.preferences[pref['@_name']] = pref['@_value'];
			}
		}
		for (const platform of widget.platform) {
			if (platform['@_name'] == 'android' && platform.preference) {
				for (const pref of platform.preference) {
					config.androidPreferences[pref['@_name']] = pref['@_value'];
				}
			}

			if (platform['@_name'] == 'ios' && platform.preference) {
				for (const pref of platform.preference) {
					config.iosPreferences[pref['@_name']] = pref['@_value'];
				}
			}
		}
		if (widget.plugin) {
			for (const plugin of widget.plugin) {
				config.plugins[plugin['@_name']] = plugin['@_spec'];
			}
		}
	}
	return config;
}

function processAndroidXML(folder: string) {
	const androidXMLFilename = `${folder}/android/app/src/main/AndroidManifest.xml`;
	const config = undefined;
	if (!fs.existsSync(androidXMLFilename)) {
		return config;
	}
	const xml = fs.readFileSync(androidXMLFilename, 'utf8');
	return parse(xml, { ignoreNameSpace: true, arrayMode: true, parseNodeValue: true, parseAttributeValue: true, ignoreAttributes: false });
}

function getAndroidManifestIntent(actionName) {
	function matches(attribute, value, array) {
		return (array.find(element => element[attribute] == value) != undefined);
	}

	console.log(androidManifest.manifest[0].application[0].activity[0]);
	for (const intent of androidManifest.manifest[0].application[0].activity[0]['intent-filter']) {

		if (matches('@_name', 'android.intent.action.VIEW', intent.action)) {
			return intent;
		}
	}
	return undefined;
}

export const isCapacitor = () => !!allDependencies['@capacitor/core'];
export const isCordova = () =>
	!!(allDependencies['cordova-ios'] || allDependencies['cordova-android'] || packageFile.cordova);

export async function load(fn: string, project: Project, context: vscode.ExtensionContext): Promise<any> {
	let packageJsonFilename = fn;
	if (fs.lstatSync(fn).isDirectory()) {
		packageJsonFilename = fn + '/package.json';
		cordovaConfig = processConfigXML(fn);
		androidManifest = processAndroidXML(fn);
	}
	if (!fs.existsSync(packageJsonFilename)) {
		error('package.json', 'This folder does not contain an Ionic application (its missing package.json)');
		allDependencies = [];
		packageFile = {};
		return undefined;
	}
	project.modified = fs.statSync(packageJsonFilename).mtime;
	packageFile = JSON.parse(fs.readFileSync(packageJsonFilename, 'utf8'));
	project.name = packageFile.name;
	allDependencies = {
		...packageFile.dependencies,
		...packageFile.devDependencies,
	};

	return await processPackages(fn, allDependencies, packageFile.devDependencies, context, project.modified);
}

export const checkMinVersion = (library: string, minVersion: string, reason?: string, url?: string): Tip => {
	const v = coerce(allDependencies[library]);
	if (v && lt(v, minVersion)) {
		const tip = writeMinVersionError(library, v, minVersion, reason);
		tip.url = url;
		return tip;
	}
};

export const warnMinVersion = (library: string, minVersion: string, reason?: string, url?: string): Tip => {
	const v = coerce(allDependencies[library]);
	if (v && lt(v, minVersion)) {
		const tip = writeMinVersionWarning(library, v, minVersion, reason, url);
		tip.url = url;
		return tip;
	}
};

export function exists(library: string) {
	return !!allDependencies[library];
}

export function checkCordovaAndroidPreference(preference: string, value: string | boolean, preferredValue?: string): Tip {
	if (!cordovaConfig) {
		return;
	}
	if (!equals(cordovaConfig.androidPreferences[preference], value)) {
		if (preferredValue) {
			return error('config.xml', `The android preference ${preference} cannot be ${cordovaConfig.androidPreferences[preference]}. Add <preference name="${preference}" value="${preferredValue}" /> to <platform name="android"> in config.xml`);
		} else {
			return error('config.xml', `The android preference ${preference} should be ${value}. Add <preference name="${preference}" value="${value}" /> to <platform name="android"> in config.xml`);
		}
	}
}

export function checkAndroidManifest() {
	error(
		'Not Implemented', 'Not implemented yet');
	const intent = getAndroidManifestIntent('android.intent.action.VIEW');
	console.error('WOW');
	console.log(intent);
	return true;
}

export function checkCordovaAndroidPreferenceMinimum(preference, minVersion): Tip {
	if (!cordovaConfig) {
		return;
	}
	const v = coerce(cordovaConfig.androidPreferences[preference]);
	if (!v || lt(v, minVersion)) {
		return error('config.xml', `The android preference ${preference} should be at a minimum ${minVersion}. Add <preference name="${preference}" value="${minVersion}" /> to <platform name="android"> in config.xml`);
	}
}

function equals(value: any, expected: any | Array<any>) {
	if (value == expected) {
		return true;
	}
	if (expected instanceof Array && expected.includes(value)) {
		return true;
	}
	return false;
}

export function checkCordovaIosPreference(preference: string, value: any, preferredValue: number): Tip {
	if (!cordovaConfig) {
		return;
	}
	if (!equals(cordovaConfig.iosPreferences[preference], value)) {
		if (preferredValue) {
			return error(
				'config.xml',
				`The ios preference ${preference} cannot be ${cordovaConfig.iosPreferences[preference]}. Add <preference name="${preference}" value="${preferredValue}" /> to <platform name="ios"> in config.xml`
			);
		} else {
			return error(
				'config.xml',
				`The ios preference ${preference} should be ${value}. Add <preference name="${preference}" value="${value}" /> to <platform name="ios"> in config.xml`
			);
		}
	}
}

export function isGreaterOrEqual(library: string, minVersion: string): boolean {
	const v = coerce(allDependencies[library]);
	return (v && gte(v, minVersion));
}

export function isLessOrEqual(library: string, minVersion: string): boolean {
	const v = coerce(allDependencies[library]);
	return (v && lte(v, minVersion));
}

export function isLess(library: string, minVersion: string): boolean {
	const v = coerce(allDependencies[library]);
	return (v && lt(v, minVersion));
}

export function checkConsistentVersions(lib1: string, lib2: string): Tip {
	const v1 = coerce(allDependencies[lib1]);
	const v2 = coerce(allDependencies[lib2]);

	if (v1 && v2 && compare(v1, v2)) {
		if (v1.major === v2.major) {
			return writeConsistentVersionWarning(lib1, v1, lib2, v2);
		} else {
			return writeConsistentVersionError(lib1, v1, lib2, v2);
		}
	}
}

export function notRequiredPlugin(name: string, message?: string): Tip {
	if (exists(name)) {
		const msg = message ? '. ' + message : '';
		return new Tip(name,
			`Not required with Capacitor${msg}`, TipType.Error,
			`The plugin ${libString(name)} is not required with Capacitor${msg}`,
			`npm uninstall ${name}`,
			'Uninstall',
			`${name} was uninstalled`).canIgnore();
	}
}

export function replacementPlugin(name: string, replacement: string, url?: string): Tip {
	if (exists(name)) {
		return new Tip(name,
			`Replace with ${replacement}${url ? ' (' + url + ')' : ''}`, TipType.Idea,
			`The plugin ${libString(name)} could be replaced with ${libString(replacement)}${url ? ' (' + url + ')' : ''}`,
			`npm install ${replacement} && npm uninstall ${name}`,
			'Replace Plugin',
			`${name} replaced with ${replacement}`,
			url
		).canIgnore();
	}
}

export function incompatibleReplacementPlugin(name: string, replacement: string, url?: string): Tip {
	if (exists(name)) {
		return new Tip(name,
			`Replace with ${replacement}${url ? ' (' + url + ')' : ''}`, TipType.Error,
			`The plugin ${libString(name)} is incompatible with Capacitor and must be replaced with ${libString(replacement)}${url ? ' (' + url + ')' : ''}`,
			`npm install ${replacement} && npm uninstall ${name}`,
			'Replace Plugin',
			`${name} replaced with ${replacement}`,
			url
		).canIgnore();
	}
}

export function incompatiblePlugin(name: string, url?: string): Tip {
	if (exists(name)) {
		const isUrl = url.startsWith('http');
		const msg = (isUrl) ? `See ${url}` : url;
		const tip = new Tip(name,
			`Incompatible with Capacitor. ${msg}`, TipType.Error,
			`The plugin ${libString(name)} is incompatible with Capacitor. ${msg}`, Command.NoOp, 'OK').canIgnore();
		if (isUrl) {
			tip.url = url;
		} else {
			tip.command = Command.NoOp;
			tip.url = `https://www.npmjs.com/package/${name}`;
		}
		return tip;
	}
}

export function reviewPlugin(name: string): Tip {
	if (exists(name)) {
		return new Tip(name,
			`Test for Capacitor compatibility.`, TipType.Warning,
			`The plugin ${libString(name)} requires testing for Capacitor compatibility.`);
	}
}

export function warnIfNotUsing(name: string): Tip {
	if (!allDependencies[name]) {
		return new Tip(name, `package is not using ${libString(name)}`);
	}
}