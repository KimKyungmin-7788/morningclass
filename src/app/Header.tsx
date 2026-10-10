import { usePrefs } from '@/core/prefs';
import { ensureAudio, playSound } from '@/core/sound';
import { toast } from '@/core/ui/toast';

// 상단 줄. 학교·학급, 날짜, 저장·기록·설정은 해당 단계에서 실제 기능과 연결한다.
export function Header() {
  const muted = usePrefs((s) => s.muted);
  const setPrefs = usePrefs((s) => s.set);
  const later = (what: string) => () => toast(`${what}: 아직 옮기는 중이에요`);

  return (
    <header>
      <h1><span className="logo-ico" role="img" aria-label="아침교실" /> 아침교실</h1>
      <div className="school" role="button" tabIndex={0} title="눌러서 학급 변경" onClick={later('학급 전환')}>학교명 · 학급명</div>
      <div className="date-card" tabIndex={0} role="button" aria-label="날짜 선택" onClick={later('날짜')}>
        <span className="ico"><i className="ph-duotone ph-calendar-blank" /></span>
        <span>날짜를 입력해주세요</span>
      </div>
      <div className="actions">
        <button className="suggest" title="새 기능을 제안해요" aria-label="기능 제안하기" onClick={later('기능 제안')}>
          <i className="ph-fill ph-lightbulb" /><span>기능 제안</span>
        </button>
        <button
          title={muted ? '소리 켜기' : '소리 끄기'}
          aria-label="소리 켜기/끄기"
          aria-pressed={muted}
          onClick={() => {
            setPrefs({ muted: !muted });
            if (muted) { ensureAudio(); playSound('select'); }
          }}
        >
          <i className={`ph-fill ph-speaker-${muted ? 'slash' : 'high'}`} />
        </button>
        <button className="primary" title="오늘 기록 저장" aria-label="오늘 기록 저장" onClick={later('저장')}>
          <i className="ph-fill ph-floppy-disk" />
        </button>
        <button title="이전 기록 보기" aria-label="이전 기록 보기" onClick={later('이전 기록')}>
          <i className="ph-fill ph-folder-open" />
        </button>
        <button title="설정" aria-label="설정 열기" onClick={later('설정')}>
          <i className="ph-fill ph-gear-six" />
        </button>
      </div>
    </header>
  );
}
