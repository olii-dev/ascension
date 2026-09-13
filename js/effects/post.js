// Fullscreen LCD-geometry / scanline / chromatic-aberration pass.
// Two scene RTs are mixed here so crossfades never fight a shared depth buffer;
// the title-card canvas texture composites in the same pass. Raw shaders only.
import * as THREE from 'three';

const frag = /* glsl */`
uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tTitle;
uniform vec2 uRes; uniform float uT; uniform float uMix; uniform float uTitle;
varying vec2 vUv;
void main(){
  vec2 uv = vUv;
  // gentle lens curvature (LCD geometry classic)
  vec2 c = uv - .5;
  uv = .5 + c * (1.0 + dot(c,c)*0.06);
  if (uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){ gl_FragColor=vec4(0.,0.,0.,1.); return; }
  // chromatic aberration scaled by distance from center
  float ca = 0.0018 + 0.0022*abs(sin(uT*0.23));
  vec3 col;
  col.r = mix(texture2D(tA, uv + vec2(ca,0.)).r, texture2D(tB, uv + vec2(ca,0.)).r, uMix);
  col.g = mix(texture2D(tA, uv).g,               texture2D(tB, uv).g,               uMix);
  col.b = mix(texture2D(tA, uv - vec2(ca,0.)).b, texture2D(tB, uv - vec2(ca,0.)).b, uMix);
  // scanlines + phosphor mask
  float scan = 0.93 + 0.07*sin(uv.y*uRes.y*3.14159);
  float mask = 0.965 + 0.035*sin(uv.x*uRes.x*2.094);
  col *= scan*mask;
  // vignette
  col *= 1.0 - dot(c,c)*0.55;
  // title card band
  if (uTitle > 0.){
    vec2 tuv = (uv - vec2(.18,.30)) / vec2(.64,.30);
    if (tuv.x>=0. && tuv.x<=1. && tuv.y>=0. && tuv.y<=1.){
      vec4 t4 = texture2D(tTitle, vec2(tuv.x, 1.-tuv.y));
      col = mix(col, t4.rgb, t4.a*uTitle);
    }
  }
  // dither to kill banding
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453)-.5)/255.;
  gl_FragColor = vec4(col, 1.0);
}`;

const vert = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

export function createPost(renderer){
  const scene = new THREE.Scene();
  const cam = new THREE.Camera();
  const mkRT = () => new THREE.WebGLRenderTarget(2, 2);
  const rtA = mkRT(), rtB = mkRT();
  const mat = new THREE.ShaderMaterial({
    fragmentShader: frag, vertexShader: vert,
    uniforms: { tA:{value:rtA.texture}, tB:{value:rtB.texture}, tTitle:{value:null},
      uRes:{value:new THREE.Vector2()}, uT:{value:0}, uMix:{value:0}, uTitle:{value:0} },
    depthTest:false, depthWrite:false
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat);
  scene.add(quad);
  function resize(w,h){
    const dpr = Math.min(devicePixelRatio||1, 1.75);
    renderer.setPixelRatio(dpr); renderer.setSize(w,h,false);
    rtA.setSize(Math.floor(w*dpr), Math.floor(h*dpr));
    rtB.setSize(Math.floor(w*dpr), Math.floor(h*dpr));
    mat.uniforms.uRes.value.set(w*dpr, h*dpr);
  }
  // Render sceneA into rtA; if sceneB given (crossfade) it goes to rtB, uMix blends.
  function render(aScene, aCam, bScene, bCam, t, mix, titleTex, titleAmt){
    renderer.setRenderTarget(rtA); renderer.render(aScene, aCam);
    if (bScene){ renderer.setRenderTarget(rtB); renderer.render(bScene, bCam); }
    renderer.setRenderTarget(null);
    mat.uniforms.uT.value = t; mat.uniforms.uMix.value = bScene ? mix : 0;
    mat.uniforms.uTitle.value = titleAmt || 0;
    if (titleTex && !mat.uniforms.tTitle.value) mat.uniforms.tTitle.value = titleTex;
    renderer.render(scene, cam);
  }
  function dispose(){ rtA.dispose(); rtB.dispose(); mat.dispose(); quad.geometry.dispose(); }
  return { resize, render, dispose };
}
