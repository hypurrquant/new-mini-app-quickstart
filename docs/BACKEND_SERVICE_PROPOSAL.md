# Backend Service Architecture Proposal

## 왜 별도 백엔드 서비스가 필요한가?

### 현재 문제점
1. **Next.js API Route의 한계**
   - 긴 요청 시간 (블록체인 RPC 호출 포함)
   - 서버리스 함수 타임아웃 제한 (Vercel: 10초, AWS Lambda: 15초)
   - 메모리/CPU 제한
   - 콜드 스타트 문제

2. **블록체인 상호작용의 특성**
   - 다수의 RPC 호출 필요
   - 외부 API 의존성 (가격 정보, 서브그래프)
   - 복잡한 계산 (APR, USD 변환)
   - 장기 실행 작업 필요

3. **확장성 문제**
   - 사용자 증가 시 RPC 호출 비용 급증
   - 동시 요청 처리 제한
   - 캐싱 전략 구현 어려움

## Rust vs Python 비교

### Rust의 장점
✅ **성능**
- 매우 빠른 실행 속도
- 낮은 메모리 사용량
- 동시성 처리 우수 (tokio)

✅ **블록체인 생태계**
- ethers-rs: 강력한 Ethereum 라이브러리
- alloy-rs: 차세대 Rust Ethereum 라이브러리
- 좋은 타입 안정성

✅ **운영**
- 단일 바이너리 배포
- 메모리 안전성
- 예측 가능한 성능

### Rust의 단점
❌ **개발 속도**
- 학습 곡선이 가파름
- 개발 시간이 더 오래 걸림
- 에러 메시지가 복잡할 수 있음

❌ **생태계**
- JavaScript/TypeScript 생태계와의 통합 필요
- 일부 라이브러리 미성숙

### Python의 장점
✅ **개발 속도**
- 빠른 프로토타이핑
- 풍부한 라이브러리
- 쉬운 학습 곡선

✅ **블록체인 생태계**
- web3.py: 성숙한 라이브러리
- brownie: 개발 도구
- 많은 예제와 문서

✅ **데이터 처리**
- pandas, numpy: 데이터 분석 용이
- ML 라이브러리 접근 가능

### Python의 단점
❌ **성능**
- Rust보다 느림 (하지만 충분히 빠름)
- GIL 제약 (async/await로 해결 가능)

❌ **타입 안정성**
- 런타임 에러 가능성
- 타입 힌팅 필요

## 추천: Rust (성능이 중요한 경우)

### 이유
1. **블록체인 RPC 호출 최적화**
   - 다수의 병렬 호출 필요
   - 낮은 레이턴시가 중요
   - Rust의 동시성이 유리

2. **장기 실행 작업**
   - 백그라운드 작업 처리
   - 이벤트 리스너
   - 웹소켓 연결 유지

3. **리소스 효율성**
   - 서버 비용 절감
   - 더 많은 동시 요청 처리

### 아키텍처 제안

```
┌─────────────┐
│  Next.js    │
│  Frontend   │
└──────┬──────┘
       │ HTTP/REST
       │ (또는 gRPC)
       ▼
┌─────────────────────────────────────┐
│     Rust Backend Service            │
│  ┌───────────────────────────────┐   │
│  │  API Layer (axum/actix-web)  │   │
│  └───────────┬───────────────────┘   │
│              │                        │
│  ┌───────────▼───────────────────┐   │
│  │  Business Logic Layer         │   │
│  │  - Position Fetcher           │   │
│  │  - APR Calculator             │   │
│  │  - Price Aggregator           │   │
│  └───────────┬───────────────────┘   │
│              │                        │
│  ┌───────────▼───────────────────┐   │
│  │  Data Layer                   │   │
│  │  - Redis Cache                │   │
│  │  - PostgreSQL (optional)      │   │
│  │  - Blockchain RPC Client      │   │
│  │  - External API Clients       │   │
│  └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 구현 예시 (Rust)

### 기술 스택
- **Web Framework**: `axum` (async, 성능 우수)
- **Blockchain**: `alloy-rs` 또는 `ethers-rs`
- **Cache**: `redis` (crate)
- **Database**: `sqlx` (PostgreSQL)
- **Async Runtime**: `tokio`
- **HTTP Client**: `reqwest`

### 주요 API 엔드포인트

```rust
// GET /api/v1/positions/summary?owner=0x...
// 빠른 응답: 기본 정보만
{
  "positions": [
    {
      "tokenId": "123",
      "pair": "WETH/USDC",
      "valueUSD": "1000.50",
      "isActive": true,
      "isStaked": false
    }
  ]
}

