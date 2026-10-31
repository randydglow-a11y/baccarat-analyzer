(function(){
'use strict';
const host=document.getElementById('bet-backtest');if(!host)return;
const panel=document.createElement('section');panel.className='panel';panel.id='custom-cockroach';
panel.innerHTML='<h2>🐛 Custom Cockroach: Match / Mismatch</h2><p class="muted">Compare the next Cockroach mark with the same row in the previous selected-width column. Ties repeat the exact side and stake. Progression continues after losses until a winning bet, then resets to the starting stake. The selected maximum stake still limits exposure.</p><div class="actions"><label>Shoes <select id="cc-count"><option value="25">25</option><option value="100" selected>100</option><option value="500">500</option><option value="1000">1,000</option><option value="5000">5,000</option><option value="10000">10,000</option></select></label><label>Strategy <select id="cc-strategy"><option value="mismatch">Mismatch</option><option value="match">Match</option></select></label><label>Rows per column <select id="cc-rows"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label><label>Progression <select id="cc-mode"><option value="doubleplus" selected>Double + 1</option><option value="preset_safe">Conservative (1,1,2,2,3,3)</option><option value="preset_fib">Fibonacci-style (1,2,3,5,8,13)</option><option value="preset_double">Doubling preset (1,2,4,8,16,32)</option><option value="flat">Flat</option><option value="add">Add fixed units</option><option value="double">Double</option><option value="triple">Triple</option><option value="fibonacci">Fibonacci</option><option value="custom">Custom multiplier + units</option></select></label><label>Starting stake <input id="cc-start" type="number" min="1" max="10000" step="1" value="1" style="width:90px"></label><label>Extra units <input id="cc-add" type="number" min="0" max="10000" step="1" value="2" style="width:90px"></label><label>Multiplier <input id="cc-mult" type="number" min="1" max="10" step="0.1" value="2" style="width:90px"></label><label>Max stake <select id="cc-cap"><option value="16">16 units</option><option value="64" selected>64 units</option><option value="256">256 units</option><option value="1024">1,024 units</option><option value="10000">10,000 units</option></select></label><label>Winning columns to end shoe <select id="cc-wins"><option value="1" selected>1</option><option value="2">2</option><option value="3">3</option><option value="whole">Whole shoe</option></select></label><button id="cc-run" class="player" disabled>Test my strategy</button></div><p id="cc-preview" class="muted"></p><p id="cc-status" class="muted">Upload the simulation file above to enable testing.</p><div id="cc-stats" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><p class="muted" style="font-size:12px">The next bet is based only on earlier hands. A tie repeats the exact same bet. The stake cap stops betting for that column and resets the progression for the next column. Profit factor compares gross winning-shoe profit with gross losing-shoe losses. Recovery and break-even figures use average profitable and losing shoes; even shoes are excluded from the break-even calculation. These are simulated results, not a prediction of future outcomes.</p>';
host.insertAdjacentElement('afterend',panel);
const audit=document.createElement('section');audit.className='panel';audit.id='cc-audit';audit.innerHTML='<h2>🔎 Shoe-by-shoe profit audit</h2><p class="muted">Select a shoe to inspect each actual wager, stake, outcome, and running profit. Tie pushes repeat the same stake. Results reflect the simulator rules.</p><div class="actions"><label>Shoe <select id="cc-audit-select" style="max-width:200px;padding:10px;background:#0d1a2c;color:white"></select></label><button type="button" id="cc-audit-export" class="secondary" disabled>Export all bets CSV</button></div><p id="cc-audit-summary" class="muted">Run a test to view the breakdown.</p><div style="overflow-x:auto;max-height:440px;overflow-y:auto"><table style="width:100%;white-space:nowrap;text-align:left"><thead><tr><th>Hand</th><th>Column</th><th>Bet</th><th>Stake</th><th>Result</th><th>Units</th><th>Shoe net</th></tr></thead><tbody id="cc-audit-body"></tbody></table></div>';
panel.insertAdjacentElement('afterend',audit);
panel.insertAdjacentHTML('beforeend','<div style="margin-top:18px;border-top:1px solid #405573;padding-top:15px"><h3>⚖️ Compare Flat vs Double + 1</h3><p class="muted">Run both progressions on the exact same loaded shoes, with identical strategy, row, stake cap and stopping rules. This comparison does not change your selected progression.</p><button id="cc-compare" class="secondary" type="button">Compare both progressions</button><p id="cc-compare-status" class="muted"></p><div id="cc-compare-results" style="overflow-x:auto"></div></div>');
let auditShoes=[];
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
function nextStake(current,previous,config){const presets={preset_safe:[1,1,2,2,3,3],preset_fib:[1,2,3,5,8,13],preset_double:[1,2,4,8,16,32]};if(presets[config.mode]){const sequence=presets[config.mode];const index=Math.max(0,Math.min(sequence.length-1,Number(config.presetStep)||0));config.presetStep=index+1;return sequence[Math.min(index+1,sequence.length-1)]}switch(config.mode){case 'flat':return config.start;case 'add':return current+config.add;case 'double':return current*2;case 'doubleplus':return current*2+1;case 'triple':return current*3;case 'fibonacci':return current+previous;default:return current*config.mult+config.add}}
function preview(){const c=settings();c.presetStep=0;let current=c.mode.startsWith('preset_')?1:c.start,previous=0,seq=[];for(let i=0;i<6;i++){seq.push(Number(current.toFixed(2)));const next=nextStake(current,previous,c);previous=current;current=next} $('cc-preview').textContent='Stake sequence: '+seq.join(' → ')+' units'}
for(const id of ['cc-strategy','cc-rows','cc-mode','cc-start','cc-add','cc-mult','cc-cap','cc-wins'])$(id).addEventListener('change',preview);preview();
async function run(shoes,modeOverride=null,quiet=false,configOverrides=null){
 const config={...settings(),...(configOverrides||{})};if(modeOverride)config.mode=modeOverride;config.presetStep=0;const result={bets:0,wins:0,losses:0,pushes:0,net:0,peak:0,drawdown:0,stakeMax:0,maxLossRun:0,lossRun:0,completed:0,exhausted:0,capStops:0,twoWinShoes:0,profitableShoes:0,losingShoes:0,evenShoes:0,totalColumns:0,playedColumns:0,winningColumns:0,losingColumns:0,shoesWithHit:0,shoesWithoutHit:0,winningShoeProfit:0,losingShoeLoss:0,biggestWinningShoe:null,biggestLosingShoe:null,shoeAudits:[]};
 for(let j=0;j<shoes.length;j++){
  const shoeStartNet=result.net;
  const shoePlayed=new Set(),shoeWon=new Set(),betsAudit=[];let shoeRunning=0,handNumber=0;
  result.totalColumns+=Math.ceil(road.derived(road.buildBig(shoes[j]),3).length/config.rows);
  const history=[];let column=-1,lossesInColumn=0,stopped=false,stake=config.mode.startsWith('preset_')?1:config.start,previousStake=0,columnWins=0,pendingTieBet=null,pendingTieColumn=null;const cap=config.cap;
  for(const outcome of shoes[j]){handNumber++;
   const signal=nextSignal(history,config);
   if(!pendingTieBet&&signal&&signal.col!==column){column=signal.col;lossesInColumn=0;stopped=false}
   const bet=pendingTieBet||(signal&&!stopped?signal.bet:null);
   if(bet){
    const betColumn=pendingTieBet?pendingTieColumn:signal.col;
    if(stake>cap){stopped=true;stake=config.mode.startsWith('preset_')?1:config.start;previousStake=0;config.presetStep=0;pendingTieBet=null;pendingTieColumn=null;result.capStops++;history.push(outcome);continue}shoePlayed.add(betColumn);result.stakeMax=Math.max(result.stakeMax,stake);result.bets++;
    if(outcome==='T'){result.pushes++;pendingTieBet=bet;pendingTieColumn=betColumn;betsAudit.push({hand:handNumber,column:betColumn+1,bet,stake,outcome,delta:0,net:shoeRunning});}
    else if(outcome===bet){pendingTieBet=null;pendingTieColumn=null;shoeWon.add(betColumn);result.wins++;result.net+=stake*(bet==='B'?.95:1);shoeRunning+=stake*(bet==='B'?.95:1);betsAudit.push({hand:handNumber,column:betColumn+1,bet,stake,outcome,delta:stake*(bet==='B'?.95:1),net:shoeRunning});result.lossRun=0;stake=config.mode.startsWith('preset_')?1:config.start;previousStake=0;config.presetStep=0;stopped=true;columnWins++;result.completed++}
    else{pendingTieBet=null;pendingTieColumn=null;result.losses++;result.net-=stake;shoeRunning-=stake;betsAudit.push({hand:handNumber,column:betColumn+1,bet,stake,outcome,delta:-stake,net:shoeRunning});const next=nextStake(stake,previousStake,config);previousStake=stake;stake=next;lossesInColumn++;result.lossRun++;result.maxLossRun=Math.max(result.maxLossRun,result.lossRun);/* Continue after losses until a winning bet or the selected stake cap. */}
    result.peak=Math.max(result.peak,result.net);result.drawdown=Math.max(result.drawdown,result.peak-result.net);
   }
   history.push(outcome);
   if(columnWins>=config.wins){result.twoWinShoes++;break}
  }
  if(shoeWon.size>0)result.shoesWithHit++;else result.shoesWithoutHit++;
  result.playedColumns+=shoePlayed.size;
  result.winningColumns+=shoeWon.size;
  result.losingColumns+=shoePlayed.size-shoeWon.size;
  const shoeNet=result.net-shoeStartNet;if(!quiet)result.shoeAudits.push({number:j+1,net:shoeNet,bets:betsAudit,columns:shoePlayed.size,wins:shoeWon.size,handCount:handNumber});
  if(shoeNet>0.0000001){result.profitableShoes++;result.winningShoeProfit+=shoeNet;result.biggestWinningShoe=Math.max(result.biggestWinningShoe===null?-Infinity:result.biggestWinningShoe,shoeNet)}else if(shoeNet< -0.0000001){result.losingShoes++;result.losingShoeLoss+=shoeNet;result.biggestLosingShoe=Math.min(result.biggestLosingShoe===null?Infinity:result.biggestLosingShoe,shoeNet)}else result.evenShoes++;
  if(j%5===4){if(!quiet)$('cc-status').textContent='Testing shoe '+(j+1)+' / '+shoes.length+'…';await new Promise(resolve=>setTimeout(resolve,0))}
 }
 return result;
}

const validation=document.createElement('section');validation.className='panel';validation.id='cc-validation';
validation.innerHTML='<h2>🧪 Independent strategy validation</h2><p class="muted">Replays full shoe histories without looking ahead. Independently checks recorded bet side, timing, column, stakes, ties, Banker commission, and totals. This checks internal consistency, not whether the strategy beats the house edge.</p><button id="cc-validate-run" class="secondary" type="button">Validate loaded shoes</button><p id="cc-validate-status" class="muted">Generate or upload shoes first.</p><div id="cc-validate-results" style="overflow-wrap:anywhere"></div>';
audit.insertAdjacentElement('afterend',validation);
$('cc-validate-run').onclick=async()=>{
 const button=$('cc-validate-run'),status=$('cc-validate-status'),output=$('cc-validate-results');
 if(!dataset){status.textContent='Generate or upload complete shoes first.';return}
 button.disabled=true;output.replaceChildren();status.textContent='Independently replaying full shoe histories…';
 await new Promise(resolve=>setTimeout(resolve,20));
 try{
 const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value)),c=settings(),sim=await run(shoes,null,false);
 let checked=0,errors=0,unambiguous=0,ambiguous=0,noSignal=0,firstErrors=[],net=0;
 const report=(message)=>{errors++;if(firstErrors.length<12)firstErrors.push(message)};
 for(let j=0;j<shoes.length;j++){
  const original=shoes[j],auditRow=sim.shoeAudits[j],history=[],bets=auditRow.bets;
  let cursor=0,shoeNet=0,previousBet=null,previousColumn=null,previousStake=null;
  for(let h=0;h<auditRow.handCount;h++){
   const actual=original[h],before=road.derived(road.buildBig(history),3),n=before.length;
   const row=n%c.rows,col=Math.floor(n/c.rows),prior=col>0?before[(col-1)*c.rows+row]:null;
   const valid=[];
   if(prior)for(const side of ['B','P']){
    const after=road.derived(road.buildBig(history.concat(side)),3);
    if(after.length===n+1&&(c.strategy==='match'?after[n].v===prior.v:after[n].v!==prior.v))valid.push(side);
   }
   if(prior){if(valid.length===1)unambiguous++;else if(valid.length===2)ambiguous++;else noSignal++}
   const bet=bets[cursor];
   if(bet&&bet.hand===h+1){
    checked++;cursor++;
    if(!['B','P','T'].includes(actual))report('Shoe '+(j+1)+' hand '+(h+1)+': invalid outcome');
    if(bet.outcome!==actual)report('Shoe '+(j+1)+' hand '+(h+1)+': recorded outcome mismatch');
    if(previousBet!==null){
     if(bet.bet!==previousBet||bet.stake!==previousStake||bet.column!==previousColumn)report('Shoe '+(j+1)+' hand '+(h+1)+': tie repeat mismatch');
    }else if(valid.length!==1||bet.bet!==valid[0]||bet.column!==col+1){
     report('Shoe '+(j+1)+' hand '+(h+1)+': prediction/column not supported by prior history');
    }
    const expected=actual==='T'?0:actual===bet.bet?bet.stake*(bet.bet==='B'?0.95:1):-bet.stake;
    shoeNet+=expected;
    if(Math.abs(bet.delta-expected)>0.00001||Math.abs(bet.net-shoeNet)>0.00001)report('Shoe '+(j+1)+' hand '+(h+1)+': payout or running total mismatch');
    if(bet.stake>c.cap)report('Shoe '+(j+1)+' hand '+(h+1)+': stake above cap');
    if(actual==='T'){previousBet=bet.bet;previousStake=bet.stake;previousColumn=bet.column}
    else{previousBet=null;previousStake=null;previousColumn=null}
   }else if(previousBet!==null){report('Shoe '+(j+1)+' hand '+(h+1)+': missing repeated wager after tie')}
   history.push(actual);
  }
  if(cursor!==bets.length)report('Shoe '+(j+1)+': wager outside processed hand range');
  if(Math.abs(shoeNet-auditRow.net)>0.00001)report('Shoe '+(j+1)+': shoe profit mismatch');
  net+=shoeNet;
  if(j%100===99){status.textContent='Validated '+(j+1)+' / '+shoes.length+' shoes…';await new Promise(resolve=>setTimeout(resolve,0))}
 }
 if(Math.abs(net-sim.net)>0.0001)report('Overall profit mismatch');
 status.textContent=errors?'Found '+errors+' validation issue(s).':'Validation passed: no inconsistencies detected in recorded wagers.';
 const summary=document.createElement('p');summary.className='muted';summary.textContent=shoes.length+' full shoes · '+checked+' recorded bets checked · '+unambiguous+' unique pre-hand signals · '+ambiguous+' ambiguous signals · '+noSignal+' unavailable signals · independently summed net '+net.toFixed(2)+' units.';
 output.append(summary);
 if(firstErrors.length){const list=document.createElement('ol');firstErrors.forEach(msg=>{const li=document.createElement('li');li.textContent=msg;list.append(li)});output.append(list)}
 const note=document.createElement('p');note.className='muted';note.textContent='Important: this validator checks signals against the same road-building implementation as the simulator. It does not independently establish that the Cockroach Road rules are correct, that the original shoes are unbiased, or that the strategy has positive expected value.';output.append(note);
 }catch(e){status.textContent='Validation error: '+e.message}
 finally{button.disabled=false}
};

