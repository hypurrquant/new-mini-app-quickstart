# Pool Cache System

**서버리스 환경에서 효율적인 Pool 발견 전략**

## 구조

### 1. 즉시 조회 (Whitelist)
- `lib/poolWhitelist.ts`: 주요 Pool 13개를 하드코딩
- 지갑 연결 즉시 Gauge 스테이킹 조회 시작

### 2. 동적 확장 (Cache)
- `scripts/build-pool-cache.ts`: Factory `PoolCreated` 이벤트 크롤러
- `public/pool-cache.json`: 정적 JSON 파일 (CDN 배포)
- GitHub Actions로 6시간마다 자동 업데이트

### 3. 온디맨드 폴백
- 캐시에 없는 Pool은 API 요청 시 Factory로 역산
- Transfer 로그 스캔으로 사용자 과거 포지션 추적

## 사용법

### 로컬 테스트
```bash
npm install
npm run build-pool-cache  # public/pool-cache.json 생성
npm run dev
```

### 프로덕션 배포
1. GitHub Actions 활성화 (`.github/workflows/update-pool-cache.yml`)
2. Vercel 환경변수 설정:
   - `NEXT_PUBLIC_ROOT_URL`: 배포된 도메인 (예: `https://yourapp.vercel.app`)
   - `NEXT_PUBLIC_BASE_RPC_URL` (선택): 커스텀 RPC
3. GitHub Actions가 자동으로 캐시 업데이트 → 커밋 → Vercel 재배포

### 수동 캐시 업데이트
```bash
# 로컬에서 실행 후 커밋
npm run build-pool-cache
git add public/pool-cache.json
git commit -m "chore: update pool cache"
git push
```

## 성능

- **Whitelist만**: ~13개 Pool → ~10개 Gauge → 멀티콜 3회
- **Cache 포함**: ~113개 Pool (Whitelist + Top 100) → ~90개 Gauge → 멀티콜 3회
- **전체 스캔**: 사용자별 필요 시 Transfer 로그 스캔 (최대 5M 블록)

## 확장

- `lib/poolWhitelist.ts`에 Pool 추가 (TVL 상위권 우선)
- `scripts/build-pool-cache.ts`의 `DEPLOY_BLOCK` 조정으로 스캔 범위 최적화
- GitHub Actions 주기 변경: `.github/workflows/update-pool-cache.yml`의 `cron` 수정

## 디버깅

```bash
# API 디버그 모드
curl "http://localhost:3000/api/cl-positions?owner=0x...&debug=1" | jq .debug

# 예상 출력 단계
# - gauge.poolKeys.total: 화이트리스트 + 캐시 합계
# - gauge.cache.loaded: 캐시에서 로드한 Pool 수
# - gauge.discovery.pools: Factory에서 확인된 실제 Pool 수
# - gauge.discovery.gauges: Pool에서 발견한 Gauge 수
# - gauge.stakedValues: 사용자 스테이킹 NFT 수
```

