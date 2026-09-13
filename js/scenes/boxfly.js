// S6: BOXY — the classic Euclidean boxfly. 288 textured quads streaming out
// of the screen toward you, positions recycled entirely in the vertex shader.
// The texture is a procedurally drawn smiley (demoscene tradition), no files.
import * as THREE from 'three';

const vert = /* glsl */`
uniform float uT;
attribute vec3 aBase;    // x,y offset and phase seed
varying vec2 vUv; varying float vA;
void main(){
  vUv = uv;
  // z marches 400 -> 0 and wraps; phase per instance keeps it organic
  float z = mod(aBase.z*400.0 - uT*140.0, 400.0) - 400.0;
  vA = clamp(1.0 - (-z)/400.0, 0.0, 1.0) * clamp((z+400.0)/120.0, 0.0, 1.0);
  vec4 wp = modelViewMatrix * vec4(position.xy + aBase.xy*0.6, z, 1.0);
  gl_Position = projectionMatrix * wp;
}`;
const frag = /* glsl */`
uniform sampler2D map_; uniform float uT; uniform float uFade;
varying vec2 vUv; varying float vA;
void main(){
  vec2 p = vUv*2.-1.;
  float r = length(p);
  if (r > 1.) discard;
  vec4 t4 = texture2D(map_, vUv);
  vec3 c = t4.rgb * (1.0 + 0.55*sin(uT*4.0 + vUv.x*6.283 + vUv.y*3.14)); // hue-pulse brightness
  gl_FragColor = vec4(c*uFade*vA, 1.0);
}`;

function smiley(){
  const cv=document.createElement('canvas'); cv.width=cv.height=256;
  const x=cv.getContext('2d'), cx=128;
  x.fillStyle='#ffd166'; x.beginPath(); x.arc(cx,cx,120,0,7); x.fill();
  x.fillStyle='#111';
  x.beginPath(); x.arc(cx-42,cx-30,16,0,7); x.fill();
  x.beginPath(); x.arc(cx+42,cx-30,16,0,7); x.fill();
  x.strokeStyle='#111'; x.lineWidth=14; x.lineCap='round';
  x.beginPath(); x.arc(cx,cx+16,64,0.25*Math.PI,0.75*Math.PI); x.stroke();
  return new THREE.CanvasTexture(cv);
}

export default function boxfly(){
  const tex = smiley();
  const N = 288;
  const base = new Float32Array(N*3);
  for (let i=0;i<N;i++){
    const a=Math.random()*Math.PI*2, r=6+Math.pow(Math.random(),.6)*46;
    base[i*3]=Math.cos(a)*r; base[i*3+1]=Math.sin(a)*r; base[i*3+2]=Math.random();
  }
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(3.2,3.2));
  geo.instanceCount = N;
  geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(base,3));
  const mat = new THREE.ShaderMaterial({vertexShader:vert, fragmentShader:frag,
    uniforms:{map_:{value:tex}, uT:{value:0}, uFade:{value:1}},
    transparent:true, side:THREE.DoubleSide, depthWrite:false});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled=false;
  const scene=new THREE.Scene(); scene.add(mesh);
  const cam=new THREE.PerspectiveCamera(70,1,.1,500); cam.position.z=2;
  return {
    scene, cam,
    update(t, fade, w, h){
      mat.uniforms.uT.value=t; mat.uniforms.uFade.value=fade;
      cam.position.x=Math.sin(t*.8)*2.2; cam.position.y=Math.cos(t*.55)*1.6;
      cam.lookAt(0,0,-200);
    },
    dispose(){ geo.dispose(); mat.dispose(); tex.dispose(); }
  };
}
