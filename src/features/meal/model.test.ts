import { describe, expect, it } from 'vitest';
import { emptyClass } from '@/core/data/types';
import { dishAlerts, dishKey, mealAlertNames, parseDish, parseMealRow, parseNutri, renameDish, shownDishes, simplifyDishQueries } from './model';

describe('급식 규칙', () => {
  it('메뉴 이름과 알레르기 번호를 나눈다', () => {
    expect(parseDish('쇠고기미역국 (5.6.16)')).toEqual({ name: '쇠고기미역국', codes: [5, 6, 16] });
    expect(parseDish('배추김치9.13.')).toEqual({ name: '배추김치', codes: [9, 13] });
    expect(parseDish('현미밥')).toEqual({ name: '현미밥', codes: [] });
    expect(parseDish('우유 (2.)')).toEqual({ name: '우유', codes: [2] });
    expect(parseDish('삼색나물 (5.99.5)').codes).toEqual([5]);        // 범위 밖 번호와 중복은 뺀다
  });
  it('NEIS 급식 한 줄을 읽는다', () => {
    const row = { DDISH_NM: '현미밥<br/>쇠고기미역국 (5.6.16)<br/> <br/>우유 (2)', CAL_INFO: '612.3 Kcal', NTR_INFO: '탄수화물(g) : 88.1<br/>단백질(g) : 24.5<br/>지방(g) : 15<br/>비타민A(R.E) : 120.4<br/>칼슘(mg) : 310' };
    const { dishes, nutri } = parseMealRow(row);
    expect(dishes.map((d) => d.name)).toEqual(['현미밥', '쇠고기미역국', '우유']);
    expect(nutri).toMatchObject({ kcal: 612.3, carb: 88.1, prot: 24.5, fat: 15, vitA: 120.4, ca: 310 });
    expect(parseNutri({})).toBeNull();
    expect(parseNutri(undefined)).toBeNull();
  });
  it('알레르기 경고: 학생 번호 × 메뉴 번호', () => {
    const cls = { ...emptyClass('c'), students: [{ id: 'a', name: '가람' }, { id: 'b', name: '나래' }, { id: 'z', name: '떠난이', archived: true as const }], allergies: { a: [2, 5], b: [9], z: [2] } };
    const milk = { name: '우유', codes: [2] };
    expect(dishAlerts(milk, cls).map((x) => [x.student.name, x.hits])).toEqual([['가람', [2]]]);   // 보관된 학생은 알리지 않는다
    expect(dishAlerts({ name: '현미밥', codes: [] }, cls)).toEqual([]);
    expect(mealAlertNames([milk, { name: '새우튀김', codes: [9, 5] }], cls)).toEqual(['가람', '나래']);
  });
  it('숨긴 메뉴를 빼도 원래 목록은 그대로다', () => {
    const dishes = [{ name: '현미밥', codes: [] }, { name: '우유', codes: [2] }];
    expect(shownDishes(dishes, ['우유']).map((d) => d.name)).toEqual(['현미밥']);
    expect(dishes).toHaveLength(2);
  });
  it('메뉴 이름 고치기', () => {
    const dishes = [{ name: '우유', codes: [2] }, { name: '김치', codes: [9] }];
    expect(renameDish(dishes, 0, '흰우유')).toEqual([{ name: '흰우유', codes: [2] }, dishes[1]]);   // 번호를 안 적으면 그대로 둔다
    expect(renameDish(dishes, 1, '깍두기 (9.13)')![1]).toEqual({ name: '깍두기', codes: [9, 13] });
    expect(renameDish(dishes, 0, '우유')).toBeNull();
    expect(renameDish(dishes, 0, '  ')).toBeNull();
    expect(renameDish(dishes, 5, '없음')).toBeNull();
  });
  it('그림 열쇠와 추천 검색어', () => {
    expect(dishKey('사과 주스·젤리*')).toBe('사과주스젤리');
    expect(simplifyDishQueries('코코넛대왕새우튀김')).toEqual(['새우튀김', '새우', '튀김']);
    expect(simplifyDishQueries('쇠고기미역국')).toEqual(['미역국', '미역']);
    expect(simplifyDishQueries('밥')).toEqual([]);
  });
});
