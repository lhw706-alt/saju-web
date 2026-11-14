// 신년운세 소개 페이지 (/newyear, 2026-11-14) — 메인 '신년운세' 카드를 누르면 여기부터.
// 검색으로 들어온 사람이 읽을 글(그해 간지 소개·무엇을 알려 주는지·자주 묻는 질문)을 두고, 버튼으로 생년월일 입력(/start)에 이어 줌.
// 고정 글이라 풀이 비용 없음. 해가 바뀌면 YEAR_INFO 에 그해 설명을 더한다.
import { useNavigate } from 'react-router-dom';
import { NEXT_YEAR } from '../lib/topics.js';
import { saveTopic } from '../lib/storage.js';
import { trackEvent } from '../lib/analytics.js';
import { dosaArtSvg } from '../brand/dosaArt.js';
import { PRICE_TAGS, PRICE_COIN } from '../lib/wallet.js';
import { PriceTag } from '../components/BokchaLink.jsx';

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const STEMS_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const BRANCHES_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
const ganzhi = (y) => {
  const s = (((y - 4) % 10) + 10) % 10;
  const b = (((y - 4) % 12) + 12) % 12;
  return { ko: STEMS[s] + BRANCHES[b], han: STEMS_H[s] + BRANCHES_H[b], animal: ANIMALS[b] };
};

// 그해 간지 소개 (겁주는 말 없이, 명리에서 보는 상징 위주)
const YEAR_INFO = {
  2027: {
    nick: '붉은 양의 해',
    lines: [
      '2027년은 천간 정(丁)과 지지 미(未)가 만난 정미년(丁未年)이에요. 정(丁)은 음의 불로, 촛불이나 등불처럼 은은하게 주변을 밝히는 기운으로 봐요.',
      '미(未)는 늦여름의 흙이자 양(羊)띠의 글자예요. 뜨거운 계절을 지나 열매를 맺기 전의 땅이라, 그동안 쌓아 온 것을 다듬고 거두는 흐름과 어울려요.',
      '다만 같은 해라도 사람마다 원국이 달라서, 정미년의 기운이 나에게 어떻게 닿는지는 내 사주를 봐야 알 수 있어요.',
    ],
  },
  2028: {
    nick: '노란 원숭이의 해',
    lines: [
      '2028년은 천간 무(戊)와 지지 신(申)이 만난 무신년(戊申年)이에요. 무(戊)는 양의 흙으로 큰 산처럼 든든한 기운, 신(申)은 초가을의 쇠이자 원숭이띠의 글자예요.',
      '같은 해라도 사람마다 원국이 달라서, 무신년의 기운이 나에게 어떻게 닿는지는 내 사주를 봐야 알 수 있어요.',
    ],
  },
};

const FAQ = [
  ['얼마인가요?', '한 해의 흐름과 1~12월 월별 상세를 합쳐 30금전(3,000원)이에요. 한 번 열면 같은 사람의 그해 신년운세는 다시 볼 때 복채가 들지 않고, 마이페이지 ‘풀이 기록’에 남아요.'],
  ['태어난 시간을 몰라도 되나요?', '네, 시간을 몰라도 볼 수 있어요. 태어난 시(時)를 빼고 여섯 글자로 풀이하고, 그 때문에 덜 정확할 수 있는 부분은 따로 알려 드려요.'],
  ['음력 생일로도 되나요?', '네, 양력과 음력(윤달 포함) 모두 넣을 수 있어요.'],
  ['어떤 기준으로 풀이하나요?', '만세력으로 계산한 내 사주 원국에 그해의 세운(그해의 기운)과 지금 대운(10년 흐름)이 어떻게 만나는지를 보고 풀이해요. 어느 글자에서 그렇게 읽었는지 근거도 함께 적어요.'],
  ['이름이나 연락처를 적어야 하나요?', '아니요. 성별, 생년월일, 태어난 시각, 태어난 곳만 받고 이름과 연락처는 받지 않아요.'],
];

export default function NewYear() {
  const navigate = useNavigate();
  const y = NEXT_YEAR;
  const gz = ganzhi(y);
  const info = YEAR_INFO[y];
  const start = (place) => {
    trackEvent('content_click', { content: 'newyear', from: `landing_${place}` });
    saveTopic('newyear');
    navigate('/start');
  };

  return (
    <article className="ny">
      <section className="ny-hero">
        <p className="ny-kicker">
          {y} {gz.ko}년({gz.han}年){info ? ` · ${info.nick}` : ''}
        </p>
        <h1 className="ny-title">{y} 신년운세</h1>
        <p className="ny-lead">천둥도사가 내 사주와 {y}년의 기운을 맞춰 보고, 한 해의 흐름과 계절마다 운, 1월부터 12월까지 달마다의 흐름을 풀어 드려요.</p>
        <p className="ny-price"><PriceTag {...PRICE_COIN.newyear} size={20} /></p>
        <span className="ny-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dosaArtSvg('newyear') }} />
        <button type="button" className="btn-primary" onClick={() => start('top')}>
          내 {y} 신년운세 보기
        </button>
      </section>

      <section className="ny-sec">
        <h2>이런 걸 알려 드려요</h2>
        <ul className="ny-points">
          <li>
            <b>한 해의 큰 흐름</b>
            <span>{y}년의 기운이 내 원국과 만나 어떤 해가 되는지</span>
          </li>
          <li>
            <b>계절별 운</b>
            <span>봄·여름·가을·겨울마다 힘을 쓰면 좋은 때와 쉬어 갈 때</span>
          </li>
          <li>
            <b>일·돈·관계</b>
            <span>그해 기회가 오는 쪽과 미리 챙기면 좋은 점</span>
          </li>
          <li>
            <b>생활 습관</b>
            <span>컨디션을 지키려면 신경 쓰면 좋은 부분</span>
          </li>
        </ul>
      </section>

      <section className="ny-sec">
        <h2>
          {y}년 {gz.ko}년은 어떤 해일까요?
        </h2>
        {(info?.lines || [`${y}년은 ${gz.ko}년(${gz.han}年), ${gz.animal}띠의 해예요. 같은 해라도 사람마다 원국이 달라서, 그해의 기운이 나에게 어떻게 닿는지는 내 사주를 봐야 알 수 있어요.`]).map((t) => (
          <p key={t}>{t}</p>
        ))}
      </section>

      <section className="ny-sec">
        <h2>보는 방법</h2>
        <ol className="ny-steps">
          <li>아래 버튼을 눌러요.</li>
          <li>성별 → 생년월일 → 태어난 시각 → 태어난 곳을 차례로 넣어요.</li>
          <li>{PRICE_TAGS.newyear}으로 열면 천둥도사가 {y}년 한 해 흐름과 월별 상세를 풀어 드려요.</li>
        </ol>
      </section>

      <section className="ny-sec">
        <h2>자주 묻는 질문</h2>
        <dl className="ny-faq">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="ny-cta">
        <button type="button" className="btn-primary" onClick={() => start('bottom')}>
          내 {y} 신년운세 보기
        </button>
        <p className="ny-note">재미와 참고를 위한 풀이예요. 중요한 결정은 스스로 판단해 주세요.</p>
      </div>
    </article>
  );
}
