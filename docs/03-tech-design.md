# 바이낸스 선물 전 종목 목록·검색·차트 — 설계 문서

> ③ 설계 (`dev-team:tech-lead`) · 상태: **초안** (승인 표시는 지휘자가 사용자 승인 후 적는다)
> 입력: `docs/01-pr-faq.md` (AC1~AC22), `docs/02-design.md` + `design/chart-only.html` (색·배치·상태 11개를 그대로 따른다).
> 참고: `02-design.md` 머리말은 "사용자 확인 대기"로 남아 있다. 지휘자 지시에 따라 승인본으로 보고 설계했다.

## 1. 맥락과 범위

- 학습용 PC 웹 화면. 바이낸스 USDⓈ-M 무기한 선물 전 종목을 목록·검색으로 고르고, 선택 종목의 캔들·거래량을 실시간으로 본다. 시세 조회 전용 (계정·키·주문 없음).
- 새 프로젝트다. 코드·`AGENTS.md`·용어집·ADR 이 없어서 이번에 처음 만든다. 서버는 두지 않는다: 브라우저가 바이낸스 공개 주소를 직접 부른다 (사용자 PC 브라우저에서 klines 응답 정상 확인됨).

## 2. 목표 / 하지 않을 것

| 목표 | 하지 않을 것 |
|---|---|
| 목록(전부·거래대금 순·포함 검색)과 선택 종목 차트를 실시간으로 | 주문·로그인·키, 지표, 그림 도구, 알림, 즐겨찾기, 여러 차트 동시 |
| 끊김·요청 제한·차단·거래 종료를 숨기지 않고 표시 | 서버·중계(프록시), 배포 호스팅 (내 PC 에서 `npm run dev`) |
| 종목 전환 시 이전 구독을 확실히 끊는다 (AC16) | 모바일 화면 최적화 (900px 미만은 시안대로 세로 쌓기만) |
| 바이낸스 응답을 경계에서 검증하고, 모르는 값은 안전한 쪽으로 처리 | 봉 키보드 탐색 (말풍선 대체는 차트 아래 정보 줄로 충분, 2차) |

## 3. 도메인 모델

**4계층이 필요한가? 예 (가볍게).** 해당 기준:
- 상태 전이가 있다: 연결(연결 중 → 실시간 → 재연결 중 → 끊김), 종목(거래 중 → 거래 종료), 요청 제한(정상 → 대기 → 정상).
- 불변식이 3개 이상이다 (아래 표).
- 해당 없음: 돈·권한·숨긴 값 없음, 채널은 웹 하나.

"가볍게"의 뜻: domain 은 **클래스보다 타입 + 순수 함수**로 쓴다. 엔티티 클래스·저장소 계층은 만들지 않는다 (저장할 데이터가 없다).

용어는 `docs/glossary.md` 에 반영했다.

| 이름 | 종류 | 지키는 규칙(불변식) |
|---|---|---|
| `Market` (종목) | 값 객체 | 기호는 `^[A-Z0-9]{2,30}$` 만. 계약 종류가 무기한이고 상태가 거래 중인 것만 `Market` 이 된다. 모르는 상태 값은 **거래 중이 아님**으로 본다 (안전한 쪽) |
| `MarketList` (종목 목록) | 일급 컬렉션 | 기호 중복 없음. 순서 = 목록을 받은 시점의 24시간 거래대금 내림차순, 같으면 기호 오름차순. 실시간 시세로 순서를 바꾸지 않는다 (값만 갱신, 02 질문 2 의 A) |
| `Ticker` (시세) | 값 객체 | 목록에 없는 기호의 시세는 버린다 (새 종목은 목록 재조회로만 들어온다, AC19) |
| `Interval` (간격) | `as const` 유니언 | `1m 5m 15m 1h 4h 1d` 6개만 |
| `Candle` (봉) | 값 객체 | `openTime`(ms, UTC) 로 식별. 가격·거래량은 숫자로 변환된 유한값만 |
| `CandleSeries` (봉 목록) | 일급 컬렉션 | `openTime` 오름차순, 중복 없음. 같은 `openTime` 이 오면 교체, 더 늦으면 뒤에 붙이고, 더 이르면 무시 (AC4). 최대 `CANDLE_CAP` 개, 넘으면 오래된 것부터 버림 |
| `Selection` (선택) | 값 객체 | 기호 + 간격. 실시간 봉은 `symbol`·`interval` 이 현재 선택과 같을 때만 반영 (AC15, AC16) |
| `ConnectionStatus` (연결 상태) | 상태 | `connecting / live / reconnecting(attempt) / offline`. 전이는 `nextConnectionStatus(상태, 사건)` 한 함수에서만 |
| `RateLimit` (요청 제한) | 상태 | `blockedUntil` 이전에는 어떤 REST 요청도 보내지 않는다 (AC21) |
| `FeedError` (시세 오류) | 도메인 오류 | 종류: `blocked`(451) / `rateLimited`(429·418, 대기 시간) / `badResponse`(형식 오류) / `network` / `http`(기타 코드) |

