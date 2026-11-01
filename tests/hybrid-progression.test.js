/* Run in browser after loading hybrid-progression.js */
(function(){
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const C=window.CockroachProgression;
let p=C.create({sequence:'1,3,7,15,15,30,30',recoveryStart:3,maxRule:'stay'});
p.outcome('L');p.outcome('L');p.outcome('L');
assert(p.snapshot().stake===15,'Early losses reach 15');
p.outcome('L');assert(p.snapshot().stake===15,'First loss repeats 15');
p.outcome('L');assert(p.snapshot().stake===30,'Second loss advances to 30');
p.outcome('L');assert(p.snapshot().stake===30,'First loss at 30 stays at 30');
p.outcome('W');assert(p.snapshot().stake===30,'First win repeats 30');
p.outcome('W');assert(p.snapshot().stake===15,'Second win descends to 15 when negative');
const before=p.snapshot();p.outcome('T');assert(p.snapshot().stake===before.stake&&p.snapshot().net===before.net,'Tie is neutral');
let q=C.create({sequence:'1,3,7,15,15,30,30'});
q.outcome('L');q.outcome('W');assert(q.snapshot().stake===1&&q.snapshot().net===0,'Positive recovery resets');
let b=C.create({sequence:'1,3,7,15,15,30,30'});b.outcome('L');b.outcome('W','B');assert(b.snapshot().stake===1,'Banker commission applied');
let m=C.create({sequence:'1,3,7,15,15,30,30',maxRule:'stop'});for(let i=0;i<9;i++)m.outcome('L');assert(m.snapshot().stopped,'Maximum step stops');
console.log('Hybrid progression unit tests passed');
})();