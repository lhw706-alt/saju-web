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

  return { root, char, body, spirits, crescent, mark, aura, sparks, floor, disc, shadow, face, blushMat };
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

  // anger: 0(평소, 감은 눈) ~ 1(화남, 눈 뜨고 노려봄). 그 사이는 겹쳐서 서서히 바뀜
  function draw({ lookX = 0, lookY = 0, anger = 0 }) {
    // 감은 눈일 땐 시선이 안 보이므로 다시 그리지 않음 (캔버스 갱신 줄이기)
    const key = anger > 0 ? `${lookX.toFixed(2)}|${lookY.toFixed(2)}|${anger.toFixed(2)}` : 'calm';
    if (key === lastKey) return;
    lastKey = key;
    g.clearRect(0, 0, FW, FH);
    if (anger < 1) {
      g.globalAlpha = 1 - anger;
      drawClosed();
    }
    if (anger > 0) {
      g.globalAlpha = anger;
      drawAngry(lookX, lookY);
    }
    g.globalAlpha = 1;
    texture.needsUpdate = true;
  }

  // 화난 얼굴: 눈을 뜨고 노려봄(윗눈꺼풀·눈썹이 안쪽으로 내려감), 'へ' 입, 💢
  function drawAngry(lookX, lookY) {
    const anger = 1;
    const blink = 0;
    const rx = 100;
    const ry = 114;
    eyes.forEach((e, i) => {
      const side = i === 0 ? -1 : 1; // 왼눈 -1, 오른눈 +1
      const drop = anger * ry * 0.62 + blink * ry * 2.2; // 눈꺼풀이 내려온 정도
      const xin = e.x - side * rx * 1.3;
      const xout = e.x + side * rx * 1.3;
      const yin = e.y - ry * 1.05 + drop + anger * 70; // 화나면 안쪽이 더 내려옴
      const yout = e.y - ry * 1.15 + drop * 0.75;
      const ctrlY = e.y - ry * 1.5 + drop * 1.15;
      const lid = () => {
        g.beginPath();
        g.moveTo(xin, yin);
        g.quadraticCurveTo(e.x, ctrlY, xout, yout);
      };
      g.save();
      // 눈꺼풀 아래만 보이게 자름
      lid();
      g.lineTo(xout, e.y + ry + 60);
      g.lineTo(xin, e.y + ry + 60);
      g.closePath();
      g.clip();
      // 흰자
      g.fillStyle = '#fbf8f2';
      g.beginPath();
      g.ellipse(e.x, e.y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      // 큰 눈동자 (포인터 방향)
      const px = e.x + lookX * rx * 0.24;
      const py = e.y + lookY * ry * 0.18 + 8;
      const pr = 72 - anger * 14;
      const grad = g.createRadialGradient(px, py + pr * 0.35, 6, px, py, pr * 1.1);
      grad.addColorStop(0, anger > 0.5 ? '#7a2a30' : '#5b4a96');
      grad.addColorStop(0.55, anger > 0.5 ? '#3a1218' : '#2a2150');
      grad.addColorStop(1, '#110d1f');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(px, py, pr, pr * 1.1, 0, 0, Math.PI * 2);
      g.fill();
      // 반짝임 (큰 것 + 작은 것)
      g.fillStyle = 'rgba(255,255,255,0.96)';
      g.beginPath();
      g.ellipse(px + pr * 0.32, py - pr * 0.42, 22, 19, -0.4, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(px - pr * 0.36, py + pr * 0.4, 9, 0, Math.PI * 2);
      g.fill();
      // 눈 테두리 (눈꺼풀 아래 부분만 보임)
      g.strokeStyle = INK;
      g.lineWidth = 8;
      g.beginPath();
      g.ellipse(e.x, e.y, rx, ry, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      // 윗눈꺼풀 선: 눈 위로 내려왔을 때만 보이도록 눈 둘레 안쪽으로 자름
      g.save();
      g.beginPath();
      g.ellipse(e.x, e.y, rx + 6, ry + 6, 0, 0, Math.PI * 2);
      g.clip();
      g.strokeStyle = INK;
      g.lineWidth = 14;
      g.lineCap = 'round';
      lid();
      g.stroke();
      g.restore();
      // 바깥 눈꼬리 속눈썹 한 가닥
      g.strokeStyle = INK;
      g.lineWidth = 9;
      g.lineCap = 'round';
      const ang = side > 0 ? -0.55 : Math.PI + 0.55;
      const lx = e.x + Math.cos(ang) * rx * 0.98;
      const ly = e.y + Math.sin(ang) * ry * 0.98 + drop * 0.5;
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx + side * 22, ly - 16);
      g.stroke();
      // 눈썹: 평소엔 살짝 안쪽이 낮은 짧은 눈썹(만만치 않게), 화나면 안쪽이 확 내려감
      const by = e.y - ry - 46 + blink * 10;
      const bIn = by + 12 + anger * 70;
      const bOut = by - 4 - anger * 14;
      g.lineWidth = 15;
      g.beginPath();
      g.moveTo(e.x - side * 44, bIn);
      g.quadraticCurveTo(e.x, (bIn + bOut) / 2 - 10 + anger * 10, e.x + side * 52, bOut);
      g.stroke();
    });
    // 입: 평소엔 한쪽만 올라간 작은 미소, 화나면 'へ' 자로 다문 입
    g.strokeStyle = INK;
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    const mx = FW / 2;
    if (anger < 0.5) {
      const k = 1 - anger * 2;
      g.moveTo(mx - 26, mouthY + 2);
      g.quadraticCurveTo(mx - 2, mouthY + 18 * k + 2, mx + 28, mouthY - 8 * k);
    } else {
      const k = (anger - 0.5) * 2;
      g.moveTo(mx - 30, mouthY + 10);
      g.quadraticCurveTo(mx, mouthY - 16 * k, mx + 30, mouthY + 10);
    }
    g.stroke();
    // 화났을 때 이마 옆 '💢' 핏대
    {
      g.save();
      g.translate(faceX(0.62, 0.95), faceY(0.6));
      g.strokeStyle = '#e0343c';
      g.lineWidth = 10;
      [0, 1, 2, 3].forEach((q) => {
        g.save();
        g.rotate((q * Math.PI) / 2);
        g.beginPath();
        g.moveTo(10, 30);
        g.quadraticCurveTo(12, 12, 30, 10);
        g.stroke();
        g.restore();
      });
      g.restore();
    }
  }
  draw({});
  return { texture, draw };
}

export default function Mascot3D({ className = '', interactive = true }) {
  const hostRef = useRef(null);
  const [failed, setFailed] = useState(false);

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
    // 누르면 화냄 (1.6초 뒤 원래 표정)
    let angryUntil = -1;
    const onDown = (e) => {
      if (!hitChar(e)) return;
      angryUntil = clock.getElapsedTime() + 1.6;
    };
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
      renderer.domElement.addEventListener('pointerdown', onDown);
    }
    const faceState = { lookX: 0, lookY: 0, anger: 0 };

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

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(t - last, 0.05);
      last = t;
      const s = reduce ? 0 : 1;

      // 공중에 살짝 떠서 천천히 숨쉬기
      const lift = Math.sin(t * 1.1) * 0.08 * s + 0.08;
      m.root.position.y = lift;
      const breath = 1 + Math.sin(t * 1.6) * 0.018 * s;
      m.body.scale.set(1 / Math.sqrt(breath), breath, 1 / Math.sqrt(breath));
      m.shadow.scale.setScalar(1 - lift * 0.9);

      // 포인터 쪽으로 아주 살짝 몸을 기울임
      m.char.rotation.y += ((pointer.x * 0.25) - m.char.rotation.y) * 0.04;
      m.char.rotation.x += ((pointer.y * 0.1) - m.char.rotation.x) * 0.04;

      // 표정: 평소엔 감은 눈, 눌리면 눈을 뜨고 화냄(눈동자는 포인터 쪽)
      const angry = t < angryUntil;
      faceState.anger += ((angry ? 1 : 0) - faceState.anger) * (angry ? 0.25 : 0.08);
      if (faceState.anger < 0.01) faceState.anger = 0;
      faceState.lookX += (THREE.MathUtils.clamp(pointer.x * 1.3, -1, 1) - faceState.lookX) * 0.15;
      faceState.lookY += (THREE.MathUtils.clamp(pointer.y * 1.3, -1, 1) - faceState.lookY) * 0.15;
      m.face.draw(faceState);
      m.blushMat.opacity = 0.28 * (1 - faceState.anger); // 화낼 땐 볼 홍조를 지움
      // 화난 순간 부르르 떨림
      const shake = angry && angryUntil - t > 1.2 && !reduce ? Math.sin(t * 70) * 0.035 : 0;
      m.char.position.x = shake;

      // 접신: 이마 표식·후광 맥동, 구슬이 차례로 빛남
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      m.mark.material.emissiveIntensity = 0.6 + pulse * 0.9 * s;
      m.mark.userData.glow.material.opacity = 0.35 + pulse * 0.4 * s;
      m.mark.userData.glow.scale.setScalar(0.28 + pulse * 0.12 * s);
      m.aura.material.opacity = 0.75 + pulse * 0.25 * s;
      m.aura.scale.setScalar(5.0 + pulse * 0.4 * s);
      const n = m.spirits.children.length;
      m.spirits.children.forEach((sp, k) => {
        const { angle, height, phase } = sp.userData;
        const a = angle + t * 0.28 * s;
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
  }, [interactive]);

  if (failed) return <LogoSymbol size={170} className="mascot-still" />;
  return <div ref={hostRef} className={`mascot3d ${className}`} role="img" aria-label="사주천문 캐릭터 천동이" />;
}
