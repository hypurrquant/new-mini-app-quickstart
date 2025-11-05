# Architecture Improvements

## 현재 구조의 문제점

### 1. 단일 거대한 API 엔드포인트
- `/api/cl-positions`가 모든 것을 처리
  - 블록체인 RPC 호출 (다수 multicall)
  - 외부 API 호출 (가격 정보, 서브그래프)
  - 복잡한 계산 (APR, USD 변환 등)
  - 23KB+ 응답 크기

### 2. 프론트엔드 부담
- 30초마다 전체 데이터 새로고침
- 필요한 데이터만 로드하지 않음
- 점진적 로딩 없음
- 큰 응답을 파싱하는 비용

### 3. 캐싱 부족
- 가격 정보는 일부 캐시되지만 포지션 데이터는 매번 새로 계산
- 서버사이드 캐싱 전략 부족
- 블록체인 데이터는 자주 변하지 않는데 매번 조회

### 4. 확장성 문제
- 사용자가 많아지면 RPC 호출 비용 증가
- 외부 API 호출 제한에 취약
- 응답 시간이 포지션 수에 비례해서 증가

## 개선 방안

### 1. API 분리 (Layered Architecture)

#### Tier 1: 핵심 데이터 (즉시 필요)
```
GET /api/positions/summary?owner=0x...
```
- 포지션 목록 (tokenId, pair, value, status)
- 빠른 응답 (캐시 가능)
- 크기: ~2-5KB

#### Tier 2: 상세 데이터 (필요 시 로드)
```
GET /api/positions/:tokenId/details
```
- APR, rewards, fees 등 상세 정보
- 클릭 시 또는 스크롤 시 로드
- 크기: ~1-2KB per position

#### Tier 3: 실시간 데이터 (업데이트 필요 시)
```
GET /api/positions/:tokenId/prices
WebSocket /api/positions/:tokenId/stream
```
- 가격 변동, 실시간 rewards
- WebSocket 또는 Server-Sent Events

### 2. 점진적 로딩 (Progressive Loading)

```typescript
// 1단계: 기본 목록만 로드
const { data: summary } = usePositionsSummary(ownerAddress);

// 2단계: 표시되는 포지션만 상세 정보 로드
const { data: details } = usePositionDetails(tokenId, {
  enabled: isVisible
});

// 3단계: 실시간 업데이트 (선택적)
usePositionStream(tokenId, {
  enabled: isExpanded
});
```

### 3. 서버사이드 캐싱 전략

#### Redis 캐싱
```typescript
// 캐시 키 전략
- positions:summary:{owner}:{timestamp} (5분 캐시)
- positions:details:{tokenId}:{timestamp} (1분 캐시)
- prices:{tokenAddress}:{timestamp} (1분 캐시)
- pools:{poolAddress}:{timestamp} (5분 캐시)
```

#### 데이터베이스 저장
```typescript
// 자주 조회하는 데이터는 DB에 저장
- 포지션 메타데이터 (pair, tickSpacing 등)
- 히스토리컬 데이터 (가격, APR 등)
- 사용자별 포지션 목록
```

### 4. 백그라운드 작업 (Background Jobs)

```typescript
// 주기적 업데이트 (Cron Job)
- 가격 정보 업데이트 (1분마다)
- 포지션 데이터 동기화 (5분마다)
- APR 계산 (10분마다)

// 이벤트 기반 업데이트
- 블록체인 이벤트 리스너
- 포지션 변경 감지
- 실시간 알림
```

### 5. API 최적화

#### 배치 처리
```typescript
// 여러 포지션을 한 번에 조회
POST /api/positions/batch
{
  "tokenIds": ["1", "2", "3"],
  "fields": ["value", "apr", "rewards"]
}
```

#### 필드 선택
```typescript
// 필요한 필드만 요청
GET /api/positions/summary?owner=0x...&fields=tokenId,pair,value
```

### 6. 프론트엔드 최적화

#### React Query 활용
```typescript
// 캐싱 및 자동 리프레시
const { data } = useQuery({
  queryKey: ['positions', ownerAddress],
  queryFn: () => fetchPositionsSummary(ownerAddress),
  staleTime: 5 * 60 * 1000, // 5분
  refetchInterval: 30 * 1000, // 30초
});
```

#### 가상화 (Virtualization)
```typescript
// 많은 포지션이 있어도 성능 유지
import { useVirtualizer } from '@tanstack/react-virtual';
```

## 구현 우선순위

### Phase 1: 즉시 개선 (Quick Wins)
1. ✅ API 응답 분리 (summary vs details)
2. ✅ 서버사이드 캐싱 추가
3. ✅ 필드 선택 옵션 추가

### Phase 2: 중기 개선 (Medium Term)
1. 점진적 로딩 구현
2. Redis 캐싱 도입
3. 데이터베이스 저장

### Phase 3: 장기 개선 (Long Term)
1. WebSocket 실시간 업데이트
2. 백그라운드 작업 시스템
3. 이벤트 기반 업데이트

## 예상 효과

### 성능 향상
- 초기 로딩 시간: 2-3초 → 0.5-1초
- 응답 크기: 23KB → 2-5KB (초기)
- 서버 부하: 70% 감소

### 사용자 경험
- 더 빠른 초기 로딩
- 필요한 데이터만 로드
- 더 부드러운 인터랙션

### 확장성
- 더 많은 사용자 처리 가능
- RPC 호출 비용 절감
- 외부 API 제한 대응

