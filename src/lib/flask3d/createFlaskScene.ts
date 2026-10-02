// Serum M1: a real WebGL flask (Three.js), art-directed after flask_black_border.webp.
// Everything here is client-only; MutatedFlask3D loads this module lazily inside useEffect.
//
//  - glass: one closed lathe solid (outer wall + thick rounded lip + inner wall) drawn in two
//    stylised passes (far wall, then near wall) + a silhouette-only ink outline
//  - liquid: a separate lathe volume inside the glass, cut by a plane in flask space. The plane's
//    normal is a damped spring chasing "world up" (so it lags, overshoots and sloshes) and its
//    offset is solved every frame so the liquid VOLUME stays the same at any tilt.
//    Colour = domain-warped 3D noise (green / cyan / blue / purple / magenta swirls).
//    The surface is drawn through the cut by shading the volume's back faces as the plane.
//  - bubbles: instanced glassy spheres that rise "up" inside the liquid and respawn below it
//  - cork stopper, green drips down the inside of the neck
import * as THREE from "three";

export type FlaskScene = { dispose: () => void };

// ---------------------------------------------------------------- shape (units: flask height ~0.96)
// Outer silhouette measured from the reference art (half-width per height), perspective removed.
const OUTER: [number, number][] = [
  [0, 0], [0.24, 0], [0.285, 0.004], [0.312, 0.014], [0.326, 0.03], [0.324, 0.046], [0.317, 0.06],
  [0.294, 0.101], [0.271, 0.152], [0.247, 0.204], [0.2235, 0.255], [0.199, 0.306], [0.175, 0.359],
  [0.151, 0.41], [0.137, 0.442], [0.124, 0.474], [0.114, 0.505], [0.106, 0.537], [0.1, 0.57],
  [0.097, 0.605], [0.0955, 0.65], [0.0955, 0.7], [0.097, 0.75], [0.099, 0.8], [0.1, 0.828],
  // the chunky lip
  [0.112, 0.833], [0.13, 0.84], [0.143, 0.852], [0.149, 0.868], [0.148, 0.884], [0.141, 0.897],
  [0.128, 0.905], [0.114, 0.909],
];
const INNER: [number, number][] = [
  [0.104, 0.907], [0.097, 0.9], [0.09, 0.887], [0.083, 0.868], [0.079, 0.84], [0.0785, 0.8],
  [0.0775, 0.75], [0.0765, 0.7], [0.0765, 0.65], [0.078, 0.605], [0.082, 0.57], [0.089, 0.537],
  [0.097, 0.505], [0.107, 0.474], [0.12, 0.442], [0.134, 0.41], [0.158, 0.359], [0.182, 0.306],
  [0.2065, 0.255], [0.23, 0.204], [0.254, 0.152], [0.277, 0.101], [0.298, 0.064], [0.304, 0.05],
  [0.3, 0.04], [0.286, 0.032], [0.25, 0.03], [0, 0.03],
];
const FILL_Y = 0.33;                       // liquid level at rest (matches the art)
const FIT_RADIUS = 0.58;                   // bounding sphere of glass + cork + ink outline around the pivot
const MOUTH_Y = 0.86;                      // liquid volume ends at the cork

// inner radius at height y (the cavity), used for bubbles and the surface rim highlight
const CAVITY = INNER.slice().reverse().filter((p) => p[1] <= 0.9);
function rInner(y: number): number {
  if (y <= CAVITY[0]![1]) return y < 0.03 ? 0 : CAVITY[0]![0];
  for (let i = 1; i < CAVITY.length; i++) {
    const a = CAVITY[i - 1]!, b = CAVITY[i]!;
    if (y <= b[1]) return a[0] + (b[0] - a[0]) * ((y - a[1]) / Math.max(1e-6, b[1] - a[1]));
  }
  return CAVITY[CAVITY.length - 1]![0];
}

const V2 = (p: [number, number]) => new THREE.Vector2(p[0], p[1]);

