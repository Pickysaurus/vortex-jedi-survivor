import path from "path";
import { types } from "vortex-api";
import { MOD_FILE_EXT, MOD_FOLDER, NEXUSMODS_ID } from "./common";

async function test(instructions: types.IInstruction[]): Promise<boolean> {
    return !!instructions.find(
        instruction => !!instruction.destination && path.extname(instruction.destination) === MOD_FILE_EXT
    );
}

const getPath = (api: types.IExtensionApi) => {
  const state = api.getState();
  const discovery = state.settings.gameMode.discovered?.[NEXUSMODS_ID];
  if (!discovery || !discovery.path) return '';
  
  return path.join(discovery.path, MOD_FOLDER);
}

export default { test, getPath };