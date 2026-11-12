import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="hero">
      <h1>길을 잃었어요</h1>
      <p className="lead">찾으시는 페이지가 없어요.</p>
      <Link to="/" className="btn-primary inline">처음으로</Link>
    </section>
  );
}
