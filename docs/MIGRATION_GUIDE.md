# 레포지토리 분리 마이그레이션 가이드

## Step 1: 새 백엔드 레포지토리 생성

```bash
# GitHub에서 새 레포 생성: lping-backend

# 로컬에서 초기화
mkdir lping-backend
cd lping-backend
git init
git remote add origin https://github.com/YOUR_USERNAME/lping-backend.git
```

## Step 2: 백엔드 코드 복사

```bash
# 현재 레포에서 백엔드 폴더 복사
cp -r ../lping/backend/* .

# .gitignore 생성
cat > .gitignore << EOF
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv
.env
*.log
.DS_Store
*.db
EOF

# 초기 커밋
git add .
git commit -m "Initial commit: FastAPI backend service"
git push -u origin main
```

## Step 3: 프론트엔드 레포 정리

```bash
# 프론트엔드 레포에서
cd lping-frontend  # 또는 현재 레포 이름

# 백엔드 폴더 제거
rm -rf backend/

# .gitignore 업데이트 (backend/ 추가)
echo "backend/" >> .gitignore

# 커밋
git add .
git commit -m "chore: 백엔드를 별도 레포로 분리"
git push
```

## Step 4: 환경 변수 업데이트

### 프론트엔드 (.env.local)
```env
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
```

### 백엔드 (.env)
```env
CORS_ORIGINS=["http://localhost:3000","https://lping.vercel.app"]
```

## Step 5: CI/CD 설정

### 백엔드 (.github/workflows/ci.yml)
```yaml
name: Backend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest
```

### 프론트엔드 (.github/workflows/ci.yml)
```yaml
name: Frontend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run build
```

## Step 6: 프론트엔드 코드 수정

### app/lp/hooks/usePositions.ts 수정

```typescript
const BACKEND_API_URL = 
  process.env.NEXT_PUBLIC_BACKEND_API_URL || 
  'http://localhost:8000';

const fetchPositions = useCallback(async () => {
  const res = await fetch(
    `${BACKEND_API_URL}/api/v1/positions/summary?owner=${ownerAddress}`
  );
  const data = await res.json();
  return data.positions;
}, [ownerAddress]);
```

## 완료 체크리스트

- [ ] 백엔드 레포지토리 생성 및 코드 이동
- [ ] 프론트엔드 레포에서 백엔드 폴더 제거
- [ ] 환경 변수 설정
- [ ] CI/CD 파이프라인 설정
- [ ] 프론트엔드 코드에서 백엔드 API 호출로 변경
- [ ] 로컬 개발 환경 테스트
- [ ] 배포 테스트

