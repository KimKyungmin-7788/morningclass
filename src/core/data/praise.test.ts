import { describe, expect, it } from 'vitest';
import { addSticker, claimBoard, clusterRows, isFull, praiseConfigOf, removeSticker, tallyOf } from './praise';
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
