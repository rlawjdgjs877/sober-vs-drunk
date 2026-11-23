# 맨정신 VS 취한 나 (SOBER VS DRUNK)

맨정신일 때의 반응속도·판단력·타이핑 기록을 저장하고, 음주 후 같은 게임을 해서 평소의 나와 대결하는 게임형 자기 측정 웹앱. 시작 버튼 한 번 누르면 3개 게임이 자동으로 이어지고 약 30초면 끝남.

- 반응속도 5회 (대기 0.5~1.2초 무작위) · 반대로 누르기 5문제 (문제당 2초) · 짧은 문장 1개 타이핑
- 카운트다운 3·2·1 (각 0.4초), 게임 사이 결과 0.8초 표시 후 자동 진행
- 규칙 버전(protocol)이 다른 예전 맨정신 기록은 기준 평균에서 제외

## 실행
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 정적 파일 (HashRouter라 어떤 정적 호스팅에도 그대로 배포 가능)
```

## 구조
- `src/lib/types.ts` 데이터 모델 (SessionRecord: baseline | test)
- `src/lib/storage.ts` `RecordRepository` 인터페이스 + localStorage 구현 → Supabase 구현체로 교체 가능
- `src/lib/stats.ts` 기준 평균, 비교, 결과 문구(측정값 기반 규칙), 레이더 정규화, 패턴 분석
- `src/components/games/*` 반응속도 / 반대로 누르기 / 타이핑 게임
- `src/pages/*` 홈, 맨정신 등록, 음주 후 테스트, 결과, 기록

## 측정 방식 메모
- 시간은 `performance.now()`, 자극 시작 시각은 DOM 반영 직후(useLayoutEffect) 기준
- 반응 처리 후 다음 시행까지 입력 잠금 → 연타/중복 입력 방지
- 타이핑 오타율 = (최종 편집거리 + 입력 중 고친 오타) / 목표 글자 수. 조합 중인 마지막 글자는 판정 제외, 첫 불일치 위치만 기록해 중복 계산 방지
- Backspace는 `beforeinput(deleteContentBackward)`로 계산 (모바일 키보드 대응)
- 게임 하나가 끝날 때마다 임시 저장 → 새로고침해도 다음 게임부터 이어서 진행
- 결과는 테스트 당시 기준값을 스냅샷으로 저장해서, 이후 기준이 바뀌어도 과거 비교가 유지됨

의학적 판정 도구가 아니며, 결과와 관계없이 음주 후 운전은 금지.
