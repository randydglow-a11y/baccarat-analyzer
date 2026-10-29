/* Baccarat roadmap rendering: results are descriptive, never predictive. */
(function(){
const ROWS=6;
function makeBoard(id, entries, style){
 const el=document.getElementById(id);if(!el)return;
 el.innerHTML='';el.className='road advanced-road '+(style||'');
 const columns=Math.max(12,entries.reduce((m,x)=>Math.max(m,x.c+1),0));
 el.style.gridTemplateColumns='repeat('+columns+', 30px)';
 el.style.gridTemplateRows='repeat(6, 30px)';
 // CSS grid is row-major here; place each cell explicitly.
 for(const entry of entries){
  const dot=document.createElement('span');
  dot.className='roadmark '+(entry.v==='B'?'red':entry.v==='P'?'blue':'green');
  dot.style.gridColumn=(entry.c+1);dot.style.gridRow=(entry.r+1);
  dot.textContent=style==='derived'?'':(entry.tie?String(entry.tie):'');
  dot.title=(entry.v==='B'?'Banker':entry.v==='P'?'Player':'Tie')+(entry.tie?' · '+entry.tie+' tie(s)':'');
  if(entry.tie)dot.classList.add('with-tie');
  el.appendChild(dot);
 }
}
function buildBig(hands){
 const groups=[];let pending=0;
 for(const v of hands){
  if(v==='T'){if(groups.length&&groups[groups.length-1].length)groups[groups.length-1][groups[groups.length-1].length-1].tie++;else pending++;continue}
  if(!groups.length||groups[groups.length-1][0].v!==v)groups.push([]);
  groups[groups.length-1].push({v,tie:pending});pending=0;
 }
 const cells=[],used=new Set(),colLengths=[];
 let prev=null;
 for(let g=0;g<groups.length;g++){
  const run=groups[g];let c=g===0?0:Math.max(...cells.filter(x=>x.group===g-1).map(x=>x.c))+1,r=0;
  for(let i=0;i<run.length;i++){
   if(i>0){
    const down=r+1;
    if(down<ROWS&&!used.has(c+','+down)&&!(r===0&&used.has(c+','+down))){r=down}
    else {c++;} 
   }
   while(used.has(c+','+r))c++;
   used.add(c+','+r);cells.push({...run[i],c,r,group:g,index:i});
  }
  colLengths.push(run.length);
 }
 if(pending&&cells.length)cells[cells.length-1].tie+=pending;
 return {cells,groups};
}
function derived(big,offset){
 // Derived roads compare historical Big Road column structure. A new result is
 // red for matching structure and blue for contrasting structure.
 const seq=[];const runs=big.groups;
 for(let col=offset+1;col<runs.length;col++){
  for(let row=0;row<runs[col].length;row++){
   if(col===offset+1&&row===0)continue;
   let red;
   if(row===0)red=runs[col-1].length===runs[col-offset-1].length;
   else {
    const reference=runs[col-offset-1];
    const at=reference.length>row;
    const above=reference.length>row-1;
    red=at===above;
   }
   seq.push(red?'B':'P');
  }
 }
 // Derived road symbols are grouped by consecutive identical colors.
 const result=buildBig(seq).cells;
 return result.map(x=>({...x,tie:0}));
}
function renderRoadmaps(){
 if(!window.hands)return;
 const big=buildBig(window.hands);
 makeBoard('big-road',big.cells,'big');
 makeBoard('big-eye-road',derived(big,1),'derived hollow');
 makeBoard('small-road',derived(big,2),'derived solid');
 makeBoard('cockroach-road',derived(big,3),'derived slash');
 const ties=window.hands.filter(x=>x==='T').length;
 const el=document.getElementById('roadmap-status');
 if(el)el.textContent=big.cells.length+' decisive hands · '+ties+' ties · '+big.groups.length+' Banker/Player runs';
}
window.renderRoadmaps=renderRoadmaps;
})();