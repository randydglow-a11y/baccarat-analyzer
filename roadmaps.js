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
 // Nonstandard display heights use Bead Plate-style chronological wrapping.
 // Standard six-row mode retains the authentic baccarat streak geometry.
 const visible=displayRows===ROWS?cells:cells.map((x,i)=>({
  ...x,c:Math.floor(i/displayRows),r:i%displayRows
 }));
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
function strategy(cells,rows,bead){const cols=new Map();cells.forEach((x,i)=>{const c=bead?Math.floor(i/rows):x.c,k=bead?i%rows:x.r;if(!cols.has(c))cols.set(c,new Map());cols.get(c).set(k,x.v)});let total=0,yes=0,no=0;for(const [c,cur] of cols){const prev=cols.get(c-1);if(!prev)continue;total++;let y=false,n=false;for(const [row,v] of cur){if(!prev.has(row))continue;if(prev.get(row)===v)y=true;else n=true}if(y)yes++;if(n)no++}return [total,yes,no]}
function showStrategies(results,big,eye,small,pig){const root=document.getElementById('strategy-body');if(!root)return;const rows=window.getRoadDisplayRows?window.getRoadDisplayRows():6;const wrap=a=>rows===6?a:a.map((x,i)=>({...x,c:Math.floor(i/rows),r:i%rows}));const items=[['Bead',results.map(v=>({v})),true],['Big Road',wrap(big),false],['Big Eye Boy',wrap(eye),false],['Small Road',wrap(small),false],['Cockroach Pig',wrap(pig),false]];root.replaceChildren();for(const [name,cells,bead] of items){const [total,yes,no]=strategy(cells,rows,bead);const tr=document.createElement('tr');for(const value of [name,yes+'/'+total,total?(100*yes/total).toFixed(1)+'%':'—',no+'/'+total,total?(100*no/total).toFixed(1)+'%':'—']){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}root.appendChild(tr)}}
function showComparison(results){const root=document.getElementById('comparison-body');if(!root)return;const big=buildBig(results),eye=derived(big,1),small=derived(big,2),pig=derived(big,3);const roads=[['Bead Road',results.map(v=>({v})),true],['Big Road',big.cells,false],['Big Eye Boy',eye,false],['Small Road',small,false],['Cockroach Pig',pig,false]];const rows=[1,2,3,4,5,6,7,8,9,10,12];const entries=[];for(const [name,cells,bead] of roads)for(const rowCount of rows){const positioned=bead?cells:rowCount===6?cells:cells.map((x,i)=>({...x,c:Math.floor(i/rowCount),r:i%rowCount}));const [total,match,different]=strategy(positioned,rowCount,bead);if(total){entries.push({name,rowCount,total,match,different})}}const kind=document.getElementById('comparison-type')?.value||'match';const min=Number(document.getElementById('comparison-min')?.value||0);entries.sort((a,b)=>{const av=kind==='match'?a.match:a.different,bv=kind==='match'?b.match:b.different;return bv/b.total-av/a.total||b.total-a.total||a.name.localeCompare(b.name)||a.rowCount-b.rowCount});root.replaceChildren();for(const e of entries.filter(x=>x.total>=min)){const tr=document.createElement('tr');const hits=kind==='match'?e.match:e.different;for(const v of [e.name,e.rowCount,hits+' / '+e.total,(100*hits/e.total).toFixed(1)+'%']){const td=document.createElement('td');td.textContent=v;tr.appendChild(td)}root.appendChild(tr)}const status=document.getElementById('comparison-status');if(status)status.textContent=entries.filter(x=>x.total>=min).length+' combinations shown · '+results.length+' hands in current shoe. Six-row advanced roads retain traditional geometry.'}
window.refreshComparison=function(){if(Array.isArray(window.hands))showComparison(window.hands)};
function showRowHits(results,big,eye,small,pig){
 const root=document.getElementById('row-hit-body');if(!root)return;
 const rows=window.getRoadDisplayRows?window.getRoadDisplayRows():6;
 const wrap=a=>rows===6?a:a.map((x,i)=>({...x,c:Math.floor(i/rows),r:i%rows}));
 const roads=[['Bead',results.map(v=>({v})),true],['Big Road',wrap(big),false],['Big Eye Boy',wrap(eye),false],['Small Road',wrap(small),false],['Cockroach Pig',wrap(pig),false]];
 root.replaceChildren();
 for(const [name,cells,bead] of roads){
  const columns=new Map();
  cells.forEach((x,i)=>{const c=bead?Math.floor(i/rows):x.c,row=bead?i%rows:x.r;if(!columns.has(c))columns.set(c,new Map());columns.get(c).set(row,x.v)});
  const matches=Array(rows).fill(0),differences=Array(rows).fill(0);
  let compared=0;
  for(const [c,current] of columns){
   const previous=columns.get(c-1);if(!previous)continue;
   compared++;
   let firstMatch=-1,firstDifference=-1;
   for(let row=0;row<rows;row++){
    if(!current.has(row)||!previous.has(row))continue;
    if(current.get(row)===previous.get(row)){if(firstMatch<0)firstMatch=row}
    else if(firstDifference<0)firstDifference=row;
    if(firstMatch>=0&&firstDifference>=0)break;
   }
   if(firstMatch>=0)matches[firstMatch]++;
   if(firstDifference>=0)differences[firstDifference]++;
  }
  for(let row=0;row<rows;row++){
   const tr=document.createElement('tr');
   const pct=n=>compared?(100*n/compared).toFixed(1)+'%':'—';
   for(const value of [name,'Row '+(row+1),matches[row]+'/'+compared,pct(matches[row]),differences[row]+'/'+compared,pct(differences[row])]){
    const td=document.createElement('td');td.textContent=value;tr.appendChild(td);
   }
   root.appendChild(tr);
  }
 }
}

