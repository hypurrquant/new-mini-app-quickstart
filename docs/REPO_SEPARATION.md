# Backend Repository 분리 전략

## 왜 별도 레포지토리로 분리해야 하는가?

### 장점
1. **독립적인 배포**
   - 프론트엔드와 백엔드의 배포 주기 분리
   - 버전 관리 독립성
   - 롤백 시 영향 최소화

2. **팀 분리**
   - 프론트엔드 팀과 백엔드 팀의 독립적 작업
   - 권한 관리 용이
   - 코드 리뷰 효율성 향상

3. **확장성**
   - 백엔드만 독립적으로 스케일링
   - 다른 프론트엔드 앱에서도 재사용 가능
   - 마이크로서비스 아키텍처로 확장 용이

4. **기술 스택 독립성**
   - 각 레포의 기술 스택 독립적 선택
   - 의존성 충돌 방지
   - 도구 선택의 자유

### 단점
1. **초기 설정 복잡도**
   - 두 개의 레포 관리
   - CI/CD 파이프라인 두 개 필요

2. **코드 공유 어려움**
   - 타입 정의 공유 어려움
   - 공통 로직 중복 가능성

3. **개발 환경 설정**
   - 로컬 개발 시 두 레포 클론 필요

## 추천 구조

### Option 1: 완전 분리 (추천)
```
lping-frontend/          # Next.js 프론트엔드
├── app/
├── public/
└── package.json

lping-backend/          # Python FastAPI 백엔드
├── app/
├── requirements.txt
└── Dockerfile
```

### Option 2: 모노레포 (Nx, Turborepo)
```
lping/
├── apps/
│   ├── frontend/       # Next.js
│   └── backend/        # Python FastAPI
├── packages/
│   └── shared/         # 공통 타입 정의
└── package.json
```

## 마이그레이션 전략

### Step 1: 새 레포지토리 생성
```bash
# GitHub에서 새 레포 생성
# lping-backend

# 로컬에서 초기화
cd lping-backend
git init
git remote add origin https://github.com/YOUR_USERNAME/lping-backend.git
```

### Step 2: 백엔드 코드 이동
```bash
# 현재 레포에서 백엔드 폴더 복사
cp -r lping/backend/* lping-backend/

# .gitignore 설정
# requirements.txt, Dockerfile 등 포함
```

### Step 3: Git 히스토리 보존 (선택사항)
```bash
# git filter-branch로 백엔드 관련 커밋만 추출
git filter-branch --subdirectory-filter backend -- --all
```

### Step 4: 프론트엔드 레포 정리
```bash
# lping-frontend에서 backend 폴더 제거
rm -rf backend/
git commit -m "chore: 백엔드를 별도 레포로 분리"
```

## 레포지토리 구조 제안

### lping-backend
```
lping-backend/
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI 파이프라인
│       └── deploy.yml      # 배포 파이프라인
├── app/
│   ├── main.py
│   ├── config.py
│   ├── api/
│   ├── services/
│   └── workers/
├── tests/                  # 테스트 코드
├── scripts/                # 유틸리티 스크립트
├── docs/                   # API 문서
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
├── docker-compose.yml      # 로컬 개발 환경
├── .env.example
├── .gitignore
├── README.md
└── pyproject.toml          # Python 프로젝트 설정
```

### lping-frontend
```
lping-frontend/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── app/
├── public/
├── lib/
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 공통 타입 정의 공유 방법

### Option 1: OpenAPI/Swagger (추천)
```python
# backend/app/main.py
from fastapi.openapi.utils import get_openapi

app.openapi_schema = get_openapi(
    title="LPing Backend API",
    version="1.0.0",
    routes=app.routes,
)

# 프론트엔드에서 타입 생성
# openapi-typescript-codegen 사용
```

### Option 2: 공유 패키지 (NPM/PyPI)
```
@lping/shared-types/      # 공통 타입 정의
├── types/
│   ├── positions.ts
│   └── emissions.ts
└── package.json
```

### Option 3: API Contract 파일
```
api-contract/
├── openapi.yaml          # OpenAPI 스펙
└── README.md
```

## CI/CD 설정 예시

### Backend (.github/workflows/ci.yml)
```yaml
name: Backend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -r requirements.txt
      - run: pytest
```

### Frontend (.github/workflows/ci.yml)
```yaml
name: Frontend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run lint
      - run: npm run build
```

## 환경 변수 관리

### Backend
```env
# .env.example
BACKEND_API_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
```

### Frontend
```env
# .env.example
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
```

## 배포 전략

### 개발 환경
- Backend: `localhost:8000`
- Frontend: `localhost:3000`
- CORS 설정으로 연결

### 프로덕션 환경
- Backend: `api.lping.xyz` 또는 `backend.lping.xyz`
- Frontend: `lping.xyz`
- CORS: 프론트엔드 도메인만 허용

## 통신 방식

### REST API (현재)
```
Frontend → Backend: HTTP REST
```

### WebSocket (향후)
```
Frontend → Backend: WebSocket (실시간 업데이트)
```

## 문서화

### Backend README
- API 엔드포인트 설명
- 로컬 개발 환경 설정
- 배포 가이드

### Frontend README
- 프론트엔드 실행 방법
- 백엔드 API 연결 방법
- 환경 변수 설명

## 다음 단계

1. ✅ 새 레포지토리 생성
2. ✅ 백엔드 코드 이동
3. ✅ .gitignore 설정
4. ✅ README 작성
5. ✅ CI/CD 설정
6. ✅ 프론트엔드에서 백엔드 API 연결
7. ✅ 환경 변수 설정
8. ✅ 배포 설정

