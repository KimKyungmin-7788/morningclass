import { describe, expect, it } from 'vitest';
import { hasLegacyData, migrateLegacy, type LegacyDump } from './migrateLegacy';

const j = JSON.stringify;

function sampleDump(): LegacyDump {
  return {
    mc_classes: j([
      { id: 'c1', schoolName: '체험학교', className: '4학년 1반', schoolLevel: 'elem', students: ['가람', '나래', '다온'],
        neisAtptCode: 'K10', neisSchoolCode: '7801212', bookUrl: 'https://youtu.be/abc', bookTitle: '아침 음악',
        allergies: { 가람: [2, 5], 떠난이: [1] }, attInclude: { emoLate: true }, emoMode: 'tap', helperMode: 'lucky',
        mealHidden: ['우유'], subjectCfg: { hidden: ['과학'], custom: ['요리실습'], icons: { 요리실습: '🍳' } }, tools: { timer: false } },
      { id: 'c2', schoolName: '체험학교', className: '', students: [] },
    ]),
    mc_current_class: 'c1',
    mc_custom_subjects: j(['한국사']),
    mc_record_c1_20261008: j({
      savedAt: '2026-10-08T00:10:00.000Z',
      weather: { emoji: '☀️', label: '맑음', temp: 18 }, dust: { emoji: '😀', label: '좋음' },
      attendance: { 가람: 'present', 나래: 'absent', 전학생: 'late' }, attendanceReasons: { 나래: '질병', 가람: '기타' },
      emotions: { 가람: { emoji: '😊', label: '기쁨', items: [{ k: 'joy', x: 0.5, y: 0.58, zone: 'belly' }, { k: 'zzz', x: 0, y: 0 }] }, 나래: { emoji: '😢', label: '슬픔' }, 다온: { emoji: '🤔', label: '모름' } },
      timetableArranged: ['국어', '수학'], timetableCorrect: true, timetableNotes: { 1: '준비물' },
      helpers: ['다온'], helperPickedAt: '2026-10-08T00:05:00.000Z', lucky: ['전학생'],
      notes: '', mealText: '현미밥\n우유', mealDishes: [{ name: '우유', codes: [2] }], mealNutri: { kcal: 600 }, mealLoadedAt: '2026-10-08T00:01:00.000Z',
    }),
    mc_draft_notes_c1_20261008: '우산 챙기기',
    mc_celebrated_c1_20261008: '1',
    mc_record_c1_20261009: j({ attendance: { 전학생: 'present' } }),
    mc_record_gone_20261001: j({ attendance: { 누구: 'present' } }),
    mc_timetable_c1_0: j({ periods: ['국어', '', '수학', '', '', '', ''] }),
    mc_timetable_c1_1: j({ periods: ['', '', '', '', '', '', ''] }),
    mc_ddays_c1: j([{ title: '소풍', date: '2026-10-20' }]),
    mc_date_set_c1: '2026-10-9',
    mc_lessons: j([{ id: 'l1', title: '덧셈' }]),
    mc_meal_images: j({ 현미밥: { src: 'https://x/y.jpg', auto: true }, 깨진것: 3 }),
    mc_video_list: j([{ url: 'https://youtu.be/abc', videoId: 'abc', title: '아침 음악', playedAt: '2026-10-08T00:00:00.000Z' }]),
    mc_muted: '1', mc_app_mode: 'lesson', mc_meal_view: 'text', mc_ws_opts: j({ dot: false, size: 20 }), mc_last_backup: '2026-10-01T00:00:00.000Z',
  };
}

