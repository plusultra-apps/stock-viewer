# 바이낸스 선물 차트 (시세 조회 전용)

바이낸스 USDⓈ-M 무기한 선물 종목 목록을 검색·정렬해서 고르고, 선택한 종목의 캔들·거래량 차트를 실시간으로 보는 학습용 PC 웹 화면입니다.

> **시세 조회 전용 · 비공식 학습용.** 바이낸스와 무관한 개인 프로젝트이며 바이낸스의 상표·로고·공식 UI 를 쓰지 않습니다. 주문·로그인·API 키 입력이 없고, 서버도 두지 않습니다 (브라우저가 바이낸스 공개 주소를 직접 부릅니다, `docs/adr/0001`).

## 실행

```
npm install
npm run dev        # http://localhost:5173 에서 연다
npm run build      # 타입 검사 후 dist/ 로 빌드
npm run preview    # 빌드 결과 확인
```

`dist/index.html` 을 더블클릭해 `file://` 로 여는 것은 지원하지 않습니다 (모듈 스크립트가 막힙니다).

## 시험

```
npm test           # 단위·화면 시험 (Vitest)
npm run lint       # oxlint
npm run typecheck  # TypeScript 타입 검사
```

- 시험은 바이낸스를 호출하지 않습니다. `fetch`·`WebSocket` 은 시험마다 가짜로 바꿉니다.
- `fixtures/binance/` 의 JSON 은 손으로 만든 **샘플**이며 실제 바이낸스 응답이 아닙니다. 상태 글자(`TRADING`, `PERPETUAL`)와 응답 크기는 실제 연결로 확인해야 합니다.

## 구조

`src/features/<도메인>/` 아래 `domain`(순수 규칙) · `application`(port·세션) · `infrastructure`(바이낸스 호출·파싱) · `ui`(화면) 로 나눕니다. 규칙과 이유는 `docs/03-tech-design.md`, 공통 용어는 `docs/glossary.md` 에 있습니다.

## 화면 규칙

- 시간은 모두 한국 시간(KST)으로 보입니다. 내부는 UTC 밀리초입니다.
- 연결이 끊기거나 요청이 제한되면 위쪽 알림 줄과 상태 칩에 이유를 씁니다. 요청 제한 중에는 새 요청을 보내지 않습니다.
- 가격은 바이낸스 가격 단위(tickSize) 자릿수로 고정합니다. 1000배 단위 종목(`1000PEPEUSDT` 등)에는 안내를 붙입니다.

## TradingView 표기

차트는 [TradingView Lightweight Charts](https://www.tradingview.com/) v5 (Apache 2.0 라이선스)로 그립니다 (`docs/adr/0002`). 차트의 TradingView 로고(`attributionLogo`)는 끄지 않고, 차트 아래 문구에도 출처를 적습니다. 라이선스상 이 표기를 제거하지 마세요.

## 알려진 한계

- 이 프로젝트를 만든 환경에서는 바이낸스 연결과 451(지역 차단) 여부를 확인하지 못했습니다. 실제 연결 시험은 사용자 PC 에서 합니다.
- 바이낸스가 `Retry-After` 헤더를 브라우저에 노출하는지 확인하지 못했습니다. 노출되지 않으면 요청 제한 대기 시간을 표시하지 않습니다.
- 거래 종료 확인은 10초마다 종목 정보를 다시 받는 방식입니다 (응답 크기는 실제 측정 필요).
