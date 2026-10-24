import { useState } from 'react';
import './educationApps.css';
import { StudentConnectionPreview } from './StudentConnectionPreview';

type AppDraft = {name:string;url:string;subject:string};
const empty:AppDraft={name:'',url:'',subject:'수학'};
/** 앱 등록·수신 흐름만 확인하는 시안. 네트워크나 학생 저장소에 접근하지 않는다. */
export function EducationAppsPreview() {
  const [step,setStep]=useState(0);
  const [draft,setDraft]=useState<AppDraft>(empty);
  const [app,setApp]=useState<AppDraft|null>(null);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  const [result,setResult]=useState<'waiting'|'success'|'invalid'>('waiting');
  const [connected,setConnected]=useState(false);
  const guide=app ? `아침교실 연동 개발 요청 — 화면 시안용\n\n앱: ${app.name}\n주소: ${app.url}\n교과: ${app.subject}\n예시 앱 ID: demo.education-app (실제 발급 ID가 아닙니다)\n\n1. 아침교실 공통 연동 규약과 웹앱 개발 지침을 읽고, 활동 ID·버전·학습 목표·측정 지표·비교 조건을 정의해 주세요. 두 문서를 제공받지 못했다면 사용자에게 요청해 주세요.\n2. 학생 연결, 활동 계산, 결과 변환, 전송 대기열을 분리해 주세요. 학생 이름은 표시용이고 learnerId로 구분해 주세요. 학생별 QR의 일회용 코드를 제한된 세션으로 교환하고, 서버가 인증된 bindingId로 학생을 결정하게 해 주세요. 동명이인·이름 변경·공유 태블릿의 학생 전환에도 원래 학생에게만 저장해야 해요.\n3. 결과 ID는 재전송에도 유지하고, 서버의 저장 완료 응답을 받은 뒤에만 저장 완료를 표시해 주세요.\n4. 다른 학생 권한 차단, 중복 전송, 오프라인 복구, 조건이 다른 기록의 비교 제외를 시험해 주세요.\n5. 현재 서버/API/SDK는 연결되지 않았습니다. 가상 어댑터와 가상 학생으로 개발하고 실제 학생 자료를 전송하지 마세요.\n6. 교사 비밀번호·관리자 키를 브라우저 코드에 넣지 마세요.\n7. 종합의견 생성 지침·프롬프트는 사용자와 공동 검토한 뒤 구현해 주세요.\n\n이 요청문은 연결 완료 증명이 아닙니다. 실제 앱 등록, 인증, 허용 출처 검증은 서버 구축 후 필요합니다.` : '';
  const register=()=>{
    setError('');
    if(!draft.name.trim()){setError('앱 이름을 입력해 주세요.');return;}
    try{const u=new URL(draft.url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw new Error();
      setApp({...draft,name:draft.name.trim(),url:u.href});setStep(2);setResult('waiting');setConnected(false);setStatus('');
    }catch{setError('https://로 시작하는 앱 주소를 입력해 주세요. 로그인 정보나 연결 코드가 붙은 주소는 제외해 주세요.');}
  };
  return <section className="ea-preview" aria-label="교육 앱 연결 시안">
    <div className="ea-heading"><div><span className="ea-eyebrow">우리 반 배움을 한곳에</span><h3>교육 앱 연결</h3></div><span className="ea-preview-badge">화면 시안</span></div>
    <p className="ea-notice">등록·수신은 예시로 동작해요. 입력한 내용은 서버에 보내지 않으며, 메뉴를 나가면 사라져요.</p>
    {step===0 ? <>
      <div className="ea-intro"><span className="ea-intro-icon">↗</span><div><h4>내 웹앱의 결과를 포트폴리오로</h4><p>앱을 등록하고 개발 안내를 전달한 뒤, 시험 결과가 도착하는 모습을 확인해 보세요.</p></div><button className="ea-primary" onClick={()=>{setStep(1);setStatus('');}}>＋ 내 앱 등록</button></div>
      <div className="ea-section-heading"><h4>연결할 앱</h4><span>{app?'1개':'아직 없어요'}</span></div>
      {app ? <div className="ea-app-row"><div className="ea-app-icon">▦</div><div><strong>{app.name}</strong><small>{app.url}</small><span className="ea-state">{connected?'연결 완료 · 예시':result==='success'?'시험 확인 완료 · 예시':'개발 연결 대기 · 예시'}</span></div><button onClick={()=>setStep(result==='success'?3:2)}>이어 보기 →</button></div> : <div className="ea-empty"><strong>처음 연결하는 앱을 등록해 보세요.</strong><span>주소를 등록한 후 앱에 결과 전송 기능을 추가하는 과정이 필요해요.</span><button onClick={()=>{setDraft({name:'차근차근 수 세기',url:'https://example.org/counting',subject:'수학'});setStep(1);}}>예시 앱으로 둘러보기 →</button></div>}
      <details className="ea-help"><summary>이미 연동되는 앱을 사용하고 싶어요</summary><p>실제 서비스에서는 등록된 앱을 골라 학급에 연결하게 됩니다. 이 시안에서는 ‘내 앱 등록’ 흐름을 먼저 체험할 수 있어요.</p></details>
    </> : <>
      <button className="ea-back" onClick={()=>{setStep(0);setStatus('');}}>← 앱 목록</button>
      <ol className="ea-steps" aria-label="연결 단계">{['내 앱 등록','개발 안내','시험 결과'].map((label,i)=><li key={label} aria-current={step===i+1?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
      {step===1&&<form className="ea-form" onSubmit={e=>{e.preventDefault();register();}}>
        <h4>어떤 앱을 연결할까요?</h4>
        <label>앱 이름<input maxLength={80} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="예: 차근차근 수 세기" required/></label>
        <label>웹앱 주소<input type="url" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})} placeholder="https://" required/></label>
        <label>대표 교과<select value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}>{['수학','국어','생활표현','미술','기타'].map(s=><option key={s}>{s}</option>)}</select></label>
        <p className="ea-hint">주소만으로 결과를 가져오지는 않아요. 다음 단계의 안내를 앱 개발자나 개발 AI에게 전달해 주세요.</p>
        {error&&<p role="alert" className="ea-error">{error}</p>}
        <div className="ea-actions"><button type="button" onClick={()=>setStep(0)}>취소</button><button className="ea-primary" type="submit">등록하고 안내 보기 →</button></div>
      </form>}
      {step===2&&app&&<>
        <div className="ea-registered"><span>등록 예시</span><strong>{app.name}</strong><small>{app.url}</small></div>
        <h4>앱을 만든 개발자나 AI에게 전달해 주세요.</h4><p className="ea-hint">복사한 요청문과 공통 연동 규약·개발 지침을 함께 제공하면 됩니다. 계정 비밀정보는 포함하지 않아요.</p>
        <textarea className="ea-guide" aria-label="개발 요청 안내" value={guide} readOnly onFocus={e=>e.currentTarget.select()}/>
        <div className="ea-actions"><button onClick={()=>{setStep(1);setStatus('');}}>등록 내용 수정</button><button onClick={async()=>{try{await navigator.clipboard.writeText(guide);setStatus('개발 요청 안내를 복사했어요.');}catch{setStatus('자동 복사가 어려워요. 안내문을 눌러 선택한 뒤 직접 복사해 주세요.');}}}>개발 안내 복사</button><button className="ea-primary" onClick={()=>{setStep(3);setStatus('');}}>시험 결과 확인 →</button></div>
      </>}
      {step===3&&app&&<>
        <div className="ea-test-heading"><h4>{app.name} · 연결 시험</h4><span className="ea-state">{result==='waiting'?'예시 결과 대기':result==='success'?'예시 수신 성공':'예시 형식 오류'}</span></div>
        <p className="ea-hint">아래 버튼은 수신 화면을 재현해요. 실제 웹앱에서 전송하거나 연결 상태를 검사하지 않아요.</p>
        <div className="ea-test-controls"><button onClick={()=>{setResult('success');setConnected(false);setStatus('가상 결과를 표시했어요. 실제 저장은 하지 않았어요.');}}>정상 결과 체험</button><button onClick={()=>{setResult('invalid');setConnected(false);setStatus('');}}>오류 결과 체험</button><button onClick={()=>{setResult('waiting');setConnected(false);setStatus('');}}>다시 기다리기</button></div>
        {result==='waiting'&&<div className="ea-empty"><span className="ea-intro-icon">⇣</span><strong>시험 결과가 도착하면 여기에 보여요.</strong><span>학생 연결 · 활동 정보 · 결과 형식 · 중복 여부를 확인하는 자리예요.</span></div>}
        {result==='invalid'&&<div className="ea-error-panel" role="alert"><h4>활동 ID가 빠진 예시예요.</h4><p>어떤 활동의 결과인지 구분할 수 없어 등록을 보류했어요.</p><code>activityId: 필수 항목</code><button onClick={()=>setStep(2)}>개발 안내 다시 보기 →</button></div>}
        {result==='success'&&<div className="ea-result"><div className="ea-result-top"><span>✓ 예시 결과 확인</span><strong>가상 학생 · 가을 열매 세기</strong><small>대표 교과: {app.subject} · 첫 시도 8 / 10 · 그림 단서 사용</small></div><ul><li>학생 연결 <b>가상 학생 연결 예시</b></li><li>활동 정보 <b>count-objects · v1</b></li><li>비교 조건 <b>1~10 범위 · 10문항</b></li><li>중복 여부 <b>신규 결과 예시</b></li></ul><p>실제 연결 후에는 해당 학생의 날짜별·활동별 포트폴리오에 쌓여요.</p></div>}
        <div className="ea-actions"><button onClick={()=>setStep(2)}>← 개발 안내</button><button className="ea-primary" disabled={result!=='success'||connected} onClick={()=>{setConnected(true);setStatus('연결 완료 화면을 체험했어요. 실제 학급 연결은 서버 구축 후 가능해요.');}}>{connected?'연결 완료 · 예시':'학급 연결 완료 체험'}</button></div>
      </>}
    </>}
    <StudentConnectionPreview />
    <p className="ea-status" role="status">{status}</p>
  </section>;
}
