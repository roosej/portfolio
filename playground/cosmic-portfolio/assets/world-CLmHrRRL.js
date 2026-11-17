import{A as e,Cn as t,K as n,M as r,N as i,S as a,X as o,a as s,c,cn as l,d as u,in as d,n as f,o as p,on as m,ot as h,q as g,sn as _,tn as v,tt as y,un as b}from"./three.core-FCQK_D2u.js";var x=`
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p){ float v = 0.0; float a = 0.5; for(int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }
`,S=`
varying vec3 vPos; varying vec3 vN; varying vec3 vV;
void main(){
  vPos = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vV = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,C=`
uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform vec3 uSun;
uniform float uTime; uniform float uSeed; uniform float uHover;
varying vec3 vPos; varying vec3 vN; varying vec3 vV;
${x}
void main(){
  vec3 p = normalize(vPos);
  float warp = fbm(p * 3.0 + uSeed + uTime * 0.03);
  float bands = sin(p.y * 7.0 + warp * 5.0 + uSeed);
  vec3 col = mix(uColA, uColB, bands * 0.5 + 0.5);
  col = mix(col, uColC, smoothstep(0.55, 0.9, fbm(p * 6.0 + uSeed * 3.0)));
  vec3 n = normalize(vN);
  float d = max(dot(n, normalize(uSun)), 0.0);
  float light = 0.07 + pow(d, 0.8) * 1.15;
  float fres = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 3.0);
  col = col * light + uColB * fres * (0.25 + d * 0.6);
  col += uColC * uHover * (0.12 + fres * 0.5);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,w=`
varying vec3 vN;
void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,T=`
uniform vec3 uColor; varying vec3 vN;
void main(){
  float i = pow(max(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0), 3.5);
  gl_FragColor = vec4(uColor * i * 1.6, i);
  #include <colorspace_fragment>
}`,E=`
attribute float aSize; attribute float aSeed; attribute vec3 aColor;
uniform float uPix; uniform float uTime;
varying vec3 vColor; varying float vTw;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uPix * (60.0 / -mv.z), 1.0, 14.0 * uPix);
  gl_Position = projectionMatrix * mv;
  vColor = aColor;
  vTw = 0.65 + 0.35 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 40.0);
}`,D=`
varying vec3 vColor; varying float vTw;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d); a *= a;
  gl_FragColor = vec4(vColor * vTw, a * vTw);
  #include <colorspace_fragment>
}`,O=`
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,k=`
uniform float uTime; uniform float uShift;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
varying vec3 vDir;
${x}
void main(){
  vec3 d = normalize(vDir);
  float n1 = fbm(d * 2.2 + vec3(uTime * 0.005, 0.0, uTime * 0.003));
  float n2 = fbm(d * 4.5 - n1 * 1.2 + 7.0);
  float n3 = fbm(d * 3.0 + 20.0);
  vec3 col = vec3(0.012, 0.01, 0.03);
  col += uA * smoothstep(0.35, 0.85, n1) * 0.5;
  col += uB * smoothstep(0.45, 0.9, n2) * 0.32;
  col += uC * pow(smoothstep(0.5, 0.95, n3), 2.0) * 0.4;
  col = mix(col, col.zxy, uShift * 0.6);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,A={hero:[0,0,0],projects:[[-7,1,-40],[7,-1,-58],[-6,2,-76]],skills:[0,0,-112],sun:[0,0,-185]},j=new t(1,.45,.8);function M({radius:t,colors:r,atmosphere:i,seed:a}){let o=new e,s={uColA:{value:new u(r[0])},uColB:{value:new u(r[1])},uColC:{value:new u(r[2])},uSun:{value:j.clone()},uTime:{value:0},uSeed:{value:a},uHover:{value:0}},c=new n(new m(t,64,64),new d({vertexShader:S,fragmentShader:C,uniforms:s})),l=new n(new m(t*1.2,48,48),new d({vertexShader:w,fragmentShader:T,uniforms:{uColor:{value:new u(i)}},side:1,blending:2,transparent:!0,depthWrite:!1}));return o.add(c,l),{group:o,body:c,atmo:l,uniforms:s}}function N(e=`rgba(255,230,190,1)`,t=`rgba(255,140,90,0)`){let n=document.createElement(`canvas`);n.width=n.height=256;let r=n.getContext(`2d`),i=r.createRadialGradient(128,128,0,128,128,128);i.addColorStop(0,e),i.addColorStop(.25,`rgba(255,170,110,0.45)`),i.addColorStop(1,t),r.fillStyle=i,r.fillRect(0,0,256,256);let a=new c(n);return a.colorSpace=v,a}function P(e,t){let n=new Float32Array(e*3),r=new Float32Array(e*3),i=new Float32Array(e),a=new Float32Array(e),o=[`#ffffff`,`#cfe3ff`,`#d9ccff`,`#ffe9d1`,`#bff3ff`].map(e=>new u(e));for(let t=0;t<e;t++){let e=9+Math.random()**.65*140,s=Math.random()*Math.PI*2;n[t*3]=Math.cos(s)*e,n[t*3+1]=Math.sin(s)*e*.75,n[t*3+2]=-235+Math.random()*290;let c=o[Math.random()*o.length|0];r.set([c.r,c.g,c.b],t*3),i[t]=.6+Math.random()**3*2.4,a[t]=Math.random()}let c=new p;c.setAttribute(`position`,new s(n,3)),c.setAttribute(`aColor`,new s(r,3)),c.setAttribute(`aSize`,new s(i,1)),c.setAttribute(`aSeed`,new s(a,1));let l=new d({vertexShader:E,fragmentShader:D,uniforms:{uPix:{value:t},uTime:{value:0}},transparent:!0,depthWrite:!1,blending:2}),f=new h(c,l);return f.frustumCulled=!1,f}function F(e,t){let n=new i(new r(1,0),new o({color:9143976,roughness:.92,flatShading:!0}),e),a=new y;for(let r=0;r<e;r++)t(a,r),a.updateMatrix(),n.setMatrixAt(r,a.matrix);return n.instanceMatrix.needsUpdate=!0,n}function I(t,{mobile:r,dpr:i}){let o=new a(16773344,2.6);o.position.copy(j).multiplyScalar(30),t.add(o,new f(6970623,.45));let s={uTime:{value:0},uShift:{value:0},uA:{value:new u(`#5b21b6`)},uB:{value:new u(`#0e7490`)},uC:{value:new u(`#be185d`)}},c=new n(new m(450,32,32),new d({vertexShader:O,fragmentShader:k,uniforms:s,side:1,depthWrite:!1}));c.renderOrder=-10,c.frustumCulled=!1,t.add(c);let p=P(r?2600:7e3,i);t.add(p);let h=M({radius:4.6,colors:[`#2a1263`,`#7c3aed`,`#67e8f9`],atmosphere:`#8b5cf6`,seed:2.2});h.group.position.set(...A.hero),t.add(h.group);let v=F(r?220:520,(e,t)=>{let n=Math.random()*Math.PI*2,r=7.4+Math.random()*3.4+(t%7==0?.8:0);e.position.set(Math.cos(n)*r,(Math.random()-.5)*.7,Math.sin(n)*r),e.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6),e.scale.setScalar(.05+Math.random()**3*.3)}),y=new e;y.rotation.set(.25,0,.32),y.add(v),t.add(y);let x=F(r?70:180,e=>{let t=Math.random()*Math.PI*2,n=7+Math.random()*26;e.position.set(Math.cos(t)*n,Math.sin(t)*n*.6,-18-Math.random()*110),e.rotation.set(Math.random()*6,Math.random()*6,Math.random()*6),e.scale.setScalar(.15+Math.random()**2*.8)});t.add(x);let S=new e;S.position.set(...A.sun);let C=new n(new m(6,48,48),new g({color:16773590})),w=new l({map:N(),blending:2,depthWrite:!1,transparent:!0,opacity:.55}),T=new _(w);T.scale.setScalar(80);let E=[13,19].map((e,t)=>{let r=new n(new b(e,.07,8,160),new g({color:t?10980346:6809849,transparent:!0,opacity:.7}));return r.rotation.x=1.2+t*.3,r});return S.add(C,T,...E),t.add(S),{hero:h,setPix(e){p.material.uniforms.uPix.value=e},update(e,t,n,r){s.uTime.value=e,s.uShift.value=r,c.position.copy(n.position),p.material.uniforms.uTime.value=e,h.body.rotation.y+=t*.05,h.uniforms.uTime.value=e,y.rotation.y+=t*.03,x.rotation.z+=t*.004,E[0].rotation.z+=t*.15,E[1].rotation.z-=t*.1,T.scale.setScalar(80+Math.sin(e*.8)*3)}}}export{A as LAYOUT,j as SUN_DIR,I as createWorld,M as makePlanet};