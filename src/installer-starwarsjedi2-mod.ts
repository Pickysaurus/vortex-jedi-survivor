import path from "path";
import { types, util } from 'vortex-api';
import { NEXUSMODS_ID, MOD_FILE_EXT } from './common';


async function test(files: string[], gameId: string): Promise<types.ISupportedResult> {
  // Make sure we're able to support this mod.
  let supported = (gameId === NEXUSMODS_ID) &&
    (files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT) !== undefined);

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

async function install(api: types.IExtensionApi, files: string[]) {
  // The .pak file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT)!;
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => 
    ((file.indexOf(rootPath) !== -1) 
    && (!file.endsWith(path.sep))));

  const pakFiles = files.filter(file => path.extname(file).toLowerCase() === MOD_FILE_EXT).map(pak => path.basename(pak));

  if (pakFiles.length > 1) return await Promise.resolve(choosePaksToInstall(api, pakFiles));

  const instructions: types.IInstruction[] = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });

  if (pakFiles.length) instructions.push({
    type: 'attribute',
    key: 'pakFiles',
    value: pakFiles
  });

  return Promise.resolve({ instructions });
}

async function choosePaksToInstall(api, paks) {
  return api.showDialog('question', 'Multiple PAK files', 
  {
    text: `The mod you are installing contains ${paks.length} PAK files.`+
    `This can be because the author intended for you to chose one of several options. Please select which files to install below:`,
    checkboxes: paks.map(pak => {
      return {
        id: path.basename(pak),
        text: path.basename(pak)
      }
    })
  },
  [
    { label: 'Cancel' },
    { label: 'Install Selected' },
    { label: 'Install All_plural' }
  ]
  ).then((result) => {
    if (result.action === 'Cancel') return Promise.reject( new util.ProcessCanceled('User cancelled.') );
    else {
      const installAll = (result.action === 'Install All' || result.action === 'Install All_plural');
      const installPAKS = installAll ? paks : Object.keys(result.input).filter(s => result.input[s]);

      const instructions = installPAKS.map(pak => {
        return {
          type: 'copy',
          source: pak,
          destination: pak
        }
      });

      instructions.push({
        type: "attribute",
        key: 'pakFiles',
        value: paks
      });

      return Promise.resolve({instructions});
    }
  });
}

export default { test, install };