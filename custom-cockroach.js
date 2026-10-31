(function(){
'use strict';
const host=document.getElementById('bet-backtest');if(!host)return;
const panel=document.createElement('section');panel.className='panel';panel.id='custom-cockroach';
panel.innerHTML='<h2>🐛 Custom Cockroach: Match / Mismatch</h2><p class="muted">Compare the next Cockroach mark with the same row in the previous selected-width column. Ties repeat the exact side and stake. Progression carries across columns, resets after a win, and stops at the selected stake limit.</p><div class="actions"><label>Shoes <select id="cc-count"><option value="25">25</option><option value="100" selected>100</option><option value="500">500</option><option value="1000">1,000</option></select></label><label>Strategy <select id="cc-strategy"><option value="mismatch">Mismatch</option><option value="match">Match</option></select></label><label>Rows per column <select id="cc-rows"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label><label>Progression <select id="cc-mode"><option value="doubleplus" selected>Double + 1</option><option value="flat">Flat</option><option value="add">Add fixed units</option><option value="double">Double</option><option value="triple">Triple</option><option value="fibonacci">Fibonacci</option><option value="custom">Custom multiplier + units</option></select></label><label>Starting stake <input id="cc-start" type="number" min="1" max="10000" step="1" value="1" style="width:90px"></label><label>Extra units <input id="cc-add" type="number" min="0" max="10000" step="1" value="2" style="width:90px"></label><label>Multiplier <input id="cc-mult" type="number" min="1" max="10" step="0.1" value="2" style="width:90px"></label><label>Max stake <select id="cc-cap"><option value="16">16 units</option><option value="64" selected>64 units</option><option value="256">256 units</option><option value="1024">1,024 units</option><option value="10000">10,000 units</option></select></label><label>Winning columns to end shoe <select id="cc-wins"><option value="1" selected>1</option><option value="2">2</option><option value="3">3</option><option value="whole">Whole shoe</option></select></label><button id="cc-run" class="player" disabled>Test my strategy</button></div><p id="cc-preview" class="muted"></p><p id="cc-status" class="muted">Upload the simulation file above to enable testing.</p><div id="cc-stats" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><p class="muted" style="font-size:12px">The next bet is based only on earlier hands. A tie repeats the exact same bet. The stake cap stops betting for that column and resets the progression for the next column. These are simulated results, not a prediction of future outcomes.</p>';
host.insertAdjacentElement('afterend',panel);
const $=id=>document.getElementById(id);let dataset=null;
window.addEventListener('baccarat-simulation-file',e=>{dataset=e.detail.rows;$('cc-run').disabled=false;$('cc-status').textContent=dataset.size.toLocaleString()+' shoes available.'});
const road=window.BaccaratRoads;
function nextSignal(history,config){
 const before=road.derived(road.buildBig(history),3),n=before.length,row=n%config.rows,col=Math.floor(n/config.rows);
 if(col===0)return null;
 const prior=before[(col-1)*config.rows+row];if(!prior)return null;
 const options=['B','P'].filter(side=>{
  const after=road.derived(road.buildBig([...history,side]),3);
  return after.length===n+1&&(config.strategy==='match'?after[n].v===prior.v:after[n].v!==prior.v);
 });
 return {col,row,bet:options.length===1?options[0]:null};
}
function settings(){return {strategy:$('cc-strategy').value,rows:Number($('cc-rows').value),mode:$('cc-mode').value,start:Math.max(1,Number($('cc-start').value)||1),add:Math.max(0,Number($('cc-add').value)||0),mult:Math.max(1,Number($('cc-mult').value)||1),cap:Number($('cc-cap').value),wins:$('cc-wins').value==='whole'?Infinity:Number($('cc-wins').value)}}
function nextStake(current,previous,config){switch(config.mode){case 'flat':return config.start;case 'add':return current+config.add;case 'double':return current*2;case 'doubleplus':return current*2+1;case 'triple':return current*3;case 'fibonacci':return current+previous;default:return current*config.mult+config.add}}
function preview(){const c=settings();let current=c.start,previous=0,seq=[];for(let i=0;i<6;i++){seq.push(Number(current.toFixed(2)));const next=nextStake(current,previous,c);previous=current;current=next} $('cc-preview').textContent='Stake sequence: '+seq.join(' → ')+' units'}
for(const id of ['cc-strategy','cc-rows','cc-mode','cc-start','cc-add','cc-mult','cc-cap','cc-wins'])$(id).addEventListener('change',preview);preview();
async function run(shoes){
 const config=settings();const result={bets:0,wins:0,losses:0,pushes:0,net:0,peak:0,drawdown:0,stakeMax:0,maxLossRun:0,lossRun:0,completed:0,exhausted:0,capStops:0,twoWinShoes:0,profitableShoes:0,losingShoes:0,evenShoes:0,totalColumns:0,playedColumns:0,winningColumns:0,losingColumns:0,shoesWithHit:0,shoesWithoutHit:0,winningShoeProfit:0,losingShoeLoss:0,biggestWinningShoe:null,biggestLosingShoe:null};
 for(let j=0;j<shoes.length;j++){
  const shoeStartNet=result.net;
  const shoePlayed=new Set(),shoeWon=new Set();
  result.totalColumns+=Math.ceil(road.derived(road.buildBig(shoes[j]),3).length/config.rows);
  const history=[];let column=-1,lossesInColumn=0,stopped=false,stake=config.start,previousStake=0,columnWins=0,pendingTieBet=null,pendingTieColumn=null;const cap=config.cap;
  for(const outcome of shoes[j]){
   const signal=nextSignal(history,config);
   if(!pendingTieBet&&signal&&signal.col!==column){column=signal.col;lossesInColumn=0;stopped=false}
   const bet=pendingTieBet||(signal&&!stopped?signal.bet:null);
   if(bet){
    const betColumn=pendingTieBet?pendingTieColumn:signal.col;
    if(stake>cap){stopped=true;stake=config.start;previousStake=0;pendingTieBet=null;pendingTieColumn=null;result.capStops++;history.push(outcome);continue}shoePlayed.add(betColumn);result.stakeMax=Math.max(result.stakeMax,stake);result.bets++;
    if(outcome==='T'){result.pushes++;pendingTieBet=bet;pendingTieColumn=betColumn;}
    else if(outcome===bet){pendingTieBet=null;pendingTieColumn=null;shoeWon.add(betColumn);result.wins++;result.net+=stake*(bet==='B'?.95:1);result.lossRun=0;stake=config.start;previousStake=0;stopped=true;columnWins++;result.completed++}
    else{pendingTieBet=null;pendingTieColumn=null;result.losses++;result.net-=stake;const next=nextStake(stake,previousStake,config);previousStake=stake;stake=next;lossesInColumn++;result.lossRun++;result.maxLossRun=Math.max(result.maxLossRun,result.lossRun);if(lossesInColumn>=4){stopped=true;result.exhausted++}}
    result.peak=Math.max(result.peak,result.net);result.drawdown=Math.max(result.drawdown,result.peak-result.net);
   }
   history.push(outcome);
   if(columnWins>=config.wins){result.twoWinShoes++;break}
  }
  if(shoeWon.size>0)result.shoesWithHit++;else result.shoesWithoutHit++;
  result.playedColumns+=shoePlayed.size;
  result.winningColumns+=shoeWon.size;
  result.losingColumns+=shoePlayed.size-shoeWon.size;
  const shoeNet=result.net-shoeStartNet;
  if(shoeNet>0.0000001){result.profitableShoes++;result.winningShoeProfit+=shoeNet;result.biggestWinningShoe=Math.max(result.biggestWinningShoe===null?-Infinity:result.biggestWinningShoe,shoeNet)}else if(shoeNet< -0.0000001){result.losingShoes++;result.losingShoeLoss+=shoeNet;result.biggestLosingShoe=Math.min(result.biggestLosingShoe===null?Infinity:result.biggestLosingShoe,shoeNet)}else result.evenShoes++;
  if(j%5===4){$('cc-status').textContent='Testing shoe '+(j+1)+' / '+shoes.length+'…';await new Promise(resolve=>setTimeout(resolve,0))}
 }
 return result;
}
$('cc-run').onclick=async()=>{
 if(!dataset)return;$('cc-run').disabled=true;const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value));$('cc-status').textContent='Running selected progression…';
 await new Promise(resolve=>setTimeout(resolve,30));
 try{
  const s=await run(shoes),rate=s.wins+s.losses?(100*s.wins/(s.wins+s.losses)).toFixed(1)+'%':'—';
  const values=[['Bets',s.bets],['Wins / Losses',s.wins+' / '+s.losses],['Bet win rate',rate],['Shoe hit rate',shoes.length?(100*s.shoesWithHit/shoes.length).toFixed(1)+'%':'—'],['Shoes with / without a column hit',s.shoesWithHit+' / '+s.shoesWithoutHit],['Played-column win rate',s.playedColumns?(100*s.winningColumns/s.playedColumns).toFixed(1)+'%':'—'],['Total-column hit rate',s.totalColumns?(100*s.winningColumns/s.totalColumns).toFixed(1)+'%':'—'],['Winning / Losing played columns',s.winningColumns+' / '+s.losingColumns],['Played / Total columns',s.playedColumns+' / '+s.totalColumns],['Profitable shoe rate',shoes.length?(100*s.profitableShoes/shoes.length).toFixed(1)+'%':'—'],['Winning / Losing / Even shoes',s.profitableShoes+' / '+s.losingShoes+' / '+s.evenShoes],['Average winning shoe',s.profitableShoes?'+'+(s.winningShoeProfit/s.profitableShoes).toFixed(2)+' units':'—'],['Average losing shoe',s.losingShoes?(s.losingShoeLoss/s.losingShoes).toFixed(2)+' units':'—'],['Biggest winning shoe',s.biggestWinningShoe===null?'—':'+'+s.biggestWinningShoe.toFixed(2)+' units'],['Biggest losing shoe',s.biggestLosingShoe===null?'—':s.biggestLosingShoe.toFixed(2)+' units'],['Net units',(s.net>=0?'+':'')+s.net.toFixed(2)],['Largest stake',s.stakeMax+' units'],['Max drawdown',s.drawdown.toFixed(2)+' units'],['Longest losing streak',s.maxLossRun],['4-loss column stops',s.exhausted],['Stake-limit stops',s.capStops],['Shoes reaching win target',s.twoWinShoes],['Win stops',s.completed],['Tie pushes',s.pushes]];
  $('cc-stats').replaceChildren();for(const [name,value] of values){const d=document.createElement('div');d.style.cssText='background:#0d1a2c;border-radius:10px;padding:10px';const a=document.createElement('strong');a.style.cssText='display:block;font-size:20px';a.textContent=value;const b=document.createElement('span');b.style.cssText='color:#a8b9d2;font-size:12px';b.textContent=name;d.append(a,b);$('cc-stats').append(d)}
  $('cc-status').textContent='Completed '+shoes.length+' simulated shoes. Betting decisions used only earlier hands. Ties excluded from bet win rate. Total columns include the entire original shoe, even if the selected stop rule ends betting early.';
 }catch(e){$('cc-status').textContent='Error: '+e.message}
 finally{$('cc-run').disabled=false}
};
})();