**규칙의 원본 위치**: 원본은 바이낸스(서버). 이 앱의 domain 규칙은 전부 **표시용**이다. 클라이언트를 조작해 얻을 이득(돈·권한·숨긴 값)이 없으므로 클라이언트에 둬도 된다. 요청 제한의 원본도 바이낸스이며, 클라이언트 `RateLimit` 은 "차단되지 않게 스스로 멈추는" 예의 규칙이다.

## 4. 설계

### 4-0. 기술 스택 (새 프로젝트)

| 안 | 장점 | 단점 | 판단 |
|---|---|---|---|
| **Vite + TypeScript + React 19 (채택)** | 상태 11개·목록 수백 행을 "상태 → 화면" 으로 선언하면 끝. `useEffect` 정리 함수가 "종목 바꾸면 이전 구독 해제"(AC16)를 구조로 보장. 코딩 원칙 `ts-react.md` 가 이미 있음 | 의존성 1개(react) 추가, 렌더 규칙 학습 필요 | **채택**. 학습 목적에도 가장 흔한 조합 |
| Vite + TS, 프레임워크 없음 | 의존성 0, 동작이 투명 | 상태별 DOM 갱신·행 갱신·정리 코드를 직접 짜야 해 코드가 가장 길고, 구독 누수를 사람이 챙겨야 함 | 버림 — AC16 을 구조가 아닌 주의력으로 지켜야 함 |
| Svelte/Vue | 코드가 짧음 | 원칙 언어 파일이 없음 (새로 써야 함) | 버림 |

- 차트: **TradingView Lightweight Charts v5** (Apache 2.0). 캔들 + 거래량 막대(별도 가격 눈금) + 십자선 + 확대/스크롤이 있다. 라이선스대로 화면에 TradingView 표기를 넣는다 (차트 옵션의 표기 로고 + 바닥 문구 링크). 직접 그리기는 확대·눈금·십자선을 전부 만들어야 해 버림 → ADR 0002.
- 시험: Vitest (+ 화면 시험 일부는 Testing Library, jsdom). 린트: oxlint (`ts-react.md` 5-1 설정 그대로) + `react/no-danger`.
- tsconfig: `strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`.
- 실행: `npm run dev` (로컬). 빌드 파일을 `file://` 로 직접 여는 것은 지원하지 않는다 (모듈 스크립트가 막힘).
- 서버·중계 없음 → ADR 0001.

### 4-1. 폴더 구조

```
src/
  app/            main.tsx, App.tsx (조립: 실제 feed 를 만들어 주입), layout.css
  shared/ui/      tokens.css (02 의 색 토큰), messages.ts (화면 문구 모음), formatKst.ts
  features/
    connection/   — 연결·요청 제한 (목록·차트가 함께 씀)
      domain/         ConnectionStatus.ts, nextConnectionStatus.ts, backoffDelay.ts,
                      FeedError.ts, RateLimit.ts, pickBanner.ts
      infrastructure/ binanceEndpoints.ts, binanceValues.ts, binanceHttp.ts, ReconnectingSocket.ts
      ui/             StatusBanner.tsx, StatusChip.tsx, useConnectionStatus.ts
    market/       — 종목 목록
      domain/         Market.ts, MarketList.ts, Ticker.ts, searchMarkets.ts, unitMultiplier.ts
      application/    MarketFeed.ts (port)
      infrastructure/ BinanceMarketFeed.ts, parseExchangeInfo.ts, parseTicker24h.ts, parseTickerStream.ts
      ui/             MarketPanel.tsx, MarketRow.tsx, SearchBox.tsx, useMarkets.ts
    chart/        — 선택 종목 차트
      domain/         Interval.ts, Candle.ts, CandleSeries.ts, Selection.ts, planGapFill.ts
      application/    CandleFeed.ts (port)
      infrastructure/ BinanceCandleFeed.ts, parseKlines.ts, parseKlineStream.ts
      ui/             ChartPanel.tsx, ChartHeader.tsx, IntervalBar.tsx, CandleChart.tsx, CandleInfoLine.tsx, useCandles.ts
  test-fixtures/binance/   실제 응답을 줄여 저장한 샘플 JSON (T002)
```

