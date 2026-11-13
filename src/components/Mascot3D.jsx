// 사주천문 캐릭터 '천동이' — 실시간 3D (three.js)
// 눈을 감고 앉아 하늘의 기운을 받는(접신) 모습.
// 진주빛 벨벳 물방울 몸 + 금빛 초승달 꼭지 + 이마의 빛나는 표식,
// 몸 둘레를 오행 빛글자(木火土金水)가 떠다니며 차례로 빛나고, 바닥에는 십이지지 원판이 천천히 돈다.
// 움직임 줄이기 설정이면 정지 화면, WebGL 이 없으면 CSS 대체(.mascot-fallback).
import { useEffect, useRef, useState } from 'react';
import { LogoSymbol } from './Logo.jsx';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const ELEMENT_COLORS = ['#6dbb8a', '#e8705f', '#e2b35a', '#eef0f6', '#6b9be6']; // 목 화 토 금 수
const ELEMENT_GLYPHS = ['木', '火', '土', '金', '水'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData.redraw = () => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, size, size);
    draw(g, size);
    t.needsUpdate = true;
  };
  return t;
}

const radial = (stops) =>
  canvasTexture(256, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    stops.forEach(([o, c]) => grd.addColorStop(o, c));
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
  });

// 빛나는 한자 한 글자 (가운데 번짐 + 글자 + 테두리 빛)
function glyphTexture(ch, color) {
  return canvasTexture(256, (g, s) => {
    const c = s / 2;
    const halo = g.createRadialGradient(c, c, 0, c, c, c);
    halo.addColorStop(0, `${color}55`);
    halo.addColorStop(0.45, `${color}22`);
    halo.addColorStop(1, `${color}00`);
    g.fillStyle = halo;
    g.fillRect(0, 0, s, s);
    g.font = `600 ${s * 0.46}px "ChosunSm", serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = s * 0.08;
    g.fillStyle = color;
    g.fillText(ch, c, c + s * 0.02);
    g.shadowBlur = 0;
    g.globalAlpha = 0.35;
    g.fillStyle = '#ffffff';
    g.font = `600 ${s * 0.44}px "ChosunSm", serif`;
    g.fillText(ch, c, c + s * 0.02);
    g.globalAlpha = 1;
  });
}

// 십이지지 원판 (금색 선, 투명 배경)
function circleTexture() {
  return canvasTexture(1024, (g, s) => {
    const c = s / 2;
    g.strokeStyle = 'rgba(240,213,149,0.9)';
    g.fillStyle = 'rgba(240,213,149,0.95)';
    g.lineWidth = 3;
    [0.47, 0.41, 0.3, 0.17].forEach((r, i) => {
      g.globalAlpha = i === 0 ? 0.9 : 0.55;
      g.beginPath();
      g.arc(c, c, s * r, 0, Math.PI * 2);
      g.stroke();
    });
    g.globalAlpha = 0.5;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r1 = s * (i % 6 === 0 ? 0.41 : 0.435);
      g.beginPath();
      g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
      g.lineTo(c + Math.cos(a) * s * 0.47, c + Math.sin(a) * s * 0.47);
      g.stroke();
    }
    g.globalAlpha = 0.95;
    g.font = `600 ${s * 0.055}px "ChosunSm", serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    BRANCHES.forEach((ch, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      g.save();
      g.translate(c + Math.cos(a) * s * 0.355, c + Math.sin(a) * s * 0.355);
      g.rotate(a + Math.PI / 2);
      g.fillText(ch, 0, 0);
      g.restore();
    });
    // 안쪽 팔각 별
    g.globalAlpha = 0.45;
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = s * (i % 2 ? 0.1 : 0.17);
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  });
}

