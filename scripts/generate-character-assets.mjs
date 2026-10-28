import fs from 'node:fs/promises';
import {CHARACTER_NAMES,characterSvg} from '../src/v2/preview/characters.js';
const output=new URL('../public/art/models/',import.meta.url);
await fs.mkdir(output,{recursive:true});
for(const name of CHARACTER_NAMES)await fs.writeFile(new URL(`${name}.svg`,output),characterSvg(name,{tick:0}));
console.log(`Exported ${CHARACTER_NAMES.length} authored character models.`);