- **port 는 두 개만**: `MarketFeed`, `CandleFeed` (외부 API 경계라 시험에서 가짜로 바꿔 끼운다). 시계·난수는 인터페이스 대신 **함수 인자**로 받는다 (`backoffDelay(attempt, random)`, `now: () => number`). 소켓은 `ReconnectingSocket` 생성자에 `createSocket` 함수를 넘겨 바꾼다.
- application 계층에 유스케이스 파일은 두지 않는다. 조합(목록 받기 → 구독)이 짧아 훅(`useMarkets`, `useCandles`)이 port 를 직접 부르는 편이 읽기 쉽다. 규칙은 전부 domain 함수라 훅은 얇다. 조합이 15줄을 넘기 시작하면 그때 `application/` 으로 뺀다.

### 4-2. 데이터 (저장 없음)

- 영구 저장 없음 (localStorage 도 안 씀). 화면 상태는 메모리에만.
- 숫자: 바이낸스 응답의 가격·거래량 문자열은 경계(parse*)에서 `number` 로 바꾼다. 표시 자릿수는 exchangeInfo 의 가격 단위(`tickSize`)에서 구한 소수 자릿수로 고정 → 바이낸스 값과 글자가 같게 (AC8, AC15 자릿수). 가격 단위를 못 읽으면 응답 문자열의 소수 자릿수를 쓴다.
- 시간: 내부는 전부 UTC 밀리초. 화면에 낼 때만 `Intl.DateTimeFormat(timeZone: 'Asia/Seoul')` (AC5). 차트에도 같은 함수를 시간 눈금·십자선 형식으로 넘긴다 (데이터를 +9시간 밀지 않는다).
- 1000배 안내: `unitMultiplier(symbol)` — 기호가 `1` 뒤에 `0` 이 3개 이상 붙고 바로 영문자로 이어지면 그 배수(1000, 1000000 …)를, 아니면 없음. 바이낸스 응답에 단위 필드가 있는지는 확인 못 해 기호 규칙으로 정했다 (`1MBABYDOGEUSDT` 같은 표기는 못 잡는다 — 감수).

### 4-3. 인터페이스 (port)

```ts
// features/market/application/MarketFeed.ts
interface MarketFeed {
  loadMarkets(): Promise<MarketSnapshot>;           // exchangeInfo + ticker/24hr 두 요청을 합쳐 MarketList + Ticker[]
  watchTickers(handlers: StreamHandlers<Ticker[]>): Unsubscribe;      // 목록 실시간
}
// features/chart/application/CandleFeed.ts
interface CandleFeed {
  loadCandles(sel: Selection, range: CandleRange, signal: AbortSignal): Promise<Candle[]>;
  watchCandles(sel: Selection, handlers: StreamHandlers<LiveCandle>): Unsubscribe;
}
// StreamHandlers = { onData, onStatus(ConnectionEvent) } ; Unsubscribe = () => void
```

- 모든 REST 는 `binanceHttp` 하나를 지난다: `RateLimit` 확인 → `fetch(credentials: 'omit')` → 상태 코드 분류 → `FeedError`. 응답 본문은 `unknown` 으로 받아 parse* 가 검증한다.
- 주소는 `binanceEndpoints.ts` 한 곳에만 둔다 (바이낸스가 주소 체계를 바꾸면 여기만 고친다).
- 목록 연결은 1개 (`!ticker@arr`), 차트 연결은 항상 최대 1개.

### 4-4. 흐름

```
열기
 ├─ MarketFeed.loadMarkets()  ── exchangeInfo + ticker/24hr (동시 요청)
 │     └─ MarketList 만들기 (거래 중 무기한만, 거래대금 순) → 목록 표시 (AC13)
 │     └─ watchTickers() 시작 → 시세 Map 에 합치기 (바뀐 종목만 와도 되게 '합치기') (AC17)
 └─ Selection = BTCUSDT·1m  (목록과 동시에 시작, 목록을 기다리지 않음 → AC1 5초)
       └─ useCandles(selection)
            effect 시작: AbortController 생성 → loadCandles(최근 500) → setData
                        → watchCandles() → 봉마다 CandleSeries 규칙으로 합치고 update
            effect 정리(종목·간격이 바뀌거나 화면이 사라질 때):
                        abort() + Unsubscribe() → 소켓 close   ← AC16 을 구조로 보장
            늦게 도착한 응답·메시지: abort 된 요청은 버리고, 기호·간격이 다른 실시간 봉은 Selection 규칙으로 버림 (AC15)
```

