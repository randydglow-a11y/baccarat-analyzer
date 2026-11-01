(function(){
'use strict';
const $=id=>document.getElementById(id);
const host=$('bet-backtest');if(!host)return;
const panel=document.createElement('section');panel.className='panel';panel.id='custom-cockroach';
panel.innerHTML='<h2>🐛 Custom Cockroach: Match / Mismatch</h2><p class="muted">Compare the next Cockroach mark with the same row in the previous selected-width column. Ties repeat the exact side and stake. Progression continues after losses until a winning bet, then resets to the starting stake. Choose a progression bet count or a manual maximum stake. In progression-bets mode, the displayed total risk is the maximum combined losing stakes for the entire shoe.</p><div class="actions"><label>Shoes <select id="cc-count"><option value="25">25</option><option value="100" selected>100</option><option value="500">500</option><option value="1000">1,000</option><option value="5000">5,000</option><option value="10000">10,000</option></select></label><label>Strategy <select id="cc-strategy"><option value="mismatch">Mismatch</option><option value="match">Match</option></select></label><label>Rows per column <select id="cc-rows"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label><label>Progression <select id="cc-mode"><option value="doubleplus" selected>Double + 1</option><option value="preset_safe">Conservative (1,1,2,2,3,3)</option><option value="preset_fib">Fibonacci-style (1,2,3,5,8,13)</option><option value="preset_double">Doubling preset (1,2,4,8,16,32)</option><option value="sequence_reset">Custom sequence — reset on win</option><option value="sequence_lr">Custom sequence — left/right</option><option value="sequence_hybrid">Hybrid — profit-based recovery</option><option value="flat">Flat</option><option value="add">Add fixed units</option><option value="double">Double</option><option value="triple">Triple</option><option value="fibonacci">Fibonacci</option><option value="custom">Custom multiplier + units</option></select></label><label>Starting stake <input id="cc-start" type="number" min="1" max="10000" step="1" value="1" style="width:90px"></label><label>Extra units <input id="cc-add" type="number" min="0" max="10000" step="1" value="2" style="width:90px"></label><label>Multiplier <input id="cc-mult" type="number" min="1" max="10" step="0.1" value="2" style="width:90px"></label><label>Cap method <select id="cc-cap-method"><option value="steps" selected>Progression bets</option><option value="stake">Manual max stake</option></select></label><label>Progression bets <input id="cc-steps" type="number" min="1" max="30" step="1" value="4" style="width:80px"></label><label><input id="cc-recovery" type="checkbox"> Enable recovery in NEXT shoe after 4 losses</label><label>Recovery multiplier <input id="cc-recovery-mult" type="number" min="1" max="100" value="5" style="width:75px"></label><label id="cc-manual-cap" style="display:none">Max stake (units) <input id="cc-cap" type="number" inputmode="decimal" min="1" max="1000000" step="1" value="64" style="width:100px"></label><label>Winning columns to end shoe <select id="cc-wins"><option value="1" selected>1</option><option value="2">2</option><option value="3">3</option><option value="whole">Whole shoe</option></select></label><button id="cc-run" class="player" disabled>Test my strategy</button></div><p id="cc-preview" class="muted"></p><p id="cc-status" class="muted">Upload the simulation file above to enable testing.</p><div id="cc-stats" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><p class="muted" style="font-size:12px">The next bet is based only on earlier hands. A tie repeats the exact same bet. In progression-bets mode, the calculated loss limit applies to all losing wagers across the entire shoe, even if earlier bets won; betting ends at the limit or before a bet that could exceed it. The progression bet count still limits each column. Profit factor compares gross winning-shoe profit with gross losing-shoe losses. Recovery and break-even figures use average profitable and losing shoes; even shoes are excluded from the break-even calculation. These are simulated results, not a prediction of future outcomes.</p>';
panel.querySelector('.actions').insertAdjacentHTML('beforeend','<label>Betting road <select id="cc-road-choice"><option value="cockroach">Cockroach (existing)</option><option value="main-follow">Main Road — Follow Row 1</option></select></label><label>Main Road entry <select id="cc-main-entry"><option value="1">Row 1 → bet Row 2</option><option value="2">Row 2 indicator → bet Row 3</option></select></label><label>Row 2 condition <select id="cc-main-condition"><option value="any">Any result</option><option value="same">Same as Row 1</option><option value="opposite">Opposite Row 1</option></select></label><label>Lost column <select id="cc-main-carry"><option value="carry">Carry progression</option><option value="reset">Reset progression</option></select></label>');
panel.querySelector('.actions').insertAdjacentHTML('beforeend','<label>Column entry <select id="cc-indicator"><option value="none">Baseline (no indicator)</option><option value="1">Row 1 indicator → bet from Row 2</option><option value="2" selected>Row 2 indicator → bet from Row 3</option></select></label>');
host.insertAdjacentElement('afterend',panel);
panel.querySelector('.actions').insertAdjacentHTML('beforeend',`<label class="cc-sequence-options">Custom stakes (comma-separated) <input id="cc-sequence" value="1,3,7,15,15,30,30" style="width:min(95vw,280px)"></label><label class="cc-sequence-options">Hybrid starts at stake # <input id="cc-hybrid-start" type="number" min="1" max="30" value="4" style="width:65px"></label><label class="cc-sequence-options">Losses to move up <input id="cc-loss-threshold" type="number" min="1" max="20" value="2" style="width:65px"></label><label class="cc-sequence-options">Wins to move down <input id="cc-win-threshold" type="number" min="1" max="20" value="2" style="width:65px"></label><label class="cc-sequence-options">At last stake <select id="cc-max-rule"><option value="stop">Stop shoe</option><option value="stay">Repeat maximum</option></select></label>`);
function sequenceMode(c){return ['sequence_reset','sequence_lr','sequence_hybrid'].includes(c.mode)}
function sequenceValues(c){const v=String(c.sequence||'').split(',').map(x=>Number(x.trim()));if(!v.length||v.length>30||v.some(x=>!Number.isFinite(x)||x<=0))throw Error('Custom progression needs 1–30 positive stakes.');return v}
function sequenceState(c){const seq=sequenceValues(c),start=Math.max(0,Math.min(seq.length-1,c.hybridStart-1));return {seq,index:0,net:0,wins:0,losses:0,start,stopped:false}}
function updateSequence(state,c,won,side){
 const v=state.seq[state.index];state.net+=won?v*(side==='B'?.95:1):-v;
 if(c.mode==='sequence_hybrid'&&state.net>0){state.index=0;state.net=0;state.wins=0;state.losses=0;return}
 if(c.mode==='sequence_reset'){if(won)state.index=0;else if(state.index<state.seq.length-1)state.index++;else state.stopped=c.maxRule==='stop';return}
 if(c.mode==='sequence_lr'){if(won)state.index=Math.max(0,state.index-1);else if(state.index===state.seq.length-1){state.stopped=c.maxRule==='stop'}else state.index++;return}
 if(won){state.wins++;state.losses=0;if(state.index>=state.start&&state.wins>=c.winThreshold){let i=state.index-1;while(i>state.start&&state.seq[i]===state.seq[state.index])i--;state.index=Math.max(state.start,i);state.wins=0}}
 else {state.losses++;state.wins=0;const threshold=state.index<state.start?1:c.lossThreshold;if(state.losses>=threshold){state.losses=0;if(state.index===state.seq.length-1){state.stopped=c.maxRule==='stop'}else{const current=state.seq[state.index];let i=state.index+1;while(i<state.seq.length-1&&state.seq[i]===current)i++;state.index=i}}}
}

const mainSettingsKeys=['cc-rows','cc-mode','cc-start','cc-add','cc-mult','cc-cap-method','cc-steps','cc-cap','cc-wins','cc-recovery','cc-recovery-mult','cc-sequence','cc-hybrid-start','cc-loss-threshold','cc-win-threshold','cc-max-rule'];
const mainSettings={};
function captureMainSettings(){for(const id of mainSettingsKeys){const el=$(id);mainSettings[id]=el.type==='checkbox'?el.checked:el.value}}
function restoreMainSettings(values){for(const id of mainSettingsKeys){const el=$(id);if(values[id]!==undefined){if(el.type==='checkbox')el.checked=values[id];else el.value=values[id]}}}
const cockroachSettings={};
function captureInto(target){for(const id of mainSettingsKeys){const el=$(id);target[id]=el.type==='checkbox'?el.checked:el.value}}
function switchRoadSettings(){const road=$('cc-road-choice').value;if(road==='main-follow'){captureInto(cockroachSettings);if(Object.keys(mainSettings).length)restoreMainSettings(mainSettings)}else{captureMainSettings();if(Object.keys(cockroachSettings).length)restoreMainSettings(cockroachSettings)}for(const id of ['cc-main-entry','cc-main-condition','cc-main-carry']){$(id).closest('label').style.display=road==='main-follow'?'':'none'}$('cc-indicator').closest('label').style.display=road==='main-follow'?'none':'';$('cc-strategy').closest('label').style.display=road==='main-follow'?'none':'';for(const id of mainSettingsKeys)$(id).dispatchEvent(new Event('change'))}
$('cc-road-choice').addEventListener('change',switchRoadSettings);
for(const id of mainSettingsKeys)$(id).addEventListener('change',()=>{if($('cc-road-choice').value==='main-follow')captureMainSettings();else captureInto(cockroachSettings)});
captureInto(cockroachSettings);switchRoadSettings();
panel.insertAdjacentHTML('beforeend','<div style="border-top:1px solid #405573;margin-top:16px;padding-top:12px"><h3>Indicator rows vs baseline</h3><p class="muted">Choose Row 1 or Row 2 as the observation-only indicator. Enter on the following row only if the indicator matches the preceding column; otherwise skip the column. Compare both rules on identical shoes with unchanged caps, ties, recovery and stop rules.</p><button id="cc-indicator-compare" type="button" class="secondary">Compare indicator vs baseline</button><p id="cc-indicator-status" class="muted"></p><div id="cc-indicator-results" style="overflow-x:auto"></div></div>');
const audit=document.createElement('section');audit.className='panel';audit.id='cc-audit';audit.innerHTML='<h2>🔎 Shoe-by-shoe profit audit</h2><p class="muted">Select a shoe to inspect each actual wager, stake, outcome, and running profit. Tie pushes repeat the same stake. Results reflect the simulator rules.</p><div class="actions"><label>Shoe <select id="cc-audit-select" style="max-width:200px;padding:10px;background:#0d1a2c;color:white"></select></label><button type="button" id="cc-audit-export" class="secondary" disabled>Export all bets CSV</button></div><p id="cc-audit-summary" class="muted">Run a test to view the breakdown.</p><div style="overflow-x:auto;max-height:440px;overflow-y:auto"><table style="width:100%;white-space:nowrap;text-align:left"><thead><tr><th>Hand</th><th>Column</th><th>Bet</th><th>Stake</th><th>Result</th><th>Units</th><th>Shoe net</th></tr></thead><tbody id="cc-audit-body"></tbody></table></div>';
panel.insertAdjacentElement('afterend',audit);
panel.insertAdjacentHTML('beforeend','<div style="margin-top:18px;border-top:1px solid #405573;padding-top:15px"><h3>⚖️ Compare Flat vs Double + 1 vs Recovery</h3><p class="muted">Run all three progressions on the exact same loaded shoes, with identical strategy, row, stake cap and stopping rules. This comparison does not change your selected progression.</p><button id="cc-compare" class="secondary" type="button">Compare all three</button><p id="cc-compare-status" class="muted"></p><div id="cc-compare-results" style="overflow-x:auto"></div></div>');
let auditShoes=[];
let dataset=null;
window.addEventListener('baccarat-simulation-file',e=>{dataset=e.detail.rows;$('cc-run').disabled=false;$('cc-status').textContent=dataset.size.toLocaleString()+' shoes available.'});
const road=window.BaccaratRoads;
function nextSignal(history,config){
 if(config.roadType==='main-follow'){
  const nonTies=history.filter(x=>x==='B'||x==='P'),n=nonTies.length,row=n%config.rows,col=Math.floor(n/config.rows),start=Number(config.mainEntry||1);
  if(row<start)return null;
  const first=nonTies[col*config.rows];if(!first)return null;
  if(start===2){const second=nonTies[col*config.rows+1];if(!second)return null;if(config.mainCondition==='same'&&second!==first)return null;if(config.mainCondition==='opposite'&&second===first)return null;}
  return {col,row,bet:first};
 }

 const offset={big:0,eye:1,small:2,cockroach:3}[config.roadType||'cockroach'];const marks=h=>offset===0?road.buildBig(h).cells:road.derived(road.buildBig(h),offset);
 const before=marks(history),n=before.length,row=n%config.rows,col=Math.floor(n/config.rows);
 if(col===0)return null;
 if(config.indicator==='1'||config.indicator==='2'){
  const indicatorRow=Number(config.indicator)-1;
  if(row<=indicatorRow)return null;
  const indicator=before[col*config.rows+indicatorRow],previousIndicator=before[(col-1)*config.rows+indicatorRow];
  if(!indicator||!previousIndicator||indicator.v!==previousIndicator.v)return null;
 }
 const prior=before[(col-1)*config.rows+row];if(!prior)return null;
 const options=['B','P'].filter(side=>{
  const after=marks([...history,side]);
  return after.length===n+1&&(config.strategy==='match'?after[n].v===prior.v:after[n].v!==prior.v);
 });
 return {col,row,bet:options.length===1?options[0]:null};
}
function settings(){return {roadType:$('cc-road-choice').value==='main-follow'?'main-follow':'cockroach',mainEntry:$('cc-main-entry').value,mainCondition:$('cc-main-condition').value,mainCarry:$('cc-main-carry').value,indicator:$('cc-indicator').value,strategy:$('cc-strategy').value,rows:Number($('cc-rows').value),mode:$('cc-mode').value,sequence:$('cc-sequence').value,hybridStart:Math.max(1,Number($('cc-hybrid-start').value)||4),lossThreshold:Math.max(1,Number($('cc-loss-threshold').value)||2),winThreshold:Math.max(1,Number($('cc-win-threshold').value)||2),maxRule:$('cc-max-rule').value,start:Math.max(1,Number($('cc-start').value)||1),add:Math.max(0,Number($('cc-add').value)||0),mult:Math.max(1,Number($('cc-mult').value)||1),cap:Math.max(1,Math.min(1000000,Number($('cc-cap').value)||64)),capMethod:$('cc-cap-method').value,steps:Math.max(1,Math.min(30,Math.floor(Number($('cc-steps').value)||4))),wins:$('cc-wins').value==='whole'?Infinity:Number($('cc-wins').value),recovery:$('cc-recovery').checked,recoveryMult:Math.max(1,Math.min(100,Number($('cc-recovery-mult').value)||5))}}
function nextStake(current,previous,config){const presets={preset_safe:[1,1,2,2,3,3],preset_fib:[1,2,3,5,8,13],preset_double:[1,2,4,8,16,32]};if(presets[config.mode]){const sequence=presets[config.mode];const index=Math.max(0,Math.min(sequence.length-1,Number(config.presetStep)||0));config.presetStep=index+1;return sequence[Math.min(index+1,sequence.length-1)]}switch(config.mode){case 'flat':return config.start;case 'add':return current+config.add;case 'double':return current*2;case 'doubleplus':return current*2+1;case 'triple':return current*3;case 'fibonacci':return current+previous;default:return current*config.mult+config.add}}
function progression(c){if(sequenceMode(c)){const seq=sequenceValues(c);return {seq,total:seq.reduce((a,b)=>a+b,0),max:Math.max(...seq)}}const x={...c,presetStep:0};let current=x.mode.startsWith('preset_')?1:x.start,previous=0,total=0,seq=[];for(let i=0;i<x.steps;i++){seq.push(Number(current.toFixed(2)));total+=current;const next=nextStake(current,previous,x);previous=current;current=next;if(!Number.isFinite(current)||current>1e12)break}return {seq,total,max:seq[seq.length-1]}}
function recoveryProgression(c){return progression({...c,start:c.start*c.recoveryMult,steps:c.steps})}
function preview(){const c=settings(),p=progression(c),rp=recoveryProgression(c),risk=p.total;$('cc-manual-cap').style.display=c.capMethod==='stake'?'':'none';$('cc-steps').disabled=c.capMethod!=='steps';$('cc-preview').textContent=c.capMethod==='steps'?'Progression: '+p.seq.join(' → ')+' units | Maximum single bet: '+p.max+' units | Whole-shoe normal loss cap: '+risk.toFixed(2)+' units; recovery-shoe cap: '+rp.total.toFixed(2)+' units. '+(c.recovery?'Recovery starts in the NEXT shoe: '+rp.seq.join(' → ')+' units. ':'')+'Shoe ends at the limit or before a bet that could exceed it.':'Manual maximum single stake: '+c.cap+' units. Progression example: '+p.seq.join(' → ')}
for(const id of ['cc-strategy','cc-rows','cc-mode','cc-start','cc-add','cc-mult','cc-cap','cc-cap-method','cc-steps','cc-wins','cc-recovery','cc-recovery-mult','cc-sequence','cc-hybrid-start','cc-loss-threshold','cc-win-threshold','cc-max-rule'])$(id).addEventListener('change',preview);preview();
async function run(shoes,modeOverride=null,quiet=false,configOverrides=null){
 const config={...settings(),...(configOverrides||{})};if(modeOverride)config.mode=modeOverride;config.presetStep=0;let recoveryNextShoe=false;const result={bets:0,wins:0,losses:0,pushes:0,net:0,peak:0,drawdown:0,stakeMax:0,maxLossRun:0,lossRun:0,completed:0,exhausted:0,capStops:0,twoWinShoes:0,profitableShoes:0,losingShoes:0,evenShoes:0,totalColumns:0,playedColumns:0,winningColumns:0,losingColumns:0,shoesWithHit:0,shoesWithoutHit:0,winningShoeProfit:0,losingShoeLoss:0,biggestWinningShoe:null,biggestLosingShoe:null,shoeAudits:[]};
 for(let j=0;j<shoes.length;j++){
  const shoeStartNet=result.net;const recoveryShoe=Boolean(config.recovery&&recoveryNextShoe&&config.capMethod==='steps');recoveryNextShoe=false;
  const shoePlayed=new Set(),shoeWon=new Set(),betsAudit=[];let shoeRunning=0,handNumber=0,stopReason='shoe completed',cycleResets=0,largestCycleDeficit=0;
  result.totalColumns+=Math.ceil((config.roadType==='main-follow'?shoes[j].filter(x=>x!=='T').length:(config.roadType==='big'?road.buildBig(shoes[j]).cells:road.derived(road.buildBig(shoes[j]),{eye:1,small:2,cockroach:3}[config.roadType]||3)).length)/config.rows);
  const custom=sequenceMode(config)?sequenceState(config):null;const history=[];let shoeGrossLoss=0,column=-1,lossesInColumn=0,recoveryStage=recoveryShoe,stopped=false,stake=config.mode.startsWith('preset_')?1:config.start,previousStake=0,columnWins=0,pendingTieBet=null,pendingTieColumn=null;const cap=config.capMethod==='steps'?Infinity:config.cap;const shoeLossCap=config.capMethod==='steps'?(recoveryShoe?recoveryProgression(config).total:progression(config).total):Infinity;
  for(const outcome of shoes[j]){handNumber++;
   const signal=nextSignal(history,config);
   if(!pendingTieBet&&signal&&signal.col!==column){column=signal.col;if(!custom&&(config.roadType!=='main-follow'||config.mainCarry!=='carry')){lossesInColumn=0;stake=recoveryShoe?config.start*config.recoveryMult:(config.mode.startsWith('preset_')?1:config.start);previousStake=0;config.presetStep=0}recoveryStage=recoveryShoe;if(!custom)stopped=false}
   if(custom){stake=custom.seq[custom.index];if(custom.stopped)stopped=true}const bet=pendingTieBet||(signal&&!stopped?signal.bet:null);
   const wagerState={recoveryShoe,signalColumn:signal?signal.col+1:null,activeColumn:column+1,lossesBefore:lossesInColumn,expectedStake:stake,tieCarry:Boolean(pendingTieBet),shoeGrossLossBefore:shoeGrossLoss};
   if(bet){
    if(shoeGrossLoss+stake>shoeLossCap+0.0000001){stopReason='gross-loss budget would be exceeded';result.capStops++;if(config.recovery&&!recoveryShoe&&!custom)recoveryNextShoe=true;break}
    const betColumn=pendingTieBet?pendingTieColumn:signal.col;
    if(stake>cap||(!custom&&config.capMethod==='steps'&&lossesInColumn>=config.steps)){stopReason='single-stake or progression-step cap';stopped=true;stake=config.mode.startsWith('preset_')?1:config.start;previousStake=0;config.presetStep=0;pendingTieBet=null;pendingTieColumn=null;result.capStops++;history.push(outcome);if(recoveryShoe)break;continue}shoePlayed.add(betColumn);result.stakeMax=Math.max(result.stakeMax,stake);result.bets++;
    if(outcome==='T'){result.pushes++;pendingTieBet=bet;pendingTieColumn=betColumn;betsAudit.push({hand:handNumber,column:betColumn+1,bet,stake,outcome,delta:0,net:shoeRunning,state:wagerState});}
    else if(outcome===bet){pendingTieBet=null;pendingTieColumn=null;shoeWon.add(betColumn);result.wins++;result.net+=stake*(bet==='B'?.95:1);shoeRunning+=stake*(bet==='B'?.95:1);betsAudit.push({hand:handNumber,column:betColumn+1,bet,stake,outcome,delta:stake*(bet==='B'?.95:1),net:shoeRunning,state:wagerState});result.lossRun=0;if(custom){const cycleBefore=custom.net;updateSequence(custom,config,true,bet);if(config.mode==='sequence_hybrid'&&cycleBefore+stake*(bet==='B'?.95:1)>0)cycleResets++;largestCycleDeficit=Math.min(largestCycleDeficit,custom.net);stake=custom.seq[custom.index];stopped=custom.stopped;if(stopped)stopReason='maximum custom progression reached'}else{stake=config.mode.startsWith('preset_')?1:config.start;previousStake=0;config.presetStep=0;stopped=true}columnWins++;result.completed++;if(recoveryShoe)columnWins=Infinity}
    else{pendingTieBet=null;pendingTieColumn=null;result.losses++;result.net-=stake;shoeRunning-=stake;shoeGrossLoss+=stake;betsAudit.push({hand:handNumber,column:betColumn+1,bet,stake,outcome,delta:-stake,net:shoeRunning,state:wagerState});if(custom){updateSequence(custom,config,false,bet);largestCycleDeficit=Math.min(largestCycleDeficit,custom.net);stake=custom.seq[custom.index];stopped=custom.stopped;if(stopped)stopReason='maximum custom progression reached'}else{const next=nextStake(stake,previousStake,config);previousStake=stake;stake=next}lossesInColumn++;if(!custom&&config.recovery&&config.capMethod==='steps'&&!recoveryShoe&&lossesInColumn===config.steps){recoveryNextShoe=true;stopped=true;stake=0}result.lossRun++;result.maxLossRun=Math.max(result.maxLossRun,result.lossRun);/* Continue after losses until a winning bet or the selected stake cap. */}
    result.peak=Math.max(result.peak,result.net);result.drawdown=Math.max(result.drawdown,result.peak-result.net);
   }
   history.push(outcome);
   if(shoeGrossLoss>=shoeLossCap-0.0000001){stopReason='gross-loss budget reached';if(config.recovery&&!recoveryShoe&&!custom)recoveryNextShoe=true;break}if(recoveryNextShoe&&!recoveryShoe)break;
   if(columnWins>=config.wins){stopReason='winning-column target reached';result.twoWinShoes++;break}
  }
  if(shoeWon.size>0)result.shoesWithHit++;else result.shoesWithoutHit++;
  result.playedColumns+=shoePlayed.size;
  result.winningColumns+=shoeWon.size;
  result.losingColumns+=shoePlayed.size-shoeWon.size;
  if(config.recovery&&!recoveryShoe&&!custom&&shoeGrossLoss>=shoeLossCap-0.0000001)recoveryNextShoe=true;const shoeNet=result.net-shoeStartNet;if(config.capMethod==='steps'&&shoeNet < -shoeLossCap-0.000001)throw Error('Shoe loss cap violation on shoe '+(j+1));if(!quiet)result.shoeAudits.push({number:j+1,net:shoeNet,bets:betsAudit,columns:shoePlayed.size,wins:shoeWon.size,handCount:handNumber,recoveryShoe,queuedRecovery:recoveryNextShoe,shoeGrossLoss,shoeLossCap,stopReason,cycleResets,largestCycleDeficit,endingCycleNet:custom?custom.net:null,endingStake:custom?custom.seq[custom.index]:null});
  if(shoeNet>0.0000001){result.profitableShoes++;result.winningShoeProfit+=shoeNet;result.biggestWinningShoe=Math.max(result.biggestWinningShoe===null?-Infinity:result.biggestWinningShoe,shoeNet)}else if(shoeNet< -0.0000001){result.losingShoes++;result.losingShoeLoss+=shoeNet;result.biggestLosingShoe=Math.min(result.biggestLosingShoe===null?Infinity:result.biggestLosingShoe,shoeNet)}else result.evenShoes++;
  if(j%5===4){if(!quiet)$('cc-status').textContent='Testing shoe '+(j+1)+' / '+shoes.length+'…';await new Promise(resolve=>setTimeout(resolve,0))}
 }
 return result;
}

$('cc-indicator-compare').onclick=async()=>{
 const button=$('cc-indicator-compare'),status=$('cc-indicator-status'),output=$('cc-indicator-results');
 if(!dataset){status.textContent='Load or generate simulation shoes first.';return}
 button.disabled=true;status.textContent='Comparing the same shoes…';
 try{
  const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value));
  const baseline=await run(shoes,null,true,{indicator:'none'});
  const filtered1=await run(shoes,null,true,{indicator:'1'});
  const filtered=await run(shoes,null,true,{indicator:'2'});
  const percent=n=>shoes.length?(100*n/shoes.length).toFixed(1)+'%':'—';
  const rows=[['Baseline',baseline],['Row 1 indicator',filtered1],['Row 2 indicator',filtered]];
  const table=document.createElement('table');table.style.width='100%';table.style.minWidth='640px';
  const head=document.createElement('tr');for(const h of ['Rule','Net units','Profitable shoes','Profitable %','Bets','Winning columns','Max drawdown']){const cell=document.createElement('th');cell.textContent=h;head.appendChild(cell)}table.appendChild(head);
  for(const [name,r] of rows){const tr=document.createElement('tr');for(const v of [name,r.net.toFixed(2),r.profitableShoes,percent(r.profitableShoes),r.bets,r.winningColumns,r.drawdown.toFixed(2)]){const td=document.createElement('td');td.textContent=String(v);td.style.padding='7px';tr.appendChild(td)}table.appendChild(tr)}
  output.replaceChildren(table);status.textContent='Compared '+shoes.length+' identical shoes. This is historical simulation, not a profit forecast.';
 }catch(e){status.textContent='Comparison error: '+e.message}finally{button.disabled=false}
};
panel.insertAdjacentHTML('beforeend','<div style="border-top:1px solid #405573;padding-top:14px;margin-top:14px"><h3>🛣️ Main Road — Follow Row 1 comparison</h3><p class="muted">Fixed groups of selected rows (default 4), ignoring ties for row positions. Compare carrying versus resetting progression after a lost column, with Row 1 or Row 2 entry. Row 2 can confirm or oppose Row 1. All bets follow Row 1.</p><button id="cc-main-compare" type="button" class="secondary">Compare Main Road rules</button><p id="cc-main-status" class="muted"></p><div id="cc-main-results" style="overflow-x:auto"></div></div>');
$('cc-main-compare').onclick=async()=>{const b=$('cc-main-compare'),status=$('cc-main-status'),out=$('cc-main-results');if(!dataset||!dataset.size){status.textContent='Load or generate shoes first.';return}b.disabled=true;status.textContent='Comparing…';try{const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value));const table=document.createElement('table');table.style.width='100%';table.style.minWidth='620px';const header=document.createElement('tr');for(const h of ['Entry','Lost column','Net units','Profitable shoes %','Bets','Drawdown']){const th=document.createElement('th');th.textContent=h;header.appendChild(th)}table.appendChild(header);for(const entry of ['1','2'])for(const carry of ['carry','reset']){const r=await run(shoes,null,true,{roadType:'main-follow',mainEntry:entry,mainCarry:carry,mainCondition:$('cc-main-condition').value});const tr=document.createElement('tr');for(const v of [entry==='1'?'After Row 1':'After Row 2',carry,r.net.toFixed(2),(100*r.profitableShoes/shoes.length).toFixed(1)+'%',r.bets,r.drawdown.toFixed(2)]){const td=document.createElement('td');td.textContent=String(v);td.style.padding='7px';tr.appendChild(td)}table.appendChild(tr)}out.replaceChildren(table);status.textContent='Compared '+shoes.length+' identical shoes; no future outcomes used.'}catch(e){status.textContent='Error: '+e.message}finally{b.disabled=false}};
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
   const actual=original[h],offset={big:0,eye:1,small:2,cockroach:3}[c.roadType||'cockroach'],before=offset===0?road.buildBig(history).cells:road.derived(road.buildBig(history),offset),n=before.length;
   const row=n%c.rows,col=Math.floor(n/c.rows),prior=col>0?before[(col-1)*c.rows+row]:null;
   const valid=[];
   if(prior)for(const side of ['B','P']){
    const after=c.roadType==='big'?road.buildBig(history.concat(side)).cells:road.derived(road.buildBig(history.concat(side)),offset);
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
    if(c.capMethod==='stake'&&bet.stake>c.cap)report('Shoe '+(j+1)+' hand '+(h+1)+': stake above cap');
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



function independentRoadMarks(hands,type){
 const decisive=hands.filter(x=>x==='B'||x==='P');
 const bigColumns=[];
 for(const outcome of decisive){
  if(!bigColumns.length||bigColumns[bigColumns.length-1][0]!==outcome)bigColumns.push([outcome]);
  else bigColumns[bigColumns.length-1].push(outcome);
 }
 if(type==='big')return decisive.map(v=>({v}));
 const distance={eye:1,small:2,cockroach:3}[type]||3,marks=[];
 for(let column=distance;column<bigColumns.length;column++){
  const current=bigColumns[column];
  for(let row=0;row<current.length;row++){
   if(column===distance&&row===0)continue;
   let same;
   if(row===0)same=bigColumns[column-1].length===bigColumns[column-distance-1].length;
   else same=(bigColumns[column-distance].length>row)===(bigColumns[column-distance].length>row-1);
   marks.push({v:same?'B':'P'});
  }
 }
 return marks;
}
function independentSignal(history,c){
 const type=c.roadType||'cockroach';
 const marks=independentRoadMarks(history,type),index=marks.length,col=Math.floor(index/c.rows),row=index%c.rows;
 if(!col)return null;
 const prior=marks[(col-1)*c.rows+row];if(!prior)return null;
 const possible=[];
 for(const side of ['B','P']){
  const after=independentRoadMarks(history.concat(side),type);
  if(after.length!==index+1)continue;
  if((after[index].v===prior.v)===(c.strategy==='match'))possible.push(side);
 }
 return possible.length===1?{bet:possible[0],column:col+1}:null;
}

const daily=document.createElement('section');daily.className='panel';daily.id='cc-daily-target';
daily.innerHTML='<h2>📅 Daily Bankroll Goal</h2><p class="muted">Simulate up to 10 shoes per day. Reset the daily profit/loss thresholds each day, while carrying the actual bankroll forward. Stop a day after a completed shoe reaches either limit. Targets are not guaranteed, and losses can overshoot the limit within a shoe.</p><div class="actions"><label>Starting bankroll (units) <input id="cc-daily-bankroll" type="number" min="1" step="1" value="1000" style="width:110px"></label><label>Daily profit target (%) <input id="cc-daily-profit" type="number" min="0.1" max="100" step="0.5" value="2" style="width:80px"></label><label>Daily loss limit (%) <input id="cc-daily-loss" type="number" min="0.1" max="100" step="0.5" value="2" style="width:80px"></label><label>Shoes per day <input id="cc-daily-shoes" type="number" min="1" max="100" step="1" value="10" style="width:80px"></label><button type="button" class="player" id="cc-daily-run">Test Daily Bankroll Goal</button></div><p id="cc-daily-status" class="muted">Generate or load shoes first.</p><div id="cc-daily-results"></div>';
audit.insertAdjacentElement('afterend',daily);
$('cc-daily-run').onclick=async()=>{
 const button=$('cc-daily-run'),status=$('cc-daily-status'),output=$('cc-daily-results');
 if(!dataset||!dataset.size){status.textContent='Generate or load shoes first.';return}
 const starting=Number($('cc-daily-bankroll').value),profit=Number($('cc-daily-profit').value),loss=Number($('cc-daily-loss').value),perDay=Math.max(1,Math.min(100,Math.floor(Number($('cc-daily-shoes').value)||10)));
 if(!Number.isFinite(starting)||starting<=0||!Number.isFinite(profit)||profit<=0||!Number.isFinite(loss)||loss<=0){status.textContent='Enter a positive bankroll, profit target and loss limit.';return}
 button.disabled=true;output.replaceChildren();
 try{
  const shoes=Array.from(dataset.values()).slice(0,10000),config=settings();
  status.textContent='Simulating '+shoes.length.toLocaleString()+' shoes…';
  const sim=await run(shoes,null,false,config);
  let bankroll=starting,peak=starting,drawdown=0,winning=0,losing=0,even=0,targetDays=0,limitDays=0,exhausted=0,played=0,days=0,overshoots=0;
  const dayDetails=[];
  for(let i=0;i<sim.shoeAudits.length&&bankroll>0;){
   const opening=bankroll,target=opening*profit/100,limit=opening*loss/100;let dayNet=0,count=0,reason='10-shoe limit';
   while(i<sim.shoeAudits.length&&count<perDay){
    const shoe=sim.shoeAudits[i++];
    // Whole-shoe resolution: this is a stop AFTER the shoe, not a mid-shoe bankroll guard.
    dayNet+=shoe.net;bankroll+=shoe.net;played++;count++;
    peak=Math.max(peak,bankroll);drawdown=Math.max(drawdown,peak-bankroll);
    if(bankroll<=0){reason='Bankroll depleted';break}
    if(dayNet>=target){reason='Profit target';targetDays++;break}
    if(dayNet<=-limit){reason='Loss limit';limitDays++;if(dayNet < -limit-0.00001)overshoots++;break}
   }
   if(dayNet>0)winning++;else if(dayNet<0)losing++;else even++;
   days++;if(dayDetails.length<10)dayDetails.push({day:days,net:dayNet,reason,shoes:count,closing:bankroll});
   if(bankroll<=0){exhausted=1;break}
   if(days%100===0){status.textContent='Processed '+days.toLocaleString()+' days…';await new Promise(resolve=>setTimeout(resolve,0))}
  }
  const pct=n=>days?(100*n/days).toFixed(1)+'%':'—';
  const lines=[['Days simulated',days.toLocaleString()],['Shoes played',played.toLocaleString()],['Daily goal reached',targetDays+' ('+pct(targetDays)+')'],['Daily loss limit reached',limitDays+' ('+pct(limitDays)+')'],['Profitable days',winning+' ('+pct(winning)+')'],['Losing days',losing+' ('+pct(losing)+')'],['Starting bankroll',starting.toFixed(2)+' units'],['Ending bankroll',bankroll.toFixed(2)+' units'],['Total net',(bankroll-starting).toFixed(2)+' units'],['Max end-of-shoe drawdown',drawdown.toFixed(2)+' units'],['Days overshooting loss limit',overshoots.toLocaleString()],['Bankroll depleted',exhausted?'Yes':'No']];
  for(const [name,value] of lines){const line=document.createElement('div');line.style.cssText='display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 0;border-bottom:1px solid #405573';const label=document.createElement('span');label.textContent=name;const val=document.createElement('strong');val.textContent=value;line.append(label,val);output.append(line)}
  const note=document.createElement('p');note.className='muted';note.textContent='Daily thresholds reset to the bankroll at the start of each day; bankroll gains/losses carry forward. Stops occur only between shoes. This test replays strategy shoe results generated without daily stopping; when recovery is enabled, skipped shoes may make next-shoe recovery sequencing inaccurate. It does not enforce available bankroll on individual wagers or intrashoe losses. A daily target changes session length, not the house edge.';output.append(note);
  status.textContent='Daily bankroll simulation complete.';
 }catch(e){status.textContent='Daily goal error: '+e.message}
 finally{button.disabled=false}
};

const deepAudit=document.createElement('section');deepAudit.className='panel';deepAudit.id='cc-deep-audit';
deepAudit.innerHTML='<h2>🔬 Independent Strategy Audit</h2><p class="muted">Check each recorded wager against pre-hand signals, independently recalculate payouts, progression stakes, ties, and shoe loss limits. Shows specific discrepancies. Road construction still shares the app road engine; this is an accounting/timing cross-check, not a fully independent road implementation or proof of an edge.</p><button type="button" class="player" id="cc-deep-run">Run Independent Strategy Audit</button><p class="muted" id="cc-deep-status">Generate or load shoes first.</p><div id="cc-deep-results"></div><div id="cc-final-check" style="border-top:1px solid #405573;margin-top:20px;padding-top:20px"><h2>🏁 Final Road & Flat-Bet Check</h2><p class="muted">Independently reconstruct the road from raw outcomes and verify every recorded betting signal, then compare your current progression against flat 1-unit bets on the same shoes. Uses your selected road, rows, Match/Mismatch, stop rule and recovery settings. Flat comparison disables recovery. This is a separate road-calculation cross-check, not a claim of positive expected value.</p><button type="button" class="player" id="cc-final-run">Run Final Check</button><p id="cc-final-status" class="muted">Generate or load shoes first.</p><div id="cc-final-results"></div></div>';
validation.insertAdjacentElement('afterend',deepAudit);
$('cc-deep-run').onclick=async()=>{
 const button=$('cc-deep-run'),status=$('cc-deep-status'),output=$('cc-deep-results');
 if(!dataset||!dataset.size){status.textContent='Generate or load shoes first.';return}
 button.disabled=true;output.replaceChildren();
 try{
  const shoes=Array.from(dataset.values()).slice(0,Math.min(dataset.size,10000)),config=settings();
  status.textContent='Replaying '+shoes.length+' shoes and checking each wager…';
  const sim=await run(shoes,null,false,config);
  const problems=[],counts={wagers:0,ties:0,signals:0,progression:0,payouts:0,caps:0,transition:0};
  const fail=(type,shoe,bet,message)=>{counts[type]++;if(problems.length<20)problems.push('Shoe '+shoe+(bet?' hand '+bet.hand:'')+': '+message)};
  const eq=(a,b)=>Math.abs(a-b)<0.00001;
  let totalNet=0,expectedRecovery=false;
  for(let i=0;i<shoes.length;i++){
   const audit=sim.shoeAudits[i],history=[],bets=audit.bets,cap=progression({...config,start:audit.recoveryShoe?config.start*config.recoveryMult:config.start}).total;
   if(config.recovery&&config.capMethod==='steps'&&audit.recoveryShoe!==expectedRecovery)fail('transition',i+1,null,'next-shoe recovery transition disagrees with prior shoe');
   expectedRecovery=audit.queuedRecovery;
   let cursor=0,net=0,grossLoss=0,lastTie=null,lastColumn=null,losses=0,previousStake=0;
   for(let h=0;h<audit.handCount;h++){
    const actual=shoes[i][h],bet=bets[cursor];
    if(bet&&bet.hand===h+1){
     cursor++;counts.wagers++;
     if(lastTie){
      if(bet.bet!==lastTie.bet||bet.column!==lastTie.column||!eq(bet.stake,lastTie.stake))fail('signals',i+1,bet,'tie did not repeat the same side, column and stake');
     }else{
      const prediction=nextSignal(history,config);
      if(!prediction||prediction.bet!==bet.bet||prediction.col+1!==bet.column)fail('signals',i+1,bet,'bet not supported by pre-hand signal');
     }
     if(lastColumn!==bet.column){losses=0;previousStake=0;lastColumn=bet.column}
     const baseStake=audit.recoveryShoe?config.start*config.recoveryMult:config.start;
     const seq=progression({...config,start:baseStake}).seq;
     if(config.capMethod==='steps'&&(!eq(bet.stake,seq[Math.min(losses,seq.length-1)])||losses>=config.steps))fail('progression',i+1,bet,'incorrect progression stake or step limit');
     if(config.capMethod==='stake'&&bet.stake>config.cap+0.00001)fail('caps',i+1,bet,'manual stake cap exceeded');
     const delta=actual==='T'?0:actual===bet.bet?bet.stake*(bet.bet==='B'?0.95:1):-bet.stake;
     net+=delta;
     if(delta<0)grossLoss+=bet.stake;
     if(!eq(delta,bet.delta)||!eq(net,bet.net)||bet.outcome!==actual)fail('payouts',i+1,bet,'payout, outcome or running balance mismatch');
     if(config.capMethod==='steps'&&grossLoss>cap+0.00001)fail('caps',i+1,bet,'whole-shoe gross loss cap exceeded');
     if(actual==='T'){counts.ties++;lastTie=bet}
     else{
      lastTie=null;
      if(delta<0){previousStake=bet.stake;losses++}
      else{losses=0;previousStake=0}
     }
    }else if(lastTie){fail('signals',i+1,null,'missing wager after tie at hand '+(h+1));lastTie=null}
    history.push(actual);
   }
   if(cursor!==bets.length||!eq(net,audit.net))fail('payouts',i+1,null,'shoe wager count or net mismatch');
   totalNet+=net;
   if(i%100===99){status.textContent='Audited '+(i+1).toLocaleString()+' / '+shoes.length.toLocaleString()+' shoes…';await new Promise(resolve=>setTimeout(resolve,0))}
  }
  if(!eq(totalNet,sim.net))fail('payouts',0,null,'aggregate net does not match simulation');
  const summary=document.createElement('p');summary.textContent=shoes.length.toLocaleString()+' shoes · '+counts.wagers.toLocaleString()+' wagers · '+counts.ties.toLocaleString()+' tie pushes · independently calculated net '+totalNet.toFixed(2)+' units';output.append(summary);
  const types=[['Pre-hand signals / tie timing',counts.signals],['Progression stakes',counts.progression],['Payouts / accounting',counts.payouts],['Shoe-wide caps',counts.caps],['Next-shoe recovery',counts.transition]];
  for(const [name,n] of types){const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #405573';const a=document.createElement('span');a.textContent=name;const b=document.createElement('strong');b.textContent=n?'ISSUES: '+n:'PASS';b.style.color=n?'#ff9c9c':'#66d5a7';row.append(a,b);output.append(row)}
  if(problems.length){const title=document.createElement('h3');title.textContent='First discrepancies';output.append(title);const list=document.createElement('ol');for(const message of problems){const li=document.createElement('li');li.textContent=message;list.append(li)}output.append(list)}
  const caveat=document.createElement('p');caveat.className='muted';caveat.textContent='This audit independently recalculates recorded outcomes and progression steps, but uses the same road engine to reconstruct pre-hand signals and the same run() to produce the wager log. A PASS cannot rule out a shared road-generation bug, incorrect assumptions about baccarat, or biased generated shoes. The audit does not test positive expected value.';output.append(caveat);
  const errors=Object.entries(counts).filter(([key])=>!['wagers','ties'].includes(key)).reduce((sum,[,value])=>sum+value,0);
  status.textContent=errors?'Audit found '+errors+' discrepancy checks. Review details below.':'Audit passed recorded wager checks; shared-engine limitations remain.';
 }catch(e){status.textContent='Audit error: '+e.message}
 finally{button.disabled=false}
};

$('cc-final-run').onclick=async()=>{
 const button=$('cc-final-run'),status=$('cc-final-status'),output=$('cc-final-results');
 if(!dataset||!dataset.size){status.textContent='Generate or load shoes first.';return}
 button.disabled=true;output.replaceChildren();
 try{
  const shoes=Array.from(dataset.values()).slice(0,Math.min(10000,dataset.size)),c=settings();
  status.textContent='Running progression on '+shoes.length+' shoes…';
  const main=await run(shoes,null,false,c);
  status.textContent='Running flat-bet control on the same shoes…';
  const flat=await run(shoes,null,false,{...c,mode:'flat',start:1,recovery:false});
  let checked=0,discrepancies=0,first=[],tieCarry=0;
  for(let i=0;i<shoes.length;i++){
   const audit=main.shoeAudits[i],history=[],bets=audit.bets;let cursor=0,lastTie=null;
   for(let h=0;h<audit.handCount;h++){
    const b=bets[cursor];
    if(b&&b.hand===h+1){
     cursor++;checked++;
     if(lastTie){
      tieCarry++;
      if(b.bet!==lastTie.bet||b.column!==lastTie.column||Math.abs(b.stake-lastTie.stake)>0.00001){discrepancies++;if(first.length<12)first.push('Shoe '+(i+1)+' hand '+(h+1)+': tie carry differs')}
     }else{
      const expected=independentSignal(history,c);
      if(!expected||expected.bet!==b.bet||expected.column!==b.column){discrepancies++;if(first.length<12)first.push('Shoe '+(i+1)+' hand '+(h+1)+': independent road signal differs (expected '+(expected?expected.bet+' column '+expected.column:'none')+', recorded '+b.bet+' column '+b.column+')')}
     }
     lastTie=b.outcome==='T'?b:null;
    }else if(lastTie){discrepancies++;if(first.length<12)first.push('Shoe '+(i+1)+' hand '+(h+1)+': missing tie continuation');lastTie=null}
    history.push(shoes[i][h]);
   }
   if(i%100===99){status.textContent='Cross-checking shoe '+(i+1)+' / '+shoes.length+'…';await new Promise(resolve=>setTimeout(resolve,0))}
  }
  const metrics=[['Shoes checked',shoes.length.toLocaleString()],['Recorded wagers checked',checked.toLocaleString()],['Tie continuations',tieCarry.toLocaleString()],['Independent signal discrepancies',discrepancies.toLocaleString()],['Current strategy net',main.net.toFixed(2)+' units'],['Flat 1-unit control net',flat.net.toFixed(2)+' units'],['Current profitable shoes',(100*main.profitableShoes/shoes.length).toFixed(1)+'%'],['Flat profitable shoes',(100*flat.profitableShoes/shoes.length).toFixed(1)+'%']];
  for(const [label,value] of metrics){const line=document.createElement('div');line.style.cssText='display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:9px 0;border-bottom:1px solid #405573';const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=value;line.append(a,b);output.append(line)}
  if(first.length){const heading=document.createElement('h3');heading.textContent='First signal differences';output.append(heading);const list=document.createElement('ol');for(const issue of first){const li=document.createElement('li');li.textContent=issue;list.append(li)}output.append(list)}
  const note=document.createElement('p');note.className='muted';note.textContent='Independent marks are reconstructed from Banker/Player streaks without calling BaccaratRoads. This checks the chronological color sequence and signal timing, but shares the same stated derived-road rules and does not independently certify casino road conventions. Flat control keeps the same stopping rule and cap method, so it is not a matched-turnover or equal-risk comparison. Positive simulated results do not demonstrate a sustainable edge.';output.append(note);
  status.textContent=discrepancies?'Found '+discrepancies+' independent road-signal discrepancies.':'Independent road signals matched all '+checked.toLocaleString()+' recorded wagers.';
 }catch(e){status.textContent='Final check error: '+e.message}
 finally{button.disabled=false}
};


// Additional independent accounting and recovery-boundary regression checks.
const recoveryCheck=document.createElement('section');recoveryCheck.className='panel';recoveryCheck.id='cc-recovery-check';
recoveryCheck.innerHTML='<h2>🔍 Recovery & progression checks</h2><p class="muted">Checks wager arithmetic, ties, progression limits, and shoe-to-shoe recovery on loaded shoes. Uses the same road signal engine, so this is not proof of predictive accuracy.</p><button type="button" class="secondary" id="cc-recovery-run">Check recovery rules</button><p class="muted" id="cc-recovery-status">Load shoes to begin.</p>';
validation.insertAdjacentElement('afterend',recoveryCheck);
$('cc-recovery-run').onclick=async()=>{
 const button=$('cc-recovery-run'),status=$('cc-recovery-status');
 if(!dataset){status.textContent='Generate or upload shoes first.';return}
 button.disabled=true;status.textContent='Checking progression and recovery boundaries…';
 try{
  const shoes=Array.from(dataset.values()).slice(0,Math.min(1000,dataset.size));
  const base={...settings(),capMethod:'steps',steps:4,start:1,mode:'doubleplus',wins:Infinity,recovery:true,recoveryMult:5};
  const sim=await run(shoes,null,false,base),normal=progression(base),boosted=recoveryProgression(base);
  const errors=[];let tieCount=0,checked=0,recoveryShoes=0,expectedRecovery=false;
  const eq=(a,b)=>Math.abs(a-b)<0.00001;
  for(const audit of sim.shoeAudits){
   const isRecovery=audit.recoveryShoe;
   if(isRecovery)recoveryShoes++;
   if(isRecovery!==expectedRecovery)errors.push('Shoe '+audit.number+': incorrect recovery transition');
   expectedRecovery=audit.queuedRecovery;
   const limit=isRecovery?boosted.total:normal.total;
   let running=0,grossLoss=0,priorTie=null,prevBet=null;
   for(const bet of audit.bets){
    checked++;
    const state=bet.state;
    if(!state){errors.push('Shoe '+audit.number+' hand '+bet.hand+': missing wager state');continue}
    if(state.recoveryShoe!==isRecovery)errors.push('Shoe '+audit.number+' hand '+bet.hand+': recovery flag mismatch');
    if(state.activeColumn!==bet.column)errors.push('Shoe '+audit.number+' hand '+bet.hand+': active column mismatch');
    if(state.lossesBefore>=base.steps)errors.push('Shoe '+audit.number+' hand '+bet.hand+': wager after progression cap');
    if(!eq(state.expectedStake,bet.stake))errors.push('Shoe '+audit.number+' hand '+bet.hand+': recorded stake differs from simulator state');
    const seq=isRecovery?boosted.seq:normal.seq;
    if(!eq(bet.stake,seq[state.lossesBefore]))errors.push('Shoe '+audit.number+' hand '+bet.hand+': progression mismatch (expected '+seq[state.lossesBefore]+', recorded '+bet.stake+', recovery='+isRecovery+', losses='+state.lossesBefore+')');
    if(state.tieCarry!==Boolean(priorTie))errors.push('Shoe '+audit.number+' hand '+bet.hand+': tie carry state mismatch');
    if(priorTie&&(bet.hand!==priorTie.hand+1||bet.bet!==priorTie.bet||bet.column!==priorTie.column||!eq(bet.stake,priorTie.stake)))errors.push('Shoe '+audit.number+' hand '+bet.hand+': tie repeat mismatch');
    if(!priorTie&&prevBet&&bet.column===prevBet.column&&prevBet.outcome!== 'T'&&prevBet.delta>0)errors.push('Shoe '+audit.number+' hand '+bet.hand+': bet after winning column');
    const delta=bet.outcome==='T'?0:bet.outcome===bet.bet?bet.stake*(bet.bet==='B'?.95:1):-bet.stake;
    running+=delta;
    if(delta<0)grossLoss+=bet.stake;
    if(!eq(delta,bet.delta)||!eq(running,bet.net))errors.push('Shoe '+audit.number+' hand '+bet.hand+': payout or running net mismatch');
    if(grossLoss>limit+0.00001)errors.push('Shoe '+audit.number+' hand '+bet.hand+': shoe gross loss cap exceeded');
    if(!eq(state.shoeGrossLossBefore,grossLoss-(delta<0?bet.stake:0)))errors.push('Shoe '+audit.number+' hand '+bet.hand+': prior gross loss state mismatch');
    if(bet.outcome==='T'){tieCount++;priorTie=bet}else priorTie=null;
    prevBet=bet;
   }
   if(!eq(running,audit.net)||!eq(grossLoss,audit.shoeGrossLoss))errors.push('Shoe '+audit.number+': final accounting mismatch');
   if(!eq(limit,audit.shoeLossCap))errors.push('Shoe '+audit.number+': incorrect loss cap');
  }
  status.textContent=errors.length?'Found '+errors.length+' potential issue(s): '+errors.slice(0,5).join('; '):'Checks passed on '+shoes.length+' shoes, '+checked+' wagers, '+tieCount+' ties and '+recoveryShoes+' recovery shoes. This confirms internal wager arithmetic and checked limits, not an advantage over the casino.';
 }catch(e){status.textContent='Recovery check error: '+e.message}
 finally{button.disabled=false}
};
const comparison=document.createElement('section');comparison.className='panel';comparison.id='cc-three-way';
comparison.innerHTML='<h2>📈 Three-strategy comparison</h2><p class="muted">Compare flat betting, Double + 1, and Double + 1 with next-shoe recovery on the SAME 5,000 shoes. Reserve a separate 5,000-shoe holdout when 10,000 are loaded. Uses your selected road, Match/Mismatch, rows and winning-column stop; each setup starts at 1 unit and uses a four-bet progression cap. No setup is guaranteed to win.</p><button id="cc-three-run" type="button" class="player">Compare three strategies</button><p id="cc-three-status" class="muted">Load at least 5,000 shoes to begin.</p><div id="cc-three-results" style="overflow-x:auto"></div>';
recoveryCheck.insertAdjacentElement('afterend',comparison);
$('cc-three-run').onclick=async()=>{
 const button=$('cc-three-run'),status=$('cc-three-status'),output=$('cc-three-results');
 if(!dataset||dataset.size<5000){status.textContent='Load 5,000 or more shoes first. Currently loaded: '+(dataset?.size||0)+'.';return}
 button.disabled=true;output.replaceChildren();
 try{
  const all=Array.from(dataset.values()),training=all.slice(0,5000),holdout=all.length>=10000?all.slice(5000,10000):null;
  const base={...settings(),start:1,capMethod:'steps',steps:4};
  const choices=[{name:'Flat · 1 unit',mode:'flat',recovery:false},{name:'Double + 1 · 4 bets',mode:'doubleplus',recovery:false},{name:'Double + 1 + next-shoe recovery',mode:'doubleplus',recovery:true}];
  const format=n=>(n>=0?'+':'')+n.toFixed(2);
  const summarize=r=>{
   const p=r.shoeAudits.map(a=>a.net),batch=[];
   for(let i=0;i<5;i++){const n=p.slice(i*1000,(i+1)*1000).reduce((a,b)=>a+b,0);batch.push(n)}
   let peak=0,cumulative=0,dd=0;
   for(const n of p){cumulative+=n;peak=Math.max(peak,cumulative);dd=Math.max(dd,peak-cumulative)}
   return {net:r.net,avg:r.net/p.length,drawdown:dd,positive:batch.filter(x=>x>0).length,batches:batch};
  };
  const results=[];
  for(let i=0;i<choices.length;i++){
   const choice=choices[i],cfg={...base,mode:choice.mode,recovery:choice.recovery};
   status.textContent='Testing '+(i+1)+' / 3: '+choice.name+' on 5,000 training shoes…';
   const train=summarize(await run(training,null,false,cfg));
   let test=null;
   if(holdout){status.textContent='Testing '+choice.name+' on reserved holdout shoes…';test=summarize(await run(holdout,null,false,cfg))}
   results.push({...choice,train,test});
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  const table=document.createElement('table');table.style.cssText='width:100%;min-width:620px;font-size:12px;text-align:left';
  const header=['Setup','Train net','Units/shoe','Train max drawdown','Positive batches / 5','Holdout net','Holdout max drawdown'];
  const makeRow=(values,heading=false)=>{const tr=document.createElement('tr');for(const value of values){const cell=document.createElement(heading?'th':'td');cell.textContent=value;cell.style.cssText='padding:9px 7px;border-bottom:1px solid #405573';tr.append(cell)}table.append(tr)};
  makeRow(header,true);
  results.forEach(x=>makeRow([x.name,format(x.train.net),format(x.train.avg),x.train.drawdown.toFixed(2),x.train.positive+'/5',x.test?format(x.test.net):'Not available',x.test?x.test.drawdown.toFixed(2):'—']));
  output.append(table);
  for(const x of results){const p=document.createElement('p');p.className='muted';p.textContent=x.name+' · training batches (1,000 shoes each): '+x.train.batches.map(format).join(' / ')+(x.test?' · holdout batches: '+x.test.batches.map(format).join(' / '):'');output.append(p)}
  const note=document.createElement('p');note.className='muted';note.textContent=holdout?'Training: shoes 1–5,000. Holdout: shoes 5,001–10,000. All three setups tested on identical shoes within each group. Drawdown is the maximum decline from the prior cumulative peak in that shoe order.':'Only 5,000 shoes were available; generate 10,000 for a separate holdout. Drawdown is the maximum decline from the prior cumulative peak in shoe order.';output.append(note);
  status.textContent='Comparison finished. Positive simulation results do not demonstrate a sustainable advantage over the house edge.';
 }catch(e){status.textContent='Comparison error: '+e.message}
 finally{button.disabled=false}
};
const stopCompare=document.createElement('section');stopCompare.className='panel';stopCompare.id='cc-stop-comparison';
stopCompare.innerHTML='<h2>🛑 Compare stopping rules</h2><p class="muted">Test 1, 2, 3 winning columns or the whole shoe on the SAME loaded shoes, using your current road, Match/Mismatch, progression, cap and recovery settings. Shows total units wagered, net return per 100 units wagered, net units, profitable shoes, worst shoe, and maximum cumulative drawdown. A different stop rule changes risk, not the casino house edge.</p><button type="button" class="player" id="cc-stop-run">Compare four stopping rules</button><p id="cc-stop-status" class="muted">Load shoes to compare.</p><div id="cc-stop-results" style="overflow-x:auto"></div><div id="cc-verify-one" style="margin-top:20px;padding-top:18px;border-top:1px solid #405573"><h2>🧪 Verify 1-Column Strategy</h2><p class="muted">Generate 10,000 completely new shuffled shoes and test one winning column with your current road, Match/Mismatch, progression, cap and recovery settings. Fresh shoes replace the currently loaded simulation set, so export any shoes you want to keep first. This tests repeatability, not a guaranteed casino advantage.</p><button type="button" class="player" id="cc-verify-one-run">Verify 1-Column Strategy</button><p class="muted" id="cc-verify-one-status">Ready for a fresh independent test.</p><div id="cc-verify-one-results"></div></div>';
comparison.insertAdjacentElement('afterend',stopCompare);

$('cc-verify-one-run').onclick=async()=>{
 const button=$('cc-verify-one-run'),status=$('cc-verify-one-status'),output=$('cc-verify-one-results');
 const generator=$('shoe-gen-run'),selector=$('shoe-gen-count');
 if(!generator||!selector){status.textContent='Shoe generator is unavailable. Reload the latest app.';return}
 if(generator.disabled){status.textContent='Wait for the current shoe generation to finish.';return}
 button.disabled=true;output.replaceChildren();
 const config={...settings(),wins:1};
 try{
  status.textContent='Generating 10,000 fresh shoes…';
  selector.value='10000';
  const fresh=new Promise((resolve,reject)=>{
   const listener=e=>{clearTimeout(timeout);resolve(e.detail.rows)};
   const timeout=setTimeout(()=>{window.removeEventListener('baccarat-simulation-file',listener);reject(new Error('Fresh shoe generation timed out.'))},120000);
   window.addEventListener('baccarat-simulation-file',listener,{once:true});
  });
  generator.click();
  const rows=await fresh,shoes=Array.from(rows.values()).slice(0,10000);
  if(shoes.length!==10000)throw new Error('Expected 10,000 newly generated shoes.');
  status.textContent='Testing one winning column on 10,000 new shoes…';
  const result=await run(shoes,null,false,config);
  const wagered=result.shoeAudits.reduce((sum,shoe)=>sum+shoe.bets.reduce((v,bet)=>v+(bet.outcome==='T'?0:bet.stake),0),0);
  const batches=[];
  for(let i=0;i<5;i++)batches.push(result.shoeAudits.slice(i*2000,(i+1)*2000).reduce((sum,shoe)=>sum+shoe.net,0));
  let balance=0,peak=0,drawdown=0;
  for(const shoe of result.shoeAudits){balance+=shoe.net;peak=Math.max(peak,balance);drawdown=Math.max(drawdown,peak-balance)}
  const fmt=n=>n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const metrics=[['Net units',fmt(result.net)],['Net per 100 wagered',wagered?fmt(100*result.net/wagered):'—'],['Units per shoe',fmt(result.net/shoes.length)],['Profitable shoes',(100*result.profitableShoes/shoes.length).toFixed(1)+'%'],['Maximum drawdown',fmt(drawdown)],['Positive batches',batches.filter(n=>n>0).length+' / 5'],['Batch net units',batches.map(fmt).join(' | ')]];
  const card=document.createElement('div');card.style.cssText='border:1px solid #405573;border-radius:14px;padding:14px;overflow-wrap:anywhere';
  for(const [name,value] of metrics){const line=document.createElement('div');line.style.cssText='display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 0;border-bottom:1px solid #34465f';const label=document.createElement('span');label.textContent=name;const val=document.createElement('strong');val.textContent=value;line.append(label,val);card.append(line)}
  output.append(card);
  const note=document.createElement('p');note.className='muted';note.textContent='Fresh shoes, fixed one-column stop, same selected betting rules. '+(result.net>0?'This batch finished positive, but a single positive test does not prove an advantage.':'This batch did not finish positive. The earlier positive result did not repeat in this test.')+' Banker commission is included. Do not interpret profitable-shoe percentage as the chance of long-term profit.';output.append(note);
  status.textContent='Fresh 10,000-shoe verification complete.';
 }catch(e){status.textContent='Verification error: '+e.message}
 finally{button.disabled=false}
};

$('cc-stop-run').onclick=async()=>{
 const button=$('cc-stop-run'),status=$('cc-stop-status'),output=$('cc-stop-results');
 if(!dataset||dataset.size===0){status.textContent='Generate or upload shoes first.';return}
 button.disabled=true;output.replaceChildren();
 try{
  const all=Array.from(dataset.values()).slice(0,10000),config=settings(),choices=[{label:'1 winning column',wins:1},{label:'2 winning columns',wins:2},{label:'3 winning columns',wins:3},{label:'Whole shoe',wins:Infinity}],results=[];
  for(let i=0;i<choices.length;i++){
   const choice=choices[i];status.textContent='Testing '+choice.label+' ('+(i+1)+'/4) on '+all.length+' shoes…';
   const r=await run(all,null,false,{...config,wins:choice.wins});
   let cumulative=0,peak=0,drawdown=0;
   for(const audit of r.shoeAudits){cumulative+=audit.net;peak=Math.max(peak,cumulative);drawdown=Math.max(drawdown,peak-cumulative)}
   const batches=[];
   for(let j=0;j<5;j++){const slice=r.shoeAudits.slice(Math.floor(j*all.length/5),Math.floor((j+1)*all.length/5));batches.push(slice.reduce((sum,x)=>sum+x.net,0))}
   const wagered=r.shoeAudits.reduce((sum,shoe)=>sum+shoe.bets.reduce((total,bet)=>total+(bet.outcome==='T'?0:bet.stake),0),0);
   const resolvedBets=r.shoeAudits.reduce((sum,shoe)=>sum+shoe.bets.filter(bet=>bet.outcome!=='T').length,0);
   results.push({label:choice.label,net:r.net,avg:r.net/all.length,profitable:100*r.profitableShoes/all.length,worst:r.biggestLosingShoe,drawdown,batches,wagered,resolvedBets,returnPer100:wagered?100*r.net/wagered:null});
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  const fmt=n=>Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const cards=document.createElement('div');cards.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;margin-top:16px';
  for(const x of results){
   const card=document.createElement('div');card.style.cssText='padding:14px;border:1px solid #405573;border-radius:14px;min-width:0';
   const heading=document.createElement('h3');heading.textContent=x.label;heading.style.cssText='margin:0 0 12px;font-size:17px';card.append(heading);
   const lines=[['Net units',fmt(x.net)],['Total units wagered',fmt(x.wagered)],['Net per 100 wagered',x.returnPer100===null?'—':fmt(x.returnPer100)],['Resolved bets',x.resolvedBets.toLocaleString()],['Units per shoe',x.avg.toFixed(3)],['Profitable shoes',x.profitable.toFixed(1)+'%'],['Worst shoe',x.worst===null?'—':fmt(x.worst)],['Max drawdown',fmt(x.drawdown)],['Positive batches',x.batches.filter(n=>n>0).length+' / 5']];
   for(const [label,value] of lines){const line=document.createElement('div');line.style.cssText='display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #34465f;font-size:13px';const l=document.createElement('span');l.textContent=label;l.style.opacity='.8';const v=document.createElement('strong');v.textContent=value;v.style.textAlign='right';line.append(l,v);card.append(line)}
   cards.append(card);
  }
  output.append(cards);
  const note=document.createElement('p');note.className='muted';note.textContent='Each row uses the identical '+all.length+' shoes. Five batches follow shoe order. Drawdown is calculated from the cumulative shoe net sequence, not intrashoe bankroll changes. Total units wagered sums stakes on resolved Banker/Player bets; ties are pushes and excluded to avoid inflating turnover. Net / 100 wagered = 100 × net units ÷ total units wagered (negative means loss). These are in-sample comparisons; a favorable result should be retested on fresh shoes.';output.append(note);
  status.textContent='Finished four stopping-rule comparisons. Lower drawdown means less simulated peak-to-trough loss.';
 }catch(e){status.textContent='Stopping-rule comparison error: '+e.message}
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


let bestSetupForVerification=null;
const simple=document.createElement('section');simple.className='panel';simple.id='cc-best-simple';
simple.innerHTML='<h2>🏆 Find My Best Strategy</h2><p class="muted">Compare four baccarat roads across three training batches, then check finalists on separate shoes. Ranks by average net units per shoe and shows batch consistency. No strategy is guaranteed to profit.</p><label>Roads to test <select id="cc-best-road"><option value="all">All four roads</option><option value="big">Big Road</option><option value="eye">Big Eye Boy</option><option value="small">Small Road</option><option value="cockroach">Cockroach Road</option></select></label><label>Shoes to test <input id="cc-best-count" type="number" min="25" max="10000" step="1" value="10000" style="width:110px"></label><label>Stop after <select id="cc-best-hits"><option value="1">1 winning column per shoe</option><option value="2">2 winning columns per shoe</option><option value="whole" selected>Whole shoe</option></select></label><button id="cc-best-go" type="button" class="player">Find my best setup</button><p id="cc-best-status" class="muted">Choose a shoe count and load at least that many shoes.</p><div id="cc-best-answer"></div><button id="cc-verify-go" type="button" class="player" disabled>Verify My Best Strategy</button><p id="cc-verify-status" class="muted">Find your best setup first, then verify it on reserved shoes not used by the optimizer.</p><div id="cc-verify-answer"></div><details><summary>Advanced tools and statistics</summary><p class="muted">The detailed strategy tester, optimizer, comparison and calendar remain available elsewhere on this page.</p></details>';
optimizer.insertAdjacentElement('beforebegin',simple);
$('cc-best-go').onclick=async()=>{
 const button=$('cc-best-go'),status=$('cc-best-status'),out=$('cc-best-answer');
 const requested=Math.floor(Number($('cc-best-count').value));if(!Number.isFinite(requested)||requested<25||requested>10000){status.textContent='Choose between 25 and 10,000 shoes.';return}if(!dataset||dataset.size<requested){status.textContent='Load at least '+requested.toLocaleString()+' shoes first (currently '+(dataset?dataset.size:0)+').';return}
 button.disabled=true;out.replaceChildren();bestSetupForVerification=null;$('cc-verify-go').disabled=true;$('cc-verify-answer').replaceChildren();
 try{
 const chosenHits=$('cc-best-hits').value,winLimit=chosenHits==='whole'?Infinity:Number(chosenHits);const all=Array.from(dataset.values()).slice(0,requested),batchSize=Math.floor(requested*0.3/3),trainCount=batchSize*3,holdoutCount=Math.floor(requested*0.2),train=all.slice(0,trainCount),holdout=all.slice(trainCount,trainCount+holdoutCount),verifyOffset=trainCount+holdoutCount,verifyCount=requested-verifyOffset,roadSelection=$('cc-best-road').value,roads=roadSelection==='all'?['big','eye','small','cockroach']:[roadSelection];
 if(batchSize<1||holdoutCount<1||verifyCount<1){status.textContent='Choose more shoes for meaningful sample sizes.';return}
 const configs=[];
 for(const roadType of roads)for(const strategy of ['match','mismatch'])for(const rows of [2,3,4,5,6])for(const item of [{mode:'flat',steps:4,name:'Flat'},{mode:'preset_safe',steps:4,name:'Conservative'},{mode:'doubleplus',steps:4,name:'Double + 1'}])configs.push({...item,roadType,strategy,rows});
 const ranked=[];
 for(let i=0;i<configs.length;i++){
  const c=configs[i];status.textContent='Searching '+(i+1)+' / '+configs.length+' setups…';
  const averages=[];for(let b=0;b<3;b++){const sample=train.slice(b*batchSize,(b+1)*batchSize);const r=await run(sample,null,true,{...c,start:1,capMethod:'steps',recovery:false,wins:winLimit});averages.push(r.net/sample.length)}
  ranked.push({...c,train:averages.reduce((a,b)=>a+b,0)/3,positiveBatches:averages.filter(x=>x>0).length});
 }
 ranked.sort((a,b)=>b.positiveBatches-a.positiveBatches||b.train-a.train);
 const finalists=ranked.slice(0,5),tested=[];
 for(const c of finalists){
  status.textContent='Checking finalists on unseen shoes…';
  const r=await run(holdout,null,true,{...c,start:1,capMethod:'steps',recovery:false,wins:winLimit});
  tested.push({...c,avg:r.net/holdout.length,rate:100*r.profitableShoes/holdout.length,drawdown:r.drawdown,worst:r.biggestLosingShoe});
 }
 tested.sort((a,b)=>b.avg-a.avg);
 const best=tested[0];bestSetupForVerification={...best,wins:winLimit,source:dataset,offset:verifyOffset,count:verifyCount};$('cc-verify-go').disabled=false;$('cc-verify-go').textContent='Verify My Best Strategy ('+verifyCount.toLocaleString()+' unused shoes)';$('cc-verify-status').textContent='Ready to verify on '+verifyCount.toLocaleString()+' separate shoes.';const heading=document.createElement('h3');heading.textContent=best.avg>0?'Best observed setup (not proven profitable)':'No profitable setup found on holdout';out.append(heading);
 const summary=document.createElement('p');summary.textContent=({big:'Big Road',eye:'Big Eye Boy',small:'Small Road',cockroach:'Cockroach Road'}[best.roadType])+' · '+best.strategy.toUpperCase()+' · '+best.rows+' rows · '+best.name+' · '+(chosenHits==='whole'?'Whole shoe':chosenHits+' winning column(s) per shoe')+' · 1-unit starting stake';out.append(summary);
 for(const [label,value] of [['Positive training batches',best.positiveBatches+' / 3'],['Average net / shoe',best.avg.toFixed(3)+' units'],['Profitable shoes',best.rate.toFixed(1)+'%'],['Maximum bankroll drawdown',best.drawdown.toFixed(2)+' units'],['Worst shoe',best.worst===null?'—':best.worst.toFixed(2)+' units']]){const p=document.createElement('p');p.textContent=label+': '+value;out.append(p)}
 const note=document.createElement('p');note.className='muted';note.textContent='Screened '+configs.length+' setups in three separate '+batchSize+'-shoe training batches and checked five finalists on '+holdout.length+' different shoes. Choosing the highest holdout result can still overfit; a fresh untouched sample is needed before trusting any positive result. Betting systems cannot remove the casino house edge.';out.append(note);
 status.textContent='Completed.';
 }catch(e){status.textContent='Search error: '+e.message}finally{button.disabled=false}
};

$('cc-verify-go').onclick=async()=>{
 const status=$('cc-verify-status'),out=$('cc-verify-answer'),button=$('cc-verify-go'),chosen=bestSetupForVerification;
 if(!chosen||chosen.source!==dataset){status.textContent='Find your best setup again on the current dataset first.';return}
 const shoes=Array.from(dataset.values()).slice(chosen.offset,chosen.offset+chosen.count);
 if(shoes.length!==chosen.count){status.textContent='The selected verification shoes are unavailable.';return}
 button.disabled=true;out.replaceChildren();status.textContent='Verifying '+chosen.strategy+' / '+chosen.rows+' rows / '+chosen.name+' on '+chosen.count.toLocaleString()+' untouched-by-optimizer shoes…';
 try{
 const r=await run(shoes,null,true,{roadType:chosen.roadType,strategy:chosen.strategy,rows:chosen.rows,mode:chosen.mode,steps:4,start:1,capMethod:'steps',recovery:false,wins:chosen.wins});
 const avg=r.net/shoes.length,heading=document.createElement('h3');heading.textContent=avg>0?'Positive on verification sample — not proof of an edge':'Not profitable on verification sample';out.append(heading);
 for(const [label,value] of [['Setup',chosen.roadType+' · '+chosen.strategy.toUpperCase()+' · '+chosen.rows+' rows · '+chosen.name+' · '+(chosen.wins===Infinity?'Whole shoe':chosen.wins+' winning column(s) per shoe')],['Average net per shoe',avg.toFixed(3)+' units'],['Total net',r.net.toFixed(2)+' units'],['Profitable shoes',(100*r.profitableShoes/shoes.length).toFixed(1)+'%'],['Maximum drawdown',r.drawdown.toFixed(2)+' units'],['Worst shoe',r.biggestLosingShoe===null?'—':r.biggestLosingShoe.toFixed(2)+' units']]){const p=document.createElement('p');p.textContent=label+': '+value;out.append(p)}
 const note=document.createElement('p');note.className='muted';note.textContent='Used shoes '+(chosen.offset+1)+'–'+(chosen.offset+chosen.count)+' from the loaded dataset, separate from optimizer training and finalist selection. These are not newly generated shoes. A positive result does not establish a real-world betting edge, and reuse of previously inspected data weakens independence.';out.append(note);
 status.textContent='Verification completed on '+chosen.count.toLocaleString()+' separate shoes.';
 }catch(e){status.textContent='Verification error: '+e.message}finally{button.disabled=false}
};

const calendar=document.createElement('section');calendar.className='panel';calendar.id='cc-calendar';
calendar.innerHTML='<h2>📅 Daily / Monthly / Yearly Simulator</h2><p class="muted">Randomly resamples complete shoe profits from your last strategy test to explore possible playing schedules. This is a historical bootstrap, not a forecast or a guarantee.</p><div class="actions"><label>Shoes / playing day <input id="cc-cal-shoes" type="number" min="1" max="200" value="10" style="width:80px"></label><label>Playing days / month <input id="cc-cal-days" type="number" min="1" max="31" value="20" style="width:80px"></label><label>$ per unit <input id="cc-cal-unit" type="number" min="0.01" step="0.01" value="5" style="width:80px"></label><label>Starting bankroll (units) <input id="cc-cal-bankroll" type="number" min="0" step="1" value="1000" style="width:100px"></label><label>Simulation runs <select id="cc-cal-runs"><option value="500">500</option><option value="1000" selected>1,000</option><option value="3000">3,000</option></select></label><button id="cc-cal-run" type="button" class="player">Simulate calendar</button></div><p class="muted" id="cc-cal-status">Run Test my strategy first to load per-shoe profit results.</p><div id="cc-cal-results" style="overflow-x:auto"></div>';
optimizer.insertAdjacentElement('afterend',calendar);
$('cc-cal-run').onclick=async()=>{
 const status=$('cc-cal-status'),output=$('cc-cal-results'),button=$('cc-cal-run');
 if(!auditShoes.length){status.textContent='Run Test my strategy first; the calendar uses those exact shoe profits.';return}
 const num=(id,min,max)=>Math.min(max,Math.max(min,Number($(id).value)||min));
 const shoesPerDay=Math.floor(num('cc-cal-shoes',1,200)),daysPerMonth=Math.floor(num('cc-cal-days',1,31)),unit=num('cc-cal-unit',0.01,1000000),bankroll=num('cc-cal-bankroll',0,100000000),runs=Number($('cc-cal-runs').value);
 const profits=auditShoes.map(x=>x.net),annualDays=daysPerMonth*12;
 const samples=[],monthly=[],daily=[],drawdowns=[],ruins=[];let losingDays=0,losingMonths=0;
 button.disabled=true;output.replaceChildren();
 try{
  for(let runIndex=0;runIndex<runs;runIndex++){
   let balance=bankroll,peak=bankroll,maxDD=0,yearProfit=0,ruined=false;
   for(let m=0;m<12;m++){
    let monthProfit=0;
    for(let d=0;d<daysPerMonth;d++){
     let dayProfit=0;
     for(let sh=0;sh<shoesPerDay;sh++){
      if(balance<=0){ruined=true;break}
      const p=profits[Math.floor(Math.random()*profits.length)];
      dayProfit+=p;balance+=p;
      peak=Math.max(peak,balance);maxDD=Math.max(maxDD,peak-balance);
      if(balance<=0){ruined=true;break}
     }
     if(dayProfit<0)losingDays++;
     if(runIndex===0)daily.push(dayProfit);
     monthProfit+=dayProfit;
     if(ruined)break;
    }
    if(monthProfit<0)losingMonths++;
    if(runIndex===0)monthly.push(monthProfit);
    yearProfit+=monthProfit;
    if(ruined)break;
   }
   samples.push(yearProfit);drawdowns.push(maxDD);ruins.push(ruined);
   if(runIndex%100===99){status.textContent='Simulating '+(runIndex+1)+' / '+runs+' possible years…';await new Promise(resolve=>setTimeout(resolve,0))}
  }
  const sorted=samples.slice().sort((a,b)=>a-b),pct=q=>sorted[Math.floor((sorted.length-1)*q)];
  const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
  const fmt=n=>(n>=0?'+':'')+n.toFixed(2);
  const values=[
   ['Average daily profit (first example year)',fmt(mean(daily))+' units'],
   ['Average monthly profit (first example year)',fmt(mean(monthly))+' units'],
   ['Average annual profit ('+runs+' runs)',fmt(mean(samples))+' units'],
   ['Annual profit 10th–90th percentile',fmt(pct(.1))+' to '+fmt(pct(.9))+' units'],
   ['Annual profit in dollars (average)',(mean(samples)*unit).toFixed(2)+' USD'],
   ['Losing days (first example year)',daily.filter(x=>x<0).length+' / '+daily.length],
   ['Losing months (first example year)',monthly.filter(x=>x<0).length+' / '+monthly.length],
   ['Years finishing negative',(100*samples.filter(x=>x<0).length/runs).toFixed(1)+'%'],
   ['Average maximum bankroll drawdown',mean(drawdowns).toFixed(2)+' units'],
   ['Bankroll depleted during year',(100*ruins.filter(Boolean).length/runs).toFixed(1)+'%']
  ];
  const table=document.createElement('table');table.style.cssText='width:100%;min-width:320px;text-align:left';
  values.forEach(([label,value])=>{const tr=document.createElement('tr');for(const textValue of [label,value]){const td=document.createElement('td');td.textContent=textValue;td.style.cssText='padding:9px 6px;border-bottom:1px solid #405573;font-size:13px';tr.append(td)}table.append(tr)});
  output.append(table);
  const note=document.createElement('p');note.className='muted';note.textContent='Each simulated shoe is sampled with replacement from '+profits.length+' recorded shoe profits. A year is 12 months of '+daysPerMonth+' playing days; each playing day has '+shoesPerDay+' shoes. A simulated bankroll of zero or less stops further play. Example daily/monthly rows are from one randomly sampled year; annual rows summarize all '+runs+' years. Resampling assumes the observed shoe-profit distribution repeats, which may be false.';output.append(note);
  status.textContent='Completed '+runs.toLocaleString()+' simulated years using your latest '+profits.length.toLocaleString()+' tested shoes.';
 }catch(e){status.textContent='Calendar simulation error: '+e.message}
 finally{button.disabled=false}
};
$('cc-compare').onclick=async()=>{if(!dataset){$('cc-compare-status').textContent='Generate or upload shoes first.';return}const button=$('cc-compare');button.disabled=true;const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value));const status=$('cc-compare-status');$('cc-compare-results').replaceChildren();try{status.textContent='Testing Flat on '+shoes.length.toLocaleString()+' shoes…';await new Promise(r=>setTimeout(r,20));const flat=await run(shoes,'flat',true);status.textContent='Testing Double + 1 on the same shoes…';await new Promise(r=>setTimeout(r,20));const doubled=await run(shoes,'doubleplus',true);const table=document.createElement('table');table.style.cssText='width:100%;min-width:310px;text-align:left';status.textContent='Testing recovery on the same shoes…';const recovered=await run(shoes,'doubleplus',true,{recovery:true,steps:4});const entries=[['Metric','Flat','Double + 1','Recovery ×'+settings().recoveryMult],['Profitable shoes',(100*flat.profitableShoes/shoes.length).toFixed(1)+'%',(100*doubled.profitableShoes/shoes.length).toFixed(1)+'%',(100*recovered.profitableShoes/shoes.length).toFixed(1)+'%'],['Net units',flat.net.toFixed(2),doubled.net.toFixed(2),recovered.net.toFixed(2)],['Average units/shoe',(flat.net/shoes.length).toFixed(2),(doubled.net/shoes.length).toFixed(2),(recovered.net/shoes.length).toFixed(2)],['Losing shoes',flat.losingShoes,doubled.losingShoes,recovered.losingShoes],['Worst shoe',flat.biggestLosingShoe===null?'—':flat.biggestLosingShoe.toFixed(2),doubled.biggestLosingShoe===null?'—':doubled.biggestLosingShoe.toFixed(2),recovered.biggestLosingShoe===null?'—':recovered.biggestLosingShoe.toFixed(2)],['Break-even profitable shoes',flat.profitableShoes&&flat.losingShoes?(100*(Math.abs(flat.losingShoeLoss/flat.losingShoes))/(flat.winningShoeProfit/flat.profitableShoes+Math.abs(flat.losingShoeLoss/flat.losingShoes))).toFixed(2)+'%':'—',doubled.profitableShoes&&doubled.losingShoes?(100*(Math.abs(doubled.losingShoeLoss/doubled.losingShoes))/(doubled.winningShoeProfit/doubled.profitableShoes+Math.abs(doubled.losingShoeLoss/doubled.losingShoes))).toFixed(2)+'%':'—',recovered.profitableShoes&&recovered.losingShoes?(100*(Math.abs(recovered.losingShoeLoss/recovered.losingShoes))/(recovered.winningShoeProfit/recovered.profitableShoes+Math.abs(recovered.losingShoeLoss/recovered.losingShoes))).toFixed(2)+'%':'—']];for(const [i,row] of entries.entries()){const tr=document.createElement('tr');for(const value of row){const cell=document.createElement(i?'td':'th');cell.textContent=value;cell.style.cssText='padding:9px 5px;border-bottom:1px solid #405573;font-size:13px';tr.appendChild(cell)}table.appendChild(tr)}$('cc-compare-results').appendChild(table);status.textContent='Compared '+shoes.length.toLocaleString()+' identical shoes. Positive net units indicate simulated profit; neither result predicts future profitability.'}catch(e){status.textContent='Comparison error: '+e.message}finally{button.disabled=false}};
$('cc-run').onclick=async()=>{
 if(!dataset)return;$('cc-run').disabled=true;const shoes=Array.from(dataset.values()).slice(0,Number($('cc-count').value));$('cc-status').textContent='Running selected progression…';
 await new Promise(resolve=>setTimeout(resolve,30));
 try{
  const s=await run(shoes);window.dispatchEvent(new CustomEvent('baccarat-profit-results',{detail:{profits:s.shoeAudits.map(a=>a.net),drawdown:s.drawdown,config:settings(),count:shoes.length}}));auditShoes=s.shoeAudits;const select=$('cc-audit-select');select.replaceChildren();auditShoes.forEach(a=>{const opt=document.createElement('option');opt.value=String(a.number-1);opt.textContent='Shoe #'+a.number+' ('+(a.net>=0?'+':'')+a.net.toFixed(2)+')';select.appendChild(opt)});renderAudit();$('cc-audit-export').disabled=!auditShoes.length;const rate=s.wins+s.losses?(100*s.wins/(s.wins+s.losses)).toFixed(1)+'%':'—';
  const pct=shoes.length?(100*s.profitableShoes/shoes.length).toFixed(1)+'%':'—';
  const values=[['Strategy Profitability %',pct],['Profitable / Losing / Even shoes',s.profitableShoes+' / '+s.losingShoes+' / '+s.evenShoes],['Total net profit',(s.net>=0?'+':'')+s.net.toFixed(2)+' units'],['Average profit per shoe',(s.net/shoes.length>=0?'+':'')+(s.net/shoes.length).toFixed(2)+' units'],['Biggest winning shoe',s.biggestWinningShoe===null?'—':'+'+s.biggestWinningShoe.toFixed(2)+' units'],['Biggest losing shoe',s.biggestLosingShoe===null?'—':s.biggestLosingShoe.toFixed(2)+' units'],['Winning shoes needed to recover one losing shoe',s.profitableShoes&&s.losingShoes?(Math.abs(s.losingShoeLoss/s.losingShoes)/(s.winningShoeProfit/s.profitableShoes)).toFixed(2):'—']];
  $('cc-stats').replaceChildren();for(const [name,value] of values){const d=document.createElement('div');d.style.cssText='background:#0d1a2c;border-radius:10px;padding:10px';if(name==='Strategy Profitability %'){d.style.cssText+='grid-column:1/-1;text-align:center;border:2px solid #36bf99;padding:22px 12px'}const a=document.createElement('strong');a.style.cssText='display:block;font-size:'+(name==='Strategy Profitability %'?'44px':'20px')+';color:'+(name==='Strategy Profitability %'?'#36bf99':'#f4f7ff');a.textContent=value;const b=document.createElement('span');b.style.cssText='color:#a8b9d2;font-size:12px';b.textContent=name;d.append(a,b);$('cc-stats').append(d)}
  $('cc-status').textContent='Profitability % means the share of tested shoes finishing with positive net units, not the predicted chance of future profit. Completed '+shoes.length+' simulated shoes. Betting decisions used only earlier hands. Ties excluded from bet win rate. Total columns include the entire original shoe, even if the selected stop rule ends betting early.';
 }catch(e){$('cc-status').textContent='Error: '+e.message}
 finally{$('cc-run').disabled=false}
};
function renderAudit(){const a=auditShoes[Number($('cc-audit-select').value)];$('cc-audit-body').replaceChildren();if(!a){$('cc-audit-summary').textContent='Run a test to view the breakdown.';return}const wins=a.bets.filter(b=>b.delta>0).length,losses=a.bets.filter(b=>b.delta<0).length,ties=a.bets.filter(b=>b.outcome==='T').length;$('cc-audit-summary').textContent='Shoe #'+a.number+' · '+a.handCount+' hands processed · '+a.columns+' columns played · '+a.wins+' winning columns · '+wins+' wins / '+losses+' losses / '+ties+' ties · Net '+(a.net>=0?'+':'')+a.net.toFixed(2)+' units · Gross losing wagers '+a.shoeGrossLoss.toFixed(2)+' / '+(Number.isFinite(a.shoeLossCap)?a.shoeLossCap.toFixed(2):'no fixed budget')+' units · Stop: '+a.stopReason+(a.endingCycleNet===null?'':' · Hybrid cycle balance '+a.endingCycleNet.toFixed(2)+' units · Cycle resets '+a.cycleResets+' · Deepest cycle deficit '+a.largestCycleDeficit.toFixed(2)+' units');for(const b of a.bets){const tr=document.createElement('tr');for(const v of [b.hand,b.column,b.bet,b.stake.toFixed(2),b.outcome,(b.delta>=0?'+':'')+b.delta.toFixed(2),(b.net>=0?'+':'')+b.net.toFixed(2)]){const td=document.createElement('td');td.textContent=v;td.style.padding='8px 5px';tr.appendChild(td)}$('cc-audit-body').appendChild(tr)}}
$('cc-audit-select').addEventListener('change',renderAudit);
$('cc-audit-export').addEventListener('click',()=>{const lines=['Shoe,Hand,Column,Bet,Stake,Outcome,Delta units,Shoe running net'];for(const a of auditShoes)for(const b of a.bets)lines.push([a.number,b.hand,b.column,b.bet,b.stake.toFixed(2),b.outcome,b.delta.toFixed(2),b.net.toFixed(2)].join(','));const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'})),link=document.createElement('a');link.href=url;link.download='baccarat-shoe-profit-audit.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
})();