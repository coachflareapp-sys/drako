export async function setupPhone(){
 const response=await fetch('/countries.json');if(!response.ok)throw new Error('No se pudo cargar el selector de países.');const countries=await response.json();
 const select=document.querySelector('#phone-country');select.replaceChildren(...countries.map(c=>{const option=document.createElement('option');option.value=c.country;option.textContent=`${c.name} +${c.code}`;option.dataset.code=c.code;return option}));select.value='CO';
 const input=document.querySelector('#phone');const flag=document.querySelector('#phone-flag');
 const update=()=>{const country=countries.find(c=>c.country===select.value);flag.src=`/assets/flags/${country.flag}`;flag.alt=country.name;document.querySelector('#calling-code').textContent='+'+country.code;input.maxLength=15-country.code.length;input.pattern=`[0-9]{4,${15-country.code.length}}`;input.title='Escribe el número local, sin el indicativo del país.'};select.onchange=update;update();
 input.oninput=()=>{input.value=input.value.replace(/\D/g,'')};
 input.onpaste=e=>{const text=e.clipboardData.getData('text').trim();if(!text.startsWith('+'))return;const digits=text.replace(/\D/g,'');const matches=countries.filter(c=>digits.startsWith(c.code)).sort((a,b)=>b.code.length-a.code.length);const country=matches.find(c=>c.country===select.value)||matches[0];if(country){e.preventDefault();select.value=country.country;update();input.value=digits.slice(country.code.length)}};
 return ()=>'+'+select.selectedOptions[0].dataset.code+input.value;
}