- 종목 전환 시 REST 는 klines 1회뿐. 목록 REST 는 열 때·재연결 때만 (PR/FAQ 위험표).
- 선택 종목이 목록에 없을 때(처음 BTCUSDT 가 거래 종료인 경우 등): 차트는 "거래 종료" 상태, 사용자가 다른 종목을 고른다.
- 목록과 차트 상태는 따로 움직인다 (02 의 `candleerror` 처럼 차트만 실패 가능).

### 4-5. 재연결

- **끊김 감지** (브라우저 WebSocket 은 회선이 끊겨도 한참 `close` 가 안 오므로 세 가지를 같이 쓴다):
  1. `close`/`error` 사건.
  2. 창의 `offline` 사건 → 즉시 두 소켓을 닫고 재연결 상태로 (AC6 5초).
  3. **무응답 감시**: 목록 소켓은 `TICKER_SILENCE_MS`(기본 4초) 동안 메시지가 없으면 끊긴 것으로 본다. 차트 소켓은 한산한 종목이 조용할 수 있어 `KLINE_SILENCE_MS`(기본 60초)로 길게 둔다. 두 값은 T002 측정값으로 확정.
- **간격**: `backoffDelay(attempt, random) = min(BASE_MS × 2^attempt, MAX_MS) × (0.5 + random × 0.5)`. 기본 `BASE_MS` 1초, `MAX_MS` 15초 (네트워크 복귀 후 30초 안 복구, AC7). 창의 `online` 사건이 오면 기다리지 않고 바로 시도. 연결 후 첫 메시지를 받으면 시도 횟수 0 으로.
- **끊김(offline) 표시**: 시도 `OFFLINE_AFTER_ATTEMPTS`(기본 6) 회 실패하면 상태를 `offline` 으로 바꿔 "복구하지 못했습니다 + [다시 연결]"을 보인다. 단 재시도는 `MAX_MS` 간격으로 계속한다 (네트워크가 돌아오면 저절로 복구). [다시 연결] 은 즉시 시도.
- **24시간 제한**: 바이낸스가 연결을 닫으면 위와 같은 재연결 길로 처리한다 (미리 갈아타는 타이머는 두지 않음 — 빠진 봉 채우기가 같은 문제를 이미 푼다).
- **복구 후 맞추기** (AC7):
  - 목록: `loadMarkets()` 다시 → 거래대금 순으로 다시 정렬 (재연결 때만 순서가 바뀐다), 사라진 종목 제거.
  - 차트: `planGapFill(series, now)` → 마지막 봉 `openTime` 부터 klines 를 받아 합친다. 빠진 봉이 `KLINES_MAX_LIMIT`(1500, 확인 필요) 를 넘으면 최근 500개로 통째로 다시 받는다.
- **마지막 갱신 시각**: 목록·차트 각각 마지막 메시지 시각을 보관해 멈춤 상태에서 보인다 (AC6).

### 4-6. 요청 제한 (429/418)과 차단 (451)

| 응답 | 처리 | 화면 (02 상태) |
|---|---|---|
| 429 | `RateLimit.blockedUntil = now + 대기`. 대기 = `Retry-After` 헤더(초)를 읽을 수 있으면 그 값, 없으면 `RATE_LIMIT_DEFAULT_MS`(60초) | `ratelimit`: "요청이 너무 많아…" + 헤더를 읽었을 때만 남은 초 (AC21) |
| 418 (IP 차단) | 같은 처리, 기본 대기 `IP_BAN_DEFAULT_MS`(5분) | 같음 |
| 대기 중 | `binanceHttp` 가 네트워크에 나가지 않고 바로 `rateLimited` 오류를 돌려준다. 재연결 시도의 REST 도 대기 끝까지 미룬다 | 목록·차트 값 멈춤 |
| 451 | `blocked`. 자동 재시도하지 않는다 (바뀔 일이 없어서) | `blocked` (AC9) |
| 400 등 klines 실패 | `http`/`badResponse` → 차트만 실패 | `candleerror` + [다시 시도] (AC22) |

- 주의 (미확인): 브라우저는 CORS 로 허용된 응답 헤더만 읽을 수 있다. `Retry-After` 가 노출되는지 확인 못 해 "읽을 수 있으면" 으로 설계했다.
- 알림이 여러 개 겹치면 `pickBanner` 우선순위 하나만 보인다: 차단 > 요청 제한 > 끊김 > 재연결 중 > 목록 실패 > 거래 종료.

### 4-7. 거래 종료 (AC18)

