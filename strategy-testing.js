(function(){
'use strict';
const replay=document.getElementById('wizard-replay');if(!replay)return;
const panel=document.createElement('section');panel.className='panel';panel.id='strategy-test-dashboard';
panel.innerHTML='<h2>📊 Strategy Testing Dashboard</h2><p class="muted">Choose a Banker or Player bet BEFORE revealing the next hand. A Tie is a push. Results use a flat 1-unit stake and standard 5% Banker commission. This measures your decisions, not predictive accuracy.</p><div class="actions"><button id="st-b" class="banker" disabled>Bet Banker</button><button id="st-p" class="player" disabled>Bet Player</button><button id="st-skip" class="secondary" disabled>Skip bet</button></div><p id="st-pending" class="muted">Load a simulated shoe to begin.</p><div id="st-stats" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0"></div><p id="st-last" class="muted"></p><div class="actions"><button id="st-reset" class="secondary">Clear test results</button><button id="st-export" class="secondary">Export CSV</button></div><p class="muted" style="font-size:12px">Only individually revealed hands with a bet selected in advance are scored. +5 and Reveal all do not create bets. Previous hand reverses any recorded result for that hand. Results are held in this page until you leave or refresh.</p>';
replay.insertAdjacentElement('afterend',panel);
const $=id=>document.getElementById(id);
let active=false,shoe=null,hand=0,pending=null,records=[];
const fmt=n=>(n>=0?'+':'')+n.toFixed(2);
function stats(){
 const bets=records.filter(r=>r.bet),wins=bets.filter(r=>r.outcome===r.bet).length,losses=bets.filter(r=>r.outcome!=='T'&&r.outcome!==r.bet).length,pushes=bets.filter(r=>r.outcome==='T').length;
 const profit=bets.reduce((v,r)=>v+(r.outcome==='T'?0:r.outcome===r.bet?(r.bet==='B'?.95:1):-1),0);
 const cells=[['Bets',bets.length],['Wins / Losses',wins+' / '+losses],['Pushes (ties)',pushes],['Win rate (resolved)',wins+losses?(100*wins/(wins+losses)).toFixed(1)+'%':'—'],['Net units',fmt(profit)],['Hands revealed',hand]];
 $('st-stats').replaceChildren();for(const [k,v] of cells){const d=document.createElement('div');d.style.cssText='background:#0d1a2c;border-radius:12px;padding:12px';const a=document.createElement('div');a.textContent=v;a.style.cssText='font-size:24px;font-weight:700';const b=document.createElement('div');b.textContent=k;b.style.cssText='font-size:12px;color:#a8b9d2';d.append(a,b);$('st-stats').append(d)}
 $('st-b').disabled=$('st-p').disabled=$('st-skip').disabled=!active;
 $('st-pending').textContent=!active?'Load a simulated shoe to begin.':pending?'Next hand: '+(pending==='B'?'Banker':'Player')+' bet queued (1 unit)':'No bet queued for next hand. Choose Banker or Player, or skip.';
 $('st-last').textContent=records.length?('Last scored hand: #'+records[records.length-1].hand+' · Bet '+(records[records.length-1].bet||'skipped')+' · Result '+records[records.length-1].outcome):'No bets scored yet.';
}
$('st-b').onclick=()=>{pending='B';stats()};
$('st-p').onclick=()=>{pending='P';stats()};
$('st-skip').onclick=()=>{pending=null;stats()};
$('st-reset').onclick=()=>{if(!confirm('Clear this strategy test? Saved shoes will not change.'))return;records=[];pending=null;stats()};
$('st-export').onclick=()=>{if(!records.length){alert('No test results to export yet.');return}const lines=['Shoe,Hand,Bet,Outcome,Units',...records.map(r=>[r.shoe,r.hand,r.bet||'SKIP',r.outcome,r.bet?(r.outcome==='T'?0:r.outcome===r.bet?(r.bet==='B'?.95:1):-1):0].join(','))];const blob=new Blob([lines.join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='baccarat-strategy-test.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.addEventListener('baccarat-replay-change',e=>{
 const d=e.detail;if(!d||!d.active){active=false;pending=null;hand=0;stats();return}
 if(shoe!==d.shoe){shoe=d.shoe;hand=0;pending=null}
 if(d.position<hand){records=records.filter(r=>r.shoe!==shoe||r.hand<=d.position);pending=null}
 if(d.position>hand){if(d.position===hand+1&&d.action==='next'){records.push({shoe,hand:d.position,bet:pending,outcome:d.hands[d.position-1]})}pending=null}
 hand=d.position;active=hand<d.total;stats();
});
stats();
})();