// GET /api/v1/positions/:tokenId/details
// 상세 정보: 필요 시 로드
{
  "tokenId": "123",
  "apr": "15.5%",
  "earnedAmountUSD": "50.25",
  "rewards": {...},
  "fees": {...}
}

// WebSocket: /ws/positions/:tokenId
// 실시간 업데이트
```

### 성능 최적화 전략

1. **병렬 처리**
```rust
use tokio::join;

// 여러 RPC 호출을 병렬로 처리
let (positions, prices, rewards) = join!(
    fetch_positions(owner),
    fetch_prices(token_addresses),
    fetch_rewards(token_ids)
);
```

2. **캐싱 전략**
```rust
// Redis 캐싱
let cache_key = format!("positions:{}:{}", owner, timestamp);
if let Some(cached) = redis.get(&cache_key).await? {
    return Ok(cached);
}
```

3. **백그라운드 작업**
```rust
// 주기적 데이터 동기화
tokio::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(60));
    loop {
        interval.tick().await;
        sync_positions().await;
    }
});
```

## 대안: Python (빠른 개발이 필요한 경우)

### 기술 스택
- **Web Framework**: `FastAPI` (자동 문서화, 타입 힌팅)
- **Blockchain**: `web3.py`
- **Cache**: `redis-py`
- **Database**: `SQLAlchemy`
- **Async**: `asyncio`, `aiohttp`

### FastAPI 예시
```python
from fastapi import FastAPI
from web3 import AsyncWeb3

app = FastAPI()

@app.get("/api/v1/positions/summary")
async def get_positions_summary(owner: str):
    # 비동기 처리
    positions = await fetch_positions(owner)
    return {"positions": positions}
```

## 마이그레이션 전략

### Phase 1: 프로토타입
1. 간단한 Rust/Python 서비스 구현
2. 기본 포지션 조회 API 구현
3. Next.js에서 새 API 호출

### Phase 2: 기능 이전
1. 점진적으로 기능 이전
2. Next.js API는 프록시 역할
3. A/B 테스트로 검증

### Phase 3: 완전 이전
1. 모든 기능 이전 완료
2. Next.js API 제거
3. 독립 서비스로 운영

## 배포 옵션

### Rust
- **Docker**: 단일 바이너리 컨테이너
- **Railway/Render**: 쉽게 배포
- **AWS ECS/Fargate**: 확장 가능
- **Kubernetes**: 프로덕션 환경

### Python
- **Docker**: 표준 컨테이너
- **Railway/Render**: 쉽게 배포
- **Fly.io**: 글로벌 배포
- **AWS Lambda**: 서버리스 (짧은 작업)

## 결론

### Rust 추천 케이스
- ✅ 성능이 중요
- ✅ 장기 운영 계획
- ✅ 높은 동시성 필요
- ✅ 서버 비용 절감 필요

### Python 추천 케이스
- ✅ 빠른 프로토타이핑
- ✅ 팀이 Python에 익숙
- ✅ 데이터 분석 기능 필요
- ✅ 빠른 기능 개발 우선

## 최종 추천

**Rust로 시작하는 것을 추천합니다.**

이유:
1. 블록체인 데이터 처리는 성능이 중요
2. 장기적으로 유지보수 비용 절감
3. 확장성 확보
4. 메모리 안전성으로 운영 안정성 향상

하지만 빠른 프로토타이핑이 필요하다면 **Python (FastAPI)**도 좋은 선택입니다.

