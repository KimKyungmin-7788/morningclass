import { useState } from 'react';

const history = [{id:'count-17',day:17,score:6},{id:'count-20',day:20,score:7},{id:'count',day:24,score:8}];
export function PortfolioActivities({onRecord}:{onRecord:(id:string)=>void}) {
  const [activity,setActivity]=useState('count');
  return <div className="pf-activity-view">
    <div className="pf-month"><strong>2026년 10월 · 활동별 변화</strong><span>같은 학생 · 같은 앱 · 같은 활동</span></div>
    <div className="pf-activity-choices" aria-label="비교할 활동">{[['count','🌰 수 세기','수학 · 기록 4개'],['talk','💬 도움 요청','생활표현 · 기록 1개'],['art','🍁 가을 표현','미술 · 작품 1개']].map(([id,title,sub])=><button key={id} aria-pressed={activity===id} onClick={()=>setActivity(id)}><strong>{title}</strong><small>{sub}</small></button>)}</div>
    {activity==='count' ? <>
      <div className="pf-comparison-heading"><small>차근차근 수 세기</small><h3>가을 열매를 세어요</h3><span>비교 조건: 1~10 범위 · 10문항 · 첫 시도 · 그림 단서 사용</span></div>
      <div className="pf-change-summary"><div><small>첫 기록</small><strong>6 / 10</strong><span>10월 17일</span></div><span>→</span><div><small>최근 기록</small><strong>8 / 10</strong><span>10월 24일</span></div><div className="pf-change"><strong>+2문항</strong><span>정답률 +20%p</span></div></div>
      <div className="pf-chart" aria-label="같은 조건의 첫 시도 정답: 10월 17일 6개, 20일 7개, 24일 8개. 전체 10문항.">{history.map(h=><button key={h.id} onClick={()=>onRecord(h.id)} aria-label={`10월 ${h.day}일 ${h.score}개 정답 기록 보기`}><span className="pf-chart-track"><span style={{height:`${h.score*10}%`}}><b>{h.score}</b></span></span><small>10/{h.day}</small></button>)}</div>
      <div className="pf-feedback"><h4>기록에서 보이는 변화 <small>예시</small></h4><p>같은 조건의 세 번 기록에서 첫 시도 정답이 6 → 7 → 8개로 늘었어요. 다른 상황에서도 같은 수행을 보이는지는 더 살펴봐야 해요.</p></div>
      <details className="pf-excluded"><summary>비교에서 제외한 기록 1개 · 조건이 달라요</summary><p>10월 22일: 9 / 10 · 1~5 범위 · 그림 단서 사용</p><button onClick={()=>onRecord('count-22')}>해당 기록 보기 →</button></details>
    </> : <div className="pf-feedback"><h3>{activity==='talk'?'도움이 필요할 때':'색으로 그린 가을'}</h3><p>{activity==='talk'?'문장 완성 · 그림 카드 3장 · 언어적 도움 1회':'작품 완성 · 자유 표현 · 점수 없음'}</p><p>현재 예시 기록이 1개여서 변화는 아직 비교하지 않아요.{activity==='art'?' 작품은 점수 대신 날짜별로 나란히 살펴보는 방식으로 모을 수 있어요.':''}</p><button onClick={()=>onRecord(activity)}>결과물 보기 →</button></div>}
  </div>;
}
const draft = '수학 활동에서는 같은 범위와 그림 단서 조건에서 첫 시도 정답 수가 6개에서 8개로 증가했습니다. 생활표현 활동에서는 언어적 도움 1회를 받아 도움 요청 문장을 완성했습니다. 미술 활동에서는 가을을 주제로 작품을 완성했습니다. 생활표현과 미술은 기록이 각 1개여서 변화 판단을 보류합니다. 이후 실제 교실 상황에서 도움 요청을 표현하는지 관찰하고, 수 세기는 같은 조건의 기록을 추가로 모아 변화를 확인할 수 있습니다.';
export function PortfolioOpinion({onEvidence}:{onEvidence:()=>void}) {
  const [text,setText]=useState('');
  const [status,setStatus]=useState('');
  return <div>
    <div className="pf-month"><strong>2026년 10월 · 종합의견</strong><span>예시 기록 6개 / 교과 3개</span></div>
    <div className="pf-subject-evidence"><article><h4>수학</h4><strong>같은 조건에서 +2문항</strong><p>비교 기록 3개 · 조건이 다른 기록 1개 제외</p></article><article><h4>생활표현</h4><strong>도움 요청 문장 완성</strong><p>언어적 도움 1회 · 단일 기록으로 변화 판단 보류</p></article><article><h4>미술</h4><strong>가을 작품 완성</strong><p>작품 1개 · 점수나 정서 상태 추정 없음</p></article></div>
    <button className="pf-evidence-link" onClick={onEvidence}>근거 기록과 비교 조건 확인 →</button>
    <div className="pf-prompt-pending"><strong>함께 정할 생성 지침</strong><p>의견의 용도·말투·분량·관찰 근거 기준과 프롬프트는 선생님과 검토한 뒤 확정해요.</p><small>현재는 자동 생성이 아닌 고정 예시입니다. 외부 전송이나 저장은 하지 않아요.</small></div>
    <div className="pf-opinion-actions"><h4>종합의견 초안</h4><button onClick={()=>{setText(draft);setStatus('고정된 예시 초안을 불러왔어요. 자유롭게 고쳐 보세요.');}}>예시 초안 {text?'다시 보기':'만들기'}</button></div>
    <textarea className="pf-opinion-text" aria-label="종합의견 예시 초안" placeholder="예시 초안 만들기를 누르면 교과별 근거를 모은 의견이 나타나요." value={text} onChange={e=>setText(e.target.value)}/>
    <div className="pf-opinion-actions"><span>교사가 근거를 확인하고 다듬는 단계예요.</span><button disabled={!text.trim()} onClick={()=>setStatus('검토 완료 모습을 확인했어요. 시안이므로 실제 저장하지 않았어요.')}>검토 완료 체험</button></div>
    <p role="status" className="pf-note">{status || '이 화면을 나가면 수정한 예시 초안은 사라져요.'}</p>
  </div>;
}
