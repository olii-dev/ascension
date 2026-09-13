// S5: finale - plasma fullscreen shader, additive glow rings, and the
// ending title card that freeze-frames "ASCENSION" with a copper bar.
import * as THREE from 'three';

const frag = /* glsl */`
uniform float uT; uniform vec2 uRes; uniform float uFade;
varying vec2 vUv;
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float t=uT*.9;
  // classic 256-colour plasma: sum of sines
  float v = sin(p.x*6.+t) + sin((p.y*4.-t)*1.3) + sin((p.x+p.y)*5.+t*.7) + sin(length(p)*9.-t*1.8);
  v/=4.;
  vec3 c1 = .5+.5*cos(6.2831*(v+vec3(0.,.33,.67)));        // rainbow sweep
  vec3 c2 = vec3(.9,.45,.1)*pow(max(0.,1.-length(p*vec2(.8,1.4))),2.); // copper core
  vec3 col = mix(c1*.6, c1+c2, uFade*.7);
  // rings
  float rings = sin(length(p)*24. - t*6.);
  col += vec3(.05,.2,.3)*smoothstep(.96,1.,rings);
  gl_FragColor = vec4(col*uFade, 1.);
}`;
const vert = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy*2.,0.,1.);}';

export default function finale(){
  const mat = new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag,
    uniforms:{ uT:{value:0}, uRes:{value:new THREE.Vector2(1,1)}, uFade:{value:1} },
    depthWrite:false });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1,1), mat));

  // glowing torus knots orbiting - additive, no lights needed
  const knots = new THREE.Group(); scene.add(knots);
  const kg = new THREE.TorusKnotGeometry(1.6,.28,120,14,2,3);
  for (let i=0;i<3;i++){
    const m = new THREE.MeshStandardMaterial({ color:0x000000, emissive:new THREE.Color([0xffd166,0x7dd3fc,0xff5d8f][i]),
      emissiveIntensity:1.6, metalness:.9, roughness:.25, transparent:true, blending:THREE.AdditiveBlending });
    const k = new THREE.Mesh(kg, m);
    k.scale.setScalar(.6+i*.25);
    knots.add(k);
  }
  const lights = [new THREE.PointLight(0xffd166,30,60), new THREE.PointLight(0x7dd3fc,20,60)];
  lights[0].position.set(4,3,4); lights[1].position.set(-4,-2,3); scene.add(...lights);
  const cam = new THREE.PerspectiveCamera(55,1,.1,100); cam.position.z = 8;

  return {
    scene, cam,
    update(t, fade, w, h, local){
      mat.uniforms.uT.value=t; mat.uniforms.uRes.value.set(w,h); mat.uniforms.uFade.value=fade;
      knots.rotation.x = t*.4; knots.rotation.y = t*.55;
      knots.children.forEach((k,i)=>{ k.rotation.z = t*(.6-i*.2); });
      cam.position.x = Math.sin(t*.5)*1.2; cam.lookAt(0,0,0);
    },
    dispose(){ kg.dispose(); mat.dispose(); knots.children.forEach(k=>k.material.dispose()); }
  };
}