function allShoeRoads(hands){
 const big=buildBig(hands),eye=derived(big,1),small=derived(big,2),pig=derived(big,3);
 return [['Bead',hands.map(v=>({v})),true],['Big Road',big.cells,false],['Big Eye Boy',eye,false],['Small Road',small,false],['Cockroach Pig',pig,false]];
}
function firstHits(cells,rows,bead){
 const cols=new Map();
 cells.forEach((x,i)=>{const c=bead?Math.floor(i/rows):x.c,row=bead?i%rows:x.r;if(!cols.has(c))cols.set(c,new Map());cols.get(c).set(row,x.v)});
 const match=Array(rows).fill(0),different=Array(rows).fill(0);
 let total=0,yes=0,no=0;
 for(const [c,cur] of cols){
  const prev=cols.get(c-1);if(!prev)continue;
  total++;let m=-1,d=-1;
  for(let row=0;row<rows;row++){
   if(!cur.has(row)||!prev.has(row))continue;
   if(cur.get(row)===prev.get(row)){if(m<0)m=row}
   else if(d<0)d=row;
   if(m>=0&&d>=0)break;
  }
  if(m>=0){match[m]++;yes++}
  if(d>=0){different[d]++;no++}
 }
 return {total,yes,no,match,different};
}
function showAllShoes(){
 const root=document.getElementById('all-shoes-body'),rowRoot=document.getElementById('all-shoes-row-body');
 if(!root||!rowRoot)return;
 const shoes=window.getBaccaratSavedShoes?window.getBaccaratSavedShoes():[];
 const rowsOptions=[1,2,3,4,5,6,7,8,9,10,12],aggregate=new Map();
 let handCount=0,nonempty=0;
 for(const shoe of shoes){
  const hands=Array.isArray(shoe.hands)?shoe.hands.filter(v=>v==='B'||v==='P'||v==='T'):[];
  if(!hands.length)continue;
  nonempty++;handCount+=hands.length;
  for(const [name,cells,bead] of allShoeRoads(hands)){
   for(const rows of rowsOptions){
    const positioned=bead||rows===6?cells:cells.map((x,i)=>({...x,c:Math.floor(i/rows),r:i%rows}));
    const stat=firstHits(positioned,rows,bead),key=name+'|'+rows;
    if(!aggregate.has(key))aggregate.set(key,{name,rows,total:0,yes:0,no:0,match:Array(rows).fill(0),different:Array(rows).fill(0),shoes:0});
    const entry=aggregate.get(key);
    entry.total+=stat.total;entry.yes+=stat.yes;entry.no+=stat.no;
    if(stat.total)entry.shoes++;
    for(let i=0;i<rows;i++){entry.match[i]+=stat.match[i];entry.different[i]+=stat.different[i]}
   }
  }
 }
 const kind=document.getElementById('all-shoes-type')?.value||'match';
 const min=Number(document.getElementById('all-shoes-min')?.value||10);
 const value=e=>kind==='match'?e.yes:e.no;
 const entries=[...aggregate.values()].filter(e=>e.total>=min).sort((a,b)=>value(b)/b.total-value(a)/a.total||b.total-a.total||a.name.localeCompare(b.name)||a.rows-b.rows);
 root.replaceChildren();
 for(const e of entries){
  const tr=document.createElement('tr');
  for(const val of [e.name,e.rows,e.shoes,value(e)+' / '+e.total,(100*value(e)/e.total).toFixed(1)+'%']){const td=document.createElement('td');td.textContent=val;tr.appendChild(td)}
  root.appendChild(tr);
 }
 const selectedRows=Number(document.getElementById('all-shoes-row-setting')?.value||6);
 const rowEntries=[...aggregate.values()].filter(e=>e.rows===selectedRows&&e.total>=min).flatMap(e=>Array.from({length:e.rows},(_,i)=>({name:e.name,row:i+1,total:e.total,hits:kind==='match'?e.match[i]:e.different[i],shoes:e.shoes}))).sort((a,b)=>b.hits/b.total-a.hits/a.total||b.total-a.total||a.name.localeCompare(b.name)||a.row-b.row);
 rowRoot.replaceChildren();
 for(const e of rowEntries){const tr=document.createElement('tr');for(const val of [e.name,'Row '+e.row,e.hits+' / '+e.total,(100*e.hits/e.total).toFixed(1)+'%']){const td=document.createElement('td');td.textContent=val;tr.appendChild(td)}rowRoot.appendChild(tr)}
 const status=document.getElementById('all-shoes-status');
 if(status)status.textContent=nonempty+' nonempty saved shoes · '+handCount+' hands · '+entries.length+' road/row-setting combinations with '+min+'+ comparisons. Comparisons never cross shoe boundaries.';
 const rowStatus=document.getElementById('all-shoes-row-status');
 if(rowStatus)rowStatus.textContent=rowEntries.length?'First-hit row rankings for '+selectedRows+' rows; percentages use all adjacent-column comparisons for each road.':'No rows meet the minimum comparisons filter.';
 if(!entries.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='No combinations meet this filter yet. Try All comparisons or add more saved shoe results.';tr.appendChild(td);root.appendChild(tr)}
}
window.refreshAllShoes=showAllShoes;

function renderRoadmaps(){
 const results=window.hands;if(!Array.isArray(results))return;
 const big=buildBig(results);
 const eye=derived(big,1),small=derived(big,2),pig=derived(big,3);
 draw('big-road',big.cells,'big');
 draw('big-eye-road',eye,'derived hollow');
 draw('small-road',small,'derived solid');
 draw('cockroach-road',pig,'derived slash');
 showStrategies(results,big.cells,eye,small,pig);
 showRowHits(results,big.cells,eye,small,pig);
 showComparison(results);
 renderNextPreview(results);
 const ties=results.filter(x=>x==='T').length;
 const runs=big.cells.filter(x=>x.run===0).length;
 const status=document.getElementById('roadmap-status');
 if(status)status.textContent=big.cells.length+' Banker/Player hands · '+ties+' ties · '+runs+' runs'+(big.leadingTies?' · '+big.leadingTies+' opening tie(s) awaiting first Banker/Player':'');
}
window.renderRoadmaps=renderRoadmaps;
window.BaccaratRoads={position,buildBig,derived};
})();