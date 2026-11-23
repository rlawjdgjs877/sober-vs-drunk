// 30초 플레이에 맞춘 짧은 문장(11~15자). 비슷한 길이·난이도, 모두 마침표로 끝남 (자동 완료 판정 기준).
export const SENTENCES = [
  "오늘 날씨가 정말 좋다.",
  "친구와 맛있는 밥을 먹었다.",
  "나는 지금 정확하게 입력한다.",
  "손가락이 빠르게 움직인다.",
  "주말에 영화를 보러 간다.",
  "버스가 곧 도착할 예정이다.",
  "따뜻한 커피 한 잔 마시자.",
  "내일은 일찍 일어나야지.",
  "창밖에 비가 내리고 있다.",
  "새 신발을 신고 공원을 걸었다.",
  "오늘은 친구들과 즐거웠다.",
  "좋아하는 노래를 들었다.",
];

export function pickSentences(n: number): string[] {
  const pool = [...SENTENCES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
