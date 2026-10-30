(function(){
'use strict';
const host=document.getElementById('strategy-test-dashboard');if(!host)return;
const section=document.createElement('section');section.className='panel';section.id='road-batch';
section.innerHTML='<h2>🧪 Automated Roadmap Comparison</h2><p class="muted">Batch-test the existing Match and Different column patterns across simulated shoes. Historical descriptive statistics only—not a bet backtest or forecast.</p><div class="actions"><label>Shoes to analyze <select id="batch-limit"><option value="25">25</option><option value="100" selected>100</option><option value="500">500</option><option value="1000">1,000</option></select></label><label>Row layout <select id="batch-rows"><option value="6" selected>6 (standard)</option><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option><option value="8">8</option><option value="10">10</option></select></label><button id="batch-run" class="player" disabled>Analyze shoes</button></div><p id="batch-status" class="muted">Upload the Wizard of Odds file above to enable batch analysis.</p><div style="overflow-x:auto"><table style="width:100%"><thead><tr><th>Road</th><th>Match</th><th>Different</th><th>Compared columns</th></tr></thead><tbody id="batch-body"></tbody></table></div><p class="muted" style="font-size:12px">A column can contain both a match and a difference, so these percentages need not add to 100%. Derived roads use red/blue structural marks, not Banker/Player outcomes. No bets are placed.</p>';
host.insertAdjacentElement('afterend',section);
let data=null,busy=false;
const $=id=>document.getElementById(id);
window.addEventListener('baccarat-simulation-file',e=>{data=e.detail.rows;$('batch-run').disabled=false;$('batch-status').textContent=data.size.toLocaleString()+' shoes available. Choose a sample size and tap Analyze shoes.'});
function compare(cells,rows,bead){
 const cols=new Map();
 cells.forEach((x,i)=>{const c=bead?Math.floor(i/rows):x.c,r=bead?i%rows:x.r;if(!cols.has(c))cols.set(c,new Map());cols.get(c).set(r,x.v)});
 let total=0,match=0,different=0;
 for(const [c,cur] of cols){const prev=cols.get(c-1);if(!prev)continue;total++;let yes=false,no=false;for(const [r,v] of cur){if(!prev.has(r))continue;if(prev.get(r)===v)yes=true;else no=true}if(yes)match++;if(no)different++}
 return {total,match,different};
}
$('batch-run').onclick=async()=>{
 if(!data||busy)return;busy=true;$('batch-run').disabled=true;
 const rows=Number($('batch-rows').value),limit=Number($('batch-limit').value);
 const shoes=Array.from(data.values()).slice(0,limit),names=['Bead Road','Big Road','Big Eye Boy','Small Road','Cockroach Pig'];
 const totals=names.map(()=>({total:0,match:0,different:0}));const road=window.BaccaratRoads;
 try{
  for(let i=0;i<shoes.length;i++){
   const results=shoes[i],big=road.buildBig(results);
   const items=[results.map(v=>({v})),big.cells,road.derived(big,1),road.derived(big,2),road.derived(big,3)];
   for(let j=0;j<items.length;j++){
    const cells=j>0&&rows!==6?items[j].map((x,k)=>({...x,c:Math.floor(k/rows),r:k%rows})):items[j];
    const stat=compare(cells,rows,j===0);for(const k of ['total','match','different'])totals[j][k]+=stat[k];
   }
   if(i%20===19){$('batch-status').textContent='Analyzing '+(i+1)+' / '+shoes.length+' shoes…';await new Promise(resolve=>setTimeout(resolve,0))}
  }
  $('batch-body').replaceChildren();
  totals.forEach((v,i)=>{const tr=document.createElement('tr');const pct=x=>v.total?(100*x/v.total).toFixed(1)+'%':'—';for(const value of [names[i],pct(v.match)+' ('+v.match+')',pct(v.different)+' ('+v.different+')',v.total]){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}$('batch-body').appendChild(tr)});
  $('batch-status').textContent='Completed '+shoes.length+' shoes · '+shoes.reduce((n,s)=>n+s.length,0).toLocaleString()+' hands · '+rows+' rows. Results reflect complete historical shoes.';
 }catch(err){$('batch-status').textContent='Analysis error: '+err.message}
 finally{busy=false;$('batch-run').disabled=!data}
};
})();