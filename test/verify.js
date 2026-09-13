// Offline verification: syntax via node --check (run separately), audio event
// ordering, timeline sums, and that every module the page imports exists.
import { readFileSync, existsSync } from 'node:fs';
import { buildEvents, LOOP, BEAT, BPM } from '../js/audio.js';

let fail = 0;
const ok = (name, cond, detail='') => {
  console.log((cond?'PASS':'FAIL')+'  '+name+(detail?'  ['+detail+']':''));
  if (!cond) fail++;
};

// 1. audio events monotonic + within loop + expected instrument mix
const ev = buildEvents();
ok('audio: events generated', ev.length > 1000, ev.length + ' events');
ok('audio: strictly time-ordered', ev.every((e,i)=> i===0 || e.t >= ev[i-1].t));
ok('audio: all inside loop', ev.every(e => e.t >= 0 && e.t < LOOP), 'LOOP=' + LOOP.toFixed(2) + 's');
const kinds = new Set(ev.map(e=>e.type));
['kick','snare','hat','bass','arp','riser','crash'].forEach(k =>
  ok('audio: has ' + k, kinds.has(k)));
const bpmHz = BPM/60;
ok('audio: BPM in 128-140 range', bpmHz >= 128/60 && bpmHz <= 140/60, BPM + ' BPM');

// 2. timeline: parse main.js between markers, assert 5 scenes summing to LOOP
const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const block = main.split('// TIMELINE_START')[1].split('// TIMELINE_END')[0];
const rows = [...block.matchAll(/\{\s*name:'([^']+)'\s*,\s*dur:\s*LOOP\*([\d.]+)\s*,\s*mod:\s*(\w+)\s*\}/g)];
ok('timeline: 5 scenes', rows.length === 5, rows.map(r=>r[1]).join(', '));
const sum = rows.reduce((a,r)=>a+parseFloat(r[2]), 0);
ok('timeline: fractions sum to 1.0', Math.abs(sum-1) < 1e-9, 'sum=' + sum);
const expect = { starfield:'js/scenes/starfield.js', tunnel:'js/scenes/tunnel.js',
  terrain:'js/scenes/terrain.js', scroller:'js/scenes/scroller.js', finale:'js/scenes/finale.js' };
for (const r of rows){
  const mod = r[3];
  const imp = "./" + expect[mod].replace("js/", "");   // main.js imports ./scenes/...
  ok('timeline: module declared+file exists for ' + mod,
     main.includes("from '"+imp+"'") && existsSync(new URL('../'+expect[mod], import.meta.url)));
}
ok('loop length 45-90s', LOOP >= 45 && LOOP <= 90, LOOP.toFixed(1)+'s');

process.exit(fail ? 1 : 0);
