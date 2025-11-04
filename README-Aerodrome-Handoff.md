# 🧭 Project Handoff Document — Aerodrome LP Share Mini App (MVP)

## 📌 프로젝트 개요

- **프로젝트명**: Aerodrome LP Share Mini App (MVP)
- **목표**: 사용자가 보유한 Aerodrome LP 포지션을 한눈에 조회하고, 공유 링크로 다른 사람에게 보여줄 수 있는 미니 앱 제작
- **현재 단계**: Read-only MVP (복사 / copy-LP 기능 미구현)

---

## 🎯 핵심 기능 요약

| 역할 | 기능 | 설명 |
|---|---|---|
| Creator (공유자) | LP 토큰 주소 추가 | Aerodrome LP 토큰 주소를 입력해 목록에 추가 |
|  | LP 정보 조회 | token0/token1, symbol, balance 표시 |
|  | 공유 링크 생성 | `?view=<owner>&lp=<lp1>,<lp2>,...` 형태의 URL 생성 |
| Viewer (조회자) | 공유 링크로 보기 | Creator가 만든 링크를 열면 LP 잔고와 페어 정보 조회 |
| 공통 | 지갑 연결 | Base Mainnet(Chain ID: 8453) 자동 감지 및 스위치 유도 |

---

## ⚙️ 기술 스택

- **Frontend**: React + Tailwind + ethers.js
- **Icons**: lucide-react
- **Network**: Base mainnet (chainId = 8453)
- **Infra**: No backend / No database — 완전 클라이언트 기반
- **배포**: Vercel 및 Base Mini App 런타임 대상

---

## 🧩 주요 코드 구성(안)

단일 파일 MVP로 시작해도 되며, 아래와 같은 핵심 훅/함수를 포함합니다.

### 주요 훅/함수

| 함수명 | 설명 |
|---|---|
| `getProviderEnsured()` | Base mainnet 연결 보장 (없으면 MetaMask 네트워크 스위치 유도) |
| `readPairInfo()` | Aerodrome Pair 컨트랙트에서 `token0()`, `token1()`, `symbol()` 조회 |
| `readLpBalance()` | ERC20 `balanceOf(address)`로 LP 잔고 조회 |
| `fetchPortfolio()` | LP 목록 순회하며 LP 정보/잔고 병합 후 UI 렌더링 |
| `shareUrl` | Creator 주소와 LP 목록을 기반으로 공유 URL 생성 |
| `useQuery()` | 공유 링크 파라미터(`view`, `lp`) 파싱용 훅 |

---

## 🧠 동작 시나리오

### Creator Mode
1. MetaMask 연결(Base)
2. Aerodrome LP 주소를 하나 이상 추가
3. “Refresh” → 각 LP의 balance/token symbol/token0/token1 조회
4. “Share Link” 생성 → 복사/공유

### Viewer Mode
1. 공유 링크 클릭 (예: `...?view=0x123&lp=0xabc,0xdef`)
2. LP 정보 자동 로드
3. Read-only UI로 표시 (지갑 연결 필요 없음)

---

## 🚀 실행 방법

```bash
git clone <repo_url>
cd aerodrome-lp-share
npm install
npm run dev
```

필요 패키지:

```bash
npm install ethers lucide-react
```

Base Mainnet 연결 필요:
- Chain ID: `8453`
- RPC: `https://mainnet.base.org`

환경변수(예시):

```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=<OnchainKit 키>
NEXT_PUBLIC_ROOT_URL=http://localhost:3000     # 배포 후 프로덕션 도메인으로 변경
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

> OnchainKit 키 발급: `https://build.base.org` → OnchainKit → API Keys → Create key (Allowed Origins 설정 권장)

---

## 🧱 구조 설계 (확장 대비)

| 모듈 | 역할 | 차후 확장 계획 |
|---|---|---|
| LP Reader | ERC20 + Pair 조회 | Subgraph 기반 가격/TVL/APR 추가 |
| Share Link | Query Params 기반 공유 | Registry 스마트컨트랙트 저장 (onchain) |
| Viewer | URL 로드 후 표시 | Copy-LP 실행 버튼 (mint flow 연결) |
| Wallet | Base 체인 자동 스위치 | WalletConnect 추가 예정 |

---

## 🪙 차후 로드맵

### ✅ Phase 1 (현재)
- LP 읽기 / 잔고 표시
- 공유 링크 생성
- Viewer 모드

### 🔜 Phase 2
- Copy-LP 버튼: 동일 비중 LP 자동 공급
- APR/수익 데이터 표시 (Subgraph)
- 사용자 프로필 페이지 (내 포지션/공유 링크 목록)
- Gauge 보상 표시 (Aerodrome Gauge 연동)

---

## 🧰 참고 사항

- Aerodrome LP는 Solidly 스타일 Pair 컨트랙트를 사용 (`token0()`, `token1()`).
- LP는 표준 ERC20이며 `balanceOf(address)`로 잔고 확인 가능.
- 읽기 전용 기능만 있으므로, 승인·전송 로직 없음.
- 안전한 MVP: 사용자의 private key나 자금을 다루지 않음.

---

## 🧑‍💻 후임자/AI를 위한 개발 포인트

1. Copy-LP 기능 추가 시
   - Aerodrome Router 또는 Uniswap V3-like mint flow 사용
   - `swap → approve → mint` 멀티콜 설계 필요
2. 서버 없이 Onchain Registry 구현 시
   - “공유 링크”를 NFT나 onchain metadata로 등록 가능
3. 데이터 확장
   - Subgraph로 Pool, Gauge, APR, Volume, TVL 자동 추적
   - Portfolio UI에 수익률 및 포지션 가치 표시
4. UI 개선
   - Tailwind 기반 유지
   - Viewer 모드에 LP 페어 로고/심볼 표시 (token metadata API 사용)

---

## 🔒 보안 및 정책

- 사용자의 자금은 이동시키지 않음
- 단순 `balanceOf` 조회만 수행
- 네트워크 자동 전환 시, 사용자가 MetaMask에서 직접 승인
- Copy-LP 단계에서는 별도 감사 필요

---

## 📎 파일 요약(안)

| 파일명 | 설명 |
|---|---|
| `App.jsx` | 전체 미니앱 로직 (React) |
| `ERC20_ABI`, `PAIR_ABI` | 최소 조회용 ABI |
| `ethers.js` | Provider, Contract 인스턴스 생성 |
| `tailwind` | UI 스타일링 (rounded, shadow, gap 등) |

---

## 🧾 인수인계 메모

다음 개발자는 아래를 수행하면 프로젝트를 바로 이어갈 수 있습니다:

1. 로컬에서 실행 (`npm run dev`)
2. Base 네트워크 연결 후 LP 주소 입력 → 공유 링크 생성 확인
3. Viewer 링크를 테스트 (다른 브라우저/지갑 없이 확인)
4. 필요 시 Copy-LP 기능 개발 시작 (`fetchPortfolio` 확장 가능)
5. 배포: Vercel / Base App 등록 절차 진행

---

## 참고 문서

- Migrate an Existing App: `https://docs.base.org/mini-apps/quickstart/migrate-existing-apps`
- OnchainKit Overview: `https://docs.base.org/onchainkit/latest/getting-started/overview`
- Onboard Any User: `https://docs.base.org/cookbook/onboard-any-user`


