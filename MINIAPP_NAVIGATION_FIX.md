# Base Mini App 네비게이션 및 Ready 호출 문제 해결

## 문제 분석

Base 미니앱 프리뷰 도구에서 "Ready call"이 "Not Ready"로 표시되는 문제가 있었습니다. 이는 `sdk.actions.ready()` 호출이 제대로 이루어지지 않았기 때문입니다.

## 해결 방법

### 1. ✅ MiniAppInitializer 개선

**파일**: `app/components/MiniAppInitializer.tsx`

**개선 사항**:
- SDK 초기화를 기다리는 재시도 로직 추가 (최대 5회)
- 각 시도마다 대기 시간 증가 (100ms, 200ms, 300ms...)
- 더 나은 에러 핸들링 및 로깅
- Base App 컨텍스트 감지 개선

**주요 변경**:
```typescript
// 이전: 단순히 ready() 호출
sdk.actions.ready().catch(...)

// 개선: 재시도 로직과 SDK 가용성 확인
while (attempts < maxAttempts) {
  // SDK 가용성 확인
  if (typeof sdk === "undefined" || !sdk.actions) {
    // 재시도
  }
  // ready() 호출
  await sdk.actions.ready();
}
```

### 2. ✅ Base App 네비게이션 유틸리티 추가

**파일**: `app/hooks/useMiniAppNavigation.ts` (새로 생성)

Base App 내에서 페이지 네비게이션을 위해 `sdk.actions.openUrl()`을 사용하는 훅을 추가했습니다.

**사용 방법**:
```typescript
import { useMiniAppNavigation } from "../hooks/useMiniAppNavigation";

function MyComponent() {
  const navigate = useMiniAppNavigation();
  
  // Base App 내에서는 sdk.actions.openUrl() 사용
  // 일반 브라우저에서는 Next.js router 사용
  navigate("/lp");
}
```

## 테스트 방법

### 1. Base 미니앱 프리뷰에서 확인

1. [base.dev/preview](https://base.dev/preview) 접속
2. 앱 URL 입력: `https://lping.vercel.app`
3. **Console 탭** 확인:
   - `[MiniApp] ✅ SDK ready() called successfully` 메시지 확인
   - "Ready call" 상태가 "Ready"로 변경되는지 확인

### 2. 페이지 네비게이션 테스트

1. 홈페이지(`/`)에서 "Start Exploring" 버튼 클릭
2. `/lp` 페이지로 이동 확인
3. Base App 내에서도 정상 작동하는지 확인

## 디버깅

### Console 로그 확인

개선된 코드는 다음과 같은 로그를 출력합니다:

- ✅ 성공: `[MiniApp] ✅ SDK ready() called successfully`
- ⚠️ 재시도: `[MiniApp] SDK not available (attempt X/5)`
- ⚠️ 실패: `[MiniApp] SDK ready() failed (attempt X/5): [error]`
- ℹ️ 일반 브라우저: `[MiniApp] Not in mini app context, skipping ready()`

### 문제 해결 체크리스트

- [ ] Console에 `[MiniApp] ✅ SDK ready() called successfully` 메시지가 있는가?
- [ ] "Ready call" 상태가 "Ready"로 변경되었는가?
- [ ] 페이지 네비게이션이 정상 작동하는가?
- [ ] 에러 메시지가 없는가?

## 추가 개선 사항

### 필요시 Link 컴포넌트 업데이트

Base App 내에서 더 안정적인 네비게이션을 위해 Link 컴포넌트를 `useMiniAppNavigation` 훅을 사용하도록 업데이트할 수 있습니다:

```typescript
// app/page.tsx 또는 다른 페이지
import { useMiniAppNavigation } from "../hooks/useMiniAppNavigation";

function Home() {
  const navigate = useMiniAppNavigation();
  
  return (
    <button onClick={() => navigate("/lp")}>
      Start Exploring
    </button>
  );
}
```

현재는 Next.js의 `Link` 컴포넌트가 Base App 내에서도 작동하지만, 더 안정적인 네비게이션을 위해 위 방법을 사용할 수 있습니다.

## 관련 문서

- [Base Mini Apps - Migrate an Existing App](https://docs.base.org/mini-apps/quickstart/migrate-existing-apps)
- [Base Mini Apps - Navigation](https://docs.base.org/mini-apps/core-concepts/navigation)

## 배포

변경 사항을 배포한 후:

1. Base 미니앱 프리뷰에서 다시 테스트
2. Console 로그 확인
3. "Ready call" 상태 확인
4. 페이지 네비게이션 테스트

---

**참고**: 변경 사항은 즉시 적용되지만, Base App이 캐시를 사용할 수 있으므로 몇 분 후에 다시 테스트해보세요.

