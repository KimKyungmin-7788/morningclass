// 선생님 확인 문제: 학생이 실수로 누르면 안 되는 일(화면 꾸미기, 칭찬 스티커 주기) 앞에 곱셈 문제를 낸다.

export interface Gate { a: number; b: number; answer: number; choices: number[] }

/** 2~9 끼리의 곱셈 문제 하나와 보기 네 개(정답 하나 포함, 섞인 순서) */
export function makeGate(rand: () => number = Math.random): Gate {
  const pick = () => 2 + Math.floor(rand() * 8);
  const a = pick(); const b = pick();
  const answer = a * b;
  const near = [answer + a, answer - a, answer + b, answer - b, answer + 1, answer - 1, answer + 10, answer + 2]
    .filter((n, i, list) => n > 0 && n !== answer && list.indexOf(n) === i);
  const choices = [answer];
  while (choices.length < 4) choices.push(near.splice(Math.floor(rand() * near.length), 1)[0]);
  for (let i = choices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { a, b, answer, choices };
}
