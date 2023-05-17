import { Recommendation } from './recommendation';
import { Project } from './project';
import { Tip, TipType } from './tip';
import { getRunOutput, isWindows } from './utilities';

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

      project.setGroup(`${type}`, '', getType(type), false);
    }

    project.add(
      new Tip(
        `${starter.name}`,
        `${starter.description}`,
        TipType.Run,
        'Create Project',
        [
          `npx ionic start @app ${starter.name} --type=${starter.type} --capacitor --package-id=@package-id --no-git`,
          isWindows()
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

function getType(framework: string): TipType {
  switch (framework.toLowerCase()) {
    case 'angular':
    case 'angular (with ngmodules)':
      return TipType.Angular;
    case 'vue':
      return TipType.Vue;
    case 'react':
      return TipType.React;
    default:
      return TipType.Ionic;
  }
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
          typeName = 'New Angular Project (Legacy)';
          break;
        case 'angular-standalone':
          typeName = 'New Angular Project';
          break;
        case 'react':
          typeName = 'New React Project';
          break;
        case 'vue':
          typeName = 'New Vue Project';
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
  result = result.sort((a, b) => (a.typeName > b.typeName ? 1 : -1));
  return result;
}