- 목록: exchangeInfo 에서 거래 중이 아닌 종목은 처음부터 뺀다.
- 보던 종목이 도중에 종료되는 것을 **10초 안**에 알아채는 방법: `exchangeInfo` 를 `MARKET_REFRESH_MS`(기본 10초)마다 다시 받아 상태만 비교한다 (가중치가 작다고 알려져 있으나 미확인, 응답 크기도 T002 에서 측정). 종료된 종목은 목록에서 빼고, 보던 종목이면 차트 상태를 `halted` 로 바꿔 실시간 구독을 끊고 마지막 봉은 남긴다.
- T002 측정에서 exchangeInfo 가 너무 크면(기준: 1MB 초과) 대안으로 `!contractInfo` 스트림(종목 상태 변경 알림, 사양 미확인)을 목록 연결에 묶는 방안을 검토한다. 그때 이 절을 고친다.

### 4-8. 확인되지 않은 것과 방어 원칙

| 미확인 | 구현이 하지 않는 가정 | 방어 |
|---|---|---|
| exchangeInfo 의 상태·계약 종류 글자 (`TRADING`, `PERPETUAL` 로 알려짐) | 글자를 코드 여러 곳에 박지 않는다 | `binanceValues.ts`(connection/infrastructure) 한 곳에 상수, 값은 T002 샘플로 확정. 모르는 상태는 "거래 중 아님", 필드가 빠진 종목은 건너뛰고 `console.warn` 1회 |
| ticker/24hr 가중치 | 몇이라고 가정하지 않는다 | 열 때·재연결 때만 호출. 429 가 오면 4-6 처리 |
| `!ticker@arr` 갱신 주기·데이터량·바뀐 종목만 오는지 | 매번 전체가 온다고 가정하지 않는다 | 받은 것만 Map 에 **합친다**. 화면 반영은 최대 `TICKER_FLUSH_MS`(1초)에 한 번. 너무 크면 대안 `!miniTicker@arr` (5절) |
| klines 1회 최대 개수 | 1500 으로 알려짐 | `KLINES_MAX_LIMIT` 상수, 넘으면 최근 500개 다시 받기 |
| WebSocket 메시지 형식 | — | parse* 가 `unknown` 을 검증. 형식이 틀린 메시지는 버리고 경고 (연결은 유지) |
| `Retry-After` 헤더 노출 | — | 4-6 |

## 5. 대안과 장단점

| 안 | 장점 | 단점 | 고르지 않은 이유 |
|---|---|---|---|
| 프레임워크 없는 TS | 의존성 0 | 상태 11개·구독 정리를 손으로 | 4-0 |
| 차트 직접 그리기 (canvas) | 의존성 0, 표기 의무 없음 | 확대·스크롤·십자선·눈금 구현이 가장 오래 걸림 | ADR 0002 |
| 로컬/클라우드 중계 서버 | CORS·헤더 제약 없음, 요청 합치기 가능 | 서버 운영 필요, 클라우드 IP 는 451 위험이 더 큼 (PR/FAQ) | ADR 0001 |
| 목록 가상 스크롤 (보이는 줄만 그리기) | 수천 행도 가벼움 | 코드·의존성 추가, 브라우저 찾기(Ctrl+F) 안 됨 | 수백 행은 CSS `content-visibility: auto` + 행 `memo` 로 충분하다고 판단. T007 성능 측정(AC20)에서 0.2초 멈춤이 나오면 그때 도입 |
| 목록 실시간 재정렬 (02 질문 2 의 B) | 항상 최신 순서 | 행이 움직여 잘못 누름 | 02 추천 A 를 따름 (사용자 결정 항목) |
| `!miniTicker@arr` 로 목록 갱신 | 데이터가 더 작음 | 등락률을 직접 계산해야 함 (24시간 시가 기준) | 지시된 주소가 `!ticker@arr`. 측정해서 무거울 때만 |
| 상태 관리 라이브러리 (Redux 등) | 도구 | 상태가 화면 하나·훅 몇 개라 과함 | 과설계 |
| 연결 24시간 전에 미리 갈아타기 | 빈틈 없는 전환 | 타이머·이중 연결 코드 | 빠진 봉 채우기로 같은 결과 |

## 6. 공통 관심사

