(function(){
'use strict';
const host=document.getElementById('road-batch');if(!host)return;
const section=document.createElement('section');section.className='panel';section.id='bet-backtest';
section.innerHTML='<h2>📈 Automated Betting Backtest</h2><p class="muted">Walk-forward testing: each bet is selected using only previously revealed results. Flat 1-unit bets, Banker win +0.95, Player win +1, loss −1, Tie push 0. No progression or future peeking.</p><div class="actions"><label>Simulated shoes <select id="bt-limit"><option value="25">25</option><option value="100" selected>100</option><option value="500">500</option><option value="1000">1,000</option></select></label><button id="bt-run" class="player" disabled>Run backtest</button><button id="bt-export" class="secondary" disabled>Export CSV</button></div><p id="bt-status" class="muted">Upload the simulation file above first.</p><div style="overflow-x:auto"><table style="width:100%"><thead><tr><th>Strategy</th><th>Bets</th><th>Win rate</th><th>Net units</th><th>Max losing streak</th></tr></thead><tbody id="bt-body"></tbody></table></div><p class="muted" style="font-size:12px">Bead/Big Road: bet the previous non-tie winner (follow) or opposite (fade). Derived roads: project the next red/blue mark for hypothetical Banker and Player outcomes; bet only when exactly one outcome continues (or changes) the latest structural color. Skip when a road has not started or signals are ambiguous. These are experimental rules, not guaranteed profitable strategies.</p>';
host.insertAdjacentElement('afterend',section);
let data=null,exportRows=[];
const $=id=>document.getElementById(id);
window.addEventListener('baccarat-simulation-file',e=>{data=e.detail.rows;$('bt-run').disabled=false;$('bt-status').textContent=data.size.toLocaleString()+' shoes ready for backtesting.'});
const roads=window.BaccaratRoads;
const labels=['Bead follow','Bead fade','Big Road follow','Big Road fade','Big Eye follow red/blue','Big Eye fade red/blue','Small Road follow red/blue','Small Road fade red/blue','Cockroach follow red/blue','Cockroach fade red/blue'];
function pick(history,index){
 const previous=[...history].reverse().find(v=>v!=='T');
 if(index<4)return previous?(index%2===0?previous:previous==='B'?'P':'B'):null;
 const offset=1+Math.floor((index-4)/2),before=roads.derived(roads.buildBig(history),offset);
 if(!before.length)return null;
 const last=before[before.length-1].v;
 const options=['B','P'].filter(side=>{
  const after=roads.derived(roads.buildBig([...history,side]),offset);
  return after.length>before.length&&((after[after.length-1].v===last)===(index%2===0));
 });
 return options.length===1?options[0]:null;
}
function score(s){return s.outcome==='T'?0:s.bet===s.outcome?(s.bet==='B'?.95:1):-1}
function calculate(shoes){
 const stats=labels.map(name=>({name,bets:0,wins:0,losses:0,pushes:0,net:0,streak:0,maxStreak:0}));
 for(const shoe of shoes){
  const history=[];
  for(const outcome of shoe){
   const decisions=stats.map((_,i)=>pick(history,i));
   decisions.forEach((bet,i)=>{if(!bet)return;const s=stats[i],delta=score({bet,outcome});s.bets++;s.net+=delta;if(outcome==='T'){s.pushes++}else if(bet===outcome){s.wins++;s.streak=0}else{s.losses++;s.streak++;s.maxStreak=Math.max(s.maxStreak,s.streak)}});
   history.push(outcome);
  }
 }
 return stats;
}
$('bt-run').onclick=async()=>{
 if(!data)return;$('bt-run').disabled=true;$('bt-export').disabled=true;
 const shoes=Array.from(data.values()).slice(0,Number($('bt-limit').value));
 $('bt-status').textContent='Testing '+shoes.length+' shoes. This may take a moment on iPhone…';
 await new Promise(resolve=>setTimeout(resolve,30));
 try{
  const stats=calculate(shoes);$('bt-body').replaceChildren();exportRows=[];
  stats.forEach(s=>{
   const rate=s.wins+s.losses?(100*s.wins/(s.wins+s.losses)).toFixed(1)+'%':'—';
   const values=[s.name,s.bets,rate,(s.net>=0?'+':'')+s.net.toFixed(2),s.maxStreak];
   exportRows.push([s.name,s.bets,s.wins,s.losses,s.pushes,s.net.toFixed(2),s.maxStreak]);
   const tr=document.createElement('tr');values.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.appendChild(td)});$('bt-body').appendChild(tr);
  });
  $('bt-status').textContent='Backtested '+shoes.length+' shoes / '+shoes.reduce((n,s)=>n+s.length,0).toLocaleString()+' hands. Win rate excludes tie pushes. Losing streak continues across shoes.';
  $('bt-export').disabled=false;
 }catch(e){$('bt-status').textContent='Backtest error: '+e.message}
 finally{$('bt-run').disabled=false}
};
$('bt-export').onclick=()=>{
 if(!exportRows.length)return;
 const lines=[['Strategy','Bets','Wins','Losses','Pushes','Net units','Max losing streak'],...exportRows].map(row=>row.join(',')).join('\n');
 const url=URL.createObjectURL(new Blob([lines],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='baccarat-walk-forward-backtest.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
})();