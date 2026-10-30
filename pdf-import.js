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
 const page=await doc.getPage(n);const viewport=page.getViewport({scale:1});const width=Math.min(900,Math.max(320,window.innerWidth*1.6));const scale=width/viewport.width;const vp=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);canvas.style.width='100%';canvas.style.height='auto';const ctx=canvas.getContext('2d');await page.render({canvasContext:ctx,viewport:vp}).promise;if(token!==renderToken)return;preview.append(canvas);attachCrop(canvas);say('Page '+n+' ready. Read the bead road top-to-bottom, then left-to-right. Enter B/P/T and check against the page totals.');
 }catch(e){say('Could not render page: '+e.message)}}
file.addEventListener('change',async()=>{const f=file.files[0];if(!f)return;try{
 if(!window.pdfjsLib)throw Error('PDF viewer library could not load. Check your internet connection.');
 if(f.size>60*1024*1024)throw Error('PDF is larger than the 60 MB limit.');
 say('Opening '+f.name+'…');const data=await f.arrayBuffer();doc=await pdfjsLib.getDocument({data:new Uint8Array(data),disableFontFace:true}).promise;
 if(doc.numPages>300)throw Error('Limit: 300 PDF pages.');
 entries=new Map();selected=1;document.getElementById('pdf-import-tools').hidden=false;drawList();update();await choose(1);say('Loaded '+doc.numPages+' pages. Cover pages and screenshots cannot be reliably read automatically; review and enter each shoe before saving.');
 }catch(e){say('PDF error: '+e.message)}});
sequence.addEventListener('input',()=>{capture();drawList()});
document.getElementById('pdf-mark-reviewed').addEventListener('click',()=>{capture();const e=entries.get(selected)||{};if(!e.sequence){report('Enter or detect a sequence first.');return}e.reviewed=true;entries.set(selected,e);report('Page '+selected+' marked reviewed. Check Banker, Player, Tie totals before importing.');drawList()});
document.getElementById('pdf-select-all').addEventListener('click',()=>{if(!doc)return;capture();for(let i=1;i<=doc.numPages;i++){const e=entries.get(i)||{};e.checked=true;entries.set(i,e)}drawList()});
document.getElementById('pdf-select-none').addEventListener('click',()=>{capture();for(const e of entries.values())e.checked=false;drawList()});
document.getElementById('pdf-prev').addEventListener('click',()=>{if(doc&&selected>1)choose(selected-1)});
document.getElementById('pdf-next').addEventListener('click',()=>{if(doc&&selected<doc.numPages)choose(selected+1)});
document.getElementById('pdf-save').addEventListener('click',()=>{
 capture();const chosen=[...entries].filter(([p,e])=>e.checked).sort((a,b)=>a[0]-b[0]);
 if(!chosen.length){say('Select one or more pages first.');return}
 const missing=chosen.filter(([p,e])=>!e.sequence);if(missing.length){say('Enter and review B/P/T sequences before importing. Missing: '+missing.slice(0,12).map(x=>x[0]).join(', ')+(missing.length>12?'…':''));return}
 const invalids=chosen.filter(([p,e])=>!valid(e.sequence)||e.sequence.length>1000);if(invalids.length){say('Invalid sequence or over 1,000 hands on pages: '+invalids.map(x=>x[0]).join(', '));return}
 const unreviewed=chosen.filter(([p,e])=>e.auto&&!e.reviewed);if(unreviewed.length){say('Review automatically detected pages before importing: '+unreviewed.slice(0,12).map(x=>x[0]).join(', ')+'. Open each page, check the sequence against the image, then tap Mark reviewed.');return}
 const payload=chosen.map(([p,e])=>({name:'PDF page '+p,hands:e.sequence.split('')}));
 if(!confirm('Import '+payload.length+' reviewed PDF shoe(s) with '+payload.reduce((n,s)=>n+s.hands.length,0)+' hands? Existing shoes will be preserved.'))return;
 if(typeof window.importBaccaratShoes!=='function'){say('Shoe importer is not ready. Refresh and try again.');return}
 const count=window.importBaccaratShoes(payload);
 if(count){say('Imported '+count+' reviewed shoes successfully.');for(const [p,e] of chosen)e.checked=false;drawList()}
});