const optimizer=document.createElement('section');optimizer.className='panel';optimizer.id='cc-optimizer';
optimizer.innerHTML='<h2>📊 Strategy Optimizer</h2><p class="muted">Compare betting progressions on identical training shoes, then evaluate the best candidates on separate holdout shoes. Keeps your selected Match/Mismatch strategy and row count. Uses one winning column per shoe. Training results are not evidence of a guaranteed advantage.</p><div class="actions"><label>Training shoes <select id="cc-opt-train"><option value="250">250</option><option value="500" selected>500</option><option value="1000">1,000</option><option value="2000">2,000</option></select></label><label>Holdout shoes <select id="cc-opt-test"><option value="250">250</option><option value="500" selected>500</option><option value="1000">1,000</option><option value="2000">2,000</option></select></label><button type="button" class="player" id="cc-opt-run">Compare setups</button></div><p class="muted" id="cc-opt-status">Generate or upload shoes to start. Requires enough shoes for both groups.</p><div id="cc-opt-results" style="overflow-x:auto"></div>';
validation.insertAdjacentElement('afterend',optimizer);
$('cc-opt-run').onclick=async()=>{
 const button=$('cc-opt-run'),status=$('cc-opt-status'),output=$('cc-opt-results');
 if(!dataset){status.textContent='Generate or upload shoes first.';return}
 const trainCount=Number($('cc-opt-train').value),testCount=Number($('cc-opt-test').value);
 const all=Array.from(dataset.values());
 if(all.length<trainCount+testCount){status.textContent='Need at least '+(trainCount+testCount)+' loaded shoes; currently '+all.length+'.';return}
 const train=all.slice(0,trainCount),test=all.slice(trainCount,trainCount+testCount);
 const candidates=[
  ['Double + 1 · 5 / 16','doubleplus',5,16],
  ['Double + 1 · 1 / 16','doubleplus',1,16],
  ['Double + 1 · 2 / 16','doubleplus',2,16],
  ['Double + 1 · 1 / 64','doubleplus',1,64],
  ['Double + 1 · 2 / 64','doubleplus',2,64],
  ['Double + 1 · 5 / 64','doubleplus',5,64],
  ['Flat · 1 / 16','flat',1,16],
  ['Flat · 5 / 16','flat',5,16],
  ['Conservative · 1 / 16','preset_safe',1,16],
  ['Fibonacci-style · 1 / 16','preset_fib',1,16],
  ['Doubling · 1 / 16','preset_double',1,16],
  ['Fibonacci-style · 1 / 64','preset_fib',1,64]
 ];
 button.disabled=true;output.replaceChildren();
 try{
  const trained=[];
  for(let i=0;i<candidates.length;i++){
   const [name,mode,start,cap]=candidates[i];
   status.textContent='Training setup '+(i+1)+' of '+candidates.length+': '+name;
   const result=await run(train,null,true,{mode,start,cap,wins:1});
   trained.push({name,mode,start,cap,train:result});
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  trained.sort((a,b)=>b.train.net-a.train.net);
  const finalists=trained.slice(0,5);
  for(let i=0;i<finalists.length;i++){
   const item=finalists[i];status.textContent='Holdout testing '+(i+1)+' of '+finalists.length+': '+item.name;
   item.test=await run(test,null,true,{mode:item.mode,start:item.start,cap:item.cap,wins:1});
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  const heading=document.createElement('p');heading.className='muted';
  heading.textContent='Ranked by TRAINING net profit only. Holdout shoes were not used to choose the top five. All setups use the same shoes in each group.';
  output.append(heading);
  const table=document.createElement('table');table.style.cssText='width:100%;min-width:610px;text-align:left;font-size:12px';
  const rows=[['Rank / setup','Training net','Training worst shoe','Holdout net','Holdout worst shoe','Holdout profitable shoes']];
  trained.forEach((x,i)=>rows.push([
   (i+1)+'. '+x.name,
   x.train.net.toFixed(2),
   x.train.biggestLosingShoe===null?'—':x.train.biggestLosingShoe.toFixed(2),
   x.test?x.test.net.toFixed(2):'Not tested',
   x.test?(x.test.biggestLosingShoe===null?'—':x.test.biggestLosingShoe.toFixed(2)):'—',
   x.test?(100*x.test.profitableShoes/testCount).toFixed(1)+'%':'—'
  ]));
  rows.forEach((row,i)=>{const tr=document.createElement('tr');row.forEach(value=>{const cell=document.createElement(i?'td':'th');cell.textContent=value;cell.style.cssText='padding:8px 6px;border-bottom:1px solid #405573;white-space:nowrap';tr.append(cell)});table.append(tr)});
  output.append(table);
  const foot=document.createElement('p');foot.className='muted';foot.textContent='Training: first '+trainCount+' shoes. Holdout: next '+testCount+' shoes. No shoe appears in both. Net results include 5% Banker commission. Worst shoe is the most negative individual shoe; inspect drawdown separately. Positive results may reflect randomness or simulator defects, not a proven edge.';output.append(foot);
  status.textContent='Finished '+candidates.length+' training comparisons and '+finalists.length+' independent holdout comparisons.';
 }catch(e){status.textContent='Optimizer error: '+e.message}
 finally{button.disabled=false}
};
$('cc-compare').onclick=async()=>{if(!dataset){$('cc-compare-status').textContent='Generate or upload shoes first.';return}const button=$('cc-compare');button.disabled=true;const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value));const status=$('cc-compare-status');$('cc-compare-results').replaceChildren();try{status.textContent='Testing Flat on '+shoes.length.toLocaleString()+' shoes…';await new Promise(r=>setTimeout(r,20));const flat=await run(shoes,'flat',true);status.textContent='Testing Double + 1 on the same shoes…';await new Promise(r=>setTimeout(r,20));const doubled=await run(shoes,'doubleplus',true);const table=document.createElement('table');table.style.cssText='width:100%;min-width:310px;text-align:left';const entries=[['Metric','Flat','Double + 1'],['Profitable shoes',(100*flat.profitableShoes/shoes.length).toFixed(1)+'%',(100*doubled.profitableShoes/shoes.length).toFixed(1)+'%'],['Net units',flat.net.toFixed(2),doubled.net.toFixed(2)],['Average units/shoe',(flat.net/shoes.length).toFixed(2),(doubled.net/shoes.length).toFixed(2)],['Losing shoes',flat.losingShoes,doubled.losingShoes],['Worst shoe',flat.biggestLosingShoe===null?'—':flat.biggestLosingShoe.toFixed(2),doubled.biggestLosingShoe===null?'—':doubled.biggestLosingShoe.toFixed(2)],['Break-even profitable shoes',flat.profitableShoes&&flat.losingShoes?(100*(Math.abs(flat.losingShoeLoss/flat.losingShoes))/(flat.winningShoeProfit/flat.profitableShoes+Math.abs(flat.losingShoeLoss/flat.losingShoes))).toFixed(2)+'%':'—',doubled.profitableShoes&&doubled.losingShoes?(100*(Math.abs(doubled.losingShoeLoss/doubled.losingShoes))/(doubled.winningShoeProfit/doubled.profitableShoes+Math.abs(doubled.losingShoeLoss/doubled.losingShoes))).toFixed(2)+'%':'—']];for(const [i,row] of entries.entries()){const tr=document.createElement('tr');for(const value of row){const cell=document.createElement(i?'td':'th');cell.textContent=value;cell.style.cssText='padding:9px 5px;border-bottom:1px solid #405573;font-size:13px';tr.appendChild(cell)}table.appendChild(tr)}$('cc-compare-results').appendChild(table);status.textContent='Compared '+shoes.length.toLocaleString()+' identical shoes. Positive net units indicate simulated profit; neither result predicts future profitability.'}catch(e){status.textContent='Comparison error: '+e.message}finally{button.disabled=false}};
$('cc-run').onclick=async()=>{
 if(!dataset)return;$('cc-run').disabled=true;const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value));$('cc-status').textContent='Running selected progression…';
 await new Promise(resolve=>setTimeout(resolve,30));
 try{
  const s=await run(shoes);auditShoes=s.shoeAudits;const select=$('cc-audit-select');select.replaceChildren();auditShoes.forEach(a=>{const opt=document.createElement('option');opt.value=String(a.number-1);opt.textContent='Shoe #'+a.number+' ('+(a.net>=0?'+':'')+a.net.toFixed(2)+')';select.appendChild(opt)});renderAudit();$('cc-audit-export').disabled=!auditShoes.length;const rate=s.wins+s.losses?(100*s.wins/(s.wins+s.losses)).toFixed(1)+'%':'—';
  const pct=shoes.length?(100*s.profitableShoes/shoes.length).toFixed(1)+'%':'—';
  const values=[['Strategy Profitability %',pct],['Profitable / Losing / Even shoes',s.profitableShoes+' / '+s.losingShoes+' / '+s.evenShoes],['Total net profit',(s.net>=0?'+':'')+s.net.toFixed(2)+' units'],['Average profit per shoe',(s.net/shoes.length>=0?'+':'')+(s.net/shoes.length).toFixed(2)+' units'],['Biggest winning shoe',s.biggestWinningShoe===null?'—':'+'+s.biggestWinningShoe.toFixed(2)+' units'],['Biggest losing shoe',s.biggestLosingShoe===null?'—':s.biggestLosingShoe.toFixed(2)+' units'],['Winning shoes needed to recover one losing shoe',s.profitableShoes&&s.losingShoes?(Math.abs(s.losingShoeLoss/s.losingShoes)/(s.winningShoeProfit/s.profitableShoes)).toFixed(2):'—']];
  $('cc-stats').replaceChildren();for(const [name,value] of values){const d=document.createElement('div');d.style.cssText='background:#0d1a2c;border-radius:10px;padding:10px';if(name==='Strategy Profitability %'){d.style.cssText+='grid-column:1/-1;text-align:center;border:2px solid #36bf99;padding:22px 12px'}const a=document.createElement('strong');a.style.cssText='display:block;font-size:'+(name==='Strategy Profitability %'?'44px':'20px')+';color:'+(name==='Strategy Profitability %'?'#36bf99':'#f4f7ff');a.textContent=value;const b=document.createElement('span');b.style.cssText='color:#a8b9d2;font-size:12px';b.textContent=name;d.append(a,b);$('cc-stats').append(d)}
  $('cc-status').textContent='Profitability % means the share of tested shoes finishing with positive net units, not the predicted chance of future profit. Completed '+shoes.length+' simulated shoes. Betting decisions used only earlier hands. Ties excluded from bet win rate. Total columns include the entire original shoe, even if the selected stop rule ends betting early.';
 }catch(e){$('cc-status').textContent='Error: '+e.message}
 finally{$('cc-run').disabled=false}
};
function renderAudit(){const a=auditShoes[Number($('cc-audit-select').value)];$('cc-audit-body').replaceChildren();if(!a){$('cc-audit-summary').textContent='Run a test to view the breakdown.';return}const wins=a.bets.filter(b=>b.delta>0).length,losses=a.bets.filter(b=>b.delta<0).length,ties=a.bets.filter(b=>b.outcome==='T').length;$('cc-audit-summary').textContent='Shoe #'+a.number+' · '+a.handCount+' hands processed · '+a.columns+' columns played · '+a.wins+' winning columns · '+wins+' wins / '+losses+' losses / '+ties+' ties · Net '+(a.net>=0?'+':'')+a.net.toFixed(2)+' units';for(const b of a.bets){const tr=document.createElement('tr');for(const v of [b.hand,b.column,b.bet,b.stake.toFixed(2),b.outcome,(b.delta>=0?'+':'')+b.delta.toFixed(2),(b.net>=0?'+':'')+b.net.toFixed(2)]){const td=document.createElement('td');td.textContent=v;td.style.padding='8px 5px';tr.appendChild(td)}$('cc-audit-body').appendChild(tr)}}
$('cc-audit-select').addEventListener('change',renderAudit);
$('cc-audit-export').addEventListener('click',()=>{const lines=['Shoe,Hand,Column,Bet,Stake,Outcome,Delta units,Shoe running net'];for(const a of auditShoes)for(const b of a.bets)lines.push([a.number,b.hand,b.column,b.bet,b.stake.toFixed(2),b.outcome,b.delta.toFixed(2),b.net.toFixed(2)].join(','));const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'})),link=document.createElement('a');link.href=url;link.download='baccarat-shoe-profit-audit.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
})();