| 항목 | 내용 |
|---|---|
| 보안·개인정보 | ① 비밀값 없음: 키·토큰·환경 변수 0개 (`VITE_*` 도 안 씀). 저장소를 공개해도 새는 것이 없다. ② 검색어·바이낸스 응답 글자는 React 글자 노드로만 넣는다. `innerHTML`·`dangerouslySetInnerHTML` 금지 (`react/no-danger` 린트). ③ 주소에 넣는 기호는 `Market` 규칙(`^[A-Z0-9]{2,30}$`)을 통과한 목록 값만 쓰고 쿼리는 `URLSearchParams` 로 만든다. ④ `fetch` 는 `credentials: 'omit'`, 개인정보·쿠키 없음. ⑤ `index.html` 에 CSP: `connect-src https://fapi.binance.com wss://fstream.binance.com; script-src 'self'` (개발 서버용 예외는 T010 에서 확인). 의존성은 react, react-dom, lightweight-charts 3개 + 개발 도구, lockfile 고정 |
| 성능·용량 | 목록 수백 행: 행 `memo`(기호·가격·등락 값이 같으면 다시 그리지 않음) + `content-visibility: auto`. 시세 반영은 1초에 1번. 차트는 봉 하나 들어올 때 `series.update` 만 (전체 `setData` 는 로드·채우기 때만). `CANDLE_CAP` 2000 으로 1시간 이상 켜 둬도 메모리 일정 (AC11) |
| 동시성 | 종목을 빨리 바꿀 때: 이전 요청 `abort` + 이전 소켓 close + Selection 불일치 메시지 버림. 목록 재조회가 겹치면 진행 중 요청이 있을 때 새로 보내지 않음 |
| 오류·복구 | `FeedError` 종류별로 4-5·4-6 처리. 사용자 문구는 `messages.ts`, 상세(코드·주소)는 `console.warn`. 빈 `catch` 금지. 렌더 오류는 최상위 Error Boundary 가 "화면 오류, 새로고침" 표시 |
| 관측(로그·지표) | 개발 도구 콘솔 경고만 (형식 오류·모르는 상태 값·429). 수집 서버 없음 |
| 되돌리기(롤백) | 정적 앱, 저장 데이터 없음 → 이전 커밋으로 되돌리면 끝 |
| 호환성 | 최신 Chrome/Edge PC 기준. 옛 데이터 없음. 바이낸스 응답 형식 변경은 parse* + 샘플 시험이 먼저 깨지게 |
| 비용 | 0 (공개 시세, 서버 없음) |

## 7. 시험 전략

바이낸스 응답은 `src/test-fixtures/binance/` 의 **고정 샘플 JSON** 으로만 시험한다. 실제 네트워크 시험은 하지 않는다. 시계는 `vi.useFakeTimers`, 난수는 인자로 고정값.

**도메인 단위 시험 (이름 = 업무 문장)**
- 종목 목록
  - 거래 중인 무기한 종목만 목록에 들어간다
  - 모르는 상태 값의 종목은 목록에서 뺀다
  - 필드가 빠진 종목은 건너뛰고 나머지는 보인다
  - 응답에 새 종목이 추가되면 코드 수정 없이 목록에 나온다 (AC19)
  - 목록은 24시간 거래대금이 큰 순이고, 같으면 기호 순이다
  - 실시간 시세가 와도 목록 순서는 바뀌지 않고 값만 바뀐다
  - 목록에 없는 기호의 시세는 무시한다
- 검색
  - `pepe` 로 찾으면 `1000PEPEUSDT` 가 나온다 (대소문자 무관, 포함 일치)
  - 일치가 없으면 빈 결과다 / 검색어가 비거나 공백뿐이면 전체 목록이다
- 1000배 단위
  - `1000PEPEUSDT` 는 1000배 단위, `1000000MOGUSDT` 는 100만 배 단위, `BTCUSDT` 는 해당 없음
- 봉
  - 같은 시작 시각의 봉이 오면 교체하고 개수는 그대로다
  - 다음 시작 시각의 봉이 오면 뒤에 하나 붙는다 (AC4)
  - 지난 시작 시각의 봉은 무시한다
  - 다른 종목·간격의 실시간 봉은 반영하지 않는다 (AC15)
  - 상한을 넘으면 가장 오래된 봉부터 버린다
  - 끊긴 동안의 봉을 채우면 시작 시각이 간격만큼 연속이다 (AC7)
  - 빠진 봉이 한 번에 받을 수 있는 수보다 많으면 최근 500개를 다시 받는다
  - 표시 자릿수는 가격 단위에서 정한다 (0.00001 → 소수 5자리)
- 연결·요청 제한
  - 재연결 간격은 1초에서 두 배씩 늘고 15초를 넘지 않는다
  - 첫 메시지를 받으면 재연결 간격이 처음으로 돌아간다
  - 6번 실패하면 '연결 끊김'이 되고 재시도는 계속한다
  - 429 를 받으면 대기 시간이 끝날 때까지 요청을 보내지 않는다 (AC21)
  - 대기 시간 헤더가 없으면 기본 60초를 기다리고 남은 시간은 보이지 않는다
  - 451 은 차단으로 분류하고 다시 시도하지 않는다 (AC9)
  - 알림이 겹치면 차단이 요청 제한보다 먼저 보인다
