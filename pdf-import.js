(function(){
'use strict';
const file=document.getElementById('pdf-shoe-file'),status=document.getElementById('pdf-import-status'),list=document.getElementById('pdf-import-pages'),preview=document.getElementById('pdf-import-preview'),sequence=document.getElementById('pdf-import-sequence'),pageLabel=document.getElementById('pdf-import-page-label');
let doc=null,selected=1,entries=new Map(),renderToken=0;
const say=t=>status.textContent=t;
const clean=s=>s.toUpperCase().replace(/[^BPT]/g,'');
const valid=s=>/^[BPT]*$/.test(s);
const update=()=>{const entry=entries.get(selected)||{};sequence.value=entry.sequence||'';pageLabel.textContent='PDF page '+selected;document.getElementById('pdf-import-count').textContent=clean(sequence.value).length+' results entered';};
function capture(){const entry=entries.get(selected)||{};entry.sequence=clean(sequence.value);entries.set(selected,entry);document.getElementById('pdf-import-count').textContent=entry.sequence.length+' results entered'}
function drawList(){
 list.replaceChildren();if(!doc)return;
 for(let i=1;i<=doc.numPages;i++){
  const row=document.createElement('label');row.className='pdf-page-item';
  const box=document.createElement('input');box.type='checkbox';box.checked=entries.get(i)?.checked||false;
  box.addEventListener('change',()=>{const e=entries.get(i)||{};e.checked=box.checked;entries.set(i,e)});
  const btn=document.createElement('button');btn.type='button';btn.className=i===selected?'player':'secondary';btn.textContent='Page '+i+(entries.get(i)?.sequence?' · '+entries.get(i).sequence.length+' hands':'');btn.addEventListener('click',()=>choose(i));
  row.append(box,btn);list.append(row);
 }
}
async function choose(n){capture();selected=n;update();drawList();const token=++renderToken;preview.replaceChildren();say('Rendering page '+n+'…');try{
 const page=await doc.getPage(n);const viewport=page.getViewport({scale:1});const width=Math.min(900,Math.max(320,window.innerWidth*1.6));const scale=width/viewport.width;const vp=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);canvas.style.width='100%';canvas.style.height='auto';const ctx=canvas.getContext('2d');await page.render({canvasContext:ctx,viewport:vp}).promise;if(token!==renderToken)return;preview.append(canvas);say('Page '+n+' ready. Read the bead road top-to-bottom, then left-to-right. Enter B/P/T and check against the page totals.');
 }catch(e){say('Could not render page: '+e.message)}}
file.addEventListener('change',async()=>{const f=file.files[0];if(!f)return;try{
 if(!window.pdfjsLib)throw Error('PDF viewer library could not load. Check your internet connection.');
 if(f.size>60*1024*1024)throw Error('PDF is larger than the 60 MB limit.');
 say('Opening '+f.name+'…');const data=await f.arrayBuffer();doc=await pdfjsLib.getDocument({data:new Uint8Array(data),disableFontFace:true}).promise;
 if(doc.numPages>300)throw Error('Limit: 300 PDF pages.');
 entries=new Map();selected=1;document.getElementById('pdf-import-tools').hidden=false;drawList();update();await choose(1);say('Loaded '+doc.numPages+' pages. Cover pages and screenshots cannot be reliably read automatically; review and enter each shoe before saving.');
 }catch(e){say('PDF error: '+e.message)}});
sequence.addEventListener('input',()=>{capture();drawList()});
document.getElementById('pdf-select-all').addEventListener('click',()=>{if(!doc)return;capture();for(let i=1;i<=doc.numPages;i++){const e=entries.get(i)||{};e.checked=true;entries.set(i,e)}drawList()});
document.getElementById('pdf-select-none').addEventListener('click',()=>{capture();for(const e of entries.values())e.checked=false;drawList()});
document.getElementById('pdf-prev').addEventListener('click',()=>{if(doc&&selected>1)choose(selected-1)});
document.getElementById('pdf-next').addEventListener('click',()=>{if(doc&&selected<doc.numPages)choose(selected+1)});
document.getElementById('pdf-save').addEventListener('click',()=>{
 capture();const chosen=[...entries].filter(([p,e])=>e.checked).sort((a,b)=>a[0]-b[0]);
 if(!chosen.length){say('Select one or more pages first.');return}
 const missing=chosen.filter(([p,e])=>!e.sequence);if(missing.length){say('Enter and review B/P/T sequences before importing. Missing: '+missing.slice(0,12).map(x=>x[0]).join(', ')+(missing.length>12?'…':''));return}
 const invalids=chosen.filter(([p,e])=>!valid(e.sequence)||e.sequence.length>1000);if(invalids.length){say('Invalid sequence or over 1,000 hands on pages: '+invalids.map(x=>x[0]).join(', '));return}
 const payload=chosen.map(([p,e])=>({name:'PDF page '+p,hands:e.sequence.split('')}));
 if(!confirm('Import '+payload.length+' reviewed PDF shoe(s) with '+payload.reduce((n,s)=>n+s.hands.length,0)+' hands? Existing shoes will be preserved.'))return;
 if(typeof window.importBaccaratShoes!=='function'){say('Shoe importer is not ready. Refresh and try again.');return}
 const count=window.importBaccaratShoes(payload);
 if(count){say('Imported '+count+' reviewed shoes successfully.');for(const [p,e] of chosen)e.checked=false;drawList()}
});
})();