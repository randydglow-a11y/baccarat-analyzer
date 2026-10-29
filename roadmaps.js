/* Baccarat road display, six-row convention. Historical only. */
(function(){
'use strict';
const ROWS=6;
function position(results){
 const cells=[],occupied=new Set();
 let previous=null,anchor=0,c=0,r=0,run=0;
 for(const item of results){
  const v=item.v;
  if(v!==previous){
   anchor=previous===null?0:anchor+1;
   c=anchor;r=0;run=0;
  }else{
   const below=r+1;
   if(below<ROWS&&!occupied.has(c+','+below))r=below;
   else c++;
   while(occupied.has(c+','+r))c++;
  }
  occupied.add(c+','+r);
  cells.push({...item,c,r,run:run++,anchor});
  previous=v;
 }
 return cells;
}
function buildBig(results){
 const decisive=[];let leadingTies=0;
 for(const v of results){
  if(v==='T'){
   if(decisive.length)decisive[decisive.length-1].tie++;
   else leadingTies++;
  }else decisive.push({v,tie:0});
 }
 if(decisive.length)decisive[0].tie+=leadingTies;
 return {cells:position(decisive),leadingTies:decisive.length?0:leadingTies};
}
function derived(big,offset){
 // Derived road begins at the second mark of Big Road column
 // (offset + 1), or the first mark of the following column.
 // offset: 1 Big Eye Boy, 2 Small Road, 3 Cockroach Pig.
 const runs=[];
 for(const cell of big.cells){
  if(cell.run===0)runs.push([]);
  runs[runs.length-1].push(cell);
 }
 const signals=[];
 for(let col=offset;col<runs.length;col++){
  for(let row=0;row<runs[col].length;row++){
   if(col===offset&&row===0)continue;
   let red;
   if(row===0){
    // Compare the lengths of the two preceding reference columns.
    red=runs[col-1].length===runs[col-offset-1].length;
   }else{
    // Compare occupancy at the same height and immediately above
    // in the offset-th preceding Big Road column.
    const reference=runs[col-offset].length;
    red=(reference>row)===(reference>row-1);
   }
   signals.push({v:red?'B':'P',tie:0});
  }
 }
 return position(signals);
}
function draw(id,cells,style){
 const root=document.getElementById(id);if(!root)return;
 root.replaceChildren();
 root.className='road advanced-road '+style;
 const cols=Math.max(12,...cells.map(x=>x.c+1));
 root.style.gridTemplateColumns='repeat('+cols+',30px)';
 root.style.gridTemplateRows='repeat(6,30px)';
 for(const x of cells){
  const dot=document.createElement('span');
  dot.className='roadmark '+(x.v==='B'?'red':'blue')+(x.tie?' with-tie':'');
  dot.style.gridColumn=String(x.c+1);dot.style.gridRow=String(x.r+1);
  if(x.tie&&style==='big'){
   const mark=document.createElement('span');mark.className='tie-count';mark.textContent=x.tie>99?'99+':String(x.tie);dot.appendChild(mark);
  }
  dot.title=(style==='big'?(x.v==='B'?'Banker':'Player'):(x.v==='B'?'Red structural mark':'Blue structural mark'))+(x.tie?' · '+x.tie+' tie(s)':'');
  root.appendChild(dot);
 }
}
function renderRoadmaps(){
 const results=window.hands;if(!Array.isArray(results))return;
 const big=buildBig(results);
 draw('big-road',big.cells,'big');
 draw('big-eye-road',derived(big,1),'derived hollow');
 draw('small-road',derived(big,2),'derived solid');
 draw('cockroach-road',derived(big,3),'derived slash');
 const ties=results.filter(x=>x==='T').length;
 const runs=big.cells.filter(x=>x.run===0).length;
 const status=document.getElementById('roadmap-status');
 if(status)status.textContent=big.cells.length+' Banker/Player hands · '+ties+' ties · '+runs+' runs'+(big.leadingTies?' · '+big.leadingTies+' opening tie(s) awaiting first Banker/Player':'');
}
window.renderRoadmaps=renderRoadmaps;
window.BaccaratRoads={position,buildBig,derived};
})();