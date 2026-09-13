// S1: 20k-point warp starfield. Pure GPU: positions in a cylinder,
// z recycled by the shader via uT so no CPU updates.
import * as THREE from 'three';

const N = 20000;
const vert = /* glsl */`
uniform float uT; uniform float uFade;
attribute float aS;      // per-point speed factor
attribute vec3 aC;      // per-point color
varying vec3 vC; varying float vA;
void main(){
  vC = aC;
  vec3 p = position;
  float z = mod(p.z - uT*180.0*aS, 400.0) - 400.0;   // recycle -400..0
  float dist = length(p.xy);
  vA = uFade * clamp((z+400.0)/90.0,0.0,1.0);        // fade in from far
  vec4 mv = modelViewMatrix * vec4(vec3(p.xy, z), 1.0);
  gl_PointSize = clamp(aS*9.0*(1.0+z/400.0)+1.0, 1.0, 16.0);  // bigger near camera
  gl_Position = projectionMatrix * mv;
}`;
const frag = /* glsl */`
varying vec3 vC; varying float vA;
void main(){
  vec2 d = gl_PointCoord - .5;
  float r = length(d);
  if (r > .5) discard;
  float glow = smoothstep(.5,.0,r);
  gl_FragColor = vec4(vC*glow*(1.0+vA)*uFade, 1.);
}`;

export default function starfield(){
  const pos = new Float32Array(N*3), spd = new Float32Array(N), col = new Float32Array(N*3);
  for (let i=0;i<N;i++){
    const a = Math.random()*Math.PI*2, r = 4 + Math.pow(Math.random(),.5)*120;
    pos[i*3]=Math.cos(a)*r; pos[i*3+1]=Math.sin(a)*r; pos[i*3+2]=-Math.random()*400;
    spd[i]=.5+Math.random()*Math.random()*2;
    const t=Math.random();
    col[i*3]=.6+.4*t; col[i*3+1]=.7+.3*(1-t); col[i*3+2]=1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  g.setAttribute('aS', new THREE.BufferAttribute(spd,1));
  g.setAttribute('aC', new THREE.BufferAttribute(col,3));
  const m = new THREE.ShaderMaterial({
    vertexShader:vert, fragmentShader:frag,
    uniforms:{ uT:{value:0}, uFade:{value:1} },
    transparent:true, blending:THREE.AdditiveBlending, depthWrite:false
  });
  const pts = new THREE.Points(g,m);
  const scene = new THREE.Scene(); scene.add(pts);
  const cam = new THREE.PerspectiveCamera(72,1,.1,600);
  return {
    scene, cam,
    update(t, fade){ m.uniforms.uT.value=t; m.uniforms.uFade.value=fade; pts.rotation.z=t*.02; }
  };
}
