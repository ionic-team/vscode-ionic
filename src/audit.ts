import { window } from 'vscode';
import { clearOutput, write, writeError, writeIonic } from './logging';
import { Project } from './project';
import { getRunOutput, run, showProgress, stripJSON } from './utilities';
import { QueueFunction } from './tip';

export async function audit(queueFunction: QueueFunction, project: Project): Promise<void> {
  try {
    queueFunction();
    clearOutput();
    await showProgress('Auditing project dependencies...', async () => {
      let folder = project.projectFolder();
      if (project.monoRepo?.nodeModulesAtRoot) {
        folder = project.folder;
      }
      const data = await getRunOutput('npm audit --json', folder);
      try {
        const audit: Audit = JSON.parse(stripJSON(data, '{'));
        completeAudit(project, audit);
      } catch (error) {
        writeError('npm audit --json failed with:');
        writeError(data);
      }
    });
  } catch (error) {
    writeError(error);
  }
  return;
}

async function completeAudit(project: Project, audit: Audit) {
  const severities = ['critical', 'high', 'moderate', 'low'];
  const types = ['direct', 'indirect'];
  writeIonic(
    `There are ${audit.metadata.vulnerabilities.total} security vulnerabilities in your projects ${audit.metadata.dependencies.total} dependencies`,
  );
  for (const type of types) {
    if (type == 'indirect' && audit.metadata.vulnerabilities.total > 0) {
      write('');
      write('Other vulnerable dependencies');
    }
    for (const severity of severities) {
      for (const name of Object.keys(audit.vulnerabilities)) {
        const v: Vulnerability = audit.vulnerabilities[name];
        if (v.severity == severity) {
          let direct = false;
          for (const source of v.via) {
            if (typeof source === 'object') direct = true;
            if (type == 'direct' && typeof source === 'object') {
              write(`[${v.severity}] ${source.title} ${source.url}`);
            }
          }
          if (!direct && type === 'indirect') {
            write(`${v.name} is vulnerable because it uses ${v.via.join(',')}`);
          }
        }
      }
    }
  }

  if (audit.metadata.vulnerabilities.total > 0) {
    const response = await window.showWarningMessage(
      `${audit.metadata.vulnerabilities.total} security vulnerabilities were found in your project. Do you want to attempt to fix them?`,
      'Yes',
      'Cancel',
    );
    if (response === 'Yes') {
      clearOutput();
      write('> npm audit fix');
      await run(project.projectFolder(), 'npm audit fix', undefined, [], [], undefined, undefined, undefined, false);
    }
  }
}

interface Vulnerability {
  name: string;
  severity: string;
  isDirect: boolean;
  via: Source[];
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean;
}

interface Source {
  source: number;
  name: string;
  dependency: string;
  title: string;
  url: string;
  severity: string;
  cwe: string[];
  cvss: Cvss;
  range: string;
}

interface Cvss {
  score: number;
  vectorString: string;
}

interface Audit {
  auditReportVersion: number;
  vulnerabilities: object;
  metadata: AuditMetadata;
}

interface AuditMetadata {
  vulnerabilities: VulnerabilitiesMeta;
  dependencies: DependenciesMeta;
}

interface VulnerabilitiesMeta {
  info: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
  total: number;
}

interface DependenciesMeta {
  prod: number;
  dev: number;
  optional: number;
  peer: number;
  peerOptional: number;
  total: number;
}
