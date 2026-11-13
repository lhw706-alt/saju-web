// 리퀴드 메탈 버튼 (2026-11-14 사용자 요청: 21st.dev LiquidMetalButton 을 사이트 톤으로 옮김)
// 원본은 Tailwind·TypeScript·shadcn 기준이지만 이 사이트는 일반 CSS·JSX 라 같은 구조를 인라인 스타일로 옮겼다.
// 테두리에 흐르는 금속 셰이더(@paper-design/shaders liquidMetal)를 금빛(--primary #E2C27A)으로 물들이고,
// 안쪽은 사이트 배경색 계열, 글자는 금색. WebGL 이 안 되면 금색 테두리만 보이는 일반 버튼처럼 보임.
import { liquidMetalFragmentShader, ShaderMount, getShaderColorFromString } from '@paper-design/shaders';
import { useEffect, useRef, useState } from 'react';

const GOLD = '#E2C27A';
const SPEED = { idle: 0.6, hover: 1, click: 2.4 };

// 아이콘 보기용 작은 반짝이 (lucide Sparkles 대신 같은 모양 SVG)
const Sparkle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);

export default function LiquidMetalButton({ label = '시작하기', onClick, viewMode = 'text', width = 212, height = 54, type = 'button', disabled = false }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState([]);
  const shaderRef = useRef(null);
  const mount = useRef(null);
  const btnRef = useRef(null);
  const rippleId = useRef(0);
  const hoveredRef = useRef(false);

  const w = viewMode === 'icon' ? height : width;
  const h = height;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const speed = (s) => (reduce ? 0 : s);

  useEffect(() => {
    if (!shaderRef.current) return undefined;
    try {
      mount.current = new ShaderMount(
        shaderRef.current,
        liquidMetalFragmentShader,
        {
          u_colorBack: getShaderColorFromString('rgba(0,0,0,0)'),
          u_colorTint: getShaderColorFromString(GOLD),
          u_repetition: 4,
          u_softness: 0.5,
          u_shiftRed: 0.12,
          u_shiftBlue: 0.12,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 45,
          u_scale: 8,
          u_shape: 1,
          u_offsetX: 0.1,
          u_offsetY: -0.1,
          u_isImage: false,
        },
        undefined,
        speed(SPEED.idle)
      );
    } catch {
      mount.current = null; // WebGL 이 없으면 셰이더 없이 (테두리 대체 배경이 보임)
    }
    return () => {
      mount.current?.dispose?.();
      mount.current?.destroy?.();
      mount.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSpeed = (s) => mount.current?.setSpeed?.(speed(s));
  const enter = () => {
    hoveredRef.current = true;
    setHovered(true);
    setSpeed(SPEED.hover);
  };
  const leave = () => {
    hoveredRef.current = false;
    setHovered(false);
    setPressed(false);
    setSpeed(SPEED.idle);
  };
  const click = (e) => {
    setSpeed(SPEED.click);
    setTimeout(() => setSpeed(hoveredRef.current ? SPEED.hover : SPEED.idle), 300);
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const ripple = { x: e.clientX - r.left, y: e.clientY - r.top, id: rippleId.current++ };
      setRipples((p) => [...p, ripple]);
      setTimeout(() => setRipples((p) => p.filter((x) => x.id !== ripple.id)), 600);
    }
    onClick?.(e);
  };

  const press = pressed ? 'translateY(1px) scale(0.98)' : 'none';
  const shadow = pressed
    ? '0 0 0 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)'
    : hovered
      ? '0 0 0 1px rgba(0,0,0,0.4), 0 8px 18px rgba(0,0,0,0.35), 0 0 26px rgba(226,194,122,0.28)'
      : '0 0 0 1px rgba(0,0,0,0.3), 0 10px 22px rgba(0,0,0,0.35), 0 0 20px rgba(226,194,122,0.16)';

  return (
    <span className="lmb" style={{ width: w, height: h, opacity: disabled ? 0.5 : 1 }}>
      {/* 바깥: 흐르는 금속 테두리 */}
      <span className="lmb-shell" style={{ transform: press, boxShadow: shadow }}>
        <span ref={shaderRef} className="lmb-shader" />
      </span>
      {/* 안쪽: 어두운 판 */}
      <span className="lmb-inner" style={{ transform: press, boxShadow: pressed ? 'inset 0 2px 4px rgba(0,0,0,0.45)' : 'inset 0 1px 0 rgba(255,255,255,0.06)' }} />
      {/* 글자 */}
      <span className="lmb-label" aria-hidden="true">
        {viewMode === 'icon' ? <Sparkle /> : label}
      </span>
      <button
        ref={btnRef}
        type={type}
        className="lmb-btn"
        aria-label={label}
        disabled={disabled}
        onClick={click}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
      >
        {ripples.map((r) => (
          <span key={r.id} className="lmb-ripple" style={{ left: r.x, top: r.y }} />
        ))}
      </button>
    </span>
  );
}
