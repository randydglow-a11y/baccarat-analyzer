/* Version 5 shoe management. Keeps original single-shoe data on first upgrade. */
(function(){
'use strict';
const STORE='baccarat-analyzer-shoes-v1',OLD='baccarat-analyzer-hands-v1';
const valid=a=>Array.isArray(a)?a.filter(v=>v==='B'||v==='P'||v==='T'):[];
const id=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,8);
let state;
try{state=JSON.parse(localStorage.getItem(STORE)||'null')}catch(e){}
if(!state||!Array.isArray(state.shoes)||!state.shoes.length){
 let old=[];try{old=valid(JSON.parse(localStorage.getItem(OLD)||'[]'))}catch(e){}
 const first=id();state={active:first,shoes:[{id:first,name:'Shoe 1',created:new Date().toISOString(),hands:old}]};
}
state.shoes=state.shoes.filter(s=>s&&typeof s.id==='string').map((s,i)=>({id:s.id,name:String(s.name||'Shoe '+(i+1)),created:s.created||new Date().toISOString(),hands:valid(s.hands)}));
if(!state.shoes.length){const first=id();state.shoes=[{id:first,name:'Shoe 1',created:new Date().toISOString(),hands:[]}];state.active=first}
if(!state.shoes.some(s=>s.id===state.active))state.active=state.shoes[0].id;
const current=()=>state.shoes.find(s=>s.id===state.active);
function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch(e){alert('Unable to save shoes. Check browser storage.')}sync()}
function sync(){hands=current().hands;window.hands=hands;render();drawManager()}
function drawManager(){
 const select=document.getElementById('shoe-select');if(!select)return;
 select.replaceChildren();
 for(const s of state.shoes){const option=document.createElement('option');option.value=s.id;option.textContent=s.name+' ('+s.hands.length+' hands)';select.appendChild(option)}
 select.value=state.active;
 const meta=document.getElementById('shoe-meta');meta.textContent=state.shoes.length+' saved shoe(s) · '+current().hands.length+' hands in current shoe';
 const list=document.getElementById('shoe-list');list.replaceChildren();
 for(const s of [...state.shoes].reverse()){
  const line=document.createElement('div');line.className='shoe-line';
  const info=document.createElement('span');info.textContent=s.name+' · '+s.hands.length+' hands · '+[s.hands.filter(v=>v==='B').length,s.hands.filter(v=>v==='P').length,s.hands.filter(v=>v==='T').length].join('/')+' B/P/T';
  const btn=document.createElement('button');btn.className='secondary';btn.textContent=s.id===state.active?'Viewing':'View';btn.disabled=s.id===state.active;btn.onclick=()=>{state.active=s.id;save()};
  line.append(info,btn);list.appendChild(line);
 }
}
document.getElementById('shoe-select').addEventListener('change',e=>{state.active=e.target.value;save()});
document.getElementById('new-shoe').addEventListener('click',()=>{
 const name=prompt('Name the new shoe (optional):','Shoe '+(state.shoes.length+1));if(name===null)return;
 const s={id:id(),name:name.trim().slice(0,60)||'Shoe '+(state.shoes.length+1),created:new Date().toISOString(),hands:[]};
 state.shoes.push(s);state.active=s.id;save();
});
// Import a reference shoe as a separate saved shoe; never replace existing history.
document.getElementById('paste-shoe').addEventListener('click',()=>{
 const raw=prompt('Paste results: B P T, Banker Player Tie, or a continuous sequence like BPPBT.');
 if(raw===null)return;
 const trimmed=raw.trim();
 if(!trimmed){alert('No results entered.');return}
 let tokens;
 if(/^[BPT\\s,;|/-]+$/i.test(trimmed)){
  tokens=trimmed.toUpperCase().replace(/[^BPT]/g,'').split('');
 }else{
  tokens=trimmed.split(/[\\s,;|/]+/).filter(Boolean).map(v=>{
   const word=v.toUpperCase();return ({B:'B',BANKER:'B',P:'P',PLAYER:'P',T:'T',TIE:'T'})[word]||null;
  });
 }
 if(!tokens.length||tokens.some(v=>!v)){alert('Invalid results. Use only B, P, T or Banker, Player, Tie.');return}
 if(tokens.length>1000){alert('Limit: 1,000 hands per paste.');return}
 const b=tokens.filter(v=>v==='B').length,p=tokens.filter(v=>v==='P').length,t=tokens.filter(v=>v==='T').length;
 if(!confirm('Create a NEW shoe with '+tokens.length+' hands ('+b+' Banker, '+p+' Player, '+t+' Tie)? Existing shoes will stay unchanged.'))return;
 const name=prompt('Name this reference shoe:','Reference shoe '+(state.shoes.length+1));
 if(name===null)return;
 const newShoe={id:id(),name:name.trim().slice(0,60)||'Reference shoe '+(state.shoes.length+1),created:new Date().toISOString(),hands:tokens};
 state.shoes.push(newShoe);state.active=newShoe.id;save();
});
document.getElementById('copy-shoe').addEventListener('click',async()=>{
 const sequence=current().hands.join('');
 if(!sequence){alert('This shoe has no recorded hands.');return}
 try{
  if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(sequence);alert('Copied '+sequence.length+' results (B/P/T).')}
  else prompt('Copy this sequence:',sequence);
 }catch(e){prompt('Copy this sequence:',sequence)}
});
document.getElementById('rename-shoe').addEventListener('click',()=>{
 const name=prompt('Rename this shoe:',current().name);if(name===null)return;
 if(name.trim()){current().name=name.trim().slice(0,60);save()}
});
document.getElementById('delete-shoe').addEventListener('click',()=>{
 if(state.shoes.length===1){alert('Keep at least one shoe. Use Clear session to empty it.');return}
 if(!confirm('Permanently delete '+current().name+' and all its recorded hands?'))return;
 state.shoes=state.shoes.filter(s=>s.id!==state.active);state.active=state.shoes[state.shoes.length-1].id;save();
});
add=function(v){if(['B','P','T'].includes(v)){current().hands.push(v);save()}};
undo=function(){if(current().hands.length){current().hands.pop();save()}};
clearAll=function(){if(confirm('Clear every hand in '+current().name+'? Other shoes will not be changed.')){current().hands=[];save()}};
downloadCSV=function(){
 const s=current();if(!s.hands.length){alert('Record a hand before exporting.');return}
 const csv='Shoe,Hand,Result\n'+s.hands.map((v,i)=>'"'+s.name.replace(/"/g,'""')+'",'+(i+1)+','+names[v]).join('\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='baccarat-'+s.name.replace(/[^a-z0-9_-]/gi,'-')+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

function backupAll(){
 const payload={app:'baccarat-analyzer',version:1,exported:new Date().toISOString(),shoes:state.shoes,active:state.active};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='baccarat-all-shoes-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function restoreAll(file){
 if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('Backup is too large (5 MB limit).');
  const data=JSON.parse(await file.text());
  if(data.app!=='baccarat-analyzer'||data.version!==1||!Array.isArray(data.shoes)||!data.shoes.length||data.shoes.length>500)throw Error('Not a supported Baccarat Analyzer backup.');
  const parsed=data.shoes.map((s,i)=>{
   if(!s||typeof s!=='object'||!Array.isArray(s.hands)||s.hands.length>100000||s.hands.some(v=>!['B','P','T'].includes(v)))throw Error('Invalid hand history in backup.');
   return {id:id(),name:String(s.name||'Restored shoe '+(i+1)).slice(0,60),created:typeof s.created==='string'?s.created:new Date().toISOString(),hands:[...s.hands]};
  });
  if(!confirm('Import '+parsed.length+' shoe(s)? They will be added to your existing shoes.'))return;
  state.shoes.push(...parsed);state.active=parsed[0].id;save();
  alert('Restored '+parsed.length+' shoe(s). Existing shoes were preserved.');
 }catch(e){alert('Could not restore backup: '+e.message)}
 finally{document.getElementById('restore-file').value=''}
}
document.getElementById('backup-all').addEventListener('click',backupAll);
document.getElementById('restore-file').addEventListener('change',e=>restoreAll(e.target.files[0]));

sync();save();
})();