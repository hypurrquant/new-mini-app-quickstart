# Featured Guidelines 개선 사항

이 문서는 Base의 Featured Guidelines에 맞추기 위해 구현한 개선 사항을 기록합니다.

**Reference**: [Featured Checklist](https://docs.base.org/mini-apps/featured-guidelines/overview)

---

## ✅ 완료된 개선 사항

### 1. noindex 설정 수정 ✅

**문제**: 프로덕션에서도 `noindex: true`로 설정되어 검색 인덱싱이 차단됨

**해결**:
- `minikit.config.ts`: 환경 변수에 따라 자동 설정
- `scripts/generate-manifest.js`: 빌드 시 환경에 따라 설정

```typescript
// 프로덕션: noindex: false (검색 인덱싱 활성화)
// 개발/스테이징: noindex: true (검색 인덱싱 비활성화)
noindex: process.env.NODE_ENV === 'production' ? false : true
```

### 2. 터치 타겟 크기 개선 ✅

**문제**: Guide 버튼이 36px로 Base Guidelines의 최소 44px 요구사항 미달

**해결**:
- `app/lp/components/Header.tsx`: Guide 버튼을 44px로 확대
- `minWidth: 44`, `minHeight: 44` 설정으로 최소 크기 보장

```typescript
// 이전: width: 36, height: 36
// 개선: minWidth: 44, minHeight: 44, width: 44, height: 44
```

---

## 🔄 진행 중인 개선 사항

### 3. 사용자 아바타 및 사용자명 표시 ⚠️

**요구사항**: 0x 주소 대신 사용자 아바타와 사용자명 표시

**현재 상태**:
- Quick Auth로 FID는 가져올 수 있음
- Context API를 사용하여 사용자 정보(아바타, 사용자명) 가져오기 필요

**구현 방법**:

#### Step 1: Context API 훅 생성

```typescript
// app/hooks/useContext.ts
"use client";

import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

interface ContextUser {
  fid: number;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export function useContext() {
  const [user, setUser] = useState<ContextUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const context = await sdk.context;
        if (context?.user) {
          setUser({
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            avatarUrl: context.user.pfp?.url,
            bio: context.user.bio?.text,
          });
        }
      } catch (error) {
        console.warn("[Context] Failed to get user context:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContext();
  }, []);

  return { user, isLoading };
}
```

#### Step 2: WalletMenu 컴포넌트 업데이트

```typescript
// app/lp/components/WalletMenu.tsx
import { useContext } from "../../hooks/useContext";

export default function WalletMenu({ address, theme, showMenu, onToggleMenu }: WalletMenuProps) {
  const { user: contextUser } = useContext();
  
  // Context에서 사용자 정보 가져오기, 없으면 주소 표시
  const displayName = contextUser?.displayName || contextUser?.username || 
    `${address.slice(0, 6)}...${address.slice(-4)}`;
  const avatarUrl = contextUser?.avatarUrl;

  return (
    <>
      <button
        onClick={onToggleMenu}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: `2px solid ${theme.success}`,
          background: theme.bgCard,
          color: theme.text,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 44, // Base Guidelines
        }}
      >
        {avatarUrl && (
          <img 
            src={avatarUrl} 
            alt={displayName}
            style={{ width: 24, height: 24, borderRadius: '50%' }}
          />
        )}
        <span>{displayName}</span>
      </button>
      {/* ... rest of component */}
    </>
  );
}
```

**참고**: [Context API Documentation](https://docs.base.org/mini-apps/core-concepts/context)

---

## 📋 추가 개선 필요 사항

### 4. 하단 네비게이션 바 추가 ⚠️

**요구사항**: 앱에 하단 네비게이션 바 또는 사이드 메뉴 필요

**제안 사항**:
- 하단 네비게이션 바: Home, Portfolio, Settings
- 모바일 친화적인 디자인
- 현재 페이지 표시

### 5. 온보딩 플로우 개선 ⚠️

**요구사항**: 앱 목적과 시작 방법을 명확히 설명

**제안 사항**:
- 첫 방문 시 온보딩 모달/가이드
- 단계별 안내 (3-4 단계)
- "Skip" 옵션 제공

### 6. 성능 최적화 ⚠️

**요구사항**:
- 앱 로드 시간: 3초 이내
- 인앱 액션 완료 시간: 1초 이내

**제안 사항**:
- Lighthouse 성능 측정
- 코드 스플리팅
- 이미지 최적화
- API 응답 시간 최적화

### 7. 아이콘 확인 ⚠️

**요구사항**: 1024×1024px, PNG, 투명도 없음

**확인 필요**:
- `public/blue-icon.png` 파일 확인
- 크기 및 형식 검증
- 투명도 제거 (필요시)

---

## 우선순위

### 🔴 High Priority (Featured 선정 필수)
1. ✅ noindex 설정 수정
2. ✅ 터치 타겟 크기 개선
3. ⚠️ 사용자 아바타/사용자명 표시 (Context API 통합)
4. ⚠️ 하단 네비게이션 바 추가

### 🟡 Medium Priority (품질 개선)
5. ⚠️ 온보딩 플로우 개선
6. ⚠️ 아이콘 확인 및 최적화
7. ⚠️ 성능 최적화

---

## 다음 단계

1. **Context API 통합** - 사용자 정보 가져오기
2. **WalletMenu 업데이트** - 아바타/사용자명 표시
3. **하단 네비게이션 바 컴포넌트 생성**
4. **온보딩 컴포넌트 생성**
5. **성능 측정 및 최적화**

---

## 관련 문서

- [Featured Checklist](https://docs.base.org/mini-apps/featured-guidelines/overview)
- [Context API](https://docs.base.org/mini-apps/core-concepts/context)
- [Product Guidelines](https://docs.base.org/mini-apps/featured-guidelines/product-guidelines)
- [Design Guidelines](https://docs.base.org/mini-apps/featured-guidelines/design-guidelines)

