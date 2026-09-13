// Scheduler logic test: fake AudioContext, assert createAudio().time() wraps
// inside the loop and that start() schedules events in non-decreasing order.
global.window = {};   // audio.js only touches window inside createAudio()
let scheduled = [];
class FakeNode {
  constructor(){ this.gain={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}}; this.frequency=this.gain; this.Q={value:0}; this.type=''; this.buffer=null; this.ratio=this.threshold={value:0}; }
  connect(){} start(t){ this._t=t; scheduled.push(['start',t]); } stop(t){ scheduled.push(['stop',t]); }
}
const ctx = {
  currentTime: 0, sampleRate: 44100, destination: new FakeNode(), state:'running',
  resume(){ return Promise.resolve(); }, suspend(){},
  createOscillator: ()=> new FakeNode(), createGain: ()=> new FakeNode(),
  createBufferSource: ()=> new FakeNode(), createBiquadFilter: ()=> new FakeNode(),
  createDynamicsCompressor: ()=> new FakeNode(),
  createBuffer: (ch,len)=>({ getChannelData: ()=> new Float32Array(len) }),
};
global.window = { AudioContext: function(){ return ctx; } };
const { createAudio, LOOP } = await import('../js/audio.js');
const a = createAudio();
a.start();
// advance fake clock across two loops, pumping the scheduler manually
for (let s=0; s<=LOOP*2.05; s+=.3){ ctx.currentTime += .3; a.tick(); }
const starts = scheduled.filter(x=>x[0]==='start').map(x=>x[1]);
const ordered = starts.every((t,i)=> i===0 || t >= starts[i-1] - 1e-9);
console.log((ordered?'PASS':'FAIL')+`  scheduler: ${starts.length} nodes scheduled, non-decreasing order`);
let t0 = a.time();
ctx.currentTime += LOOP; let t1 = a.time();
const okWrap = Math.abs(t1 - t0) < .5001;   // modulo -> same phase (+/- one tick step)
console.log((okWrap?'PASS':'FAIL')+`  scheduler: time() wraps by loop (${t0.toFixed(2)} -> ${t1.toFixed(2)} after +LOOP)`);
// events actually got pushed by the real scheduler? it runs via setInterval - trigger manually:
process.exit((okWrap&&ordered)?0:1);
