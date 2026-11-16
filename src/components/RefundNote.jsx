// 금전을 쓰는 버튼 바로 아래 청약철회 제한 안내 (2026-11-16 — 전자상거래법 제17조: 디지털 콘텐츠는 사기 전에 환불 제한을 알려야 제한이 인정됨)
import { Link } from 'react-router-dom';

export default function RefundNote({ what = '풀이' }) {
  return (
    <p className="refund-note">
      금전으로 연 {what}는 디지털 콘텐츠라 열어 본 뒤에는 청약철회(환불)가 어려워요. 서비스 잘못으로 받지 못하면 금전을 돌려드려요.{' '}
      <Link to="/terms#refund">환불 정책</Link>
    </p>
  );
}
