/* Baccarat road display, six-row convention. Historical only. */
(function(){
'use strict';
const ROWS=6;
function position(results,displayRows=ROWS){
 const cells=[],occupied=new Set();
 let previous=null,anchor=0,c=0,r=0,run=0;
 for(const item of results){
  const v=item.v;
  if(v!==previous){
   anchor=previous===null?0:anchor+1;
   // A long streak can bend across the top of a later column.
   // Never start a new streak on a previously occupied cell.
   while(occupied.has(anchor+',0'))anchor++;
   c=anchor;r=0;run=0;
  }else{
   const below=r+1;
   if(below<displayRows&&!occupied.has(c+','+below))r=below;
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
 const displayRows=window.getRoadDisplayRows?window.getRoadDisplayRows():ROWS;
 // Reposition only the final marks. Never recompute derived signals using display geometry.
 const visible=displayRows===ROWS?cells:position(cells.map(x=>({v:x.v,tie:x.tie||0})),displayRows);
 root.className='road advanced-road '+style;
 const cols=Math.max(12,...visible.map(x=>x.c+1));
 root.style.gridTemplateColumns='repeat('+cols+',30px)';
 root.style.gridTemplateRows='repeat('+displayRows+',30px)';
 for(const x of visible){
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
function renderNextPreview(results){
 const root=document.getElementById('next-road-options');
 if(!root)return;
 root.replaceChildren();
 for(const side of ['B','P']){
  const panel=document.createElement('div');
  panel.className='next-option';
  const heading=document.createElement('strong');
  heading.textContent=side==='B'?'If Banker wins':'If Player wins';
  heading.style.color=side==='B'?'#ff7b8c':'#7cb5ff';
  panel.appendChild(heading);
  const marks=document.createElement('div');
  marks.className='next-marks';
  const before=buildBig(results),after=buildBig([...results,side]);
  for(const [offset,label,style] of [[1,'Big Eye','hollow'],[2,'Small','solid'],[3,'Cockroach','slash']]){
   const a=derived(before,offset),b=derived(after,offset);
   const pair=document.createElement('span');
   pair.className='next-pair';
   const mark=document.createElement('span');
   if(b.length>a.length){
    const value=b[b.length-1].v;
    mark.className='next-mark '+(value==='B'?'red':'blue')+' '+style;
    mark.title=label+': '+(value==='B'?'red':'blue');
   }else{
    mark.className='next-mark';
    mark.textContent='—';
    mark.title=label+': not started';
   }
   const text=document.createElement('span');
   text.textContent=label;
   pair.append(mark,text);marks.appendChild(pair);
  }
  panel.appendChild(marks);root.appendChild(panel);
 }
}
function renderRoadmaps(){
 const results=window.hands;if(!Array.isArray(results))return;
 const big=buildBig(results);
 draw('big-road',big.cells,'big');
 draw('big-eye-road',derived(big,1),'derived hollow');
 draw('small-road',derived(big,2),'derived solid');
 draw('cockroach-road',derived(big,3),'derived slash');
 renderNextPreview(results);
 const ties=results.filter(x=>x==='T').length;
 const runs=big.cells.filter(x=>x.run===0).length;
 const status=document.getElementById('roadmap-status');
 if(status)status.textContent=big.cells.length+' Banker/Player hands · '+ties+' ties · '+runs+' runs'+(big.leadingTies?' · '+big.leadingTies+' opening tie(s) awaiting first Banker/Player':'');
}
window.renderRoadmaps=renderRoadmaps;
window.BaccaratRoads={position,buildBig,derived};
})();