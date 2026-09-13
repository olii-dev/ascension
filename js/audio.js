// Procedural techno track + master clock. All scheduling derives from
// AudioContext.currentTime so the visual timeline stays sample-accurate.
// BPM 133, A minor, 16 bars = 24 beats... structure below. Exported buildEvents()
// is pure (no WebAudio) so tests can assert ordering.

export const BPM = 133;
export const BEAT = 60 / BPM;              // seconds per beat
export const BAR = BEAT * 4;               // seconds per bar
export const BARS = 36;                    // 36-bar loop = 144 beats
export const LOOP = BAR * BARS;            // ~65 s

// A minor scale degrees used: A2 root bass, arp notes from A minor + G F
const ARP = [
  // 4-bar arp pattern (semitones over A3), varied across the loop
  {bar:0,  pat:[0,7,12,7, 0,7,12,15, 12,7,3,7, 0,-2,3,7]},      // Am
  {bar:8,  pat:[0,3,7,12, 10,7,3,0, -2,3,7,10, 12,10,7,3]},     // F
  {bar:12, pat:[-2,5,7,12, 7,5,-2,-5, 0,3,7,12, 15,12,7,3]},    // G
  {bar:16, pat:[0,7,12,19, 17,12,7,0, 3,10,15,22, 20,15,10,3]}, // Am->C spread
  {bar:24, pat:[7,12,16,19, 17,14,12,7, 3,7,10,14, 12,10,7,3]}, // high answer
];
const BASS = [0,0,12,0, 0,-3,0,3]; // 8th-note bass root movement per bar-pair

export function buildEvents(){
  const ev = [];
  const kickBars = [
    // section, barFrom, barTo, pattern
    ['drive', 0, 8,  'four'],   // four on the floor
    ['build', 8, 16, 'four'],
    ['stab',  16, 24, 'four'],
    ['out',   24, 32, 'four'],
    ['idle',  32, 36, 'none'],
  ];
  for (const [, b0, b1, pat] of kickBars){
    for (let b = b0; b < b1; b++){
      if (pat === 'four'){
        for (let s = 0; s < 4; s++){
          const t = (b*4 + s) * BEAT;
          ev.push({ t, type:'kick', v: s===0?1:.9 });
        }
      }
      if (b >= 2){
        // snare on 2 & 4
        ev.push({ t:(b*4+1)*BEAT, type:'snare' });
        ev.push({ t:(b*4+3)*BEAT, type:'snare' });
      }
      // hats on 8ths from bar 1, 16ths in the heavy section
      const div = b >= 16 ? 4 : 2;
      for (let h = 0; h < 4*div; h++){
        const t = (b*4)*BEAT + h*BEAT/div;
        ev.push({ t, type:'hat', v: h % div === 0 ? .5 : .28 });
      }
    }
  }
  // bass: 8th notes, root follows BASS table (A2 = 55hz via midi 45)
  for (let b = 0; b < 32; b++){
    for (let e = 0; e < 8; e++){
      const st = BASS[(b*8+e) % BASS.length];
      const t = (b*4)*BEAT + e*BEAT/2;
      ev.push({ t, type:'bass', midi: 45+st, dur: BEAT/2*.9 });
    }
  }
  // arpeggio lead: 16th-note per bar, sections of 4 bars each
  for (const sec of ARP){
    for (let b = 0; b < 4; b++){
      if (sec.bar + b >= 28) break;
      sec.pat.forEach((n, i)=>{
        const t = ((sec.bar+b)*4)*BEAT + i*(BEAT/4);
        ev.push({ t, type:'arp', midi: 69+n, dur: BEAT/4*.8 });
      });
    }
  }
  // riser sfx at end of each 8-bar section, crash into the big shifts
  [7.5, 15.5, 23.5, 31.5].forEach(b=> ev.push({ t:b*4*BEAT, type:'riser', dur: 4*BEAT }));
  [16,24,32].forEach(b=> ev.push({ t:b*4*BEAT, type:'crash' }));
  ev.sort((a,c)=>a.t-c.t);
  return ev;
}

