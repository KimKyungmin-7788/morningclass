import { useState } from 'react';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';

// 기능 제안하기: 메일 전송 서비스(FormSubmit)를 거쳐 개발자 메일로 보낸다. 실패하면 메일 앱으로 보내는 길을 연다.

const SUGGEST_EMAIL = 'themaniwant19@gmail.com';
const SUBJECT = '[아침교실] 기능 제안';

export function Suggest({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const send = async () => {
    if (!text.trim()) { toast('제안 내용을 적어 주세요', 'error'); return; }
    setSending(true);
    try {
      const r = await fetch(`https://formsubmit.co/ajax/${SUGGEST_EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: SUBJECT, _template: 'box', _captcha: 'false', '제안 내용': text.trim(), '보낸 사람': name.trim() || '(익명)', '보낸 시각': new Date().toLocaleString('ko-KR') }),
      });
      const data = await r.json().catch(() => ({})) as { success?: unknown };
      if (!r.ok || String(data.success) === 'false') throw new Error('send_failed');
      playSound('complete');
      toast('제안이 전달됐어요. 고마워요! 💌', 'success');
      onClose();
    } catch {
      setFailed(true);                                            // 적은 내용은 그대로 두고 메일 앱으로 보낼 수 있게 한다
      toast('전송에 실패했어요. 메일 앱으로 보낼 수 있어요', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Popup title="💡 기능 제안하기" onClose={onClose}>
      <div className="hint" style={{ marginBottom: 10 }}>
        있었으면 하는 기능이나 불편한 점을 자유롭게 적어 주세요. 제출하면 메일 전송 서비스(FormSubmit)를 거쳐 개발자에게 전달돼요.<br />
        <b>학생 이름 등 개인정보는 적지 말아 주세요.</b>
      </div>
      <textarea className="notes-textarea" aria-label="제안 내용" placeholder={'예) 급식 메뉴 사진이 나오면 좋겠어요\n예) 출석할 때 학생 사진도 보이면 좋겠어요'} value={text} onChange={(e) => setText(e.target.value)} />
      <input className="sg-name" maxLength={40} placeholder="이름 또는 연락처 (선택 — 답장을 받고 싶으면 적어 주세요)" value={name} onChange={(e) => setName(e.target.value)} />
      {failed && (
        <a className="sg-mailto" href={`mailto:${SUGGEST_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(`${text.trim()}\n\n보낸 사람: ${name.trim() || '(익명)'}`)}`}>✉️ 메일 앱으로 보내기</a>
      )}
      <PopupActions>
        <button className="btn-cancel" onClick={onClose}>취소</button>
        <button className="btn-save" disabled={sending} onClick={() => void send()}>{sending ? '보내는 중...' : '📨 제출'}</button>
      </PopupActions>
    </Popup>
  );
}
