# 용어집

> 업무 용어와 코드 이름을 1:1 로 맞춘다 (DDD 공통 언어). 코드에 새 이름을 만들기 전에 여기부터 고친다.
> 원칙 검수가 코드 이름이 이 표와 같은지 확인한다.

| 업무 용어 | 코드 이름 | 뜻 | 단위·범위 | 처음 나온 곳 |
|---|---|---|---|---|
| 종목 | `Market` | 거래 중인 USDⓈ-M 무기한 선물 하나. 기호·가격 단위를 가진다 | 기호 `^[A-Z0-9]{2,30}$` | docs/03-tech-design.md |
| 기호 | `symbol` | 바이낸스가 주는 종목 이름 (예: `BTCUSDT`, `1000PEPEUSDT`). 코드에 박지 않는다 | 대문자·숫자 | docs/01-pr-faq.md |
| 종목 목록 | `MarketList` | 화면 왼쪽 목록. 받은 시점의 24시간 거래대금 내림차순 | 중복 없음 | docs/03-tech-design.md |
| 시세 | `Ticker` | 종목의 현재가·24시간 등락률·24시간 거래대금 | 등락률 %, 거래대금 USDT 등 호가 자산 | docs/03-tech-design.md |
| 24시간 거래대금 | `quoteVolume` | 최근 24시간 거래 금액 (호가 자산 기준). 목록 정렬 기준 | ≥ 0 | docs/01-pr-faq.md |
| 1000배 단위 | `unitMultiplier` | 기호 앞의 `1000…` 배수. 가격이 코인 1개 가격의 그 배수로 보인다 | 1000, 1000000 … 또는 없음 | docs/02-design.md |
| 가격 단위 | `tickSize` | 가격이 움직이는 최소 폭. 표시 자릿수를 정한다 | 예: 0.1, 0.00001 | docs/03-tech-design.md |
| 간격 | `Interval` | 봉 하나의 시간 폭 | `1m 5m 15m 1h 4h 1d` | docs/01-pr-faq.md |
| 봉 | `Candle` | 한 간격의 시가·고가·저가·종가·거래량. 시작 시각으로 식별 | 시각은 UTC ms | docs/01-pr-faq.md |
| 진행 중 봉 | `LiveCandle` | 아직 닫히지 않은 맨 오른쪽 봉 (실시간으로 바뀜) | — | docs/01-pr-faq.md |
| 봉 목록 | `CandleSeries` | 시작 시각 오름차순·중복 없는 봉 모음 | 최대 `CANDLE_CAP` | docs/03-tech-design.md |
| 선택 | `Selection` | 지금 차트에 보이는 기호 + 간격 | — | docs/03-tech-design.md |
| 빠진 봉 채우기 | `planGapFill` | 재연결 후 끊긴 동안의 봉을 다시 받아 합치는 계획 | — | docs/03-tech-design.md |
| 연결 상태 | `ConnectionStatus` | 연결 중 / 실시간 / 재연결 중 / 끊김 | `connecting live reconnecting offline` | docs/02-design.md |
| 재연결 간격 | `backoffDelay` | 다음 재연결 시도까지 기다리는 시간 (두 배씩, 상한 있음) | ms | docs/03-tech-design.md |
| 요청 제한 | `RateLimit` | 429/418 을 받은 뒤 요청을 멈추는 대기 상태 | `blockedUntil` (ms) | docs/01-pr-faq.md |
| 시세 오류 | `FeedError` | 바이낸스 요청 실패의 종류 | `blocked rateLimited badResponse network http` | docs/03-tech-design.md |
| 차단 | `blocked` | 451 — 이 지역·네트워크에서 시세를 받을 수 없음 | — | docs/01-pr-faq.md |
| 거래 종료 | `halted` | 보던 종목이 거래 중이 아니게 됨. 마지막 봉은 남기고 실시간을 멈춤 | — | docs/01-pr-faq.md |
| 시세 공급원 | `MarketFeed`, `CandleFeed` | 바이낸스 목록·봉을 받아오는 경계 (port). 시험에서 가짜로 바꾼다 | — | docs/03-tech-design.md |
