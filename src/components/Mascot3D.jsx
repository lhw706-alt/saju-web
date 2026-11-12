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

  // 감은 눈 (편안한 ‿)
  const lidMat = new THREE.MeshStandardMaterial({ color: '#2a2440', roughness: 0.6 });
  [-0.34, 0.34].forEach((x) => {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.13, 0.01, 0), new THREE.Vector3(0, -0.09, 0), new THREE.Vector3(0.13, 0.01, 0));
    const lid = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.019, 10, false), lidMat);
    lid.position.set(x, 0.24, 0.955);
    lid.lookAt(x * 3, 0.3, 4);
    char.add(lid);
  });

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

  return { root, char, body, spirits, crescent, mark, aura, sparks, floor, disc, shadow };
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
    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      pointer.x = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.5, 1.5);
      pointer.y = THREE.MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1.5, 1.5);
    };
    if (interactive) window.addEventListener('pointermove', onMove, { passive: true });

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