- 시간
  - 봉 시각은 한국 시간으로 표시한다 (UTC 00:00 → 09:00, AC5)

**통합·화면 시험 (가짜 feed·가짜 소켓)**
- 종목을 10번 바꾼 뒤 열린 차트 소켓은 1개다, 간격을 바꿔도 같다 (AC16)
- 종목 전환 직후 늦게 온 이전 종목 klines 응답은 화면에 그려지지 않는다 (AC15)
- `offline` 사건 후 5초 안에 '재연결 중'과 마지막 갱신 시각이 보인다 (AC6)
- 보던 종목이 목록 재조회에서 사라지면 '거래 종료' 알림과 함께 구독이 끊긴다 (AC18)
- klines 실패 시 문구와 [다시 시도]가 보이고, 다른 종목을 누르면 정상이 된다 (AC22)

**사람이 보는 시험 (QA)**: AC1·2·3·8·11·12·17·20 (실제 연결·시간·성능 측정), AC10 (화면·네트워크 탭).

## 8. 결정 기록

- `docs/adr/0001-서버-없이-브라우저가-바이낸스를-직접-부른다.md`
- `docs/adr/0002-차트는-lightweight-charts-v5-를-쓴다.md`

## 9. 검토 기록

| 검토자 | 의견 | 반영 |
|---|---|---|
| principles-reviewer | | |
| security-reviewer | | |

## 10. 작업 목록

각 작업 = PR 한 번. 경로 기준 `C:\Users\KUP\Desktop\applications\stock-viewer\`. 모든 작업 공통 완료 조건: 린트·타입 검사·시험 통과.

```
T001 ─┬─ T002 ─┬─ T004 ─┐
      │        └─ T005 ─┤
      └─ T003 ──────────┼─ T006 ─┐
                        └─ T007 ─┼─ T008 ─ T009 ─ T010