let calibration=null,dragStart=null,activeCanvas=null;
const detectReport=document.getElementById('pdf-detect-report');
const report=t=>detectReport.textContent=t;
function pointerPoint(canvas,event){
 const bounds=canvas.getBoundingClientRect();
 return {x:(event.clientX-bounds.left)*canvas.width/bounds.width,y:(event.clientY-bounds.top)*canvas.height/bounds.height};
}
function attachCrop(canvas){
 activeCanvas=canvas;
 canvas.addEventListener('pointerdown',event=>{dragStart=pointerPoint(canvas,event);canvas.setPointerCapture(event.pointerId)});
 canvas.addEventListener('pointerup',event=>{
  if(!dragStart)return;
  const end=pointerPoint(canvas,event),x=Math.min(end.x,dragStart.x),y=Math.min(end.y,dragStart.y),w=Math.abs(end.x-dragStart.x),h=Math.abs(end.y-dragStart.y);dragStart=null;
  if(w<20||h<30){report('Drag around the full six-row Bead Road to select it.');return}
  calibration={x:x/canvas.width,y:y/canvas.height,w:w/canvas.width,h:h/canvas.height};
  report('Bead Road selected. Tap Read selected page, then verify the extracted B/P/T against the PDF totals.');
 });
}
function classify(data,w,h,x,y,r){
 let b=0,p=0,t=0,seen=0;
 const rad=Math.max(2,Math.floor(r*.32));
 for(let dy=-rad;dy<=rad;dy+=2)for(let dx=-rad;dx<=rad;dx+=2){
  if(dx*dx+dy*dy>rad*rad)continue;
  const xx=Math.round(x+dx),yy=Math.round(y+dy);if(xx<0||yy<0||xx>=w||yy>=h)continue;
  const k=(yy*w+xx)*4,R=data[k],G=data[k+1],B=data[k+2],hi=Math.max(R,G,B),lo=Math.min(R,G,B);
  if(hi<65||hi-lo<38)continue;
  seen++;
  if(G>R*1.13&&G>B*.85&&G>85)t++;
  else if(B>R*1.2&&B>G*.95&&B>85)p++;
  else if(R>G*1.3&&R>B*1.12&&R>90)b++;
 }
 const votes=[['B',b],['P',p],['T',t]].sort((a,b)=>b[1]-a[1]);
 return votes[0][1]>=Math.max(3,seen*.38)&&votes[0][1]>votes[1][1]*1.4?votes[0][0]:null;
}
function recognize(canvas){
 if(!calibration)throw Error('First drag a rectangle around the six-row Bead Road.');
 const x=calibration.x*canvas.width,y=calibration.y*canvas.height,w=calibration.w*canvas.width,h=calibration.h*canvas.height;
 const pitch=h/6,cols=Math.round(w/pitch);
 if(cols<2||cols>40)throw Error('Selected rectangle proportions look wrong. Select only the six-row Bead Road.');
 const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
 const hands=[];let uncertain=0,empty=0;
 for(let c=0;c<cols;c++)for(let row=0;row<6;row++){
  const value=classify(data,canvas.width,canvas.height,x+(c+.5)*w/cols,y+(row+.5)*pitch,pitch);
  if(value)hands.push(value);
  else {empty++;if(c<cols-1)uncertain++}
 }
 return {sequence:hands.join(''),uncertain,empty,cols};
}
async function renderForRecognition(n){
 const page=await doc.getPage(n),viewport=page.getViewport({scale:1});
 const scale=Math.min(2.5,1250/viewport.width),vp=page.getViewport({scale});
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
 return canvas;
}
async function readPage(n,canvas){
 const result=recognize(canvas);
 const e=entries.get(n)||{};e.sequence=result.sequence;e.checked=true;e.auto=true;e.reviewed=false;entries.set(n,e);
 return result;
}
document.getElementById('pdf-auto-read').addEventListener('click',async()=>{
 if(!doc)return;
 try{
  capture();const canvas=activeCanvas||await renderForRecognition(selected);
  const result=await readPage(selected,canvas);update();drawList();
  report('Page '+selected+': '+result.sequence.length+' colored markers detected across '+result.cols+' columns. '+result.uncertain+' possible missing positions. VERIFY the full order and header totals; recognition may be wrong.');
 }catch(e){report('Recognition: '+e.message)}
});
document.getElementById('pdf-auto-batch').addEventListener('click',async()=>{
 if(!doc||!calibration){report('Calibrate on one page first by dragging around its six-row Bead Road.');return}
 capture();
 const chosen=[...entries].filter(([n,e])=>e.checked).map(([n])=>n).sort((a,b)=>a-b);
 if(!chosen.length){report('Check the pages you want to scan first.');return}
 if(!confirm('Attempt image recognition on '+chosen.length+' selected pages using the SAME Bead Road position? Pages with different layouts may be read incorrectly. All results require review before saving.'))return;
 let done=0,failed=0;
 for(const n of chosen){
  try{report('Scanning page '+n+' ('+(done+failed+1)+'/'+chosen.length+')…');const canvas=await renderForRecognition(n);const result=await readPage(n,canvas);if(!result.sequence.length)failed++;else done++}catch(e){failed++}
  if((done+failed)%5===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 update();drawList();report('Batch scan finished: '+done+' pages with detected circles; '+failed+' empty/failed. Every page must be reviewed before importing.');
});

})();