export function buildCheondong() {
  const root = new THREE.Group();
  const char = new THREE.Group();
  root.add(char);

  // 몸: 위가 둥근 물방울 (회전체)
  const profile = new THREE.SplineCurve(
    [[0, -1.0], [0.72, -0.99], [0.98, -0.88], [1.07, -0.6], [1.07, -0.2], [1.02, 0.2], [0.93, 0.56], [0.76, 0.9], [0.5, 1.15], [0.22, 1.27], [0, 1.29]].map(
      ([x, y]) => new THREE.Vector2(x, y)
    )
  ).getPoints(80);
  const velvet = new THREE.MeshPhysicalMaterial({
    color: '#f5ecdc',
    roughness: 0.58,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
    sheen: 1,
    sheenColor: new THREE.Color('#d8c6ff'),
    sheenRoughness: 0.35,
    emissive: '#3a2a12',
    emissiveIntensity: 0.12,
  });
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), velvet);
  char.add(body);

  // 앞으로 모은 다리, 옆구리의 손
  [-0.42, 0.42].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), velvet);
    leg.scale.set(0.37, 0.3, 0.44);
    leg.position.set(x, -0.76, 0.74);
    char.add(leg);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), velvet);
    hand.scale.set(0.24, 0.32, 0.28);
    hand.position.set(Math.sign(x) * 1.0, -0.42, 0.36);
    char.add(hand);
  });

  // 얼굴: 몸 표면에 딱 붙는 얇은 껍질(같은 윤곽의 회전체 일부)에 캔버스로 눈·눈썹·입을 그림
  // → 눈동자가 포인터를 따라가고, 누르면 화난 표정. 몸과 함께 숨쉬도록 body 의 자식으로 둔다.
  const faceProfile = profile.filter((v) => v.y >= FACE_Y0 && v.y <= FACE_Y1).map((v) => new THREE.Vector2(v.x * 1.006, v.y));
  const face = createFace();
  const faceMesh = new THREE.Mesh(
    new THREE.LatheGeometry(faceProfile, 48, -FACE_PHI, FACE_PHI * 2),
    new THREE.MeshStandardMaterial({ map: face.texture, transparent: true, roughness: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  body.add(faceMesh);

  // 볼
  const blushMat = new THREE.MeshBasicMaterial({ color: '#ff9fb4', transparent: true, opacity: 0.28, depthWrite: false });
  [-0.62, 0.62].forEach((x) => {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.14, 32), blushMat);
    b.scale.set(1.3, 0.7, 1);
    b.position.set(x, 0.02, 0.85);
    b.lookAt(x * 3, 0, 4);
    char.add(b);
  });

  // 자는 표시 zZZ: 크기가 다른 Z 세 개가 머리 오른쪽에서 차례로 떠오름 (누르면 사라졌다가 다시 잠들면 나타남)
  const zTex = canvasTexture(128, (g, size) => {
    g.clearRect(0, 0, size, size);
    g.font = '900 104px "Pretendard Variable", Pretendard, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 14;
    g.lineJoin = 'round';
    g.strokeStyle = '#4a2a24';
    g.strokeText('Z', size / 2, size / 2 + 4);
    g.fillStyle = '#fff6dc';
    g.fillText('Z', size / 2, size / 2 + 4);
  });
  document.fonts?.ready.then(() => zTex.userData.redraw()).catch(() => {}); // 서체가 늦게 오면 다시 그림
  const zzz = new THREE.Group();
  [0.2, 0.28, 0.38].forEach((sz, i) => {
    const z = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false, toneMapped: false }));
    z.userData = { size: sz, phase: i / 3 };
    zzz.add(z);
  });
  zzz.position.set(0.95, 1.05, 0.2);
  root.add(zzz);

  // 이마의 빛나는 표식
  const markMat = new THREE.MeshStandardMaterial({ toneMapped: false, color: '#f6d98e', emissive: '#f0c060', emissiveIntensity: 1.2, roughness: 0.3 });
  const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), markMat);
  mark.scale.set(0.8, 1.3, 0.5);
  mark.position.set(0, 0.62, 0.93);
  mark.lookAt(0, 1.2, 4);
  const markGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial([[0, 'rgba(255,200,110,0.75)'], [0.35, 'rgba(255,180,80,0.18)'], [1, 'rgba(0,0,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  markGlow.scale.setScalar(0.55);
  markGlow.position.set(0, 0.62, 0.98);
  char.add(markGlow);
  mark.userData.glow = markGlow;
  char.add(mark);

  // 초승달 꼭지
  const R = 0.3;
  const cx = 0.45 * R;
  const ri = Math.hypot(0.5 * R - cx, 0.866 * R);
  const ang = Math.atan2(0.866 * R, 0.5 * R - cx);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, R, Math.PI / 3, (Math.PI * 5) / 3, false);
  shape.absarc(cx, 0, ri, -ang, ang, true);
  const crescentGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 10, curveSegments: 48 });
  crescentGeo.center();
  const crescent = new THREE.Mesh(
    crescentGeo,
    new THREE.MeshPhysicalMaterial({ color: '#e9b949', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, emissive: '#c48a1c', emissiveIntensity: 0.45 })
  );
  crescent.position.set(0.06, 1.48, 0.02);
  crescent.rotation.set(-0.1, 0.2, -0.55);
  char.add(crescent);

  // 후광
  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radial([[0, 'rgba(255,226,160,0.55)'], [0.35, 'rgba(200,170,255,0.28)'], [0.7, 'rgba(120,150,255,0.08)'], [1, 'rgba(0,0,0,0)']]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  aura.scale.set(5.2, 5.2, 1);
  aura.position.set(0, 0.35, -1.2);
  root.add(aura);

  // 오행 빛글자: 木火土金水 가 각자의 색으로 빛나며 높낮이를 달리해 떠다님
  const spirits = new THREE.Group();
  root.add(spirits);
  ELEMENT_GLYPHS.forEach((ch, k) => {
    const col = ELEMENT_COLORS[k];
    const tex = glyphTexture(ch, col);
    document.fonts?.load('600 160px "ChosunSm"', ch).then(() => tex.userData.redraw()).catch(() => {});
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.setScalar(0.7);
    sp.userData = { angle: (k / ELEMENT_GLYPHS.length) * Math.PI * 2, height: [0.55, -0.25, 0.95, 0.15, -0.5][k], phase: k * 1.3 };
    spirits.add(sp);
  });

  // 피어오르는 빛 알갱이
  const N = 70;
  const pos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 0.6 + Math.random() * 1.6;
    const a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, -1 + Math.random() * 3.6, Math.sin(a) * r * 0.6], i * 3);
    speed[i] = 0.15 + Math.random() * 0.35;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      size: 0.09,
      map: radial([[0, 'rgba(255,240,200,1)'], [0.3, 'rgba(255,220,150,0.5)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  sparks.userData.speed = speed;
  root.add(sparks);

  // 바닥: 십이지지 원판 + 그림자
  const floor = new THREE.Group();
  floor.position.y = -1.35;
  const discTex = circleTexture();
  // 글꼴이 늦게 오면 다시 그림 (처음엔 대체 글꼴로 그려짐)
  document.fonts?.load('600 56px "ChosunSm"', '子丑寅卯').then(() => discTex.userData.redraw()).catch(() => {});
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({ map: discTex, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  disc.rotation.x = -Math.PI / 2;
  floor.add(disc);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  floor.add(shadow);

  return { root, char, body, spirits, crescent, mark, aura, sparks, floor, disc, shadow, face, blushMat, zzz };
}

// ── 행운의 번호 화면 소품 (2026-11-14) ──
// 네잎클로버: 손에 쥔 줄기 + 하트 잎 네 장 (행운의 번호 화면)
export function buildClover() {
  const g = new THREE.Group();
  const leafMat = new THREE.MeshPhysicalMaterial({ color: '#4cb95e', roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.5, sheenColor: new THREE.Color('#c8ffb0'), emissive: '#16481f', emissiveIntensity: 0.2 });
  const stemMat = new THREE.MeshStandardMaterial({ color: '#3f8f4a', roughness: 0.6 });
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, 0.45, 0.02), new THREE.Vector3(0.02, 0.95, 0.06)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 24, 0.035, 10, false), stemMat));
  const heart = new THREE.Shape();
  heart.moveTo(0, 0);
  heart.bezierCurveTo(-0.28, 0.12, -0.32, 0.46, -0.15, 0.5);
  heart.bezierCurveTo(-0.05, 0.52, 0, 0.44, 0, 0.38);
  heart.bezierCurveTo(0, 0.44, 0.05, 0.52, 0.15, 0.5);
  heart.bezierCurveTo(0.32, 0.46, 0.28, 0.12, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(heart, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 6, curveSegments: 28 });
  leafGeo.translate(0, 0, -0.025);
  const head = new THREE.Group();
  [0, 1, 2, 3].forEach((i) => {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    // 잎마다 살짝 위로 오므려 입체감 (평평한 판이 아니게)
    const holder = new THREE.Group();
    holder.rotation.z = (i * Math.PI) / 2 + Math.PI / 4;
    leaf.rotation.x = 0.32;
    holder.add(leaf);
    head.add(holder);
  });
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), stemMat));
  head.position.set(0.02, 0.97, 0.07);
  head.rotation.x = -0.4; // 얼굴(카메라) 쪽으로 눕혀 잎 네 장이 잘 보이게
  g.add(head);
  g.userData.head = head;
  return g;
}

