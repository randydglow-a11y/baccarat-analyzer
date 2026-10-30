(function(){
'use strict';
const input=document.getElementById('shot-files'),status=document.getElementById('shot-status'),viewer=document.getElementById('shot-viewer'),editor=document.getElementById('shot-sequence'),counter=document.getElementById('shot-count'),select=document.getElementById('shot-select');
let items=[],current=0,crop=null,corner=null;
const clean=s=>s.toUpperCase().replace(/[^BPT?]/g,'');
function counts(s){return ['B','P','T','?'].map(c=>c+': '+[...s].filter(v=>v===c).length).join(' · ')}
function saveEdit(){if(!items.length)return;const next=clean(editor.value);if(items[current].sequence!==next){items[current].sequence=next;items[current].reviewed=false}}
function draw(){
 if(!items.length)return;
 const it=items[current];select.replaceChildren();
 items.forEach((x,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+x.name+(x.reviewed?' ✓':'');select.append(o)});
 select.value=String(current);editor.value=it.sequence;counter.textContent=it.sequence.length+' positions · '+counts(it.sequence);
 viewer.replaceChildren();const img=document.createElement('img');img.src=it.url;img.alt='Screenshot '+it.name;img.style.cssText='width:100%;height:auto;display:block';viewer.append(img);img.addEventListener('click',e=>{const r=img.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};if(!corner){corner=p;document.getElementById('shot-scan-status').textContent='Tap the opposite corner.'}else{crop={x:Math.min(corner.x,p.x),y:Math.min(corner.y,p.y),w:Math.abs(corner.x-p.x),h:Math.abs(corner.y-p.y)};corner=null;document.getElementById('shot-scan-status').textContent='Selected. Tap Scan this screenshot.'}});
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

const note=document.getElementById('shot-scan-status');
document.getElementById('shot-reset-crop').onclick=()=>{crop=null;corner=null;note.textContent='Tap two corners of the Bead Plate.'};
async function scan(it){
 if(!crop||crop.w<.01||crop.h<.01)throw Error('Select the Bead Plate corners first.');
 const img=new Image();img.src=it.url;await img.decode();
 const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 const rows=Number(document.getElementById('shot-rows').value);
 const x=crop.x*canvas.width,y=crop.y*canvas.height,w=crop.w*canvas.width,h=crop.h*canvas.height;
 const cols=Math.round(w/(h/rows));if(cols<2||cols>45)throw Error('Selection is not aligned with the grid.');
 const seq=[];
 for(let c=0;c<cols;c++)for(let row=0;row<rows;row++){
  const cx=x+(c+.5)*w/cols,cy=y+(row+.5)*h/rows,r=Math.max(3,Math.floor(Math.min(w/cols,h/rows)*.3)),v={B:0,P:0,T:0};
  for(let dy=-r;dy<=r;dy+=2)for(let dx=-r;dx<=r;dx+=2){
   if(dx*dx+dy*dy>r*r||dx*dx+dy*dy<r*r*.25)continue;
   const px=Math.round(cx+dx),py=Math.round(cy+dy);if(px<0||py<0||px>=canvas.width||py>=canvas.height)continue;
   const k=(py*canvas.width+px)*4,R=data[k],G=data[k+1],B=data[k+2];
   if(R>95&&R>G*1.5&&R>B*1.35)v.B++;
   else if(B>85&&B>R*1.45&&B>G*1.28)v.P++;
   else if(G>65&&G>R*1.28&&G>B*1.15)v.T++;
  }
  const ranked=Object.entries(v).sort((a,b)=>b[1]-a[1]);
  seq.push(ranked[0][1]>=5&&ranked[0][1]>ranked[1][1]*1.4?ranked[0][0]:'?');
 }
 while(seq.length&&seq[seq.length-1]==='?')seq.pop();
 if(!seq.length)throw Error('No markers found. Adjust selection.');
 it.sequence=seq.join('');it.reviewed=false;
 return seq.filter(x=>x==='?').length;
}
document.getElementById('shot-scan').onclick=async()=>{
 try{note.textContent='Scanning…';const n=await scan(items[current]);draw();note.textContent='Scan complete: '+n+' uncertain positions. Verify all results before import.'}catch(e){note.textContent=e.message}
};
document.getElementById('shot-scan-batch').onclick=async()=>{
 if(!crop){note.textContent='Select Bead Plate first.';return}
 if(!confirm('Scan all screenshots using the same Bead Plate position?'))return;
 let ok=0;for(const it of items){try{await scan(it);ok++}catch(e){}}
 draw();note.textContent='Scanned '+ok+' of '+items.length+'. Review each screenshot before import.';
};

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