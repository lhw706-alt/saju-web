// 별마루 3D 세상 (2026-11-15 기획 1단계 1번: 맵 + 걷기 + 카메라 + 내 천동이)
// 밤하늘 아래 작은 마당: 입구 '천문문' → 별자리 돌길(석등) → 가운데 돌단 위 큰 천동이 + 방석 자리, 왼쪽 소원 연못, 둘레 소나무.
// 조작: WASD·방향키로 걷기(카메라 기준), 마우스·손가락 드래그로 시점 돌리기, 휴대폰은 화면의 조이스틱(joyRef) 값.
// 사람이 많아도 가볍게: 그림자·많은 조명 없이 빛나는 재질과 스프라이트로 분위기를 냄.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildCheondong } from './Mascot3D.jsx';

const WORLD_R = 24; // 걸을 수 있는 반지름
const SPEED = 4.4;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.redraw = () => {
    draw(c.getContext('2d'), w, h);
    t.needsUpdate = true;
  };
  return t;
}
const glow = (inner, outer = 'rgba(0,0,0,0)') =>
  canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, inner);
    r.addColorStop(1, outer);
    g.clearRect(0, 0, w, w);
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });

// 밤하늘: 위는 짙은 남색, 지평선은 보랏빛 (안쪽에서 보는 큰 구)
function buildSky() {
  const geo = new THREE.SphereGeometry(180, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#070a1f') }, mid: { value: new THREE.Color('#141a3d') }, bottom: { value: new THREE.Color('#2b2150') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.15 ? mix(mid, top, smoothstep(0.15, 0.7, h)) : mix(bottom, mid, smoothstep(-0.05, 0.15, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const sky = new THREE.Mesh(geo, mat);
  const group = new THREE.Group();
  group.add(sky);
  // 별 + 은하수(기울어진 띠를 따라 더 촘촘히)
  const N = 2600;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const tilt = new THREE.Euler(0.5, 0, 0.9);
  const tmp = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const band = i < 1500;
    const a = Math.random() * Math.PI * 2;
    const yb = band ? (Math.random() - 0.5) * 0.22 : Math.random() * 2 - 1;
    const r = Math.sqrt(1 - yb * yb);
    tmp.set(Math.cos(a) * r, yb, Math.sin(a) * r);
    if (band) tmp.applyEuler(tilt);
    if (tmp.y < -0.02) tmp.y = Math.abs(tmp.y) + 0.02; // 땅 아래 별은 위로
    tmp.normalize().multiplyScalar(170);
    pos.set([tmp.x, tmp.y, tmp.z], i * 3);
    c.set(band ? (Math.random() < 0.5 ? '#c9c2ff' : '#ffe9c4') : '#ffffff').multiplyScalar(0.55 + Math.random() * 0.45);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, map: glow('rgba(255,255,255,1)'), alphaTest: 0.02, fog: false }));
  group.add(stars);
  // 은하수 빛 안개
  const milky = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 46),
    new THREE.MeshBasicMaterial({
      map: canvasTex(512, 128, (g, w, h) => {
        const lg = g.createLinearGradient(0, 0, 0, h);
        lg.addColorStop(0, 'rgba(0,0,0,0)');
        lg.addColorStop(0.5, 'rgba(150,140,230,0.22)');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = lg;
        g.fillRect(0, 0, w, h);
      }),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  milky.position.set(0, 80, -60);
  milky.rotation.set(-0.9, 0.2, 0.9);
  group.add(milky);
  return group;
}

// 별자리 돌바닥: 어두운 돌 + 금빛 별자리 선
function groundTexture() {
  return canvasTex(2048, 2048, (g, w) => {
    g.fillStyle = '#1b2032';
    g.fillRect(0, 0, w, w);
    // 돌 결
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`;
      const s = 20 + Math.random() * 90;
      g.fillRect(Math.random() * w, Math.random() * w, s, s * (0.4 + Math.random()));
    }
    // 동심원 테
    g.strokeStyle = 'rgba(226,194,122,0.18)';
    [0.2, 0.32, 0.46].forEach((k) => {
      g.lineWidth = 6;
      g.beginPath();
      g.arc(w / 2, w / 2, w * k, 0, Math.PI * 2);
      g.stroke();
    });
    // 별자리 (북두칠성 비슷한 꺾인 선들)
    const groups = [
      [[0.62, 0.22], [0.68, 0.25], [0.74, 0.24], [0.79, 0.28], [0.82, 0.35], [0.9, 0.34], [0.88, 0.27]],
      [[0.18, 0.62], [0.22, 0.7], [0.3, 0.72], [0.34, 0.8]],
      [[0.25, 0.2], [0.3, 0.26], [0.36, 0.22], [0.4, 0.3]],
      [[0.7, 0.72], [0.76, 0.66], [0.82, 0.7], [0.8, 0.8]],
    ];
    groups.forEach((pts) => {
      g.strokeStyle = 'rgba(240,210,140,0.45)';
      g.lineWidth = 3;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * w, y * w) : g.moveTo(x * w, y * w)));
      g.stroke();
      pts.forEach(([x, y]) => {
        const r = g.createRadialGradient(x * w, y * w, 0, x * w, y * w, 22);
        r.addColorStop(0, 'rgba(255,236,180,0.95)');
        r.addColorStop(1, 'rgba(255,236,180,0)');
        g.fillStyle = r;
        g.fillRect(x * w - 22, y * w - 22, 44, 44);
      });
    });
  });
}

const stoneMat = new THREE.MeshStandardMaterial({ color: '#5d6070', roughness: 0.92 });
const darkStone = new THREE.MeshStandardMaterial({ color: '#3b3e4c', roughness: 0.95 });
const woodMat = new THREE.MeshStandardMaterial({ color: '#3b2418', roughness: 0.8 });

// 석등: 돌 기둥 + 빛나는 창 + 빛 번짐
function stoneLantern() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.3, 8), stoneMat);
  base.position.y = 0.15;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.9, 8), stoneMat);
  post.position.y = 0.75;
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), new THREE.MeshStandardMaterial({ color: '#ffd58a', emissive: '#ffb347', emissiveIntensity: 1.6, roughness: 0.6 }));
  box.position.y = 1.42;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 4), stoneMat);
  roof.position.y = 1.85;
  roof.rotation.y = Math.PI / 4;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,190,90,0.55)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(2.6);
  halo.position.y = 1.42;
  g.add(base, post, box, roof, halo);
  return g;
}

// 소나무 실루엣
function pine(h = 4) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#16241f', roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.35, 6), woodMat);
  trunk.position.y = h * 0.17;
  g.add(trunk);
  [0, 1, 2].forEach((i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(h * (0.38 - i * 0.08), h * 0.42, 7), mat);
    cone.position.y = h * (0.45 + i * 0.2);
    g.add(cone);
  });
  return g;
}

// 입구 '천문문': 기둥 둘 + 지붕 + 현판(별마루) + 붉은 낙관
function gate() {
  const g = new THREE.Group();
  [-2.4, 2.4].forEach((x) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 10), woodMat);
    p.position.set(x, 2.1, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), stoneMat);
    foot.position.set(x, 0.2, 0);
    g.add(p, foot);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(6, 0.35, 0.45), woodMat);
  beam.position.y = 4.0;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.25, 1.6), new THREE.MeshStandardMaterial({ color: '#1d1f2a', roughness: 0.8 }));
  roof.position.y = 4.45;
  const roofTop = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.3, 1.0), new THREE.MeshStandardMaterial({ color: '#23263a', roughness: 0.8 }));
  roofTop.position.y = 4.7;
  const signTex = canvasTex(512, 220, (c, w, h) => {
    c.fillStyle = '#1f3a32';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c9a65a';
    c.lineWidth = 10;
    c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#f3e4bf';
    c.font = '600 112px "ChosunSm", serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('별마루', w / 2 - 34, h / 2 + 6);
    c.fillStyle = '#c8352b';
    c.fillRect(w - 118, h / 2 - 44, 74, 88);
    c.fillStyle = '#fce9c8';
    c.font = '600 34px "ChosunSm", serif';
    c.fillText('天', w - 81, h / 2 - 18);
    c.fillText('文', w - 81, h / 2 + 22);
  });
  document.fonts?.load('600 112px "ChosunSm"', '별마루天文').then(() => signTex.userData.redraw()).catch(() => {});
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7, emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 0.35 }));
  sign.position.set(0, 3.35, 0.24);
  g.add(beam, roof, roofTop, sign);
  // 기둥 사이 연등
  [-1.85, 1.85].forEach((x) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffb38a', emissive: '#ff8a5c', emissiveIntensity: 1.3 }));
    l.scale.y = 1.2;
    l.position.set(x, 3.55, 0.55);
    g.add(l);
  });
  return g;
}

// 방석
function cushion(color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.16, 20), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  m.position.y = 0.08;
  return m;
}

// 이름표 (머리 위)
function nameTag(text) {
  const tex = canvasTex(512, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.font = '600 40px "Pretendard Variable", Pretendard, sans-serif';
    const tw = c.measureText(text).width + 110;
    const x = (w - tw) / 2;
    c.fillStyle = 'rgba(20,22,36,0.82)';
    c.beginPath();
    if (c.roundRect) c.roundRect(x, 14, tw, 68, 34);
    else c.rect(x, 14, tw, 68);
    c.fill();
    c.fillStyle = '#E2C27A';
    c.beginPath();
    c.arc(x + 40, 48, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1B1C1E';
    c.font = '600 26px "Pretendard Variable", Pretendard, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('나', x + 40, 50);
    c.fillStyle = '#F3E4BF';
    c.font = '600 40px "Pretendard Variable", Pretendard, sans-serif';
    c.textAlign = 'left';
    c.fillText(text, x + 72, 50);
  });
  document.fonts?.ready.then(() => tex.userData.redraw()).catch(() => {});
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  s.scale.set(2.2, 0.41, 1);
  s.renderOrder = 10;
  return s;
}

// 원 충돌체: [x, z, 반지름]
const COLLIDERS = [
  [0, 0, 3.4], // 가운데 돌단
  [-12, -4, 3.6], // 연못
  [-2.4, 17, 0.45],
  [2.4, 17, 0.45], // 문 기둥
];

// apiRef.current = { qi(), stopQi(), bow(), star(), lantern() } — 화면의 동작 버튼이 부름
// onEvent(type, data): 'qi-walk'(방석으로 가는 중) · 'qi-start' · 'qi-cancel' · 'star'({n}) · 'lantern-up'
export default function Byeolmaru3D({ nick = '별빛의 손님', joyRef, apiRef, onEvent, starCount = 0, onReady, onFail }) {
  const mount = useRef(null);
  useEffect(() => {
    const el = mount.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      onFail?.();
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const colliders = COLLIDERS.map((c) => [...c]);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#141a3d', 28, 95);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

    // 빛: 달빛 + 하늘빛 + 가운데 따뜻한 빛
    scene.add(new THREE.HemisphereLight('#8d93d8', '#1a1426', 0.75));
    const moon = new THREE.DirectionalLight('#c8d0ff', 0.9);
    moon.position.set(-20, 40, 10);
    scene.add(moon);
    const warm = new THREE.PointLight('#ffcf80', 18, 16, 1.6);
    warm.position.set(0, 4.5, 0);
    scene.add(warm);

    scene.add(buildSky());

    // 바닥
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const grass = new THREE.Mesh(new THREE.RingGeometry(30, 120, 64), new THREE.MeshStandardMaterial({ color: '#0f1715', roughness: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    scene.add(grass);

    // 돌길 (문 → 돌단)
    for (let z = 15.5; z > 4; z -= 1.25) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.4 + Math.random() * 0.3, 0.08, 1.05), darkStone);
      slab.position.set((Math.random() - 0.5) * 0.15, 0.04, z);
      slab.rotation.y = (Math.random() - 0.5) * 0.06;
      scene.add(slab);
    }
    // 석등 (길 양옆 + 마당 둘레)
    [[-2.6, 12], [2.6, 12], [-2.6, 7.5], [2.6, 7.5], [8, -8], [-6, -12], [10, 4], [-15, 3]].forEach(([x, z]) => {
      const l = stoneLantern();
      l.position.set(x, 0, z);
      scene.add(l);
      colliders.push([x, z, 0.45]);
    });

    // 입구 천문문
    const g = gate();
    g.position.set(0, 0, 17);
    scene.add(g);

    // 가운데 돌단 3층 + 큰 천동이
    [[3.3, 0.35], [2.6, 0.35], [1.9, 0.35]].forEach(([r, h], i) => {
      const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.12, h, 40), i % 2 ? darkStone : stoneMat);
      tier.position.y = h / 2 + i * h;
      scene.add(tier);
    });
    const big = buildCheondong();
    const BIG = 1.15;
    big.root.scale.setScalar(BIG);
    big.root.position.set(0, 1.05 + 1.06 * BIG, 0);
    big.floor.visible = false;
    big.zzz.visible = false;
    scene.add(big.root);
    const altarGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,210,140,0.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    altarGlow.scale.setScalar(12);
    altarGlow.position.set(0, 2.6, 0);
    scene.add(altarGlow);

    // 방석 자리 (돌단 둘레 12개)
    const seats = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      const c = cushion(i % 3 === 0 ? '#8c2f2a' : '#6b2a3a');
      c.position.set(Math.sin(a) * 5.4, 0, Math.cos(a) * 5.4);
      scene.add(c);
      seats.push(c.position.clone());
    }

    // 소원 연못 + 물 위 등불
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), new THREE.MeshStandardMaterial({ color: '#0d1a3a', roughness: 0.12, metalness: 0.6, emissive: '#0a1430', emissiveIntensity: 0.6 }));
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(-12, 0.03, -4);
    scene.add(pond);
    const pondRim = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.18, 8, 48), stoneMat);
    pondRim.rotation.x = -Math.PI / 2;
    pondRim.position.set(-12, 0.08, -4);
    scene.add(pondRim);
    const floats = [];
    for (let i = 0; i < 7; i++) {
      const lot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb366', emissiveIntensity: 1.8 }));
      lot.scale.y = 0.6;
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,190,110,0.6)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      h.scale.setScalar(1.2);
      lot.add(h);
      lot.userData = { a: Math.random() * Math.PI * 2, r: 0.6 + Math.random() * 2.2, s: 0.05 + Math.random() * 0.08 };
      lot.position.set(-12, 0.15, -4);
      scene.add(lot);
      floats.push(lot);
    }

    // 하늘로 떠오르는 등불
    const sky = [];
    const skyMat = new THREE.SpriteMaterial({ map: glow('rgba(255,200,120,1)', 'rgba(255,140,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    for (let i = 0; i < 28; i++) {
      const s = new THREE.Sprite(skyMat);
      s.scale.setScalar(0.5 + Math.random() * 0.5);
      s.position.set((Math.random() - 0.5) * 60, 4 + Math.random() * 40, (Math.random() - 0.5) * 60);
      s.userData.v = 0.4 + Math.random() * 0.5;
      scene.add(s);
      sky.push(s);
    }

    // 둘레 소나무
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + Math.random() * 0.05;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.22) continue; // 입구 쪽(+z)은 비움
      const r = 26 + Math.random() * 6;
      const t = pine(3.5 + Math.random() * 3);
      t.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
      scene.add(t);
    }

    // 반딧불
    const FN = 90;
    const fpos = new Float32Array(FN * 3);
    for (let i = 0; i < FN; i++) fpos.set([(Math.random() - 0.5) * 50, 0.4 + Math.random() * 3, (Math.random() - 0.5) * 50], i * 3);
    const fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    const flies = new THREE.Points(fgeo, new THREE.PointsMaterial({ size: 0.16, map: glow('rgba(255,236,170,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe9a8' }));
    scene.add(flies);

    // 내 천동이
    const me = buildCheondong();
    const ME = 0.42;
    me.root.scale.setScalar(ME);
    me.floor.visible = false;
    me.zzz.visible = false;
    me.spirits.visible = false;
    me.sparks.visible = false; // 작은 천동이 둘레 빛 알갱이는 지저분해 보여서 뺌
    me.aura.scale.setScalar(2.2);
    const player = new THREE.Group();
    player.add(me.root);
    me.root.position.y = 1.06 * ME;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ map: glow('rgba(0,0,0,0.55)'), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    player.add(shadow);
    const tag = nameTag(nick);
    tag.position.y = 1.75;
    player.add(tag);
    player.position.set(0, 0, 21);
    player.rotation.y = Math.PI;
    scene.add(player);

    // ── 동작 효과 ──
    const sparkTex = glow('rgba(255,236,180,1)', 'rgba(255,200,120,0)');
    const bursts = []; // { s, v, life }
    const burst = (at, n = 14, up = 1) => {
      for (let i = 0; i < n; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        sp.scale.setScalar(0.18 + Math.random() * 0.14);
        sp.position.copy(at);
        const a = Math.random() * Math.PI * 2;
        const r = 0.6 + Math.random() * 1.2;
        bursts.push({ s: sp, v: new THREE.Vector3(Math.cos(a) * r, (0.8 + Math.random() * 1.6) * up, Math.sin(a) * r), life: 1.2 + Math.random() * 0.6, age: 0 });
        scene.add(sp);
      }
    };
    // 헤아린 별: 하늘에 남는 반짝이 (오늘 켠 수만큼 다시 그림)
    const countStarTex = canvasTex(128, 128, (g2, w) => {
      g2.clearRect(0, 0, w, w);
      const r = g2.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      r.addColorStop(0, 'rgba(255,248,220,1)');
      r.addColorStop(0.18, 'rgba(255,226,150,0.9)');
      r.addColorStop(1, 'rgba(255,200,120,0)');
      g2.fillStyle = r;
      g2.fillRect(0, 0, w, w);
      g2.strokeStyle = 'rgba(255,240,200,0.85)';
      g2.lineWidth = 3;
      g2.beginPath();
      g2.moveTo(w / 2, 6);
      g2.lineTo(w / 2, w - 6);
      g2.moveTo(6, w / 2);
      g2.lineTo(w - 6, w / 2);
      g2.stroke();
    });
    const counted = [];
    const addCountStar = (dir, instant = false) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: countStarTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      sp.position.copy(dir).multiplyScalar(90);
      sp.userData = { size: 6 + Math.random() * 3, age: instant ? 9 : 0, ph: Math.random() * 6 };
      sp.scale.setScalar(instant ? sp.userData.size : 0.01);
      scene.add(sp);
      counted.push(sp);
    };
    const randomSkyDir = (around) => {
      const d = new THREE.Vector3();
      for (let k = 0; k < 20; k++) {
        d.set((Math.random() - 0.5) * 2, 0.35 + Math.random() * 0.6, (Math.random() - 0.5) * 2);
        if (around) d.lerp(around, 0.55);
        d.normalize();
        if (d.y > 0.25) break;
      }
      return d;
    };
    for (let i = 0; i < Math.min(108, starCount); i++) addCountStar(randomSkyDir(), true);
    // 띄운 등불
    const lanterns = [];
    const lanternMat = new THREE.MeshStandardMaterial({ color: '#ffd59a', emissive: '#ff9f4a', emissiveIntensity: 1.8, roughness: 0.6 });

    // 동작 상태
    let mode = 'walk'; // walk | auto(방석으로 걸어가는 중) | sit
    let seatAt = null;
    let bowT = -1;
    let qiOn = false;

    // ── 입력 ──
    const keys = new Set();
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        if (e.type === 'keydown') keys.add(k);
        else keys.delete(k);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    const blur = () => keys.clear();
    window.addEventListener('blur', blur);
    // 시점: 드래그로 돌리기, 휠로 가깝게·멀게
    let yaw = 0;
    let pitch = 0.32;
    let dist = 7.5;
    let drag = null;
    const cv = renderer.domElement;
    cv.style.touchAction = 'none';
    const onDown = (e) => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      cv.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      yaw -= (e.clientX - drag.x) * 0.006;
      pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.y) * 0.004, 0.08, 1.05);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onUp = (e) => {
      if (drag && drag.id === e.pointerId) drag = null;
    };
    const onWheel = (e) => {
      dist = THREE.MathUtils.clamp(dist + e.deltaY * 0.01, 4, 13);
      e.preventDefault();
    };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });

    const resize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 70 : 55; // 휴대폰 세로 화면은 시야를 넓게
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const nearestSeat = () => {
      let best = null;
      let bd = Infinity;
      seats.forEach((p) => {
        const d = p.distanceTo(player.position);
        if (d < bd) {
          bd = d;
          best = p;
        }
      });
      return best;
    };
    const stopSit = (silent) => {
      const was = mode !== 'walk';
      mode = 'walk';
      seatAt = null;
      qiOn = false;
      if (was && !silent) onEvent?.('qi-cancel');
    };
    if (apiRef)
      apiRef.current = {
        qi: () => {
          seatAt = nearestSeat();
          mode = player.position.distanceTo(seatAt) < 0.5 ? 'sit' : 'auto';
          if (mode === 'sit') {
            qiOn = true;
            onEvent?.('qi-start');
          } else onEvent?.('qi-walk');
        },
        stopQi: () => stopSit(true),
        bow: () => {
          if (bowT < 0) bowT = 0;
        },
        star: () => {
          const fwd = new THREE.Vector3();
          camera.getWorldDirection(fwd);
          addCountStar(randomSkyDir(fwd.setY(Math.max(0.4, fwd.y + 0.5)).normalize()));
          burst(player.position.clone().setY(1.2), 6);
        },
        lantern: () => {
          const l = new THREE.Group();
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 12, 1, true), lanternMat);
          const cap = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), lanternMat);
          cap.rotation.x = -Math.PI / 2;
          cap.position.y = 0.21;
          const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,190,100,0.75)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
          halo.scale.setScalar(1.6);
          l.add(body, cap, halo);
          l.position.copy(player.position).setY(1.6);
          l.userData = { age: 0, sway: Math.random() * 6, told: false };
          scene.add(l);
          lanterns.push(l);
          burst(player.position.clone().setY(1), 10);
        },
      };

    const clock = new THREE.Clock();
    let raf;
    let facing = Math.PI;
    let walkT = 0;
    const camTarget = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    let firstFrame = true;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      // 이동 입력 (키보드 + 조이스틱)
      let ix = 0;
      let iz = 0;
      if (keys.has('w') || keys.has('arrowup')) iz += 1;
      if (keys.has('s') || keys.has('arrowdown')) iz -= 1;
      if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
      if (keys.has('d') || keys.has('arrowright')) ix += 1;
      const joy = joyRef?.current;
      if (joy && (joy.x || joy.y)) {
        ix += joy.x;
        iz += joy.y;
      }
      let mag = Math.min(1, Math.hypot(ix, iz));
      if (mag > 0.05 && mode !== 'walk') stopSit(false); // 걷기 시작하면 앉기·기운 받기 멈춤
      // 방석으로 알아서 걸어가기
      if (mode === 'auto' && seatAt) {
        const tx = seatAt.x - player.position.x;
        const tz = seatAt.z - player.position.z;
        const d = Math.hypot(tx, tz);
        if (d < 0.35) {
          player.position.x = seatAt.x;
          player.position.z = seatAt.z;
          mode = 'sit';
          qiOn = true;
          onEvent?.('qi-start');
        } else {
          // 카메라 기준 입력값으로 바꿔 아래 이동 코드를 그대로 씀
          const wx = tx / d;
          const wz = tz / d;
          const fx0 = -Math.sin(yaw);
          const fz0 = -Math.cos(yaw);
          const rx0 = Math.cos(yaw);
          const rz0 = -Math.sin(yaw);
          iz = wx * fx0 + wz * fz0;
          ix = wx * rx0 + wz * rz0;
          mag = Math.min(1, d);
        }
      }
      const moving = mag > 0.05 && mode !== 'sit';
      if (moving) {
        const fx = -Math.sin(yaw);
        const fz = -Math.cos(yaw);
        const rx = Math.cos(yaw);
        const rz = -Math.sin(yaw);
        const n = Math.hypot(ix, iz) || 1;
        const dx = ((fx * iz + rx * ix) / n) * mag;
        const dz = ((fz * iz + rz * ix) / n) * mag;
        let nx = player.position.x + dx * SPEED * dt;
        let nz = player.position.z + dz * SPEED * dt;
        // 마당 밖으로 못 나감 + 원 충돌체 밀어내기
        const rr = Math.hypot(nx, nz);
        if (rr > WORLD_R) {
          nx = (nx / rr) * WORLD_R;
          nz = (nz / rr) * WORLD_R;
        }
        colliders.forEach(([cx, cz, cr]) => {
          const ddx = nx - cx;
          const ddz = nz - cz;
          const d = Math.hypot(ddx, ddz);
          const min = cr + 0.45;
          if (d < min && d > 0.0001) {
            nx = cx + (ddx / d) * min;
            nz = cz + (ddz / d) * min;
          }
        });
        player.position.x = nx;
        player.position.z = nz;
        const target = Math.atan2(dx, dz);
        let diff = target - facing;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        facing += diff * Math.min(1, dt * 10);
        walkT += dt * 9 * mag;
      } else {
        walkT += dt * 1.2;
      }
      if (mode === 'sit') {
        // 돌단(가운데)을 바라봄
        const target = Math.atan2(-player.position.x, -player.position.z);
        let diff = target - facing;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        facing += diff * Math.min(1, dt * 5);
      }
      player.rotation.y = facing;
      // 걸을 때 통통, 서 있으면 숨쉬기, 앉으면 낮게 + 천천히 깊은 숨
      const breathe = mode === 'sit' ? Math.sin(t * 0.785) * 0.035 : Math.sin(walkT) * 0.02;
      const hop = moving ? Math.abs(Math.sin(walkT)) * 0.16 : breathe;
      me.root.position.y = 1.06 * ME + hop + (mode === 'sit' ? 0.02 : 0);
      me.root.rotation.z = moving ? Math.sin(walkT) * 0.08 : 0;
      let lean = moving ? 0.08 : 0;
      if (bowT >= 0) {
        bowT += dt;
        const p = Math.min(1, bowT / 1.3);
        lean += Math.sin(p * Math.PI) * 0.6;
        if (bowT > 0.55 && bowT - dt <= 0.55) burst(player.position.clone().setY(1.1), 12);
        if (p >= 1) bowT = -1;
      }
      me.root.rotation.x = lean;
      shadow.scale.setScalar(1 - Math.max(0, hop) * 0.8);
      // 기운 받기 중: 내 둘레로 빛이 피어오름
      if (qiOn && Math.random() < dt * 9) burst(player.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.2, (Math.random() - 0.5) * 0.8)), 1, 0.7);

      // 큰 천동이: 숨쉬기 + 오행 빛글자 돌기
      big.body.scale.set(1, 1 + Math.sin(t * 1.4) * 0.015, 1);
      big.spirits.children.forEach((sp) => {
        const u = sp.userData;
        u.spin = (u.spin || 0) + dt * (qiOn ? 0.9 : 0.35);
        const a = u.angle + u.spin;
        sp.position.set(Math.cos(a) * 2.3, u.height + Math.sin(t + u.phase) * 0.15, Math.sin(a) * 2.3);
      });
      const sp = big.sparks.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        let y = sp.getY(i) + big.sparks.userData.speed[i] * dt;
        if (y > 2.6) y = -1;
        sp.setY(i, y);
      }
      sp.needsUpdate = true;
      altarGlow.material.opacity = 0.8 + Math.sin(t * 1.2) * 0.2;
      const glowTo = qiOn ? 17 : 12;
      altarGlow.scale.setScalar(altarGlow.scale.x + (glowTo - altarGlow.scale.x) * Math.min(1, dt * 2));
      warm.intensity += ((qiOn ? 30 : 18) - warm.intensity) * Math.min(1, dt * 2);
      // 빛 터짐
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.age += dt;
        b.s.position.addScaledVector(b.v, dt);
        b.v.multiplyScalar(1 - dt * 1.2);
        b.s.material.opacity = Math.max(0, 1 - b.age / b.life);
        if (b.age >= b.life) {
          scene.remove(b.s);
          b.s.material.dispose();
          bursts.splice(i, 1);
        }
      }
      // 헤아린 별: 반짝 켜지고 계속 깜빡
      counted.forEach((c) => {
        const u = c.userData;
        u.age += dt;
        const pop = u.age < 0.5 ? u.size * (1.8 - (u.age / 0.5) * 0.8) * Math.min(1, u.age / 0.12) : u.size;
        c.scale.setScalar(pop * (0.85 + Math.sin(t * 2.4 + u.ph) * 0.15));
      });
      // 띄운 등불: 천천히 하늘로, 흔들리며 작아짐
      for (let i = lanterns.length - 1; i >= 0; i--) {
        const l = lanterns[i];
        const u = l.userData;
        u.age += dt;
        l.position.y += dt * (0.9 + u.age * 0.12);
        l.position.x += Math.sin(t * 0.8 + u.sway) * dt * 0.25;
        if (!u.told && u.age > 2.6) {
          u.told = true;
          onEvent?.('lantern-up');
        }
        if (l.position.y > 70) {
          scene.remove(l);
          lanterns.splice(i, 1);
        }
      }
      // 연못 등불 맴돌기
      floats.forEach((f) => {
        f.userData.a += f.userData.s * dt;
        f.position.x = -12 + Math.cos(f.userData.a) * f.userData.r;
        f.position.z = -4 + Math.sin(f.userData.a) * f.userData.r;
        f.position.y = 0.15 + Math.sin(t * 2 + f.userData.r) * 0.03;
      });
      // 하늘 등불 떠오르기
      sky.forEach((s) => {
        s.position.y += s.userData.v * dt;
        s.position.x += Math.sin(t * 0.3 + s.userData.v * 9) * 0.004;
        if (s.position.y > 48) s.position.y = 4;
      });
      // 반딧불 흔들림
      const fp = flies.geometry.attributes.position;
      for (let i = 0; i < FN; i++) fp.setY(i, fp.getY(i) + Math.sin(t * 1.5 + i) * 0.004);
      fp.needsUpdate = true;
      flies.material.opacity = 0.6 + Math.sin(t * 2) * 0.3;

      // 카메라: 뒤에서 따라가기 (앉으면 등 뒤로 다가가 돌단을 함께 봄)
      if (mode === 'sit') {
        let want = facing + Math.PI;
        let dy = want - yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        yaw += dy * Math.min(1, dt * 2.5);
        pitch += (0.36 - pitch) * Math.min(1, dt * 2);
      }
      const useDist = mode === 'sit' ? (camera.aspect < 1 ? 5.4 : 6.4) : dist;
      tag.visible = mode !== 'sit'; // 앉아 있을 땐 이름표 숨김
      // 앉으면 나와 큰 천동이 사이를 바라봐 둘 다 화면에 들어오게
      if (mode === 'sit') { const k = camera.aspect < 1 ? 0.7 : 0.82; camTarget.set(player.position.x * k, camera.aspect < 1 ? 1.9 : 1.5, player.position.z * k); } // 가로 화면은 나 쪽으로 더 낮게 봐서 내 천동이가 버튼에 안 가리게
      else camTarget.set(player.position.x, 1.3, player.position.z);
      camPos.set(camTarget.x + Math.sin(yaw) * Math.cos(pitch) * useDist, camTarget.y + Math.sin(pitch) * useDist, camTarget.z + Math.cos(yaw) * Math.cos(pitch) * useDist);
      if (firstFrame) camera.position.copy(camPos);
      else camera.position.lerp(camPos, Math.min(1, dt * 8));
      camera.lookAt(camTarget);
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        onReady?.();
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', blur);
      renderer.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach((m) => {
          m.map?.dispose?.();
          m.dispose?.();
        });
      });
      el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="bm-canvas" ref={mount} />;
}
