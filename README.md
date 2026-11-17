# 몽땅 · 부모님 기념일 알림 (시연용)

인스타그램 프로필 링크용 모바일 웹. Figma `콘텐츠 제작 › 사전 신청 랜딩페이지`의 최종 화면(인트로 인터랙션, 플로우)을 그대로 구현했어요.

- 디자인 시스템: 원티드 Montage (브랜드 컬러만 Violet), 폰트 Wanted Sans Variable
- 흐름: 인트로 모션 → 랜딩 → 누구 → 날짜(양력/음력) → 태어난 해 → 결과(+1.6초 뒤 몽땅 소개 시트) → 알림 신청 → 완료
- 음력→양력 변환, D-day, 환갑·칠순/결혼 주년, D-30·D-7·내년 알림일 계산은 `src/calc.js`
- **DB 미연동**: 신청 정보는 브라우저 localStorage(`mongttang:alarms`)와 콘솔에만 남아요
- 테스트용으로 기준일 고정: `?today=2026-11-17`

```
npm install
npm run dev
```

`main` 브랜치에 push하면 GitHub Actions가 GitHub Pages로 자동 배포해요.
