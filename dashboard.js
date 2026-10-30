(function(){
'use strict';
const KEY='baccarat-dashboard-layout-v2';
const main=document.querySelector('main');
const panels=[...main.querySelectorAll('section.panel:not(.dashboard-tools)')];
const sections=panels.map((el,i)=>({id:'section-'+i,title:el.querySelector('h2')?.textContent.trim()||'Section '+(i+1),el}));
const byId=new Map(sections.map(s=>[s.id,s]));
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
const settings=document.getElementById('dashboard-section-list');
const nav=document.getElementById('dashboard-nav-links');
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}};
function apply(){
 const order=Array.isArray(saved.order)?saved.order:[];
 const ordered=[...sections].sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?1000+sections.indexOf(a):ai)-(bi<0?1000+sections.indexOf(b):bi)});
 const anchor=document.getElementById('dashboard-section-anchor');
 for(const s of ordered)main.insertBefore(s.el,anchor);
 saved.order=ordered.map(s=>s.id);
 for(const s of sections)s.el.hidden=!!saved.hidden?.[s.id]&&!document.body.classList.contains('roads-focus');
 if(document.body.classList.contains('roads-focus'))for(const s of sections)s.el.hidden=!s.el.querySelector('#road,#big-road');
 const toolsPanel=document.querySelector('.dashboard-tools');if(toolsPanel)toolsPanel.hidden=document.body.classList.contains('roads-focus');
 settings.replaceChildren();
 for(const s of ordered){
  const line=document.createElement('div');line.className='dashboard-section-line';
  const check=document.createElement('input');check.type='checkbox';check.checked=!saved.hidden?.[s.id];check.setAttribute('aria-label','Show '+s.title);
  check.addEventListener('change',()=>{saved.hidden={...saved.hidden,[s.id]:!check.checked};persist();apply()});
  const label=document.createElement('span');label.textContent=s.title;
  const up=document.createElement('button');up.type='button';up.textContent='↑';up.title='Move up';up.setAttribute('aria-label','Move '+s.title+' up');
  const down=document.createElement('button');down.type='button';down.textContent='↓';down.title='Move down';down.setAttribute('aria-label','Move '+s.title+' down');
  for(const [button,delta] of [[up,-1],[down,1]])button.addEventListener('click',()=>{const ids=[...saved.order],i=ids.indexOf(s.id),j=i+delta;if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];saved.order=ids;persist();apply()});
  line.append(check,label,up,down);settings.appendChild(line);
 }
 renderNav();
}
function renderNav(){
 nav.replaceChildren();
 for(const s of sections.filter(s=>['Saved shoes','Bead road','Advanced baccarat roadmaps','Row Hit Analyzer','All-Shoes Strategy Analyzer','Strategy Comparison Dashboard'].some(t=>s.title.startsWith(t)))){
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=s.title.replace('Advanced baccarat roadmaps','Roadmaps').replace('Strategy Comparison Dashboard','Comparison').replace('All-Shoes Strategy Analyzer','All Shoes');
  button.addEventListener('click',()=>{if(saved.hidden?.[s.id]){saved.hidden[s.id]=false;persist();apply()}s.el.scrollIntoView({behavior:'smooth',block:'start'})});
  nav.appendChild(button);
 }
}
document.getElementById('dashboard-reset').addEventListener('click',()=>{saved={};persist();apply()});
const focus=document.getElementById('dashboard-road-focus');
focus.addEventListener('click',()=>{
 const on=!document.body.classList.contains('roads-focus');
 document.body.classList.toggle('roads-focus',on);
 document.body.classList.toggle('dashboard-mode',on);
 focus.textContent=on?'Exit road focus':'Road focus';
 apply();
 if(on)document.getElementById('road').closest('section').scrollIntoView({block:'start'});
});
const oldToggle=document.getElementById('dashboard-toggle');
oldToggle.addEventListener('click',()=>{if(document.body.classList.contains('roads-focus')){document.body.classList.remove('roads-focus');focus.textContent='Road focus';apply()}});
const board=document.getElementById('visual-leaderboard');
const kind=document.getElementById('visual-leaderboard-kind');
const scope=document.getElementById('visual-leaderboard-scope');
function drawBars(){
 const all=scope.value==='all';
 const tbody=document.getElementById(all?'all-shoes-body':'comparison-body');
 const items=[...tbody.querySelectorAll('tr')].map(tr=>[...tr.cells].map(td=>td.textContent.trim())).filter(c=>c.length>3&&/\d+(\.\d+)?%$/.test(c[c.length-1]));
 const results=items.map(c=>({label:c[0]+' · '+c[1]+' rows',rate:parseFloat(c[c.length-1]),hits:c[c.length-2]})).slice(0,10);
 board.replaceChildren();
 if(!results.length){board.textContent='Not enough comparisons yet. Try lowering the minimum comparisons filter.';return}
 for(const e of results){
  const row=document.createElement('div');row.className='visual-bar-item';
  const label=document.createElement('div');label.className='visual-bar-label';label.textContent=e.label+' — '+e.rate.toFixed(1)+'% ('+e.hits+')';
  const track=document.createElement('div');track.className='visual-bar-track';
  const bar=document.createElement('div');bar.className='visual-bar-fill';bar.style.width=Math.max(0,Math.min(100,e.rate))+'%';
  track.appendChild(bar);row.append(label,track);board.appendChild(row);
 }
}
function syncKind(){
 const sel=document.getElementById(scope.value==='all'?'all-shoes-type':'comparison-type');
 if(sel){sel.value=kind.value;sel.dispatchEvent(new Event('change'))}
 drawBars();
}
kind.addEventListener('change',syncKind);
scope.addEventListener('change',syncKind);
for(const id of ['all-shoes-body','comparison-body']){
 const el=document.getElementById(id);if(el)new MutationObserver(drawBars).observe(el,{childList:true});
}
document.getElementById('dashboard-visual-refresh').addEventListener('click',drawBars);
apply();drawBars();

const compactButton=document.getElementById('gameplay-compact-toggle');
const compactKey='baccarat-compact-gameplay-v1';
function applyCompact(){
 const active=document.body.classList.contains('compact-gameplay');
 compactButton.textContent=active?'Full view':'Compact';
 compactButton.setAttribute('aria-pressed',String(active));
 document.documentElement.style.setProperty('--compact-rows',String(window.getRoadDisplayRows?.()||6));
 if(active){
  document.body.classList.remove('roads-focus');
  focus.textContent='Road focus';
  for(const section of sections)section.el.hidden=!section.el.querySelector('#road,#big-road,#total');
 }else apply();
}
compactButton.addEventListener('click',()=>{
 const active=!document.body.classList.contains('compact-gameplay');
 document.body.classList.toggle('compact-gameplay',active);
 try{localStorage.setItem(compactKey,active?'1':'0')}catch(e){}
 applyCompact();
 if(active)document.querySelector('section.panel:has(#road)')?.scrollIntoView({block:'start'});
});
try{if(localStorage.getItem(compactKey)==='1')document.body.classList.add('compact-gameplay')}catch(e){}
document.getElementById('road-rows')?.addEventListener('change',()=>document.documentElement.style.setProperty('--compact-rows',String(window.getRoadDisplayRows?.()||6)));
applyCompact();
})();