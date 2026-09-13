// ASCENSION - timeline orchestrator. The show clocks off the audio loop
// (audio.time(), 0..LOOP); this file maps loop-time to scenes with 1.5s
// crossfades. No assets, no build step.
import * as THREE from 'three';
import { createAudio, LOOP } from './audio.js';
import { createPost } from './effects/post.js';
import starfield from './scenes/starfield.js';
import tunnel from './scenes/tunnel.js';
import terrain from './scenes/terrain.js';
import scroller from './scenes/scroller.js';
import boxfly from './scenes/boxfly.js';
import finale from './scenes/finale.js';

const FADE = 1.5;
// TIMELINE_START: each entry {name, dur, mod} - durations must sum to LOOP
const TIMELINE = [
  { name:'STARFIELD WARP', dur: LOOP*0.16, mod: starfield },
  { name:'TUNNEL VISION',  dur: LOOP*0.16, mod: tunnel },
  { name:'BOXY',           dur: LOOP*0.16, mod: boxfly },
  { name:'SUNSET FLYOVER', dur: LOOP*0.18, mod: terrain },
  { name:'GREETINGS',      dur: LOOP*0.14, mod: scroller },
  { name:'ASCENSION',      dur: LOOP*0.20, mod: finale },
];
// TIMELINE_END

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' });
const post = createPost(renderer);
const audio = createAudio();

const built = [];
// title-card texture: canvas text composited over the frame by the post pass
const title = (()=>{
  const cv=document.createElement('canvas'); cv.width=2048; cv.height=512;
  const x=cv.getContext('2d');
  x.clearRect(0,0,cv.width,cv.height);
  // dark band behind the letters
  x.fillStyle='rgba(0,0,0,.55)'; x.fillRect(0,0,cv.width,cv.height);
  x.font='900 200px ui-monospace, Menlo, monospace'; x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle='#ff003c'; x.fillText('ASCENSION', 1024+8, 258);
  x.fillStyle='#00e5ff'; x.fillText('ASCENSION', 1024-8, 254);
  x.fillStyle='#f5f2e8'; x.fillText('ASCENSION', 1024, 256);
  x.font='500 40px ui-monospace, Menlo, monospace'; x.fillStyle='#c8c4b8';
  x.fillText('FINALLY. TUNE IN NEXT YEAR', 1024, 430);
  const tex=new THREE.CanvasTexture(cv);
  return {tex};
})();
let acc = 0;
for (const s of TIMELINE){
  built.push({ ...s, from: acc, to: acc + s.dur, inst: null });
  acc += s.dur;
}
function inst(s){ if (!s.inst) s.inst = s.mod(); return s.inst; }

function sceneAt(t){
  for (let i=0;i<built.length;i++){
    if (t < built[i].to) return i;
  }
  return built.length-1;
}

function frame(){
  requestAnimationFrame(frame);
  if (!running) return;
  const t = audio.time();
  const idx = sceneAt(t);
  const cur = built[idx], curI = inst(cur);
  const w = innerWidth, h = innerHeight;
  const remain = cur.to - t;
  let b = null, mix = 0;
  if (remain < FADE){
    const nxt = built[(idx+1) % built.length], ni = inst(nxt);
    curI.update(t, 1, w, h, t - cur.from);
    ni.update(t, 1, w, h, 0);
    b = ni; mix = 1 - remain/FADE;
  } else {
    curI.update(t, 1, w, h, t - cur.from);
  }
  const endT = built[built.length-1];
  const titleAmt = (t > endT.to - 6) ? Math.min(1,(t-(endT.to-6))/.8) : 0;
  post.render(curI.scene, curI.cam, b && b.scene, b && b.cam, t, mix, title.tex, titleAmt);
  hud.textContent = cur.name;
}

// ---- boot ----
let running = false;
const hud = document.getElementById('sceneName');

function resize(){
  post.resize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

function start(){
  if (running) return;
  running = true;
  document.body.classList.add('running');
  audio.start();
  resize();
  requestAnimationFrame(frame);
}

// ---- screener (12s webm proves realtime) ----
const recBtn = document.getElementById('record');
recBtn.addEventListener('click', () => {
  if (!running || recBtn.disabled) return;
  recBtn.disabled = true;
  const stream = canvas.captureStream(30);
  const mr = new MediaRecorder(stream, { mimeType:'video/webm' });
  const chunks = [];
  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  mr.onstop = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(chunks, { type:'video/webm' }));
    a.download = 'ascension-screener.webm';
    a.click();
    recBtn.disabled = false;
  };
  mr.start(); hud.textContent = 'RECORDING 12s...';
  setTimeout(() => mr.stop(), 12000);
});

document.getElementById('start').addEventListener('click', start);
addEventListener('keydown', e => {
  if (!running){ start(); return; }
  if (e.key === 'r' || e.key === 'R') recBtn.click();
});
// touch: any tap on the overlay starts (button is inside it, so full-screen tap)
document.getElementById('overlay').addEventListener('touchstart', start, { passive:true });
