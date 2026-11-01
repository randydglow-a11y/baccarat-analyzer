/* Custom Cockroach progression engine — isolated from the existing live tester.
   A cycle is profitable only when its cumulative net is strictly positive.
   Banker wins pay 0.95 per unit, Player wins 1.0, ties push. */
(function(root){
'use strict';
function parseSequence(input){
 const values=(Array.isArray(input)?input:String(input).split(',')).map(Number);
 if(!values.length||values.some(v=>!Number.isFinite(v)||v<=0))throw Error('Enter positive stakes separated by commas.');
 return values;
}
function create(options={}){
 const sequence=parseSequence(options.sequence||'1,3,7,15,15,30,30');
 const recoveryStart=Math.max(0,Math.min(sequence.length-1,Number(options.recoveryStart??3)));
 const lossesToAdvance=Math.max(1,Math.floor(Number(options.lossesToAdvance??2)));
 const winsToDescend=Math.max(1,Math.floor(Number(options.winsToDescend??2)));
 const target=Number(options.profitTarget??0);
 const maxRule=options.maxRule||'stop';
 let index=0,net=0,winRun=0,lossRun=0,stopped=false;
 const current=()=>sequence[index];
 function outcome(result,side='P'){
  if(stopped)return snapshot();
  if(result==='T')return snapshot();
  if(result!=='W'&&result!=='L')throw Error('Result must be W, L, or T.');
  const stake=current();
  net+=result==='L'?-stake:stake*(side==='B'?0.95:1);
  if(net>target){index=0;net=0;winRun=0;lossRun=0;return snapshot();}
  if(result==='W'){
   winRun++;lossRun=0;
   if(index>=recoveryStart&&winRun>=winsToDescend){index=Math.max(recoveryStart,index-1);winRun=0;}
  }else{
   lossRun++;winRun=0;
   const threshold=index<recoveryStart?1:lossesToAdvance;
   if(lossRun>=threshold){
    lossRun=0;
    if(index===sequence.length-1){if(maxRule==='stop')stopped=true;else if(maxRule==='reset')index=0;}
    else index++;
   }
  }
  return snapshot();
 }
 function snapshot(){return {stake:current(),index,net,winRun,lossRun,stopped};}
 return {outcome,snapshot,sequence:sequence.slice()};
}
root.CockroachProgression={parseSequence,create};
})(typeof window!=='undefined'?window:globalThis);