describe('기존 자료 변환', () => {
  it('학급 설정을 새 형식으로 옮긴다', () => {
    const { data } = migrateLegacy(sampleDump());
    const c1 = data.classes[0];
    expect(data.currentClassId).toBe('c1');
    expect(c1).toMatchObject({ schoolName: '체험학교', className: '4학년 1반', level: 'elem', neis: { atptCode: 'K10', schoolCode: '7801212' } });
    expect(c1.subjects).toEqual({ hidden: ['과학'], custom: ['요리실습'], icons: { 요리실습: '🍳' } });
    expect(c1.options).toMatchObject({ emoMode: 'tap', helperMode: 'lucky', mealHidden: ['우유'], tools: { timer: false }, video: { url: 'https://youtu.be/abc', title: '아침 음악' } });
    // 추가 과목 목록이 없는 학급은 예전 공용 목록을 이어받는다
    expect(data.classes[1].subjects.custom).toEqual(['한국사']);
  });

  it('학생에게 고유 번호를 붙이고 기록의 이름을 번호로 바꾼다', () => {
    const { data } = migrateLegacy(sampleDump());
    const c1 = data.classes[0];
    const id = (name: string) => c1.students.find((s) => s.name === name)!.id;
    expect(c1.students.filter((s) => !s.archived).map((s) => s.name)).toEqual(['가람', '나래', '다온']);
    const rec = data.records.find((r) => r.date === '20261008')!;
    expect(rec.attendance[id('가람')]).toEqual({ status: 'present' });           // 결석이 아니면 사유를 버린다
    expect(rec.attendance[id('나래')]).toEqual({ status: 'absent', reason: '질병' });
    expect(rec.helpers.ids).toEqual([id('다온')]);
    expect(c1.allergies[id('가람')]).toEqual([2, 5]);
  });

  it('명단에 없는 학생의 기록은 보관된 학생으로 남긴다', () => {
    const { data, report } = migrateLegacy(sampleDump());
    const archived = data.classes[0].students.filter((s) => s.archived).map((s) => s.name);
    expect(archived.sort()).toEqual(['떠난이', '전학생']);
    const gone = data.classes[0].students.find((s) => s.name === '전학생')!.id;
    expect(data.records.find((r) => r.date === '20261008')!.attendance[gone]).toEqual({ status: 'late' });
    expect(data.records.find((r) => r.date === '20261009')!.attendance[gone]).toEqual({ status: 'present' });  // 날짜가 달라도 같은 번호
    expect(report.archivedStudents).toBe(2);
    expect(report.students).toBe(3);
    expect(report.warnings.some((w) => w.includes('보관된 학생'))).toBe(true);
  });

  it('감정 기록: 지금 형식 · 초기 형식 · 알 수 없는 감정', () => {
    const { data } = migrateLegacy(sampleDump());
    const c1 = data.classes[0];
    const rec = data.records.find((r) => r.date === '20261008')!;
    const of = (name: string) => rec.emotions[c1.students.find((s) => s.name === name)!.id];
    expect(of('가람').items).toEqual([{ k: 'joy', x: 0.5, y: 0.58, zone: 'belly' }]);          // 모르는 감정 종류는 뺀다
    expect(of('나래').items).toEqual([{ k: 'sad', x: 0.5, y: 0.47, zone: 'chest' }]);          // 초기 형식 → 가슴에 하나
    expect(of('다온')).toEqual({ items: [], legacy: { emoji: '🤔', label: '모름' } });         // 버리지 않고 보존
  });

  it('급식 · 시간표 · 유의사항 · 축하 표시', () => {
    const { data } = migrateLegacy(sampleDump());
    const rec = data.records.find((r) => r.date === '20261008')!;
    expect(rec.meal).toEqual({ dishes: [{ name: '현미밥', codes: [] }, { name: '우유', codes: [2] }], nutri: { kcal: 600 }, loadedAt: '2026-10-08T00:01:00.000Z' });
    expect(rec.timetable).toEqual({ arranged: ['국어', '수학'], correct: true, notes: { 1: '준비물' } });
    expect(rec.notes).toBe('우산 챙기기');       // 기록에 유의사항이 없으면 임시 저장분을 쓴다
    expect(rec.celebrated).toBe(true);
    expect(data.timetables).toEqual([{ classId: 'c1', day: 0, periods: ['국어', '', '수학', '', '', '', ''] }]);   // 빈 요일은 옮기지 않는다
  });

  it('그 밖의 자료와 기기별 보기 설정', () => {
    const { data, prefs, report } = migrateLegacy(sampleDump());
    expect(data.ddays).toEqual({ c1: [{ title: '소풍', date: '2026-10-20' }] });
    expect(data.dateSet).toEqual({ c1: '2026-10-9' });
    expect(data.lessons).toEqual([{ id: 'l1', title: '덧셈' }]);
    expect(data.mealImages).toEqual({ 현미밥: { src: 'https://x/y.jpg', auto: true } });
    expect(data.videos).toHaveLength(1);
    expect(prefs).toEqual({ muted: true, appMode: 'lesson', mealView: 'text', wsOpts: { dot: false, size: 20 }, lastBackup: '2026-10-01T00:00:00.000Z' });
    expect(report.warnings.some((w) => w.includes('삭제된 학급의 기록 1건'))).toBe(true);
    expect(report).toMatchObject({ classes: 2, records: 2, timetables: 1 });
  });

  it('여러 번 돌려도 결과가 같고 입력을 고치지 않는다', () => {
    const dump = sampleDump();
    const before = j(dump);
    expect(j(migrateLegacy(dump).data)).toBe(j(migrateLegacy(dump).data));
    expect(j(dump)).toBe(before);
  });

  it('더 예전(단일 학급) 자료도 옮긴다', () => {
    const { data } = migrateLegacy({
      mc_settings: j({ schoolName: '옛학교', className: '1반', students: ['하나', '두리'] }),
      mc_record_20250301: j({ attendance: { 하나: 'present' } }),
      mc_timetable_2: j({ periods: ['음악'] }),
      mc_ddays: j([{ title: '방학' }]),
      mc_date_set: '2025-3-1',
    });
    const cls = data.classes[0];
    expect(cls).toMatchObject({ schoolName: '옛학교', className: '1반' });
    expect(data.records).toHaveLength(1);
    expect(data.records[0].attendance[cls.students[0].id]).toEqual({ status: 'present' });
    expect(data.timetables).toEqual([{ classId: cls.id, day: 2, periods: ['음악'] }]);
    expect(data.ddays[cls.id]).toEqual([{ title: '방학' }]);
    expect(data.dateSet[cls.id]).toBe('2025-3-1');
  });

  it('깨진 값이 있어도 멈추지 않는다', () => {
    const { data } = migrateLegacy({ mc_classes: '{깨짐', mc_record_c1_20261008: 'x', mc_meal_images: 'null' });
    expect(data.classes).toHaveLength(1);
    expect(data.records).toHaveLength(0);
  });

  it('기존 자료가 있는지 알아낸다', () => {
    expect(hasLegacyData({ mc_classes: '[]' })).toBe(true);
    expect(hasLegacyData({ mc_muted: '1' })).toBe(false);
  });
});
