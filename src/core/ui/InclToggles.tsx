import { playSound } from '@/core/sound';
import { useCurrentClass, useData } from '@/core/data/store';
import { attIncludeOf, type InclKind } from '@/core/data/eligible';

// 각 기능(감정 카드·뽑기 창) 아래에 두는 작은 포함 토글. 누르면 학급 설정에 바로 저장된다.
const ITEMS = [['Late', '지각'], ['Early', '조퇴'], ['Absent', '결석']] as const;

export function InclToggles({ kind, disabled }: { kind: InclKind; disabled?: boolean }) {
  const cls = useCurrentClass();
  const saveClass = useData((s) => s.saveClass);
  if (!cls) return null;
  const inc = attIncludeOf(cls);
  return (
    <div className="incl-mini" role="group" aria-label="포함할 학생">
      <span>포함</span>
      {ITEMS.map(([k, label]) => {
        const key = `${kind}${k}` as keyof typeof inc;
        return (
          <button key={k} type="button" className={inc[key] ? 'on' : ''} aria-pressed={inc[key]} disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              void saveClass({ ...cls, options: { ...cls.options, attInclude: { ...inc, [key]: !inc[key] } } });
              playSound('select');
            }}>
            {label}<i />
          </button>
        );
      })}
    </div>
  );
}
