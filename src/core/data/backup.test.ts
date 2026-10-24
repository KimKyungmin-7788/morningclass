import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackup, parseBackup } from './backup';
import { emptyData, emptyRecord } from './types';

describe('백업', () => {
  it('내보낸 파일을 그대로 다시 읽는다', () => {
    const data = emptyData();
    data.classes[0].className = '4학년 1반';
    expect(parseBackup(buildBackup(data))).toEqual({ data });
  });

  it('주간 시간표·자동 불러오기·영상 목록과 기본 영상을 백업으로 보존한다', () => {
    const data = emptyData();
    const cls = data.classes[0];
    cls.options.timetableAutoLoad = true;
    cls.options.video = { url: 'https://youtu.be/VAoR8bL04qA', title: '아침 음악' };
    data.timetables = [{ classId: cls.id, day: 0, periods: ['국어', '', '음악'] }];
    data.videos = [{ ...cls.options.video, videoId: 'VAoR8bL04qA', playedAt: '2026-10-22T00:00:00.000Z' }];
    const restored = parseBackup(buildBackup(data)).data;
    expect(restored.classes[0].options).toEqual(cls.options);
    expect(restored.timetables).toEqual(data.timetables);
    expect(restored.videos).toEqual(data.videos);
  });

  it('기존 앱의 백업 파일을 변환해 읽는다', () => {
    const old = JSON.stringify({
      mc_classes: JSON.stringify([{ id: 'c1', className: '1반', students: ['가람'] }]),
      mc_record_c1_20261008: JSON.stringify({ attendance: { 가람: 'late' } }),
      _exportedAt: '2026-10-08T00:00:00.000Z', _version: '2.2',
    });
    const { data, report } = parseBackup(old);
    expect(data.classes[0].className).toBe('1반');
    expect(data.records[0].attendance[data.classes[0].students[0].id]).toEqual({ status: 'late' });
    expect(report).toMatchObject({ classes: 1, students: 1, records: 1 });
  });

  it('엉뚱한 파일은 이유와 함께 거절한다', () => {
    expect(() => parseBackup('안녕')).toThrow('JSON');
    expect(() => parseBackup('[1,2]')).toThrow('백업 파일이 아니에요');
    expect(() => parseBackup('{"a":1}')).toThrow('백업 파일이 아니에요');
    expect(() => parseBackup(JSON.stringify({ format: 'morningclass-backup', data: { classes: [] } }))).toThrow('깨졌어요');
    const future = emptyData();
    future.schemaVersion = 999;
    expect(() => parseBackup(buildBackup(future))).toThrow('새로운 버전');
  });

  it('파일 이름에 날짜를 넣는다', () => {
    expect(backupFileName(new Date(2026, 9, 3))).toBe('아침교실_백업_20261003.json');
  });
});

it('schemaVersion 1 백업은 학생 기록의 빈 칸과 기본 설정을 채운다', () => {
  const data = emptyData();
  const { studentNotes, ieps, expr, notesConfig, ...old } = data;
  const parsed = parseBackup(JSON.stringify({ format: 'morningclass-backup', schemaVersion: 1, data: { ...old, schemaVersion: 1 } })).data;
  expect(parsed.schemaVersion).toBe(9); expect(parsed.studentNotes).toEqual([]); expect(parsed.ieps).toEqual([]); expect(parsed.expr).toEqual({}); expect(parsed.notesConfig.quick).toHaveLength(6);
});
it('학생 기록·IEP·생활표현·설정·복구 열쇠가 왕복하고 PIN 해시는 빠진다', () => {
  const data = emptyData();
  data.studentNotes = [{ id: 'n', classId: data.currentClassId, studentId: 's', at: '2026-10-22T00:00:00Z', text: '관찰', category: 'challenge', abc: { a: '전환', b: '행동', c: '휴식', intensity: 'mid', minutes: 2 }, support: 'verbal', share: true, updatedAt: '2026-10-22T00:00:00Z' }];
  data.ieps = [{ id: 'i', classId: data.currentClassId, studentId: 's', semester: '2026-2', subjects: [] }];
  data.expr[data.currentClassId] = { levels: { s: 'word' }, plan: { '20261022': 'x' }, bag: { used: ['x'], days: { '20261022': 'x' } } };
  data.notesConfig.quick = ['내 문장']; data.recoveryKey = 'a'.repeat(64);
  const text = buildBackup({ ...data, pinHash: { hash: 'secret' } } as typeof data);
  expect(text).not.toContain('pinHash'); expect(parseBackup(text).data).toEqual(data);
});

it('v2 백업의 기존 날짜 기록을 옷차림 없는 상태로 그대로 읽는다',()=>{
 const data=emptyData();data.schemaVersion=2;data.records=[{...emptyRecord(data.currentClassId,'20261023'),notes:'남겨둘 내용'}];
 const result=parseBackup(buildBackup(data)).data;expect(result.schemaVersion).toBe(9);expect(result.records).toEqual(data.records);expect(result.records[0].outfits).toBeUndefined();
});

it('봄옷과 모자·스카프를 백업에 함께 보존한다',()=>{
 const data=emptyData();const record=emptyRecord(data.currentClassId,'20261024');
 record.outfits={s:{avatar:'girl',clothes:{top:'stripe-shirt',bottom:'chinos',outer:'pink-cardigan',hat:'spring-cap',neck:'spring-scarf'},season:'봄',weather:'바람',completedAt:'2026-10-24T00:00:00Z'}};data.records=[record];
 expect(parseBackup(buildBackup(data)).data.records).toEqual([record]);
 data.schemaVersion=4;delete record.outfits.s.clothes.hat;delete record.outfits.s.clothes.neck;
 expect(parseBackup(buildBackup(data)).data.records).toEqual([record]);
});

it('새 계절 옷·신발과 선택한 계절·날씨를 백업 왕복으로 보존한다',()=>{
 const data=emptyData();
 const record=emptyRecord(data.classes[0].id,'20261024');
 record.outfits={s:{avatar:'girl',clothes:{top:'summer-ocean-shirt',bottom:'summer-coral-shorts',outer:'summer-sky-jacket',shoes:'sandals'},season:'여름',weather:'비',completedAt:'2026-10-24T00:00:00Z'}};
 data.records=[record];
 expect(parseBackup(buildBackup(data)).data.records[0].outfits).toEqual(record.outfits);
});


it('슬리퍼와 새 날씨 의상을 백업해도 ID를 그대로 보존한다',()=>{
 const data=emptyData();const record=emptyRecord(data.classes[0].id,'20261024');
 record.outfits={s:{avatar:'boy',clothes:{top:'summer-rainbow-shirt',bottom:'autumn-olive-pants',outer:'spring-rain-jacket',shoes:'summer-slippers'},season:'여름',weather:'비',completedAt:'2026-10-24T00:00:00Z'}};
 data.records=[record];expect(parseBackup(buildBackup(data)).data.records[0].outfits).toEqual(record.outfits);
});
