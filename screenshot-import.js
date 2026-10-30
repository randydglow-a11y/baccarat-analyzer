(function(){
'use strict';
const input=document.getElementById('shot-files'),status=document.getElementById('shot-status'),viewer=document.getElementById('shot-viewer'),editor=document.getElementById('shot-sequence'),counter=document.getElementById('shot-count'),select=document.getElementById('shot-select');
let items=[],current=0;
const clean=s=>s.toUpperCase().replace(/[^BPT?]/g,'');
function counts(s){return ['B','P','T','?'].map(c=>c+': '+[...s].filter(v=>v===c).length).join(' · ')}
function saveEdit(){if(!items.length)return;items[current].sequence=clean(editor.value);items[current].reviewed=false}
function draw(){
 if(!items.length)return;
 const it=items[current];select.replaceChildren();
 items.forEach((x,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+x.name+(x.reviewed?' ✓':'');select.append(o)});
 select.value=String(current);editor.value=it.sequence;counter.textContent=it.sequence.length+' positions · '+counts(it.sequence);
 viewer.replaceChildren();const img=document.createElement('img');img.src=it.url;img.alt='Screenshot '+it.name;img.style.cssText='width:100%;height:auto;display:block';viewer.append(img);
 status.textContent='Screenshot '+(current+1)+' of '+items.length+'. Enter results top-to-bottom, then left-to-right in the Bead Plate. Check totals before marking reviewed.';
}
input.addEventListener('change',()=>{
 items.forEach(x=>URL.revokeObjectURL(x.url));items=[];
 const files=[...input.files].filter(f=>f.type.startsWith('image/')).slice(0,50);
 for(const f of files)items.push({name:f.name,url:URL.createObjectURL(f),sequence:'',reviewed:false});
 current=0;document.getElementById('shot-tools').hidden=!items.length;
 if(items.length)draw();else status.textContent='Choose one or more screenshots to begin.';
});
select.addEventListener('change',()=>{saveEdit();current=Number(select.value);draw()});
document.getElementById('shot-prev').addEventListener('click',()=>{if(current){saveEdit();current--;draw()}});
document.getElementById('shot-next').addEventListener('click',()=>{if(current<items.length-1){saveEdit();current++;draw()}});
editor.addEventListener('input',()=>{saveEdit();counter.textContent=editor.value.length+' positions · '+counts(clean(editor.value))});
document.querySelectorAll('#shot-buttons [data-value]').forEach(b=>b.addEventListener('click',()=>{editor.value=clean(editor.value)+b.dataset.value;saveEdit();draw()}));
document.getElementById('shot-undo').addEventListener('click',()=>{editor.value=clean(editor.value).slice(0,-1);saveEdit();draw()});
document.getElementById('shot-clear').addEventListener('click',()=>{if(confirm('Clear entries for this screenshot?')){editor.value='';saveEdit();draw()}});
document.getElementById('shot-review').addEventListener('click',()=>{
 saveEdit();const it=items[current];if(!it.sequence||it.sequence.includes('?')){status.textContent='Enter results and resolve any ? before marking reviewed.';return}
 it.reviewed=true;draw();status.textContent='Screenshot '+(current+1)+' reviewed. Verify totals against the image before importing.';
});
document.getElementById('shot-import').addEventListener('click',()=>{
 saveEdit();const chosen=items.filter(x=>x.reviewed&&/^[BPT]+$/.test(x.sequence));
 if(!chosen.length){status.textContent='No reviewed screenshots yet. Enter each shoe and tap Mark reviewed first.';return}
 if(!confirm('Import '+chosen.length+' reviewed screenshot shoes? Existing shoes stay saved.'))return;
 if(typeof window.importBaccaratShoes!=='function'){status.textContent='Shoe importer unavailable. Refresh the app.';return}
 const n=window.importBaccaratShoes(chosen.map((x,i)=>({name:'Screenshot '+x.name.slice(0,40),hands:x.sequence.split('')})));
 if(n){items=items.filter(x=>!chosen.includes(x));chosen.forEach(x=>URL.revokeObjectURL(x.url));current=0;document.getElementById('shot-tools').hidden=!items.length;if(items.length)draw();status.textContent='Imported '+n+' screenshot shoe(s) successfully.'}else status.textContent='Import failed; no shoes were added.';
});
})();