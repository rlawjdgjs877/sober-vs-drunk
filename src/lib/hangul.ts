// 한글 음절을 자판 타수로 환산 (분당 타수 계산용)
const CHO_STROKES = [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1]; // ㄲㄸㅃㅆㅉ = shift(2)
const JUNG_STROKES = [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 2, 2, 2, 1, 1, 2, 1]; // ㅘㅙㅚㅝㅞㅟㅢ = 2
const JONG_STROKES = [0, 1, 2, 2, 1, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1];

export function strokeCount(text: string): number {
  let n = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const idx = code - 0xac00;
      const cho = Math.floor(idx / 588);
      const jung = Math.floor((idx % 588) / 28);
      const jong = idx % 28;
      n += CHO_STROKES[cho] + JUNG_STROKES[jung] + JONG_STROKES[jong];
    } else {
      n += 1;
    }
  }
  return n;
}

/** 음절 단위 편집 거리 */
export function editDistance(a: string, b: string): number {
  const A = Array.from(a);
  const B = Array.from(b);
  const dp = Array.from({ length: B.length + 1 }, (_, i) => i);
  for (let i = 1; i <= A.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= B.length; j++) {
      const tmp = dp[j];
      dp[j] = A[i - 1] === B[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[B.length];
}
