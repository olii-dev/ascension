// S3: raymarched terrain flyover with fog + sunset sky, single fullscreen quad.
import * as THREE from 'three';

const frag = /* glsl */`
uniform float uT; uniform vec2 uRes; uniform float uFade;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
}
float fbm(vec2 p){
  float v=0., a=.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.07; a*=.5; }
  return v;
}
float terr(vec2 p){
  p += vec2(uT*8., uT*2.);                      // fly forward
  float h = fbm(p*.35)*3.2 + fbm(p*1.4)*.5;
  h += smoothstep(2.0,5.0,length(p))*1.5;       // far ridges rise
  return h;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float sun = max(0., .95-abs(uv.y-0.06));
  vec3 sky = mix(vec3(.95,.38,.16), vec3(.06,.07,.20), clamp((uv.y+.15)*1.5,0.,1.));
  sky = mix(sky, vec3(1.,.8,.4), pow(sun,14.));
  vec3 col = sky;
  vec3 cam = vec3(0., 9.5, -uT*16.);
  vec3 dir = normalize(vec3(uv.x*1.2, uv.y*0.9 - 0.14, -1.));  // pitched slightly down
  bool hit=false;
  if (dir.y < 0.){
    float t = 2.;
    for (int i=0;i<48;i++){
      vec3 pos = cam + dir*t;
      float h = terr(pos.xz);
      if (h > pos.y){
        float shade = clamp((h - terr(pos.xz - vec2(.5,.9)))*.7, .0, 1.);
        vec3 rock = mix(vec3(.10,.07,.13), vec3(.46,.32,.28), shade);
        rock += vec3(1.,.5,.2)*pow(max(0.,1.-t*.011),3.)*.4;   // sunset rim
        float fog = 1. - exp(-t*.011);
        col = mix(rock, sky, fog);
        hit=true; break;
      }
      t *= 1.115;
      if (t > 340.) break;
    }
  }
  col *= mix(.35,1., smoothstep(-.5,.25,vUv.y));
  gl_FragColor = vec4(col*uFade, 1.);
}`;

export default function terrain(){
  const mat = new THREE.ShaderMaterial({
    vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy*2.,0.,1.);}',
    fragmentShader:frag, uniforms:{ uT:{value:0}, uRes:{value:new THREE.Vector2(1,1)}, uFade:{value:1} }});
  const scene = new THREE.Scene(); scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat));
  const cam = new THREE.OrthographicCamera(-.5,.5,.5,-.5,0,1);
  return {
    scene, cam,
    update(t, fade, w, h){ mat.uniforms.uT.value=t; mat.uniforms.uRes.value.set(w,h); mat.uniforms.uFade.value=fade; }
  };
}