export function createAudio(){
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = .8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value=-14; comp.ratio.value=6;
  master.connect(comp); comp.connect(ctx.destination);

  // noise buffer for snare/hat/crash
  const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i=0;i<nd.length;i++) nd[i] = Math.random()*2-1;

  const hz = m => 440*Math.pow(2,(m-69)/12);

  function kick(t,v){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(44,t+.09);
    g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.001,t+.22);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+.25);
  }
  function snare(t){
    const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    s.buffer=nb; f.type='highpass'; f.frequency.value=1400;
    g.gain.setValueAtTime(.5,t); g.gain.exponentialRampToValueAtTime(.001,t+.14);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+.16);
    const o=ctx.createOscillator(),og=ctx.createGain(); o.frequency.value=190;
    og.gain.setValueAtTime(.3,t); og.gain.exponentialRampToValueAtTime(.001,t+.08);
    o.connect(og); og.connect(master); o.start(t); o.stop(t+.1);
  }
  function hat(t,v){
    const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    s.buffer=nb; f.type='highpass'; f.frequency.value=7000;
    g.gain.setValueAtTime(v*.5,t); g.gain.exponentialRampToValueAtTime(.001,t+.04);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+.05);
  }
  function bass(t,m,d){
    const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type='sawtooth'; o.frequency.value=hz(m);
    f.type='lowpass'; f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(120,t+d);
    g.gain.setValueAtTime(.35,t); g.gain.setTargetAtTime(0,t+d*.7,.02);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t+d+.1);
  }
  function arp(t,m,d){
    const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type='square'; o.frequency.value=hz(m);
    f.type='lowpass'; f.frequency.value=2600;
    g.gain.setValueAtTime(.09,t); g.gain.setTargetAtTime(0,t+d*.6,.03);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t+d+.2);
    // echo slap
    const g2=ctx.createGain(); g2.gain.value=.035; o.connect(g2); g2.connect(master);
  }
  function riser(t,d){
    const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    s.buffer=nb; s.loop=true; f.type='bandpass'; f.Q.value=6;
    f.frequency.setValueAtTime(200,t); f.frequency.exponentialRampToValueAtTime(6000,t+d);
    g.gain.setValueAtTime(.001,t); g.gain.linearRampToValueAtTime(.25,t+d*.9); g.gain.linearRampToValueAtTime(0,t+d);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+d+.1);
  }
  function crash(t){
    const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    s.buffer=nb; f.type='highpass'; f.frequency.value=5000;
    g.gain.setValueAtTime(.4,t); g.gain.exponentialRampToValueAtTime(.001,t+1.4);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+1.5);
  }
  const play={kick,snare,hat,bass,arp,riser,crash};

  const events = buildEvents();
  let startT = 0, idx = 0, timer = 0;
  function scheduler(){
    const ahead = .6;
    const now = ctx.currentTime - startT;
    while (idx < events.length && events[idx].t < now + ahead){
      const e = events[idx];
      const at = startT + e.t;
      if (e.type==='riser'||e.type==='crash') play[e.type](at, e.dur);
      else if (e.type==='kick') kick(at, e.v);
      else if (e.type==='hat') hat(at, e.v);
      else play[e.type](at, e.midi, e.dur);
      idx++;
    }
    if (idx >= events.length){ idx = 0; startT += LOOP; } // wrap
  }
  return {
    ctx,
    start(){ ctx.resume(); startT = ctx.currentTime + .1; idx = 0; timer = setInterval(()=>scheduler(), 60); },
    tick(){ scheduler(); }, // manual pump for tests
    // seconds into the loop, always 0..LOOP — the visual timeline clocks off this
    time(){ return startT ? ((ctx.currentTime - startT) % LOOP + LOOP) % LOOP : 0; },
    stop(){ clearInterval(timer); ctx.suspend(); }
  };
}
