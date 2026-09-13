// S4: the obligatory greetings scroller. Text rendered to a canvas texture
// (procedural, no external fonts), mapped onto a gently waving plane.
import * as THREE from 'three';

const LINES = [
  ' ASCENSION ......... A REALTIME WEBGL PRODUCTION ......... CODE, MATH AND SYNTHS ONLY - NO ASSETS WERE LOADED ',
  '',
  ' GREETINGS TO ....... NOUS RESEARCH ............ THE AGENT THAT WROTE THIS AT 8PM ON A SUNDAY NEEDS A VACATION ',
  ' LATTICE ATOM ....... 833 STEPS OF PURE WILLPOWER ....... IT STILL THINKS EVERY STORY STARTS WITH A PUPPY ',
  ' THE MINECRAFT CREW . YOU KNOW WHO YOU ARE. MOSTLY THE ONE WHO DIED TO A CREEPER TWICE IN ONE MINUTE ',
  ' WHOEVER READS THIS AT 3AM . WE ARE NOT JUDGING. WE ALSO LIVE HERE ',
  '',
  ' TECHNICAL DEBT ....... ZERO ASSETS ........ ZERO APOLOGIES ........ 60FPS OR BUST ',
  ' NO BUNDLER NO FRAMEWORK NO MP3 ANALYSER ........ YES, WE HEARD THE REQUEST ........ IT IS COMING ',
  '',
  ' ASCENSION CONTINUES ......... PLASMA ......... TITLE CARD ......... TUNE IN NEXT YEAR ......... ',
];

function makeTexture(){
  const cv = document.createElement('canvas');
  cv.width = 4096; cv.height = 640;
  const x = cv.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0,0,cv.width,cv.height);
  x.font = '900 56px ui-monospace, Menlo, monospace';
  x.textBaseline = 'top';
  LINES.forEach((ln,i)=>{
    const y = 18 + i*50;
    // chromatic stack for glow
    x.fillStyle = '#ff003c'; x.fillText(ln, 6, y);
    x.fillStyle = '#00e5ff'; x.fillText(ln, -6, y+2);
    x.fillStyle = '#f5f2e8'; x.fillText(ln, 0, y+1);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return {tex, w:cv.width, h:cv.height};
}

const vert = /* glsl */`
uniform float uT; varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position;
  p.z += sin(p.y*2.0 + uT*1.4)*0.35 + sin(p.x*.6 + uT)*.25;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const frag = /* glsl */`
uniform sampler2D map_; uniform float uT; uniform float uFade;
varying vec2 vUv;
void main(){
  vec2 uv = vUv; uv.x = fract(uv.x - uT*.045);
  vec3 c = texture2D(map_, uv).rgb;
  c *= 1.0 + .15*sin(uT*7.+uv.y*22.);                 // shimmer
  c += vec3(.0,.5,.9)*smoothstep(.94,1.,c.g)*.2;       // cyan edges pop
  gl_FragColor = vec4(c*uFade, 1.);
}`;

export default function scroller(){
  const {tex} = makeTexture();
  const geo = new THREE.PlaneGeometry(64, 10, 64, 24);  // matches 4096x640 canvas aspect
  const mat = new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag,
    uniforms:{ map_:{value:tex}, uT:{value:0}, uFade:{value:1} },
    transparent:true, side:THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  const scene = new THREE.Scene();
  scene.add(mesh);
  // faint grid floor to sell the space
  const grid = new THREE.GridHelper(200, 60, 0x223344, 0x111a26);
  grid.position.y = -6;
  grid.material.transparent = true;
  scene.add(grid);
  const cam = new THREE.PerspectiveCamera(60,1,.1,300);
  cam.position.set(0, 1.2, 14);
  return {
    scene, cam,
    update(t, fade){
      mat.uniforms.uT.value = t; mat.uniforms.uFade.value = fade;
      mesh.rotation.y = Math.sin(t*.4)*.18;
      cam.position.y = 1.2 + Math.sin(t*.7)*.6;
      grid.material.opacity = .5*fade;
    },
    dispose(){ geo.dispose(); mat.dispose(); tex.dispose(); grid.geometry.dispose(); grid.material.dispose(); }
  };
}
