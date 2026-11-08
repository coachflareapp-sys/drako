import {mkdir,copyFile,cp,readFile,readdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {getCountries,getCountryCallingCode} from 'libphonenumber-js';
import metadata from 'libphonenumber-js/metadata.min.json';
import QRCode from 'qrcode';
import {writeFile,access} from 'node:fs/promises';
const target=resolve('dist');
await mkdir(target,{recursive:true});
const files=['index.html','privacidad.html','style.css','app.js','api.js','portals.js','management.js','telegram-panel.js','booking.js','booking-details.js','reservation.js','schedule-editor.js','phone.js','route-quote.js','location-picker.js','meter.js','config.js','_headers'];
for(const file of files)await copyFile(file,resolve(target,file));
await cp('assets',resolve(target,'assets'),{recursive:true});
await QRCode.toFile(resolve(target,'assets/drako-qr.png'),'https://drakotransport.app/',{width:800,margin:4,errorCorrectionLevel:'M'});
// Remove stale generated street files from previous catalogue versions.
const currentStreets=new Set();for(const bucket of await readdir('catalogue/cali/streets'))for(const file of await readdir('catalogue/cali/streets/'+bucket))currentStreets.add(bucket+'/'+file);
try{for(const bucket of await readdir(resolve(target,'catalogue/cali/streets')))for(const file of await readdir(resolve(target,'catalogue/cali/streets',bucket))){if(/^[A-Z0-9_]+\.json$/.test(file)&&!currentStreets.has(bucket+'/'+file))await unlink(resolve(target,'catalogue/cali/streets',bucket,file));}}catch(error){if(error.code!=='ENOENT')throw error;}
// Copy only the current catalogue naming scheme, excluding obsolete generated files.
for(const bucket of await readdir('catalogue/cali/streets')){await mkdir(resolve(target,'catalogue/cali/streets',bucket),{recursive:true});for(const file of await readdir('catalogue/cali/streets/'+bucket)){if(!file.includes('%'))await copyFile('catalogue/cali/streets/'+bucket+'/'+file,resolve(target,'catalogue/cali/streets',bucket,file));}}
for(let i=0;i<256;i++)await unlink(resolve(target,'catalogue/cali',i+'.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});
for(const file of ['manifest.json','intersections.json','intersection-references.json','intersection-references-manifest.json','references.json','references-manifest.json','curated-references.json'])await copyFile('catalogue/cali/'+file,resolve(target,'catalogue/cali',file));
const currentParcels=new Set();for(const bucket of await readdir('catalogue/cali/parcels')){await mkdir(resolve(target,'catalogue/cali/parcels',bucket),{recursive:true});for(const file of await readdir('catalogue/cali/parcels/'+bucket)){if(!/^[A-Z0-9_]+\.json$/.test(file))continue;currentParcels.add(bucket+'/'+file);await copyFile('catalogue/cali/parcels/'+bucket+'/'+file,resolve(target,'catalogue/cali/parcels',bucket,file));}}
for(const bucket of await readdir(resolve(target,'catalogue/cali/parcels')))for(const file of await readdir(resolve(target,'catalogue/cali/parcels',bucket))){if(/^[A-Z0-9_]+\.json$/.test(file)&&!currentParcels.has(bucket+'/'+file))await unlink(resolve(target,'catalogue/cali/parcels',bucket,file));}
await mkdir(resolve(target,'vendor/leaflet'),{recursive:true});
for(const file of ['leaflet.js','leaflet.css'])await copyFile('node_modules/leaflet/dist/'+file,resolve(target,'vendor/leaflet',file));
await copyFile('node_modules/leaflet/LICENSE',resolve(target,'vendor/leaflet/LICENSE'));
await cp('node_modules/leaflet/dist/images',resolve(target,'vendor/leaflet/images'),{recursive:true});
const names=new Intl.DisplayNames(['es'],{type:'region'});const countries=[];await mkdir(resolve(target,'assets/flags'),{recursive:true});
for(const country of getCountries()){const code=getCountryCallingCode(country);let flag=country.toLowerCase()+'.svg';let source=resolve('node_modules/flag-icons/flags/4x3',flag);try{await access(source)}catch{flag='xx.svg';source=resolve('node_modules/flag-icons/flags/4x3',flag)}await copyFile(source,resolve(target,'assets/flags',flag));countries.push({country,code,name:names.of(country)||country,flag,lengths:metadata.countries[country][3]})}
countries.sort((a,b)=>a.name.localeCompare(b.name,'es'));await writeFile(resolve(target,'countries.json'),JSON.stringify(countries));
for(const file of ['index.html','app.js','api.js','portals.js']){
 const content=await readFile(resolve(target,file),'utf8');
 if(content.includes('service_role')||content.includes('TELEGRAM_BOT_TOKEN'))throw new Error('Un secreto de servidor no debe estar en el paquete publico.');
}
console.log('Paquete listo en dist/. Solo contiene archivos publicos de la aplicacion.');
