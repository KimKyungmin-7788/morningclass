import { describe, expect, it } from 'vitest';
import { PRAISE_DEFAULT, addSticker, claimBoard, cleanOwn, clusterRows, isFull, praiseConfigOf, reasonsFor, removeSticker, rewardsFor, tallyOf } from './praise';
import { emptyClass } from './types';

describe('칭찬판', () => {
  it('스티커를 더하고 되돌리며, 0 아래로는 내려가지 않는다', () => {
    const a = addSticker(undefined, 's1');
    expect(a).toEqual({ s1: { now: 1, boards: 0 } });
    const b = addSticker(a, 's1');
    expect(tallyOf(b, 's1').now).toBe(2);
    expect(a.s1.now).toBe(1);                                      // 원래 기록은 그대로
    expect(tallyOf(removeSticker(removeSticker(removeSticker(b, 's1'), 's1'), 's1'), 's1').now).toBe(0);
  });
  it('학생마다 따로 센다', () => {
    const t = addSticker(addSticker(undefined, 's1'), 's2');
    expect(tallyOf(t, 's1').now).toBe(1);
    expect(tallyOf(t, 's2').now).toBe(1);
    expect(tallyOf(t, 's3')).toEqual({ now: 0, boards: 0 });
  });
  it('판을 다 채우면 보상으로 바꾸고 새 판을 시작한다', () => {
    let t = undefined as ReturnType<typeof addSticker> | undefined;
    for (let i = 0; i < 10; i += 1) t = addSticker(t, 's1');
    expect(isFull(t, 's1', 10)).toBe(true);
    expect(isFull(t, 's1', 20)).toBe(false);
    expect(claimBoard(t, 's1')).toEqual({ s1: { now: 0, boards: 1 } });
  });
  it('포도송이는 위가 넓고 아래로 좁아지며 알 수가 맞는다', () => {
    expect(clusterRows(10)).toEqual([4, 3, 2, 1]);
    expect(clusterRows(20)).toEqual([6, 5, 4, 3, 2]);
    for (const n of [10, 20, 30]) expect(clusterRows(n).reduce((a, b) => a + b, 0)).toBe(n);
  });
  it('설정이 없으면 기본값, 일부만 있으면 나머지는 기본값', () => {
    expect(praiseConfigOf(undefined).size).toBe(20);
    const cls = { ...emptyClass('c1'), options: { praise: { size: 10, autoRole: true } } };
    expect(praiseConfigOf(cls)).toMatchObject({ size: 10, autoRole: true, shape: 'grape' });
  });
});

describe('학생별 맞춤 칭찬 · 보상', () => {
  const cfg = { ...PRAISE_DEFAULT, reasons: ['바르게 앉기', '친구 돕기'], rewards: ['자유 시간 10분'] };
  it('맞춤이 없으면 공통 것만 나온다', () => {
    expect(reasonsFor(cfg, undefined)).toEqual([{ text: '바르게 앉기', own: false }, { text: '친구 돕기', own: false }]);
    expect(rewardsFor(cfg, {})).toEqual([{ text: '자유 시간 10분', own: false }]);
  });
  it('맞춤은 공통 것 앞에 더해지고, 그 학생의 것으로 표시된다', () => {
    expect(reasonsFor(cfg, { reasons: ['눈 맞추고 인사하기'] }).map((x) => `${x.own ? '*' : ''}${x.text}`)).toEqual(['*눈 맞추고 인사하기', '바르게 앉기', '친구 돕기']);
    expect(rewardsFor(cfg, { rewards: ['태블릿 5분'] }).map((x) => x.text)).toEqual(['태블릿 5분', '자유 시간 10분']);
  });
  it('빈 칸과 공통과 겹치는 것은 한 번만 나온다', () => {
    expect(reasonsFor(cfg, { reasons: [' ', '친구 돕기'] }).map((x) => x.text)).toEqual(['친구 돕기', '바르게 앉기']);
  });
  it('저장 전에 빈 칸 · 빈 학생 · 명단에 없는 학생을 지운다', () => {
    const cleaned = cleanOwn({ s1: { reasons: [' 도움 요청하기 ', ''], rewards: [] }, s2: { reasons: [''], rewards: [' '] }, gone: { reasons: ['x'] } }, ['s1', 's2']);
    expect(cleaned).toEqual({ s1: { reasons: ['도움 요청하기'], rewards: [] } });
  });
});