// ---------------------------------------------------------------- GLSL
// Noise comes from a small tiling 3D texture (4 independent channels, trilinear) instead of
// per-pixel simplex math: 7 texture taps per pixel for the whole chemical swirl, cheap on phones.
const NOISE = /* glsl */ `
precision highp sampler3D;
uniform sampler3D uNoise;
// hermite-smoothed lookup (one tap): no diamond artefacts from plain trilinear filtering
vec4 N(vec3 p){ vec3 x=p*32.0+0.5; vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f); return texture(uNoise,(i+f-0.5)/32.0); }
vec4 fbm4(vec3 p){ return N(p)*0.55+N(p*2.03+0.31)*0.3+N(p*4.07+0.73)*0.15; }
`;

// liquid: body (front faces) and surface (back faces seen through the cut)
const LIQ_VERT = /* glsl */ `
varying vec3 vLocal; varying vec3 vNormalL; varying vec3 vNView;
void main(){ vLocal=position; vNormalL=normal; vNView=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const LIQ_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uPlaneN; uniform float uPlaneD; uniform vec3 uCam; uniform vec3 uLight;
uniform float uSlosh; uniform float uRadii[48];
varying vec3 vLocal; varying vec3 vNormalL; varying vec3 vNView;
${NOISE}
float radiusAt(float y){ float f=clamp(y/0.9,0.0,1.0)*47.0; int i=int(floor(f)); int j=min(i+1,47); return mix(uRadii[i],uRadii[j],fract(f)); }
float ripple(vec3 p){ return uSlosh*0.006*sin(dot(p.xz,vec2(23.0,17.0))+uTime*5.0) + 0.0015*sin(p.x*41.0+uTime*2.3)*sin(p.z*37.0-uTime*1.7); }
vec3 chem(vec3 p){
  // stretched vertically so the colours run in tall wavy streams like the painted flask
  vec3 q=vec3(p.x*0.42,p.y*0.2,p.z*0.42)+vec3(0.13,-uTime*0.006,uTime*0.004);
  vec3 w=fbm4(q*0.8).xyz-0.5;
  vec4 nm=fbm4(q+0.55*w);
  float n=smoothstep(0.25,0.75,nm.x);                // large masses
  float m=smoothstep(0.25,0.75,nm.y);                // second family of swirls
  float f=N(q*3.0+w*0.6).z;                          // fine turbulence
  vec3 green=vec3(0.22,1.0,0.28), lime=vec3(0.5,1.0,0.22), cyan=vec3(0.1,0.85,1.0);
  vec3 blue=vec3(0.15,0.3,1.0), purple=vec3(0.56,0.2,1.0), magenta=vec3(1.0,0.28,0.85);
  vec3 c=mix(green,lime,smoothstep(0.55,0.85,f)*0.3);
  c=mix(c,cyan,smoothstep(0.48,0.58,n));
  c=mix(c,blue,smoothstep(0.62,0.72,n));
  float pu=smoothstep(0.5,0.6,m)*smoothstep(0.38,0.5,n);
  c=mix(c,purple,pu);
  c=mix(c,magenta,smoothstep(0.64,0.74,m)*smoothstep(0.34,0.46,n));
  // painted dark ink where streams meet
  float edge=(1.0-smoothstep(0.0,0.02,abs(n-0.53)))+(1.0-smoothstep(0.0,0.02,abs(m-0.55)))*smoothstep(0.38,0.5,n);
  c*=1.0-0.18*clamp(edge,0.0,1.0);
  c+=vec3(0.05,0.1,0.05)*smoothstep(0.8,0.95,f);
  return c;
}
void main(){
  float s=dot(vLocal,uPlaneN)-uPlaneD;
  if(gl_FrontFacing){
    if(s+ripple(vLocal)>0.0) discard;
    vec3 n=normalize(vNormalL); vec3 v=normalize(uCam-vLocal);
    float ndv=clamp(abs(dot(n,v)),0.0,1.0);
    vec3 c=chem(vLocal);
    c*=0.8+0.42*ndv;                                 // brighter core, deeper towards the glass
    c=mix(c*vec3(0.55,0.75,1.0),c,smoothstep(0.0,0.35,ndv));
    float spec=pow(max(dot(reflect(-uLight,n),v),0.0),36.0);
    c+=vec3(0.85,1.0,0.9)*spec*0.55;
    c+=vec3(0.35,1.0,0.6)*smoothstep(0.05,0.0,-s)*0.35;   // glow just under the surface
    vec3 nv=normalize(vNView);
    float gloss=smoothstep(-0.78,-0.68,nv.x)*(1.0-smoothstep(-0.5,-0.42,nv.x));   // painted gloss band
    c=mix(c,vec3(0.92,1.0,0.95),gloss*0.3);
    gl_FragColor=vec4(c*1.1,0.95);
  } else {
    // back face seen through the cut: shade it as the liquid surface itself
    vec3 dir=normalize(vLocal-uCam);
    float dn=dot(dir,uPlaneN); if(abs(dn)<1e-4) discard;
    float t=(uPlaneD-dot(uCam,uPlaneN))/dn; vec3 P=uCam+dir*t;
    if(s>0.0){ discard; }
    float rho=length(P.xz); float rI=radiusAt(P.y);
    vec3 c=mix(vec3(0.35,1.0,0.42),vec3(0.2,0.9,0.95),smoothstep(0.35,0.75,N(P*1.3+uTime*0.02).w)*0.6);
    c=mix(c,chem(P-uPlaneN*0.02)*1.1,0.22);
    float ring=smoothstep(rI-0.035,rI-0.006,rho);
    c=mix(c,vec3(0.8,1.0,0.75),ring*0.75);
    float spec=pow(max(dot(reflect(-uLight,uPlaneN),-dir),0.0),24.0);
    c+=vec3(1.0)*spec*0.35;
    gl_FragColor=vec4(c,0.9);
  }
}
`;

