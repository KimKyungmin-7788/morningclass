import { useState } from 'react';
import './portfolio.css';
import { PortfolioActivities, PortfolioOpinion } from './PortfolioReviewPreview';

// 화면 구성을 검토하기 위한 가상 자료. 학생 저장소나 전송 API를 사용하지 않는다.
export const examples = [
  {id:'count',day:24,subject:'수학',app:'차근차근 수 세기',title:'가을 열매를 세어요',icon:'🌰',result:'첫 시도 8 / 10',condition:'1~10 범위 · 그림 단서 사용',color:'#FFF1DB',work:'🌰 🌰 🌰 🌰 🌰',answer:'열매 5개를 골랐어요',feedback:'같은 범위와 도움 조건의 예시 기록에서 첫 시도 정답이 6개에서 8개로 늘었어요.',next:'6~10개 묶음을 다른 물건으로 다시 세어 봐요.'},
  {id:'talk',day:24,subject:'생활표현',app:'마음을 전해요',title:'도움이 필요할 때',icon:'💬',result:'문장 완성',condition:'그림 카드 3장 · 언어적 도움 1회',color:'#E9F4EC',work:'🙋  +  🤝',answer:'선생님, 도와주세요.',feedback:'그림 카드를 순서대로 골라 요청 문장을 완성했어요. 반복 기록이 부족해 변화는 아직 판단하지 않아요.',next:'실제 교실 상황에서도 요청할 기회를 만들어 봐요.'},
  {id:'art',day:22,subject:'미술',app:'나의 작은 작업실',title:'색으로 그린 가을',icon:'🍁',result:'작품 완성',condition:'자유 표현 · 점수 없음',color:'#F8EAF1',work:'🍂 🍁 🌳 🍁 🍂',answer:'내가 고른 가을 색',feedback:'세 가지 색을 사용한 작품이 남아 있어요. 작품만으로 수행 수준이나 정서 상태를 판단하지 않아요.',next:'어떤 부분이 가장 마음에 드는지 학생의 이야기를 들어봐요.'},
];
const records = [
  ...examples,
  {...examples[0],id:'count-17',day:17,result:'첫 시도 6 / 10',feedback:'같은 조건에서 모은 첫 번째 예시 기록이에요.'},
  {...examples[0],id:'count-20',day:20,result:'첫 시도 7 / 10',feedback:'같은 조건의 10월 17일 기록보다 정답이 1개 늘었어요.'},
  {...examples[0],id:'count-22',day:22,result:'첫 시도 9 / 10',condition:'1~5 범위 · 그림 단서 사용',feedback:'수 범위가 달라 1~10 활동 기록과 직접 비교하지 않아요.'},
];
export function PortfolioPreview() {
  const [view,setView]=useState('날짜별');
  const [filter,setFilter]=useState('전체');
  const [mode,setMode]=useState('월별');
  const [day,setDay]=useState(24);
  const [selected,setSelected]=useState<string|null>(null);
  const visible=records.filter(e=>(filter==='전체'||e.subject===filter)&&(mode==='월별'||e.day===day));
  const detail=records.find(e=>e.id===selected);
  return <section className="pf-preview" aria-label="포트폴리오 시안">
    <div className="pf-demo"><span>화면 시안</span> 가상 학생의 예시 자료예요. 실제 기록에 저장되지 않아요.</div>
    <div className="pf-view-tabs" aria-label="포트폴리오 보기">{['날짜별','활동별 변화','종합의견'].map(v=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);setSelected(null);}}>{v}</button>)}</div>
    {view==='활동별 변화' ? <PortfolioActivities onRecord={id=>{setView('날짜별');setSelected(id);}}/> : view==='종합의견' ? <PortfolioOpinion onEvidence={()=>setView('활동별 변화')}/> : detail ? <>
      <button className="pf-back" onClick={()=>setSelected(null)}>← 활동 모아보기</button>
      <div className="pf-detail-heading"><span>{detail.subject} · 10월 {detail.day}일</span><h3>{detail.title}</h3><small>{detail.app}</small></div>
      <div className="pf-detail-grid"><div className="pf-work" style={{background:detail.color}}><span className="pf-work-label">예시 결과물</span><div>{detail.work}</div><strong>{detail.answer}</strong></div><div className="pf-facts"><h4>활동 기록</h4><strong>{detail.result}</strong><p>{detail.condition}</p><span>태블릿에서 전달된 결과 · 예시</span></div></div>
      <div className="pf-feedback"><h4>💡 기록에서 발견한 점 <small>피드백 예시</small></h4><p>{detail.feedback}</p><h4>다음 활동 제안</h4><p>{detail.next}</p><small>실제 분석 기능은 아직 연결되지 않았어요.</small></div>
    </> : <>
      <div className="pf-heading"><div><small>배움이 쌓이는 곳</small><h3>학습 포트폴리오</h3></div><div className="pf-modes" aria-label="기간 보기">{['월별','일별'].map(v=><button key={v} aria-pressed={mode===v} onClick={()=>setMode(v)}>{v}</button>)}</div></div>
      <div className="pf-month"><strong>2026년 10월</strong><span>예시 기록 6개 · 활동한 날 4일</span></div>
      <div className="pf-stats"><div><b>6</b><span>모인 결과물</span></div><div><b>3</b><span>참여한 활동 앱</span></div><div><b>4</b><span>활동한 날</span></div></div>
      <div className="pf-filters" aria-label="교과 필터">{['전체','수학','생활표현','미술'].map(v=><button key={v} aria-pressed={filter===v} onClick={()=>setFilter(v)}>{v}</button>)}</div>
      {mode==='일별'&&<div className="pf-days" aria-label="활동 날짜">{[24,22,20,17].map(v=><button key={v} aria-pressed={day===v} onClick={()=>setDay(v)}>10월 {v}일</button>)}</div>}
      <div className="pf-timeline">{[24,22,20,17].map(d=>{const items=visible.filter(e=>e.day===d);return items.length ? <section key={d}><div className="pf-date"><strong>10월 {d}일</strong><span>{items.length}개의 배움</span></div><div className="pf-entries">{items.map(e=><button className="pf-entry" key={e.id} onClick={()=>setSelected(e.id)}><span className="pf-art" style={{background:e.color}}>{e.icon}</span><span className="pf-entry-text"><small>{e.subject} · {e.app}</small><strong>{e.title}</strong><span>{e.result}</span></span><span className="pf-arrow">↗</span></button>)}</div></section>:null;})}</div>
      {!visible.length&&<p className="pf-empty">이 날짜에는 해당 교과의 예시가 없어요.</p>}
      <div className="pf-note">활동을 누르면 결과물과 피드백 예시를 볼 수 있어요.</div>
    </>}
  </section>;
}
