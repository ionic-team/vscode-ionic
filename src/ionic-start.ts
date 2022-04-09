import { Recommendation } from './recommendation';
import { Project } from './project';
import { Tip, TipType } from './tip';
import { getRunOutput } from './utilities';

/**
 * Creates ionic start commands
 * @param  {string} folder
 * @returns Promise
 */
export async function starterProject(folder: string): Promise<Recommendation[]> {
  const project: Project = new Project('New Project');

  const out = await getRunOutput('npx ionic start -l', folder);
  const projects = parseIonicStart(out);
  let type = undefined;
  for (const starter of projects) {
    if (type != starter.typeName) {
      type = starter.typeName;
      project.setGroup(`New ${type} Project`, '', TipType.Ionic, false);
    }

    project.add(
      new Tip(
        `${starter.name}`,
        `${starter.description}`,
        TipType.Run,
        'Create Project',
        [
          `npx ionic start @app ${starter.name} --type=${starter.type} --capacitor`,
          process.platform === 'win32'
            ? `robocopy @app . /MOVE /E /NFL /NDL /NJH /NJS /nc /ns /np`
            : `mv @app/{,.[^.]}* . && rmdir @app`,
        ],
        'Creating Project',
        'Project Created'
      )
        .requestAppName()
        .showProgressDialog()
    );
  }
  return project.groups;
}

function parseIonicStart(text: string): Array<any> {
  const lines = text.split('\n');
  let type = undefined;
  let typeName = undefined;
  let result = [];
  for (const line of lines) {
    if (line.includes('--type=')) {
      const t = line.split('=');
      typeName = t[1].replace(')', '');
      type = typeName;
      switch (typeName) {
        case 'ionic-angular':
          typeName = 'ionic2';
          break;
        case 'angular':
          typeName = 'Angular';
          break;
        case 'react':
          typeName = 'React';
          break;
        case 'vue':
          typeName = 'Vue';
          break;
      }
    }
    if (line.includes('|')) {
      const t = line.split('|');
      const name = t[0].trim();
      const description = t[1].trim();
      if (name != 'name') {
        result.push({ type: type, typeName: typeName, name: name, description: description });
      }
    }
  }
  result = result.filter((project) => {
    return project.type != 'ionic1' && project.type != 'ionic-angular';
  });
  result = result.sort((a, b) => (a.type > b.type ? 1 : -1));
  return result;
}