// glass: stylised illustrated glass (tinted, inked edge, painted highlight streaks)
const GLASS_VERT = /* glsl */ `
varying vec3 vLocal; varying vec3 vNView; varying vec3 vPosView; varying vec3 vNLocal;
void main(){ vLocal=position; vNLocal=normal; vNView=normalize(normalMatrix*normal);
  vec4 mv=modelViewMatrix*vec4(position,1.0); vPosView=mv.xyz; gl_Position=projectionMatrix*mv; }
`;
const GLASS_FRAG = /* glsl */ `
uniform float uBack; uniform float uTime;
varying vec3 vLocal; varying vec3 vNView; varying vec3 vPosView; varying vec3 vNLocal;
void main(){
  vec3 n=normalize(vNView); if(uBack>0.5) n=-n;
  vec3 v=normalize(-vPosView);
  float ndv=clamp(dot(n,v),0.0,1.0);
  float fr=pow(1.0-ndv,1.6);
  float lip=smoothstep(0.82,0.86,vLocal.y);
  vec3 deep=vec3(0.03,0.22,0.38), mid=vec3(0.16,0.70,0.86), hi=vec3(0.72,1.0,1.0);
  if(uBack>0.5){
    vec3 c=mix(deep*0.8,mid*0.75,fr);
    gl_FragColor=vec4(c,0.22+0.4*fr);
    return;
  }
  vec3 c=mix(mid*0.85,hi,smoothstep(0.55,0.95,fr));
  c=mix(c,deep,smoothstep(0.93,1.0,fr)*0.65);             // darker blue right at the silhouette
  float a=0.07+0.75*fr;
  // painted white streaks (view-space bands: they stay put while the flask turns, like reflections)
  float body=1.0-smoothstep(0.80,0.83,vLocal.y);
  float s1=smoothstep(-0.76,-0.70,n.x)*(1.0-smoothstep(-0.56,-0.50,n.x));
  float dash=step(0.28,fract(vLocal.y*5.2+0.15));
  float s2=smoothstep(0.50,0.55,n.x)*(1.0-smoothstep(0.62,0.67,n.x))*step(0.45,fract(vLocal.y*3.1+0.4));
  float s3=smoothstep(-0.36,-0.32,n.x)*(1.0-smoothstep(-0.29,-0.25,n.x))*step(0.66,vLocal.y)*body;
  float streak=max(max(s1*dash*body,s2*body*0.7),s3*0.6);
  c=mix(c,vec3(1.0),streak); a=max(a,streak*0.95);
  // the thick lip: bright cyan ring + glossy top
  float top=smoothstep(0.25,0.8,normalize(vNLocal).y)*lip;
  c=mix(c,hi,lip*0.45+top*0.4); a=max(a,lip*(0.55+0.35*fr));
  float lipStreak=lip*smoothstep(-0.7,-0.55,n.x)*(1.0-smoothstep(-0.35,-0.2,n.x))*smoothstep(0.1,0.5,n.y);
  c=mix(c,vec3(1.0),lipStreak); a=max(a,lipStreak);
  gl_FragColor=vec4(c,a);
}
`;

