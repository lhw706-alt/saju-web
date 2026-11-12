// 브랜드 시안 확인용 (개발 서버에서만 /brand 로 열림, 배포 사이트에는 없음)
import Mascot3D from '../components/Mascot3D.jsx';
import Logo, { LogoSymbol } from '../components/Logo.jsx';

export default function Brand() {
  return (
    <div className="brand-page">
      <section className="brand-stage">
        <div className="brand-grid" aria-hidden="true" />
        <Mascot3D className="brand-mascot" />
        <p className="brand-caption">
          <strong>천동이</strong> — 하늘(天文)의 기운을 받는 아이. 몸 둘레를 도는 구슬 여덟 개는 사주의 여덟 글자, 구슬 색은 오행, 바닥 원판은 십이지지입니다.
        </p>
      </section>

      <section className="brand-logos">
        <div className="brand-tile dark"><Logo size={44} /></div>
        <div className="brand-tile light"><Logo size={44} /></div>
        <div className="brand-tile dark"><LogoSymbol size={96} /></div>
        <div className="brand-tile dark small">
          <LogoSymbol size={32} /><LogoSymbol size={24} /><LogoSymbol size={16} />
        </div>
      </section>
    </div>
  );
}
