// S2: classic scrolling tunnel — a tube with a scrolling grid shader and
// a sinusoidal camera path that banks with the curves.
import * as THREE from 'three';

const vert = /* glsl */`
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const frag = /* glsl */`
uniform float uT; uniform float uFade;
varying vec2 vUv;
float grid(vec2 uv){
  vec2 g = fract(uv*vec2(8.,14.));
  vec2 d = min(g, 1.-g);
  return smoothstep(0., .04, min(d.x,d.y));
}
void main(){
  vec2 uv = vUv; uv.x += uT*.08;             // forward scroll
  vec2 w = uv + .02*vec2(sin(uv.y*10.+uT), cos(uv.x*8.-uT));  // wave warp
  float gd = 1.-grid(w);
  float hue = .52+.2*sin(uv.y*6.28+uT*.3);
  vec3 neon = vec3(sin(hue*6.28), .55, cos(hue*3.14)) * 1.2;
  float glow = gd * (1.-abs(uv.y-.5)*.3);
  float pulse = .8+.2*sin(uT*6.);
  gl_FragColor = vec4(neon*glow*pulse*1.4*vec3(uFade), 1.);
}`;

export default function tunnel(){
  const curve = new THREE.CatmullRomCurve3(
    Array.from({length:14},(_,i)=>new THREE.Vector3(
      Math.sin(i*.9)*14, Math.cos(i*.6)*8, -i*30)), false, 'catmullrom', .5);
  const geo = new THREE.TubeGeometry(curve, 240, 6, 22, false);
  const mat = new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag,
    uniforms:{uT:{value:0},uFade:{value:1}}, side:THREE.BackSide });
  const scene = new THREE.Scene(); scene.add(new THREE.Mesh(geo,mat));
  const cam = new THREE.PerspectiveCamera(80,1,.1,400);
  return {
    scene, cam,
    update(t, fade){
      mat.uniforms.uT.value=t; mat.uniforms.uFade.value=fade;
      const p = ((t*.11)%1+1)%1;
      cam.position.copy(curve.getPointAt(p));
      const look = curve.getPointAt((p+.02)%1);
      cam.lookAt(look);
      cam.rotation.z += Math.sin(t*.7)*.12;
    }
  };
}
