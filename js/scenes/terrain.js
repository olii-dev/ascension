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
  float ro = 2.2 + .4*sin(uT*.35);              // camera height
  vec3 col;
  // sky gradient (sunset)
  float sy = uv.y + .18;
  vec3 sky = mix(vec3(.95,.35,.15), vec3(.07,.08,.2), clamp(sy*1.6,0.,1.));
  sky = mix(sky, vec3(1.,.8,.4), pow(max(0., .95-abs(uv.y-0.36)),14.)); // low sun
  col = sky;
  // raymarch from cam pos
  vec2 rd = uv*vec2(1.6,.7);
  float march = .04;
  bool hit=false; vec3 pc; float h;
  for (int i=0;i<48;i++){
    float t = i*2.6 + 1.0;                       // hard step, bounded loop for mobile GPUs
    vec2 gp = uv.xy*t*1.3 + vec2(0.0, uT*2.4);
    h = terr(gp);
    float camH = ro + t*.16;                   // gentle downward pitch of ray
    if (h > camH){
      pc = vec3(gp.x, h, gp.y);
      float shade = clamp((h - terr(gp-vec2(.06,.03))*1.0)*.9,.0,1.);
      vec3 rock = mix(vec3(.16,.09,.10), vec3(.42,.3,.3), shade);
      float fog = 1. - exp(-t*.055);
      col = mix(rock*(.6+.4*shade), sky, fog);
      hit=true; break;
    }
    if (t>120.) break;
  }
  // horizon glow line
  if(!hit){ col = mix(sky, vec3(1.,.55,.25), pow(max(0.,1.-abs(uv.y+.06)*9.),3.)*.5); }
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
