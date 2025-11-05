# lping-frontend

LPing 프론트엔드 - Aerodrome Concentrated Liquidity 포지션 관리 앱

## 개요

LPing은 Base 네트워크의 Aerodrome 프로토콜에서 제공하는
Concentrated Liquidity (CL) 포지션을 관리하고 모니터링하는 웹 애플리케이션입니다.

## 기술 스택

- **Framework**: Next.js 15
- **UI**: React 19
- **Blockchain**: Wagmi, Viem
- **Styling**: CSS-in-JS
- **State Management**: React Query

## 빠른 시작

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 레포지토리 클론
git clone https://github.com/YOUR_USERNAME/lping-frontend.git
cd lping-frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 수정
```

### 실행

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 환경 변수

`.env.local` 파일에서 다음 변수들을 설정하세요:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000

# 또는 프로덕션 백엔드
# NEXT_PUBLIC_BACKEND_API_URL=https://api.lping.xyz

# Base RPC (직접 사용 시)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

## 백엔드 연동

이 프론트엔드는 별도의 백엔드 서비스를 사용합니다:
- [lping-backend](https://github.com/YOUR_USERNAME/lping-backend)

백엔드 서비스가 실행 중이어야 정상 작동합니다.

## 배포

### Vercel 배포
1. GitHub 레포지토리 연결
2. 환경 변수 설정
3. 자동 배포

### 자체 호스팅
```bash
npm run build
npm start
```

## 라이선스

MIT

## 관련 레포지토리

- [lping-backend](https://github.com/YOUR_USERNAME/lping-backend) - Python FastAPI 백엔드