// 로또 공: 번호가 적힌 반짝이는 공 (번호 고르는 동안 천동이 둘레를 빙글빙글)
const lottoColor = (n) => (n <= 10 ? '#fbc400' : n <= 20 ? '#69c8f2' : n <= 30 ? '#ff7272' : n <= 40 ? '#aab0b6' : '#b0d840');
export function buildLottoBalls(count = 8) {
  // 진짜 3D 공(빛을 받는 광택 구) + 앞면의 흰 원 번호표(늘 카메라를 보는 정원)
  const g = new THREE.Group();
  const R = 0.3;
  const sphere = new THREE.SphereGeometry(R, 48, 32);
  const nums = Array.from({ length: count }, (_, i) => ((i * 17 + 7) % 45) + 1);
  nums.forEach((n, i) => {
    const ball = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: lottoColor(n), roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, emissive: lottoColor(n), emissiveIntensity: 0.12 });
    ball.add(new THREE.Mesh(sphere, mat));
    const tex = canvasTexture(128, (c, size) => {
      const h = size / 2;
      c.clearRect(0, 0, size, size);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(h, h, h - 3, 0, Math.PI * 2); // 정원
      c.fill();
      c.fillStyle = '#1b1c1e';
      c.font = `600 ${n < 10 ? 76 : 64}px Pretendard, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(n), h, h + 4);
    });
    document.fonts?.ready.then(() => tex.userData.redraw()).catch(() => {});
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    label.scale.setScalar(R * 1.12);
    label.position.z = R * 1.02; // 공 앞면에 붙은 번호표
    label.renderOrder = 2;
    ball.add(label);
    ball.userData = { angle: (i / count) * Math.PI * 2, height: [0.9, 0.2, -0.4, 0.6, -0.1, 1.1, 0.35, -0.55][i % 8], phase: i * 0.9, label };
    g.add(ball);
  });
  return g;
}

// ── 얼굴 캔버스 ──
// 껍질은 몸 앞쪽 ±FACE_PHI 라디안, 높이 FACE_Y0~FACE_Y1. 캔버스 가로 = 각도, 세로 = 높이.
const FACE_PHI = 0.8;
const FACE_Y0 = -0.25;
const FACE_Y1 = 0.78;
const FW = 1024;
const FH = 640;
const faceX = (x, r = 1.02) => ((Math.asin(THREE.MathUtils.clamp(x / r, -1, 1)) + FACE_PHI) / (FACE_PHI * 2)) * FW; // 몸 위 x → 캔버스 x
const faceY = (y) => (1 - (y - FACE_Y0) / (FACE_Y1 - FACE_Y0)) * FH; // 몸 위 y → 캔버스 y

function createFace() {
  const canvas = document.createElement('canvas');
  canvas.width = FW;
  canvas.height = FH;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const INK = '#221c36';
  const eyes = [-0.36, 0.36].map((x) => ({ x: faceX(x), y: faceY(0.18) }));
  const mouthY = faceY(-0.08);
  let lastKey = '';

  // 평소: 편안하게 감은 눈(‿) — 접신 중인 천동이 (2026-11-13 사용자: 뜬 눈보다 감은 눈이 낫다)
  const closedEyes = [-0.34, 0.34].map((x) => ({ x: faceX(x), y: faceY(0.24) }));
  function drawClosed() {
    g.strokeStyle = '#2a2440';
    g.lineWidth = 24;
    g.lineCap = 'round';
    closedEyes.forEach((e) => {
      g.beginPath();
      g.moveTo(e.x - 80, e.y - 4);
      g.quadraticCurveTo(e.x, e.y + 56, e.x + 80, e.y - 4);
      g.stroke();
    });
  }

  // surprise: 0(평소, 감은 눈) ~ 1(깜짝 놀람, 눈 번쩍). 그 사이는 겹쳐서 서서히 바뀜
  function draw({ lookX = 0, lookY = 0, surprise = 0 }) {
    // 감은 눈일 땐 시선이 안 보이므로 다시 그리지 않음 (캔버스 갱신 줄이기)
    const key = surprise > 0 ? `${lookX.toFixed(2)}|${lookY.toFixed(2)}|${surprise.toFixed(2)}` : 'calm';
    if (key === lastKey) return;
    lastKey = key;
    g.clearRect(0, 0, FW, FH);
    if (surprise < 1) {
      g.globalAlpha = 1 - surprise;
      drawClosed();
    }
    if (surprise > 0) {
      g.globalAlpha = surprise;
      drawSurprised(lookX, lookY);
    }
    g.globalAlpha = 1;
    texture.needsUpdate = true;
  }

  // 깜짝 놀란 얼굴: 동그랗게 뜬 눈(작은 눈동자), 치켜 올라간 눈썹, 'o' 입, 머리 옆 '!'
  function drawSurprised(lookX, lookY) {
    const rx = 92;
    const ry = 104;
    eyes.forEach((e, i) => {
      const side = i === 0 ? -1 : 1;
      g.fillStyle = '#fbf8f2';
      g.beginPath();
      g.ellipse(e.x, e.y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 9;
      g.stroke();
      // 놀라서 작아진 눈동자 (포인터 쪽으로 살짝)
      const px = e.x + lookX * rx * 0.2;
      const py = e.y + lookY * ry * 0.15;
      g.fillStyle = '#16121f';
      g.beginPath();
      g.arc(px, py, 34, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.arc(px + 12, py - 13, 10, 0, Math.PI * 2);
      g.fill();
      // 높이 치켜 올라간 둥근 눈썹
      g.strokeStyle = INK;
      g.lineWidth = 14;
      g.lineCap = 'round';
      const by = e.y - ry - 56;
      g.beginPath();
      g.moveTo(e.x - side * 50, by + 16);
      g.quadraticCurveTo(e.x, by - 26, e.x + side * 56, by + 10);
      g.stroke();
    });
    // 'o' 모양으로 벌린 입
    g.fillStyle = '#5a2a3a';
    g.beginPath();
    g.ellipse(FW / 2, mouthY + 14, 26, 34, 0, 0, Math.PI * 2);
    g.fill();
    // 머리 옆 '!'
    g.save();
    g.translate(faceX(0.66, 0.95), faceY(0.58));
    g.rotate(0.18);
    g.fillStyle = '#f0c45e';
    g.beginPath();
    if (g.roundRect) g.roundRect(-11, -58, 22, 62, 11);
    else g.rect(-11, -58, 22, 62);
    g.fill();
    g.beginPath();
    g.arc(0, 26, 12, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  draw({});
  return { texture, draw };
}

// prop: 'lotto' 면 행운의 번호 화면: 네잎클로버를 들고(머리와 안 겹치게 바깥으로), 오행 빛글자 대신 3D 로또 공이 늘 둘레를 돎. 더 크게 둥둥.
// mode: 'idle' | 'drawing'(번호 고르는 중: 눈 뜨고 들썩이며 로또 공이 둘레를 빙글빙글) | 'done'(폴짝)
export default function Mascot3D({ className = '', interactive = true, prop = null, mode = 'idle' }) {
  const hostRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true); // WebGL 이 없으면 2D 그림
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.9, 9.4);
    camera.lookAt(0, 0.05, 0);

    // 조명: 따뜻한 정면광 + 양쪽 파스텔 테두리광(하늘빛·분홍) — 신비로운 진주빛
    scene.add(new THREE.HemisphereLight('#fff4e0', '#1b1f45', 0.45));
    const key = new THREE.DirectionalLight('#fff0d0', 1.6);
    key.position.set(2.5, 4, 5);
    scene.add(key);
    const rimL = new THREE.DirectionalLight('#7fd0ff', 2.6);
    rimL.position.set(-5, 1.5, -2.5);
    scene.add(rimL);
    const rimR = new THREE.DirectionalLight('#ff9fd0', 2.0);
    rimR.position.set(5, 0.5, -2.5);
    scene.add(rimR);
    const glowLight = new THREE.PointLight('#ffd68a', 2.5, 6, 2);
    glowLight.position.set(0, 1.0, 1.6);
    scene.add(glowLight);

    const m = buildCheondong();
    const lucky = prop === 'lotto';
    let balls = null;
    let clover = null;
    if (lucky) {
      balls = buildLottoBalls();
      m.root.add(balls);
      // 클로버는 오른손에서 바깥쪽으로 비스듬히 들어 머리·몸과 겹치지 않게 (2026-11-14 사용자 지시)
      clover = buildClover();
      clover.position.set(1.08, -0.46, 0.5);
      clover.rotation.set(0.15, -0.35, -0.62);
      clover.scale.setScalar(0.78);
      m.char.add(clover);
    }
    scene.add(m.root);
    scene.add(m.floor);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 0, y: 0 };
    // 천동이를 눌렀는지: 화면 좌표 → 광선 → 몸에 닿았는지
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hitChar = (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return false;
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(m.char, true).length > 0;
    };
    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.5, 1.5);
      pointer.y = THREE.MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1.5, 1.5);
      renderer.domElement.style.cursor = hitChar(e) ? 'pointer' : '';
    };
    // 누르면 깜짝 놀람: 눈 번쩍·폴짝, zZZ 사라짐 (1.4초 뒤 다시 잠듦)
    let surpriseAt = -10;
    const SURPRISE_SEC = 1.4;
    const onDown = (e) => {
      if (!hitChar(e)) return;
      surpriseAt = clock.getElapsedTime();
    };
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
      renderer.domElement.addEventListener('pointerdown', onDown);
    }
    const faceState = { lookX: 0, lookY: 0, surprise: 0 };

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(host);

    const clock = new THREE.Clock();
    const sparkPos = m.sparks.geometry.attributes.position;
    const sparkSpeed = m.sparks.userData.speed;
    let raf = 0;
    let last = 0;
    let lastMode = modeRef.current;
    let spinAngle = 0;
    let ballShow = 0;
    let ballSpin = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(t - last, 0.05);
      last = t;
      const s = reduce ? 0 : 1;

      // 번호 고르는 중이면 계속 눈을 뜨고 있고, 다 고르면 폴짝
      const md = modeRef.current;
      if (md === 'drawing') surpriseAt = t - 0.6;
      if (md === 'done' && lastMode !== 'done') surpriseAt = t;
      lastMode = md;
      const drawing = md === 'drawing';
      // 공중에 떠서 천천히 숨쉬기 (행운의 번호 화면에선 더 크게 둥둥)
      const lift = Math.sin(t * 1.1) * (lucky ? 0.16 : 0.08) * s + (lucky ? 0.14 : 0.08);
      m.root.position.y = lift;
      const breath = 1 + Math.sin(t * 1.6) * 0.018 * s;
      m.body.scale.set(1 / Math.sqrt(breath), breath, 1 / Math.sqrt(breath));
      m.shadow.scale.setScalar(1 - lift * 0.9);

      // 포인터 쪽으로 아주 살짝 몸을 기울임
      m.char.rotation.y += ((pointer.x * 0.25) - m.char.rotation.y) * 0.04;
      m.char.rotation.x += ((pointer.y * 0.1) - m.char.rotation.x) * 0.04;
      m.char.rotation.z = drawing && s ? Math.sin(t * 18) * 0.05 : m.char.rotation.z * 0.85;

      // 표정: 평소엔 감은 눈(자는 중), 눌리면 눈을 번쩍 뜨고 깜짝 놀람(눈동자는 포인터 쪽)
      const since = t - surpriseAt;
      const surprised = since < SURPRISE_SEC;
      faceState.surprise += ((surprised ? 1 : 0) - faceState.surprise) * (surprised ? 0.45 : 0.08);
      if (faceState.surprise < 0.01) faceState.surprise = 0;
      faceState.lookX += (THREE.MathUtils.clamp(pointer.x * 1.3, -1, 1) - faceState.lookX) * 0.15;
      faceState.lookY += (THREE.MathUtils.clamp(pointer.y * 1.3, -1, 1) - faceState.lookY) * 0.15;
      m.face.draw(faceState);
      // 놀란 순간 폴짝 뛰어오름
      const hop = since < 0.5 && !reduce ? Math.sin((since / 0.5) * Math.PI) * 0.28 : 0;
      m.char.position.y = hop;

      // zZZ: 차례로 오른쪽 위로 떠오르며 커지고 흐려짐. 놀란 동안은 숨기고, 다시 잠들면 서서히 나타남
      const zShow = THREE.MathUtils.clamp((since - 1.6) / 1.0, 0, 1);
      m.zzz.children.forEach((z) => {
        const ph = reduce ? z.userData.phase : (t * 0.28 + z.userData.phase) % 1;
        z.position.set(ph * 0.45, ph * 0.6, 0);
        z.scale.setScalar(z.userData.size * (0.75 + ph * 0.45));
        z.material.opacity = Math.sin(ph * Math.PI) * zShow;
      });

      // 접신: 이마 표식·후광 맥동, 구슬이 차례로 빛남
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      m.mark.material.emissiveIntensity = 0.6 + pulse * 0.9 * s;
      m.mark.userData.glow.material.opacity = 0.35 + pulse * 0.4 * s;
      m.mark.userData.glow.scale.setScalar(0.28 + pulse * 0.12 * s);
      m.aura.material.opacity = 0.75 + pulse * 0.25 * s;
      m.aura.scale.setScalar(5.0 + pulse * 0.4 * s);
      spinAngle += dt * 0.28 * s;
      // 로또 공: 행운의 번호 화면에선 오행 빛글자 대신 늘 천천히 돌고, 번호 고르는 동안엔 빠르게 (2026-11-14 사용자 지시)
      if (balls) {
        ballShow += (1 - ballShow) * 0.06;
        ballSpin += dt * (drawing ? 3.4 : 0.45) * s;
        balls.children.forEach((b) => {
          const { angle: ba, height: bh, phase: bp } = b.userData;
          const a = ba + ballSpin;
          const rr = 2.0 + Math.sin(t * 2 + bp) * 0.15 * s;
          b.position.set(Math.cos(a) * rr, bh + Math.sin(t * 3 + bp) * 0.18 * s, Math.sin(a) * rr * 0.7);
          b.scale.setScalar((0.4 + ballShow * 0.6) * (0.92 + (Math.sin(a) + 1) * 0.06));
        });
      }
      if (clover) clover.userData.head.rotation.z = Math.sin(t * (drawing ? 9 : 1.4)) * (drawing ? 0.25 : 0.08) * s;
      m.spirits.visible = !balls; // 행운의 번호 화면에선 오행 빛글자 숨김
      const n = m.spirits.children.length;
      m.spirits.children.forEach((sp, k) => {
        const { angle, height, phase } = sp.userData;
        const a = angle + spinAngle;
        sp.position.set(Math.cos(a) * 1.9, height + Math.sin(t * 1.2 + phase) * 0.12 * s, Math.sin(a) * 1.25);
        const wave = Math.max(0, Math.cos(t * 1.4 - (k / n) * Math.PI * 2));
        sp.material.opacity = 0.7 + wave * 0.3;
        sp.scale.setScalar(0.64 + wave * 0.16 * s);
      });
      m.crescent.rotation.z = -0.55 + Math.sin(t * 1.0) * 0.06 * s;

      // 십이지지 원판 회전
      m.disc.rotation.z = t * 0.08 * s;
      m.disc.material.opacity = 0.6 + pulse * 0.25 * s;

      // 빛 알갱이 상승
      if (s) {
        for (let i = 0; i < sparkSpeed.length; i++) {
          let y = sparkPos.getY(i) + sparkSpeed[i] * dt;
          if (y > 2.7) y = -1.1;
          sparkPos.setY(i, y);
        }
        sparkPos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((mt) => { mt?.map?.dispose?.(); mt?.dispose?.(); });
      });
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [interactive, prop]);

  if (failed) return <LogoSymbol size={170} className="mascot-still" />;
  return <div ref={hostRef} className={`mascot3d ${className}`} role="img" aria-label="사주천문 캐릭터 천동이" />;
}
