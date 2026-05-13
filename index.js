const Promise = require('bluebird');
const React = require('react');
const path = require('path');
const semver = require('semver');
const { actions, fs, FlexLayout, log, selectors, util } = require('vortex-api');

// APPIDs for the different game stores. 
const STEAMAPP_ID = '1172380';
const ORIGINAPP_ID = 'Origin.OFR.50.0003795';
const EPICAPP_ID = 'Shoebill';

// Nexus Mods id for the game.
const STARWARS_ID = 'starwarsjedifallenorder';

const I18N_NAMESPACE = `game-${STARWARS_ID}`;

// Most Fallen Order mods will be .pak files
const MOD_FILE_EXT = ".pak";

function findGame() {
  return util.GameStoreHelper.findByAppId([STEAMAPP_ID, ORIGINAPP_ID, EPICAPP_ID])
      .then(game => game.gamePath);
}

function prepareForModding(discovery) {
  return fs.ensureDirWritableAsync(path.join(discovery.path, 'swgame', 'content', 'paks', '~mods'),
    () => Promise.resolve());
}

const getPakModsPath = (api) => {
  const state = api.store.getState();
  const discovery = util.getSafe(state.settings, ['gameMode', 'discovered', STARWARS_ID], undefined);
  return discovery ? path.join(discovery.path, 'SwGame', 'content', 'paks', '~mods') : undefined;
}

