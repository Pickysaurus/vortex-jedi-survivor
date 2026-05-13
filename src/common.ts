import path from 'path';

// Game Constants
const STEAMAPP_ID = '1774580';
const ORIGINAPP_ID = 'Origin.SFT.50.0001331';
const EPICAPP_ID = '';
const NEXUSMODS_ID = 'starwarsjedisurvivor';
const EXE_PATH = path.join('SwGame', 'Binaries', 'Win64', 'jedisurvivor.exe')

// Modding Constants
const MOD_FILE_EXT = ".pak";
const MOD_FOLDER = path.join('SwGame', 'content', 'paks', '~mods');

const I18N_NAMESPACE = `game-${NEXUSMODS_ID}`;

export { STEAMAPP_ID, ORIGINAPP_ID, EPICAPP_ID, NEXUSMODS_ID, MOD_FILE_EXT, EXE_PATH, MOD_FOLDER, I18N_NAMESPACE };