```

| ID | 할 일 | 선행 | 고칠 파일 | 완료 조건 |
|---|---|---|---|---|
| T001 | 뼈대: Vite + React + TS + Vitest + oxlint, tsconfig(4-0), 색 토큰, 빈 2단 레이아웃(목록 340px + 차트), 바닥 문구, README(실행·시험 방법) | — | `package.json`, `tsconfig.json`, `.oxlintrc.json`, `vite.config.ts`, `index.html`, `src/app/main.tsx`, `src/app/App.tsx`, `src/app/layout.css`, `src/shared/ui/tokens.css`, `src/shared/ui/messages.ts`, `README.md` | `npm run dev`·`npm test`·`npm run lint` 동작. 화면에 주문·로그인·키 칸 없음 (AC10). 1280px 에서 두 영역이 잘리지 않음 (AC12 뼈대) |
| T002 | 샘플 수집·측정 + HTTP 경계: 실제 응답을 줄여 샘플 저장(exchangeInfo 는 BTCUSDT·1000PEPEUSDT·비거래 종목 포함 5개 안팎, ticker/24hr, klines, `!ticker@arr`·kline 메시지). 1분 측정(메시지 주기·크기, exchangeInfo 크기)을 4-8 표에 기록. `binanceEndpoints`·`binanceValues`·`binanceHttp`·`FeedError`·`RateLimit` | T001 | `src/test-fixtures/binance/*.json`, `src/features/connection/domain/FeedError.ts`, `.../domain/RateLimit.ts`, `.../infrastructure/binanceEndpoints.ts`, `.../infrastructure/binanceValues.ts`, `.../infrastructure/binanceHttp.ts`, 시험 파일, `docs/03-tech-design.md`(측정값) | 451→차단, 429·418→대기, 대기 중 요청 0건 시험 통과 (AC9, AC21 로직). 상태 글자·주기 값이 샘플 근거로 문서에 적힘. 에이전트 환경에서 451 이면 사용자가 브라우저로 받은 파일을 쓴다 |
| T003 | 재연결 소켓: `backoffDelay`, `nextConnectionStatus`, `ReconnectingSocket`(무응답 감시·`online`/`offline` 사건·close 시 재시도·명시적 닫기) | T001 | `src/features/connection/domain/ConnectionStatus.ts`, `.../domain/nextConnectionStatus.ts`, `.../domain/backoffDelay.ts`, `.../infrastructure/ReconnectingSocket.ts`, 시험 파일 | 7절 연결 시험 통과. 닫은 소켓은 다시 열리지 않음 (AC16 바탕), 가짜 시계로 offline 후 5초 안 상태 변경 (AC6 로직) |
| T004 | 종목 도메인 + 파싱: `Market`, `MarketList`, `Ticker`, `searchMarkets`, `unitMultiplier`, parse 3종 | T002 | `src/features/market/domain/*.ts`, `src/features/market/infrastructure/parse*.ts`, 시험 파일 | 7절 종목·검색·1000배 시험 통과 (AC13·14·18 필터·19 로직) |
| T005 | 봉 도메인 + 파싱: `Interval`, `Candle`, `CandleSeries`, `Selection`, `planGapFill`, `parseKlines`, `parseKlineStream`, `formatKst`, 자릿수 계산 | T002 | `src/features/chart/domain/*.ts`, `src/features/chart/infrastructure/parse*.ts`, `src/shared/ui/formatKst.ts`, 시험 파일 | 7절 봉·시간 시험 통과 (AC4·5·7·8 로직) |
| T006 | 목록 화면: `MarketFeed` port + `BinanceMarketFeed`, `useMarkets`, `MarketPanel`·`MarketRow`·`SearchBox`, 목록 상태 loading·empty·listerror·nomatch, 1000배 안내 | T003, T004 | `src/features/market/application/MarketFeed.ts`, `.../infrastructure/BinanceMarketFeed.ts`, `.../ui/*.tsx`, `.../ui/useMarkets.ts`, `src/app/App.tsx` | 실제 연결로 5초 안 목록 표시·행 수 = 샘플 기준 거래 중 무기한 수 (AC13), 검색 4가지 (AC14), 가격이 움직임 (AC17), 300행 이상 스크롤·타이핑 시 0.2초 넘는 멈춤 없음 (AC20, 실패하면 가상 스크롤 도입을 이 작업에서) |
| T007 | 차트 화면: `CandleFeed` port + `BinanceCandleFeed`, `useCandles`(abort·정리), `CandleChart`(Lightweight Charts v5, 캔들+거래량, KST 형식, TradingView 표기), `ChartHeader`, `IntervalBar`, `CandleInfoLine`, 차트 상태 loading·candleerror(+다시 시도) | T003, T005 | `src/features/chart/application/CandleFeed.ts`, `.../infrastructure/BinanceCandleFeed.ts`, `.../ui/*.tsx`, `.../ui/useCandles.ts`, `src/app/App.tsx` | BTCUSDT 1m 500봉 + 거래량 5초 안 (AC1), 간격 3초 안 전환·종목 바꿔도 유지 (AC2), 진행 봉 움직임 (AC3), 말풍선 KST (AC5), 목록 클릭으로 전환·이전 값 없음 (AC15), 10번 전환 후 차트 소켓 1개 시험 (AC16), 실패 문구·재시도 (AC22) |
| T008 | 연결 상태 화면과 복구: `useConnectionStatus`, `pickBanner`, `StatusBanner`·`StatusChip`, 마지막 갱신 시각, 재연결 후 목록 재조회·빠진 봉 채우기, 요청 제한·차단 표시 | T006, T007 | `src/features/connection/domain/pickBanner.ts`, `.../ui/*.tsx`, `.../ui/useConnectionStatus.ts`, `src/features/market/ui/useMarkets.ts`, `src/features/chart/ui/useCandles.ts`, `src/app/App.tsx` | 끊기 5초 안 '재연결 중'+마지막 갱신 시각 (AC6), 복귀 30초 안 '연결됨'·봉 연속 (AC7), 451 문구 (AC9), 429 문구·요청 멈춤 (AC21), 1시간 연속 동작 (AC11) |
| T009 | 거래 종료: 10초 주기 exchangeInfo 상태 비교, 목록에서 제거, 보던 종목 `halted`(구독 끊고 마지막 봉 유지) | T008 | `src/features/market/ui/useMarkets.ts`, `src/features/market/domain/MarketList.ts`, `src/features/chart/ui/useCandles.ts`, `src/features/chart/ui/ChartPanel.tsx`, 시험 파일 | 상태를 바꾼 샘플로 10초 안 알림·갱신 멈춤·다른 종목 선택 가능 (AC18). T002 측정에서 exchangeInfo 가 1MB 초과면 4-7 대안으로 설계 변경을 먼저 요청 |
| T010 | 마무리: CSP, 900px 미만 세로 쌓기, 접근성(`role=status`, `aria-pressed`, label), README 갱신, AC 전체 자가 점검 | T009 | `index.html`, `src/app/layout.css`, `README.md`, 해당 ui 파일 | AC10·AC12 확인, 3종목 닫힌 봉 10개 REST 대조 (AC8), QA 에 넘길 AC 점검표 작성 |