// ink outline: back faces of a slightly fattened hull, kept only near the silhouette
const INK_VERT = /* glsl */ `
uniform float uThick; varying vec3 vNView; varying vec3 vPosView;
void main(){ vec3 p=position+normal*uThick; vNView=normalize(normalMatrix*normal);
  vec4 mv=modelViewMatrix*vec4(p,1.0); vPosView=mv.xyz; gl_Position=projectionMatrix*mv; }
`;
const INK_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uCut; varying vec3 vNView; varying vec3 vPosView;
void main(){ float f=abs(dot(normalize(vNView),normalize(-vPosView))); if(f>uCut) discard; gl_FragColor=vec4(uColor,1.0); }
`;

// bubbles: glassy shells (bright rim, clear middle, specular dot)
const BUB_VERT = /* glsl */ `
varying vec3 vNView; varying vec3 vPosView; varying vec3 vLocalPos;
void main(){ vec4 wp=instanceMatrix*vec4(position,1.0); vLocalPos=wp.xyz;
  vNView=normalize(normalMatrix*mat3(instanceMatrix)*normal);
  vec4 mv=modelViewMatrix*wp; vPosView=mv.xyz; gl_Position=projectionMatrix*mv; }
`;
const BUB_FRAG = /* glsl */ `
uniform vec3 uPlaneN; uniform float uPlaneD;
varying vec3 vNView; varying vec3 vPosView; varying vec3 vLocalPos;
void main(){
  if(dot(vLocalPos,uPlaneN)-uPlaneD>0.0) discard;
  vec3 n=normalize(vNView); vec3 v=normalize(-vPosView);
  float ndv=clamp(dot(n,v),0.0,1.0); float rim=pow(1.0-ndv,2.2);
  vec3 c=mix(vec3(0.3,1.0,0.45),vec3(0.8,1.0,0.95),rim);
  float spec=smoothstep(0.86,0.98,dot(n,normalize(vec3(-0.45,0.55,0.7))));
  c=mix(c,vec3(1.0),spec);
  gl_FragColor=vec4(c,0.14+0.8*rim+spec*0.9);
}
`;

// cork: chunky toon shading with pores
const CORK_VERT = /* glsl */ `
varying vec3 vLocal; varying vec3 vNView; varying vec3 vNLocal;
void main(){ vLocal=position; vNLocal=normal; vNView=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;
const CORK_FRAG = /* glsl */ `
varying vec3 vLocal; varying vec3 vNView; varying vec3 vNLocal;
${NOISE}
void main(){
  vec3 n=normalize(vNView);
  float l=dot(n,normalize(vec3(-0.45,0.6,0.65)))*0.5+0.5;
  float band=l>0.62?1.0:(l>0.38?0.78:0.58);              // 3-step toon
  vec3 base=mix(vec3(0.60,0.39,0.20),vec3(0.80,0.58,0.34),smoothstep(0.3,0.9,normalize(vNLocal).y));
  float pores=smoothstep(0.62,0.8,N(vLocal*22.0).x);
  vec3 c=base*band*(1.0-0.28*pores);
  c+=vec3(0.18,0.12,0.05)*smoothstep(0.7,0.95,l);
  gl_FragColor=vec4(c,1.0);
}
`;

// ---------------------------------------------------------------- scene
export function createFlaskScene(canvas: HTMLCanvasElement, opts: { still?: boolean } = {}): FlaskScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
  // slightly from above and in front: rim ellipse + liquid depth visible like the art
  camera.position.set(0, 1.27, 2.55);
  camera.lookAt(0, 0.45, 0);

  const flask = new THREE.Group();                 // rotates as one rigid object
  const pivot = new THREE.Vector3(0, 0.44, 0);     // turn around the middle of the flask
  const holder = new THREE.Group(); holder.position.copy(pivot); scene.add(holder);
  flask.position.set(0, -pivot.y, 0); holder.add(flask);

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  // 32^3 tiling value-noise volume, 4 channels, smoothed once so trilinear taps look painterly
  const NV = 32, vol = new Float32Array(NV * NV * NV * 4);
  for (let i = 0; i < vol.length; i++) vol[i] = Math.random();
  const idx = (x: number, y: number, z: number) => ((((z + NV) % NV) * NV + ((y + NV) % NV)) * NV + ((x + NV) % NV)) * 4;
  let src = vol;
  for (let pass = 0; pass < 3; pass++) {
    const dst = new Float32Array(src.length);
    for (let z = 0; z < NV; z++) for (let y = 0; y < NV; y++) for (let x = 0; x < NV; x++) {
      const o = idx(x, y, z);
      for (let c = 0; c < 4; c++) {
        dst[o + c] = (src[o + c]! * 2 + src[idx(x + 1, y, z) + c]! + src[idx(x - 1, y, z) + c]! + src[idx(x, y + 1, z) + c]!
          + src[idx(x, y - 1, z) + c]! + src[idx(x, y, z + 1) + c]! + src[idx(x, y, z - 1) + c]!) / 8;
      }
    }
    src = dst;
  }
  // stretch the (now narrow) value range back to 0..1 per channel
  const smooth = new Uint8Array(NV * NV * NV * 4);
  for (let c = 0; c < 4; c++) {
    let lo = 1, hi = 0;
    for (let i = c; i < src.length; i += 4) { lo = Math.min(lo, src[i]!); hi = Math.max(hi, src[i]!); }
    for (let i = c; i < src.length; i += 4) smooth[i] = Math.round(((src[i]! - lo) / Math.max(1e-6, hi - lo)) * 255);
  }
  const noiseTex = keep(new THREE.Data3DTexture(smooth, NV, NV, NV));
  noiseTex.format = THREE.RGBAFormat; noiseTex.type = THREE.UnsignedByteType;
  noiseTex.minFilter = THREE.LinearFilter; noiseTex.magFilter = THREE.LinearFilter;
  noiseTex.wrapS = noiseTex.wrapT = noiseTex.wrapR = THREE.RepeatWrapping;
  noiseTex.unpackAlignment = 1; noiseTex.needsUpdate = true;
  const uNoise = { value: noiseTex };

  // glass solid: outer wall up and over the lip, then down the inner wall
  const glassProfile = [...OUTER.map(V2), ...INNER.map(V2)];
  const glassGeo = keep(new THREE.LatheGeometry(glassProfile, 72));
  const glassUniforms = (back: number) => ({ uBack: { value: back }, uTime: { value: 0 } });
  const glassBack = new THREE.Mesh(glassGeo, keep(new THREE.ShaderMaterial({
    vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, uniforms: glassUniforms(1),
    transparent: true, depthWrite: false, side: THREE.BackSide,
  })));
  glassBack.renderOrder = 2;
  const glassFront = new THREE.Mesh(glassGeo, keep(new THREE.ShaderMaterial({
    vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, uniforms: glassUniforms(0),
    transparent: true, depthWrite: false, side: THREE.FrontSide,
  })));
  glassFront.renderOrder = 6;
  flask.add(glassBack, glassFront);

  // ink outline around the glass silhouette
  const inkGeo = keep(new THREE.LatheGeometry(OUTER.map(V2), 72));
  const inkMat = keep(new THREE.ShaderMaterial({
    vertexShader: INK_VERT, fragmentShader: INK_FRAG, side: THREE.BackSide,
    uniforms: { uThick: { value: 0.012 }, uColor: { value: new THREE.Color(0x061019) }, uCut: { value: 0.45 } },
  }));
  flask.add(new THREE.Mesh(inkGeo, inkMat));

  // liquid volume (separate mesh, slightly inside the glass)
  const cavity = INNER.filter((p) => p[1] <= MOUTH_Y).map((p) => new THREE.Vector2(Math.max(0, p[0] - 0.004), Math.max(p[1], 0.034)));
  cavity.unshift(new THREE.Vector2(0, MOUTH_Y), new THREE.Vector2(rInner(MOUTH_Y) - 0.004, MOUTH_Y));
  const liqGeo = keep(new THREE.LatheGeometry(cavity.reverse(), 64));
  const radii = new Float32Array(48);
  for (let i = 0; i < 48; i++) radii[i] = rInner((i / 47) * 0.9) - 0.004;
  const liqUniforms = {
    uTime: { value: 0 }, uPlaneN: { value: new THREE.Vector3(0, 1, 0) }, uPlaneD: { value: FILL_Y },
    uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Vector3(-0.45, 0.7, 0.55).normalize() },
    uSlosh: { value: 0 }, uRadii: { value: Array.from(radii) }, uNoise,
  };
  const liquid = new THREE.Mesh(liqGeo, keep(new THREE.ShaderMaterial({
    vertexShader: LIQ_VERT, fragmentShader: LIQ_FRAG, uniforms: liqUniforms,
    transparent: true, depthWrite: true, side: THREE.DoubleSide,
  })));
  liquid.renderOrder = 5;
  flask.add(liquid);

  // bubbles
  const BUBBLES = 32;
  const bubGeo = keep(new THREE.SphereGeometry(1, 14, 10));
  const bubMat = keep(new THREE.ShaderMaterial({
    vertexShader: BUB_VERT, fragmentShader: BUB_FRAG, transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uPlaneN: liqUniforms.uPlaneN, uPlaneD: liqUniforms.uPlaneD },
  }));
  const bubbles = new THREE.InstancedMesh(bubGeo, bubMat, BUBBLES);
  bubbles.renderOrder = 5.5; bubbles.frustumCulled = false;
  flask.add(bubbles);

  // green drips running down the inside of the neck, and the cork
  const dripMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1, 0.3) }));
  [[-0.5, 0.06], [0.35, 0.045], [2.6, 0.075]].forEach(([ang, len]) => {
    const g = keep(new THREE.CapsuleGeometry(0.013, len!, 4, 8));
    const m = new THREE.Mesh(g, dripMat);
    const r = rInner(0.84) - 0.008;
    m.position.set(Math.sin(ang!) * r, 0.86 - len! / 2, Math.cos(ang!) * r);
    m.renderOrder = 3;
    flask.add(m);
  });
  const corkGeo = keep(new THREE.CylinderGeometry(0.121, 0.084, 0.09, 40, 1));
  const cork = new THREE.Mesh(corkGeo, keep(new THREE.ShaderMaterial({ vertexShader: CORK_VERT, fragmentShader: CORK_FRAG, uniforms: { uNoise } })));
  cork.position.y = 0.92;
  const corkInk = new THREE.Mesh(corkGeo, keep(new THREE.ShaderMaterial({
    vertexShader: INK_VERT, fragmentShader: INK_FRAG, side: THREE.BackSide,
    uniforms: { uThick: { value: 0.008 }, uColor: { value: new THREE.Color(0x140c06) }, uCut: { value: 1.01 } },
  })));
  corkInk.position.y = 0.92;
  flask.add(cork, corkInk);

  // ---------------------------------------------------------------- volume-conserving fill level
  // Points spread evenly through the cavity; for any liquid "up" direction n the plane offset is
  // the quantile of their projections that keeps the same fraction of the cavity filled.
  const SAMPLES: number[] = [];
  let tries = 0;
  while (SAMPLES.length < 1800 * 3 && tries < 200000) {
    tries++;
    const y = 0.03 + Math.random() * (MOUTH_Y - 0.03), r = rInner(y) - 0.004;
    const x = (Math.random() * 2 - 1) * 0.31, z = (Math.random() * 2 - 1) * 0.31;
    if (x * x + z * z <= r * r) SAMPLES.push(x, y, z);
  }
  const NS = SAMPLES.length / 3;
  let below = 0;
  for (let i = 0; i < NS; i++) if (SAMPLES[i * 3 + 1]! < FILL_Y) below++;
  const FILL = below / NS;
  const proj = new Float32Array(NS);
  const solveD = (n: { x: number; y: number; z: number }) => {
    for (let i = 0; i < NS; i++) proj[i] = SAMPLES[i * 3]! * n.x + SAMPLES[i * 3 + 1]! * n.y + SAMPLES[i * 3 + 2]! * n.z;
    proj.sort();
    return proj[Math.min(NS - 1, Math.max(0, Math.round(FILL * NS)))]!;
  };

  // bubble state (flask space)
  type Bub = { p: { x: number; y: number; z: number }; r: number; v: number; ph: number };
  const pick = (n: { x: number; y: number; z: number }, d: number) => {
    for (let k = 0; k < 40; k++) {
      const i = Math.floor(Math.random() * NS);
      const x = SAMPLES[i * 3]!, y = SAMPLES[i * 3 + 1]!, z = SAMPLES[i * 3 + 2]!;
      if (x * n.x + y * n.y + z * n.z < d - 0.04) return { x, y, z };
    }
    return { x: 0, y: 0.08, z: 0 };
  };
  const bubs: Bub[] = [];
  for (let i = 0; i < BUBBLES; i++) {
    const big = i < 3, mid = i >= 3 && i < 11;
    bubs.push({ p: pick({ x: 0, y: 1, z: 0 }, FILL_Y), r: big ? 0.022 + Math.random() * 0.01 : mid ? 0.012 + Math.random() * 0.006 : 0.005 + Math.random() * 0.004, v: big ? 0.018 + Math.random() * 0.02 : 0.025 + Math.random() * 0.05, ph: Math.random() * 6.28 });
  }
  const m4 = new THREE.Matrix4();

  // ---------------------------------------------------------------- interaction: drag to rotate, inertia
  const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, -0.5, 0));
  holder.quaternion.copy(rest);
  const angVel = new THREE.Vector3();               // world-space angular velocity (rad/s)
  let dragging = false, lastX = 0, lastY = 0, lastT = 0, idleFor = 0;
  const qTmp = new THREE.Quaternion(), axis = new THREE.Vector3();
  const rotateBy = (dx: number, dy: number) => {
    const k = 3.4 / Math.max(240, canvas.clientHeight);
    qTmp.setFromAxisAngle(axis.set(0, 1, 0), dx * k); holder.quaternion.premultiply(qTmp);
    qTmp.setFromAxisAngle(axis.set(1, 0, 0), dy * k); holder.quaternion.premultiply(qTmp);
    holder.quaternion.normalize();
  };
  const onDown = (e: PointerEvent) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; lastT = performance.now(); angVel.set(0, 0, 0);
    canvas.setPointerCapture(e.pointerId); canvas.classList.add("grabbing");
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const now = performance.now(), dt = Math.max(1, now - lastT) / 1000;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    rotateBy(dx, dy);
    const k = 3.4 / Math.max(240, canvas.clientHeight);
    angVel.lerp(new THREE.Vector3((dy * k) / dt, (dx * k) / dt, 0), 0.5);
    lastX = e.clientX; lastY = e.clientY; lastT = now; idleFor = 0;
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return; dragging = false; canvas.classList.remove("grabbing");
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (performance.now() - lastT > 90) angVel.set(0, 0, 0);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  // ---------------------------------------------------------------- slosh spring
  const n = new THREE.Vector3(0, 1, 0), nVel = new THREE.Vector3(), target = new THREE.Vector3();
  const invQ = new THREE.Quaternion(), camLocal = new THREE.Vector3();
  let slosh = 0;

  // ---------------------------------------------------------------- loop
  let raf = 0, last = performance.now(), visible = true, time = 0;
  const resize = () => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 500 ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the flask's bounding sphere (around the pivot it turns on), not its upright outline,
    // so no orientation can poke out of the canvas: lying sideways, upside down, mid-spin.
    const dist = camera.position.distanceTo(pivot);
    const t = Math.tan(Math.asin(Math.min(0.95, FIT_RADIUS / dist))) / Math.min(1, w / h);
    camera.fov = (2 * Math.atan(t) * 180) / Math.PI;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { threshold: 0 });
  io.observe(canvas);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    time += dt;

    // inertia + gentle return to the display pose when left alone
    if (!dragging) {
      idleFor += dt;
      if (angVel.lengthSq() > 1e-6) {
        const a = angVel.length() * dt;
        qTmp.setFromAxisAngle(axis.copy(angVel).normalize(), a); holder.quaternion.premultiply(qTmp).normalize();
        angVel.multiplyScalar(Math.exp(-2.6 * dt));
      }
      if (idleFor > 1.4 && !opts.still) {
        holder.quaternion.slerp(rest, 1 - Math.exp(-1.6 * dt));
        rest.premultiply(qTmp.setFromAxisAngle(axis.set(0, 1, 0), dt * 0.28));   // slow turntable
      }
    }

    // liquid "up" in flask space lags behind the real up (spring) -> slosh
    invQ.copy(holder.quaternion).invert();
    target.set(0, 1, 0).applyQuaternion(invQ);
    const acc = target.clone().sub(n).multiplyScalar(70).sub(nVel.clone().multiplyScalar(5.2));
    nVel.addScaledVector(acc, dt); n.addScaledVector(nVel, dt).normalize();
    slosh = Math.min(1, slosh * Math.exp(-1.2 * dt) + nVel.length() * dt * 2.5);
    const d = solveD(n);
    liqUniforms.uPlaneN.value.copy(n); liqUniforms.uPlaneD.value = d;
    liqUniforms.uTime.value = time; liqUniforms.uSlosh.value = slosh;
    flask.updateMatrixWorld();
    camLocal.copy(camera.position); flask.worldToLocal(camLocal); liqUniforms.uCam.value.copy(camLocal);
    (glassFront.material as { uniforms: { uTime: { value: number } } }).uniforms.uTime.value = time;

    // bubbles rise along the liquid's up, wobble a little, respawn at the bottom when they surface
    for (let i = 0; i < BUBBLES; i++) {
      const b = bubs[i]!;
      const sway = Math.sin(time * 2.2 + b.ph) * 0.012 * dt + nVel.x * 0.002;
      b.p.x += n.x * b.v * dt + sway; b.p.y += n.y * b.v * dt; b.p.z += n.z * b.v * dt + Math.cos(time * 1.7 + b.ph) * 0.01 * dt;
      const depth = b.p.x * n.x + b.p.y * n.y + b.p.z * n.z - d;
      const rr = rInner(b.p.y) - 0.006 - b.r;
      if (depth > -b.r * 0.6 || b.p.y < 0.035 || b.p.x * b.p.x + b.p.z * b.p.z > rr * rr) b.p = pick(n, d);
      m4.makeScale(b.r, b.r, b.r); m4.setPosition(b.p.x, b.p.y, b.p.z);
      bubbles.setMatrixAt(i, m4);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp);
      disposables.forEach((x) => x.dispose()); bubbles.dispose(); renderer.dispose();
    },
  };
}