async function installContent(api, files, destinationPath) {
  // The .pak file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
  const modFile = files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => 
    ((file.indexOf(rootPath) !== -1) 
    && (!file.endsWith(path.sep))));

  const pakFiles = files.filter(file => path.extname(file).toLowerCase() === MOD_FILE_EXT).map(pak => path.basename(pak));

  if (pakFiles.length > 1) return await Promise.resolve(choosePaksToInstall(api, pakFiles));

  const instructions = filtered.map(file => {
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

function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  let supported = (gameId === STARWARS_ID) &&
    (files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT) !== undefined);

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function testPakModType(instructions) {
  return Promise.resolve(instructions.find(instruction => !!instruction.destination && path.extname(instruction.destination) === MOD_FILE_EXT) !== undefined);
}

function main(context) {

  context.requireVersion('^1.2.0');

  context.registerGame({
    id: STARWARS_ID,
    name: 'Star Wars Jedi: Fallen Order',
    mergeMods: true,
    queryPath: findGame,
    requiresCleanup: true,
    supportedTools: [],
    queryModPath: () => '.',
    logo: 'gameart.jpg',
    executable: () => path.join('SwGame', 'Binaries', 'Win64', 'starwarsjedifallenorder.exe'),
    requiredFiles: [
      path.join('SwGame', 'Binaries', 'Win64', 'starwarsjedifallenorder.exe')
    ],
    setup: prepareForModding,
    environment: {
      SteamAPPId: STEAMAPP_ID,
    },
    details: {
      steamAppId: STEAMAPP_ID,
      customOpenModsPath: path.join('SwGame', 'content', 'paks', '~mods')
    },
  });

  context.registerInstaller('starwarsjedi-mod', 25, testSupportedContent, 
    (files, destinationPath) => installContent(context.api, files, destinationPath));

  context.registerModType('starwarsjedi-pak-modtype', 25, gameId => gameId === STARWARS_ID, () => getPakModsPath(context.api), 
    testPakModType, { mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id , name: 'Fallen Order PAK mod'});


  let previousLO;

  context.registerLoadOrderPage({
    gameId: STARWARS_ID,
    gameArtURL: `${__dirname}\\gameart.jpg`,
    preSort: (items, direction) => preSort(context.api, items, direction),
    filter: mods => mods.filter(mod => mod.type === 'starwarsjedi-pak-modtype'),
    displayCheckboxes: false,
    callback: (loadOrder) => {
      if (previousLO === undefined) previousLO = loadOrder;
      if (loadOrder === previousLO) return;
      context.api.store.dispatch(actions.setDeploymentNecessary(STARWARS_ID, true));
      previousLO = loadOrder;
    },
    createInfoPanel: () => React.createElement(FlexLayout.Flex, {},
      React.createElement('div', {
        style: {
          padding: 'var(--half-gutter, 15px)',
        }
      },
        React.createElement('h2', {}, 
          context.api.translate('Changing your load order', { ns: I18N_NAMESPACE })),
        React.createElement('p', {}, 
          context.api.translate('Drag and drop the mods on the left to reorder them. Star Wars Jedi: Fallen Order loads mods in alphanumerical order so Vortex prefixes '
              + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
              + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.', { ns: I18N_NAMESPACE })),
          React.createElement('p', {}, 
          context.api.translate('Note: You can only manage mods installed with Vortex. Installing other mods manually may cause unexpected errors.', { ns: I18N_NAMESPACE })),
      )),
  });

  context.registerMigration((oldVersion) => migrate100(oldVersion, context.api));

  return true;
}

function migrate100(oldVersion, api) {
  if (semver.gte(oldVersion, '1.0.0')) return Promise.resolve();

  const state = api.store.getState(); 
  const activatorId = util.getSafe(state, ['settings', 'mods', 'activator', STARWARS_ID], undefined);
  const gameDiscovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', STARWARS_ID], undefined);
  if (!gameDiscovery || !activatorId || !gameDiscovery.path) {
    log('debug', 'Skipping Jedi: Fallen Order migration to 1.0.0 as no there is deployment set up for it.');
    return Promise.resolve();
  }

  const mods = util.getSafe(state, ['persistent', 'mods', STARWARS_ID], {});
  if (!Object.keys(mods).length) {
    log('debug', 'Skipping Jedi: Fallen Order migration to 1.0.0 are no mods installed.');
    return Promise.resolve();
  }

  const stagingFolder = selectors.installPath(state);
  let changedMods = 0;

  return api.awaitUI()
    .then(() => api.emitAndAwait('purge-mods-in-path', STARWARS_ID, '', getPakModsPath(api)))
    .then(() => {
      // Flip the mod types for applicable mods.
      return Promise.all(Object.values(mods).map((mod) => {
        // Ignore any mods the user has changed the modtype for. 
        if (mod.type === '') {
          const modPath = path.join(stagingFolder, mod.installationPath);
          // Get a list of files in the base directory. 
          return fs.readdirAsync(modPath)
            .then((files) => {
              // If it contains a PAK mod, change the mod type.
              if (files.find(file => path.extname(file) === MOD_FILE_EXT)) {
                api.store.dispatch(actions.setModType(STARWARS_ID, mod.id, 'starwarsjedi-pak-modtype'));
                changedMods ++;
              }
            })
            .catch(err => log('warn', 'Error reading path for mod', mod.id, err));
        }
      }));
    })
    .then(() => {
      log('debug', 'Jedi: Fallen Order migration complete.');
      if (changedMods > 0) api.store.dispatch(actions.setDeploymentNecessary(STARWARS_ID, true));
    });
}

async function preSort(api, items, direction) {
  const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', STARWARS_ID], {});

  const loadOrder = items.map(mod => {
    const modInfo = mods[mod.id];
    let name = modInfo ? modInfo.attributes.customFileName ?? modInfo.attributes.logicalFileName ?? modInfo.attributes.name : mod.name;
    const paks = util.getSafe(modInfo.attributes, ['pakFiles'], []);
    if (paks.length > 1) name = name + ` (${paks.length} PAK files)`;

    return {
      id: mod.id,
      name,
      imgUrl: modInfo ? modInfo.attributes.pictureUrl : undefined
    }
  });

  return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);

}

function makePrefix(input) {
  let res = '';
  let rest = input;
  while (rest > 0) {
    res = String.fromCharCode(65 + (rest % 25)) + res;
    rest = Math.floor(rest / 25);
  }
  return util.pad(res, 'A', 3);
}

function loadOrderPrefix(api, mod) {
  const state = api.store.getState();
  const gameId = selectors.activeGameId(state);
  if (gameId !== STARWARS_ID) return null;
  const profile = selectors.activeProfile(state);
  const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile?.id], {});
  const loKeys = Object.keys(loadOrder);
  const pos = loKeys.indexOf(mod.id);
  if (pos === -1) {
    return 'ZZZZ-';
  }

  return makePrefix(pos) + '-';
}

module.exports = {
  default: main,
};
