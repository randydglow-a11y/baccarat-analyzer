(function(){
'use strict';
const host=document.getElementById('bet-backtest');if(!host)return;
const panel=document.createElement('section');panel.className='panel';panel.id='custom-cockroach';
panel.innerHTML='<h2>🐛 Custom Cockroach: 4-Row Mismatch</h2><p class="muted">Compare the next Cockroach mark with the same row in the previous 4-row column. Bet only when exactly one possible Banker/Player result creates a mismatch. After each loss, double plus 1 unit across columns; reset after a win. Stop the shoe immediately after the first winning bet. Stop betting within a column after a win or four losses. Ties push. Choose a maximum stake; exceeding it skips the rest of that column and resets to 1 unit for the next.</p><div class="actions"><label>Shoes <select id="cc-count"><option value="25">25</option><option value="100" selected>100</option><option value="500">500</option><option value="1000">1,000</option></select></label><label>Max stake <select id="cc-cap"><option value="16">16 units</option><option value="64" selected>64 units</option><option value="256">256 units</option><option value="1024">1,024 units</option></select></label><button id="cc-run" class="player" disabled>Test my strategy</button></div><p id="cc-status" class="muted">Upload the simulation file above to enable testing.</p><div id="cc-stats" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><p class="muted" style="font-size:12px">Four-row columns use chronological wrapping of the Cockroach marks, matching the app’s 4-row display. No bets are made where both hypothetical outcomes yield the same comparison, or the previous column has no corresponding row. This is an experimental interpretation of your rules.</p>';
host.insertAdjacentElement('afterend',panel);
const $=id=>document.getElementById(id);let dataset=null;
window.addEventListener('baccarat-simulation-file',e=>{dataset=e.detail.rows;$('cc-run').disabled=false;$('cc-status').textContent=dataset.size.toLocaleString()+' shoes available.'});
const road=window.BaccaratRoads;
function nextSignal(history){
 const before=road.derived(road.buildBig(history),3),n=before.length,row=n%4,col=Math.floor(n/4);
 if(col===0)return null;
 const prior=before[(col-1)*4+row];if(!prior)return null;
 const options=['B','P'].filter(side=>{
  const after=road.derived(road.buildBig([...history,side]),3);
  return after.length===n+1&&after[n].v!==prior.v;
 });
 return {col,row,bet:options.length===1?options[0]:null};
}
async function run(shoes){
 const result={bets:0,wins:0,losses:0,pushes:0,net:0,peak:0,drawdown:0,stakeMax:0,maxLossRun:0,lossRun:0,completed:0,exhausted:0,capStops:0,twoWinShoes:0};
 for(let j=0;j<shoes.length;j++){
  const history=[];let column=-1,lossesInColumn=0,stopped=false,stake=1,columnWins=0;const cap=Number($('cc-cap').value);
  for(const outcome of shoes[j]){
   const signal=nextSignal(history);
   if(signal&&signal.col!==column){column=signal.col;lossesInColumn=0;stopped=false}
   if(signal&&!stopped&&signal.bet){
    if(stake>cap){stopped=true;stake=1;result.capStops++;history.push(outcome);continue}result.stakeMax=Math.max(result.stakeMax,stake);result.bets++;
    if(outcome==='T')result.pushes++;
    else if(outcome===signal.bet){result.wins++;result.net+=stake*(signal.bet==='B'?.95:1);result.lossRun=0;stake=1;stopped=true;columnWins++;result.completed++}
    else{result.losses++;result.net-=stake;stake=stake*2+1;lossesInColumn++;result.lossRun++;result.maxLossRun=Math.max(result.maxLossRun,result.lossRun);if(lossesInColumn>=4){stopped=true;result.exhausted++}}
    result.peak=Math.max(result.peak,result.net);result.drawdown=Math.max(result.drawdown,result.peak-result.net);
   }
   history.push(outcome);
   if(columnWins>=1){result.twoWinShoes++;break}
  }
  if(j%5===4){$('cc-status').textContent='Testing shoe '+(j+1)+' / '+shoes.length+'…';await new Promise(resolve=>setTimeout(resolve,0))}
 }
 return result;
}
$('cc-run').onclick=async()=>{
 if(!dataset)return;$('cc-run').disabled=true;const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value));$('cc-status').textContent='Running 4-row mismatch progression…';
 await new Promise(resolve=>setTimeout(resolve,30));
 try{
  const s=await run(shoes),rate=s.wins+s.losses?(100*s.wins/(s.wins+s.losses)).toFixed(1)+'%':'—';
  const values=[['Bets',s.bets],['Wins / Losses',s.wins+' / '+s.losses],['Win rate',rate],['Net units',(s.net>=0?'+':'')+s.net.toFixed(2)],['Largest stake',s.stakeMax+' units'],['Max drawdown',s.drawdown.toFixed(2)+' units'],['Longest losing streak',s.maxLossRun],['4-loss column stops',s.exhausted],['Stake-limit stops',s.capStops],['Shoes stopped after first win',s.twoWinShoes],['Win stops',s.completed],['Tie pushes',s.pushes]];
  $('cc-stats').replaceChildren();for(const [name,value] of values){const d=document.createElement('div');d.style.cssText='background:#0d1a2c;border-radius:10px;padding:10px';const a=document.createElement('strong');a.style.cssText='display:block;font-size:20px';a.textContent=value;const b=document.createElement('span');b.style.cssText='color:#a8b9d2;font-size:12px';b.textContent=name;d.append(a,b);$('cc-stats').append(d)}
  $('cc-status').textContent='Completed '+shoes.length+' simulated shoes. Betting decisions used only earlier hands. Ties excluded from win rate.';
 }catch(e){$('cc-status').textContent='Error: '+e.message}
 finally{$('cc-run').disabled=false}
};
})();