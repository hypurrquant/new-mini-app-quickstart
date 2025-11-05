# Base Featured Guidelines 체크리스트

**Reference**: [Featured Checklist](https://docs.base.org/mini-apps/featured-guidelines/overview)

이 문서는 LPing 앱이 Base의 Featured Guidelines를 얼마나 충족하는지 분석합니다.

---

## 1. Authentication ✅

### 요구사항
- ✅ In-app authentication stays within the Base app with no external redirects
- ✅ Wallet connection happens automatically
- ✅ No email or phone verification inside the app

### 현재 상태
- ✅ Quick Auth 구현됨 (`useQuickAuth` 훅)
- ✅ OnchainKit의 자동 지갑 연결 사용
- ✅ 이메일/전화 인증 없음

### 개선 필요
- ⚠️ **사용자 아바타와 사용자명 표시 필요** (현재 0x 주소만 표시)

---

## 2. Onboarding Flow ⚠️

### 요구사항
- ⚠️ Explain the purpose of the app and how to get started
- ⚠️ Clear onboarding instructions either on the home page or as a pop-up window
- ⚠️ App only requests essential personal information
- ❌ Display user's avatar and username **(no 0x addresses)**

### 현재 상태
- ✅ 홈페이지에 앱 목적 설명 있음
- ✅ Guide 버튼 존재 (온보딩 역할)
- ✅ 필수 정보만 요청 (지갑 연결만)
- ❌ **사용자 아바타/사용자명 표시 없음** - 0x 주소만 표시

### 개선 필요
- ❌ **Context API를 사용하여 Farcaster 사용자 정보 가져오기**
- ❌ **사용자 아바타와 사용자명 표시**
- ⚠️ 온보딩 플로우를 더 명확하게 개선

---

## 3. Base Compatibility ✅

### 요구사항
- ✅ App is client-agnostic (no hard-coded Farcaster text or links)
- ⚠️ Transactions are sponsored

### 현재 상태
- ✅ 클라이언트 중립적 (Farcaster 전용 텍스트/링크 없음)
- ⚠️ 트랜잭션 스폰서링 확인 필요 (현재 읽기 전용 앱)

### 개선 필요
- ℹ️ 향후 트랜잭션 기능 추가 시 스폰서링 구현 필요

---

## 4. Layout ⚠️

### 요구사항
- ✅ Call to actions are visible and centered on page
- ❌ App has a bottom navigation bar or side menu
- ⚠️ All buttons are accessible and not cut off
- ⚠️ Navigation bar items have clear, understandable labels

### 현재 상태
- ✅ CTA 버튼이 홈페이지 중앙에 명확히 표시됨
- ❌ **하단 네비게이션 바 없음**
- ⚠️ Guide 버튼이 36px (44px 미만)
- ✅ 네비게이션 라벨 명확함

### 개선 필요
- ❌ **하단 네비게이션 바 추가** (Home, Portfolio, Settings 등)
- ⚠️ **Guide 버튼 크기 44px로 증가**

---

## 5. Load Time ⚠️

### 요구사항
- ⚠️ App loads within **3 seconds**
- ⚠️ In-app actions complete within **1 second**
- ✅ Loading indicators are shown during actions

### 현재 상태
- ⚠️ 로드 시간 측정 필요
- ⚠️ 액션 완료 시간 측정 필요
- ✅ 로딩 인디케이터 표시됨

### 개선 필요
- ⚠️ 성능 최적화 및 로드 시간 측정
- ⚠️ 액션 완료 시간 최적화

---

## 6. Usability ✅

### 요구사항
- ✅ App supports **light and dark modes** consistently
- ⚠️ App has minimum **44px touch targets**

### 현재 상태
- ✅ 라이트/다크 모드 완전 지원
- ⚠️ **일부 버튼이 44px 미만** (Guide 버튼 36px)

### 개선 필요
- ⚠️ **모든 터치 타겟을 최소 44px로 확대**

---

## 7. App Metadata ⚠️

### 요구사항
- ✅ App description is clear, concise, and user-focused
- ⚠️ App icon is **1024×1024 px**, PNG, **no transparency**
- ✅ App cover photo is high quality
- ❌ **noindex: true** - 프로덕션에서는 false여야 함

### 현재 상태
- ✅ 설명 명확하고 사용자 중심
- ⚠️ 아이콘 크기/형식 확인 필요
- ✅ 커버 사진 고품질
- ❌ **`noindex: true` 설정됨** - 프로덕션 배포 시 false로 변경 필요

### 개선 필요
- ⚠️ 아이콘 확인: 1024×1024px, PNG, 투명도 없음 확인
- ❌ **프로덕션에서 `noindex: false`로 변경**

---

## 종합 점수

| 항목 | 상태 | 완료도 |
|------|------|--------|
| 1. Authentication | ✅ | 80% (아바타/사용자명 필요) |
| 2. Onboarding Flow | ⚠️ | 60% (아바타/사용자명, 온보딩 개선 필요) |
| 3. Base Compatibility | ✅ | 90% (스폰서링 확인 필요) |
| 4. Layout | ⚠️ | 60% (하단 네비게이션, 버튼 크기) |
| 5. Load Time | ⚠️ | 70% (측정 및 최적화 필요) |
| 6. Usability | ⚠️ | 85% (터치 타겟 크기) |
| 7. App Metadata | ⚠️ | 80% (noindex, 아이콘 확인) |

**전체 완료도: 약 72%**

---

## 우선순위별 개선 사항

### 🔴 High Priority (Featured 선정 필수)

1. **사용자 아바타와 사용자명 표시** (0x 주소 대신)
   - Context API 사용하여 Farcaster 사용자 정보 가져오기
   - WalletMenu 컴포넌트 업데이트

2. **하단 네비게이션 바 추가**
   - Home, Portfolio, Settings 등 핵심 기능 접근

3. **터치 타겟 크기 44px 이상**
   - Guide 버튼 및 기타 작은 버튼들 확대

4. **프로덕션에서 `noindex: false`로 변경**

### 🟡 Medium Priority (품질 개선)

5. **온보딩 플로우 개선**
   - 첫 방문 시 명확한 안내
   - 팝업 또는 인라인 온보딩

6. **아이콘 확인**
   - 1024×1024px, PNG, 투명도 없음 확인

7. **성능 최적화**
   - 로드 시간 3초 이내
   - 액션 완료 시간 1초 이내

### 🟢 Low Priority (선택 사항)

8. **트랜잭션 스폰서링** (향후 기능 추가 시)

---

## 다음 단계

1. ✅ **Context API 통합** - 사용자 정보 가져오기
2. ✅ **WalletMenu 개선** - 아바타/사용자명 표시
3. ✅ **하단 네비게이션 바 추가**
4. ✅ **터치 타겟 크기 조정**
5. ✅ **noindex 설정 수정**
6. ⚠️ **성능 측정 및 최적화**

---

## 참고 문서

- [Featured Checklist](https://docs.base.org/mini-apps/featured-guidelines/overview)
- [Product Guidelines](https://docs.base.org/mini-apps/featured-guidelines/product-guidelines)
- [Design Guidelines](https://docs.base.org/mini-apps/featured-guidelines/design-guidelines)
- [Technical Guidelines](https://docs.base.org/mini-apps/featured-guidelines/technical-guidelines)
- [Context API](https://docs.base.org/mini-apps/core-concepts/context)

