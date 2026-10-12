import {mkdir,copyFile,cp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const target=resolve('dist');
await mkdir(target,{recursive:true});
const files=['index.html','style.css','app.js','api.js','portals.js','config.js','_headers'];
for(const file of files)await copyFile(file,resolve(target,file));
await cp('assets',resolve(target,'assets'),{recursive:true});
for(const file of ['index.html','app.js','api.js','portals.js']){
 const content=await readFile(resolve(target,file),'utf8');
 if(content.includes('service_role')||content.includes('TELEGRAM_BOT_TOKEN'))throw new Error('Un secreto de servidor no debe estar en el paquete publico.');
}
console.log('Paquete listo en dist/. Solo contiene archivos publicos de la aplicacion.');
