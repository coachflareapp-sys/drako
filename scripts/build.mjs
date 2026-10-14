import {mkdir,copyFile,cp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {getCountries,getCountryCallingCode} from 'libphonenumber-js';
import metadata from 'libphonenumber-js/metadata.min.json';
import {writeFile,access} from 'node:fs/promises';
const target=resolve('dist');
await mkdir(target,{recursive:true});
const files=['index.html','privacidad.html','style.css','app.js','api.js','portals.js','booking.js','booking-details.js','reservation.js','schedule-editor.js','phone.js','route-quote.js','meter.js','config.js','_headers'];
for(const file of files)await copyFile(file,resolve(target,file));
await cp('assets',resolve(target,'assets'),{recursive:true});
const names=new Intl.DisplayNames(['es'],{type:'region'});const countries=[];await mkdir(resolve(target,'assets/flags'),{recursive:true});
for(const country of getCountries()){const code=getCountryCallingCode(country);let flag=country.toLowerCase()+'.svg';let source=resolve('node_modules/flag-icons/flags/4x3',flag);try{await access(source)}catch{flag='xx.svg';source=resolve('node_modules/flag-icons/flags/4x3',flag)}await copyFile(source,resolve(target,'assets/flags',flag));countries.push({country,code,name:names.of(country)||country,flag,lengths:metadata.countries[country][3]})}
countries.sort((a,b)=>a.name.localeCompare(b.name,'es'));await writeFile(resolve(target,'countries.json'),JSON.stringify(countries));
for(const file of ['index.html','app.js','api.js','portals.js']){
 const content=await readFile(resolve(target,file),'utf8');
 if(content.includes('service_role')||content.includes('TELEGRAM_BOT_TOKEN'))throw new Error('Un secreto de servidor no debe estar en el paquete publico.');
}
console.log('Paquete listo en dist/. Solo contiene archivos publicos de la aplicacion.');
