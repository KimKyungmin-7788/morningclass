import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackup, parseBackup } from './backup';
import { emptyData } from './types';

describe('백업', () => {
  it('내보낸 파일을 그대로 다시 읽는다', () => {
    const data = emptyData();
    data.classes[0].className = '4학년 1반';
    expect(parseBackup(buildBackup(data))).toEqual({ data });
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
