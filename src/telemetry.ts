import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'https';

interface TelemetryMetric {
	name: string;
	timestamp: string;
	session_id: string;
	source: string;
	value: any;
}

interface TelemetryEvent {
	metrics: Array<TelemetryMetric>,
	sent_at: string
}

export interface IonicConfig {
	telemetry: boolean;
	npmClient?: string;
	'git.setup'?: boolean;
	'tokens.telemetry'?: string;
	'user.email'?: string;
	'user.id'?: string;
	'version'?: string;
}

/**
 * Sends telemetry to Ionic
 * @param  {boolean} telemetry If false will not send
 * @param  {string} sessionId A session identifier
 * @param  {string} event_type Name of the event to send
 * @param  {any} payload Javascript object containing information to send
 */
export function sendTelemetry(telemetry: boolean, sessionId: string, event_type: string, payload: any) {
	if (!telemetry) return;

	try {
		payload.event_type = event_type;
		payload.os_name = os.platform();
		payload.os_version = os.release();

		// Call POST https://api.ionicjs.com/events/metrics
		const now = new Date().toISOString();
		const metric: TelemetryMetric = {
			name: 'vscode_ext', //'vscode_ext_metrics', // Needs to be added https://github.com/ionic-team/appflow-events/blob/04173db00f0a9ef6c2798166bfda8f4b3d53a89a/ionic_api_events/settings.py#L52
			timestamp: now,
			session_id: sessionId,
			source: 'vscode_ext',
			value: payload
		};
		const event: TelemetryEvent = {
			metrics: [metric],
			sent_at: now
		};

		const data = JSON.stringify(event);
		const options = {
			hostname: 'api.ionicjs.com',
			port: 443,
			path: '/events/metrics',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': data.length
			}
		};

		const req = http.request(options, res => {
			//console.log(`statusCode: ${res.statusCode}`);
			res.on('data', d => {
				console.log(d.toString());				
			});
		});

		req.on('error', error => {
			console.error(error);
		});
		req.write(data);
		req.end();

	} catch (err) {
		console.error('Unable to send telemetry', err);
	}
}
/**
 * Gets the local folders ionic configuration to override telemetry if needed
 * @param  {string} folder
 * @returns IonicConfig
 */
export function getIonicConfig(folder: string): IonicConfig {
	const config = getGlobalIonicConfig();
	const configFile = path.join(folder, 'ionic.config.json');
	if (fs.existsSync(configFile)) {
		const json: any = fs.readFileSync(configFile);
		const data: IonicConfig = JSON.parse(json);
		if (data.telemetry) {
			config.telemetry = data.telemetry; // Override global with local setting
		}
	}	
	return config;
}

/**
 * Look for ~/.ionic/config.json and return json object or default
 * @returns IonicConfig
 */
export function getGlobalIonicConfig(): IonicConfig {
	const configPath = path.resolve(os.homedir(), '.ionic');
	const configFile = path.join(configPath, 'config.json');

	if (fs.existsSync(configFile)) {
		const json: any = fs.readFileSync(configFile);		
		const data: IonicConfig = JSON.parse(json);
		if (!data.telemetry) {
			data.telemetry = true; // Default is true for telemetry
		}
		return data;
	} else {
		return { telemetry: false };
	}
}

/** INFO about telemtry
you can collect analytics/metrics/telemetry by posting an EventsSchema to https://api.ionicjs.com/events/metrics
the EventsSchema is defined here: https://github.com/ionic-team/appflow-core/blob/main/ionic_api_core/schema/schemas.py#L12-L24
the the CLI implementations are here: https://github.com/ionic-team/ionic-cli/blob/develop/packages/@ionic/cli/src/lib/telemetry.ts
https://github.com/ionic-team/capacitor/blob/main/cli/src/tasks/telemetry.ts
https://github.com/ionic-team/stencil/blob/main/src/cli/telemetry/telemetry.ts
the stencil CLI does something similar to collect a list of ionic (the company) packages: https://github.com/ionic-team/stencil/blob/main/src/cli/telemetry/telemetry.ts#L149-L192
{
	"metrics": [
	  {
		"name": "vscode_ext",
		"session_id": "7257a836-8b5c-4250-844d-c9f01f0a0949",
		"source": "vscode_ext",
		"timestamp": "2022-02-24T19:56:56.773Z",
		"value": {
		  "event_type": "actual_event_name",
		  "os_name": "darwin",
		  "os_version": "21.3.0",
  
		  "arguments": ["--dev", "--watch", "--serve", "start"],
		  "build": "20220124181123",
		  "cpu_model": "Intel(R) Core(TM) i7-4770HQ CPU @ 2.20GHz",
		  "duration_ms": 56202,
		  "has_app_pwa_config": false,
		  "packages": ["@stencil/core@2.6.0", "@stencil/sass@1.4.1"],
		  "packages_no_versions": ["@stencil/core", "@stencil/sass"],
		  "rollup": "2.42.3",
		  "stencil": "2.13.0",
		  "system": "node 15.14.0",
		  "system_major": "node 15",
		  "targets": ["dist-custom-elements-bundle", "www", "dist-lazy", "copy", "dist-global-styles", "dist", "dist-types", "docs-readme", "angular"],
		  "task": "build",
		  "typescript": "4.3.5",
		  "yarn": true
		}   
	  }     
	],    
	"sent_at": "2022-02-24T19:56:56.773Z"
  }  
*/