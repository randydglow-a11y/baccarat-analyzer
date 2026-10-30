(function(){
'use strict';
const list=document.getElementById('db-list'),stats=document.getElementById('db-stats'),search=document.getElementById('db-search'),status=document.getElementById('db-status');
const all=()=>typeof window.getBaccaratSavedShoes==='function'?window.getBaccaratSavedShoes():[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draw(){
 const shoes=all(),filled=shoes.filter(s=>s.hands.length),hands=filled.flatMap(s=>s.hands),q=search.value.toLowerCase().trim();
 const count=c=>hands.filter(v=>v===c).length;
 stats.textContent=filled.length+' recorded games · '+hands.length+' hands · Banker '+count('B')+' · Player '+count('P')+' · Tie '+count('T');
 list.replaceChildren();
 filled.forEach((s,i)=>{if(q&&!s.name.toLowerCase().includes(q)&&!s.hands.join('').toLowerCase().includes(q))return;
  const line=document.createElement('div');line.style.cssText='padding:10px 0;border-bottom:1px solid #3b4c66;overflow-wrap:anywhere';
  const title=document.createElement('strong');title.textContent=s.name+' · '+s.hands.length+' hands';
  const info=document.createElement('div');info.className='muted';info.textContent='B '+s.hands.filter(v=>v==='B').length+' / P '+s.hands.filter(v=>v==='P').length+' / T '+s.hands.filter(v=>v==='T').length;
  const seq=document.createElement('div');seq.style.cssText='font-size:12px;letter-spacing:1px;overflow-wrap:anywhere;margin-top:5px';seq.textContent=s.hands.join('');
  line.append(title,info,seq);list.append(line);
 });
 if(!list.children.length)list.textContent='No matching recorded games.';
}
search.addEventListener('input',draw);
document.getElementById('db-refresh').addEventListener('click',draw);
function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
document.getElementById('db-export').addEventListener('click',()=>{
 const shoes=all().filter(s=>s.hands.length);if(!shoes.length){status.textContent='No games to export.';return}
 download('baccarat-game-database.csv','Shoe,Hand,Result\n'+shoes.flatMap(s=>s.hands.map((v,i)=>'"'+s.name.replace(/"/g,'""')+'",'+(i+1)+','+v)).join('\n'),'text/csv;charset=utf-8');
 status.textContent='Exported '+shoes.length+' games as CSV.';
});
document.getElementById('db-import').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>5e6)throw Error('File exceeds 5 MB');
  const txt=await file.text();let rows=[];
  if(file.name.toLowerCase().endsWith('.json')){
   const obj=JSON.parse(txt),shoes=Array.isArray(obj)?obj:obj.shoes;
   if(!Array.isArray(shoes))throw Error('JSON needs a shoes array');
   rows=shoes.map((s,i)=>({name:String(s.name||'Imported '+(i+1)),hands:Array.isArray(s.hands)?s.hands.join(''):String(s.sequence||'')}));
  }else{
   const lines=txt.replace(/\r/g,'').split('\n').filter(s=>s.trim());
   // Simple CSV: name,sequence; also supports exported Shoe,Hand,Result rows.
   const head=lines[0].toLowerCase();
   if(head.startsWith('shoe,hand,result')){
    const groups=new Map();
    for(const line of lines.slice(1)){const m=line.match(/^("(?:[^"]|"")*"|[^,]*),\s*\d+,\s*([BPT])\s*$/i);if(!m)throw Error('Invalid CSV row');const name=m[1].replace(/^"|"$/g,'').replace(/""/g,'"');if(!groups.has(name))groups.set(name,[]);groups.get(name).push(m[2].toUpperCase())}
    rows=[...groups].map(([name,hands])=>({name,hands:hands.join('')}));
   }else{
    rows=lines.filter((s,i)=>!(i===0&&/^(name|shoe),\s*(sequence|results)/i.test(s))).map((line,i)=>{const cut=line.indexOf(',');return cut<0?{name:'Imported '+(i+1),hands:line.trim()}:{name:line.slice(0,cut).replace(/^"|"$/g,'').trim(),hands:line.slice(cut+1).trim()}});
   }
  }
  rows=rows.map(s=>({name:s.name.slice(0,60),hands:s.hands.toUpperCase().replace(/[\s;|]/g,'')}));
  if(!rows.length||rows.length>300||rows.some(s=>!s.hands||s.hands.length>1000||!/^[BPT]+$/.test(s.hands)))throw Error('Each game must contain 1–1000 B/P/T results; maximum 300 games.');
  if(!confirm('Add '+rows.length+' games to your database? Existing games will remain.'))return;
  const n=window.importBaccaratShoes(rows.map(s=>({name:s.name,hands:s.hands.split('')})));
  if(!n)throw Error('Import failed');
  status.textContent='Imported '+n+' games. All strategy analyzers can use these saved shoes.';draw();
 }catch(err){status.textContent='Import error: '+err.message}
 finally{e.target.value=''}
});
draw();
})();