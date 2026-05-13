import { fs, types, util } from 'vortex-api';
import { EPICAPP_ID, EXE_PATH, MOD_FOLDER, NEXUSMODS_ID, ORIGINAPP_ID, STEAMAPP_ID } from './common';
import installer from './installer-starwarsjedi2-mod';
import modtype from './modtype-starwarsjedi2-pak-modtype';
import loadorder from './loadorder';

function main(context: types.IExtensionContext) {
    // Required Vortex 1.2.0+ for load order support
    context.requireVersion('>=1.2.0');

    context.registerGame({
        id: NEXUSMODS_ID,
        name: 'Star Wars Jedi: Survivor',
        mergeMods: true,
        queryPath: util.toBlue(findGame),
        requiresCleanup: true,
        queryModPath: () => '.',
        logo: 'gameart.jpg',
        executable:() => EXE_PATH,
        requiredFiles: [
            EXE_PATH
        ],
        setup: util.toBlue(prepareForModding),
        environment: {
            SteamAPPId: STEAMAPP_ID
        },
        details: {
            steamAppId: STEAMAPP_ID,
            customOpenModsPath: MOD_FOLDER,
            supportsSymlinks: false,
        }
    });

    context.registerInstaller(
        'starwarsjedi2-mod', 
        25, 
        installer.test, 
        (files) => installer.install(context.api, files)
    );

    context.registerModType(
        'starwarsjedi2-pak-modtype', 
        25,
        (gameId) => gameId === NEXUSMODS_ID,
        () => modtype.getPath(context.api),
        util.toBlue(modtype.test),
        {
            mergeMods: (mod) => loadorder.createPrefix(context.api, mod) + mod.id , 
            name: 'Fallen Order PAK mod'
        }
    );
    
    context.registerLoadOrderPage({
        gameId: NEXUSMODS_ID,
        gameArtURL: `${__dirname}\\gameart.jpg`,
        preSort: (items, direction) => loadorder.preSort(context.api, items, direction),
        filter: loadorder.filter,
        displayCheckboxes: false,
        callback: (lo) => loadorder.callback(context.api, lo),
        createInfoPanel: () => loadorder.infoPanel({ api: context.api }),
    });
}

async function findGame() {
    const detected = await util.GameStoreHelper.findByAppId([
        STEAMAPP_ID,
        ORIGINAPP_ID,
        EPICAPP_ID,
    ]);
    return detected;
}

async function prepareForModding() {
    return fs.ensureDirWritableAsync(MOD_FOLDER, () => Promise.resolve());
}

export default main;