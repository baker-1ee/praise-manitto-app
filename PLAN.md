# 칭찬 마니또 앱 — 개발 계획서

> 기준일: 2026-06-24  
> 기존 웹 서비스(Next.js + PostgreSQL)를 분석하여 Expo(React Native) + Firebase로 재구성

---

## 1. 기존 웹 서비스 분석 요약

**스택**: Next.js 14 + PostgreSQL (Supabase/Prisma) + NextAuth.js + Nodemailer

| 기능 | 웹 구현 방식 |
|------|-------------|
| 인증 | username + 비밀번호, 초대 링크 전용 가입 |
| 팀 소속 | 단일 팀, 전역 ADMIN/LEADER/MEMBER 역할 |
| 스프린트 | ACTIVE → REVEALED → CLOSED |
| 마니또 배정 | Fisher-Yates derangement 알고리즘 |
| 칭찬 작성 | 10~500자, 6개 카테고리, 발신자 익명 |
| 알림 | 이메일 4종 (스프린트 시작/칭찬 수신/조르기/공개) |
| 자동 독려 | Vercel cron — 미작성자 정기 메일 |
| 공개 화면 | confetti + 멤버별 마니또 관계 펼침 카드 |
| Gmail 회신 칭찬 | Pub/Sub 연동, 회신만으로 칭찬 등록 |

---

## 2. 앱 전환 시 변경/개선 사항

| 항목 | 웹 (기존) | 앱 (신규) | 사유 |
|------|-----------|-----------|------|
| **인증** | username만, 초대링크 필수 | 이메일+비밀번호, 자유 가입 | 정식 서비스 오픈 |
| **팀 구조** | 전역 역할, 단일 팀 소속 | 팀별 역할, 다중 팀 소속 | 여러 팀 참여 지원 |
| **팀 생성** | ADMIN만 가능 | 누구든 팀 생성 가능 → 생성자 = LEADER | 서비스 확장 |
| **알림** | 이메일 | 앱 푸쉬 (추후 별도 작업) | 앱 전환 |
| **자동 독려 cron** | Vercel cron으로 주기적 발송 | **제거** | 앱 불필요 |
| **Gmail 회신 칭찬** | Pub/Sub 연동 | **제거** | 앱에서 직접 작성 |
| **팀 초대** | 토큰 URL 공유 | 6자리 초대 코드 입력 | 모바일 UX 최적화 |
| **공개 조건** | 없음 (즉시 공개 가능) | 미작성 팀원 있으면 공개 차단 | 신규 요구사항 |
| **백엔드** | PostgreSQL + API Routes | Firestore 클라이언트 SDK | Firebase 스택 통일 |

---

## 3. 역할(Role) 설계

- **전역 역할 없음** — 역할은 팀별로 관리
- **LEADER**: 팀 생성자. 팀별로 1명
  - 멤버 초대 코드 관리
  - 스프린트 생성 / 공개 / 삭제
  - 미칭찬 멤버 목록 조회
- **MEMBER**: 초대 코드로 합류한 팀원
- 한 사용자가 A팀 LEADER + B팀 MEMBER 동시 가능

---

## 4. Firestore 데이터 모델

```
users/{uid}
├── email: string
├── name: string
├── avatarUrl?: string
├── bio?: string
└── createdAt: Timestamp

teams/{teamId}
├── name: string
├── inviteCode: string       ← 6자리 영문+숫자, 팀 합류용
├── createdBy: string (uid)  ← 이 사람이 LEADER
└── createdAt: Timestamp

memberships/{membershipId}   ← 복합 unique: userId + teamId
├── userId: string
├── teamId: string
├── role: 'LEADER' | 'MEMBER'
└── joinedAt: Timestamp

sprints/{sprintId}
├── teamId: string
├── name: string
├── startDate: Timestamp
├── endDate: Timestamp
├── status: 'ACTIVE' | 'REVEALED' | 'CLOSED'
├── createdBy: string (uid)
└── createdAt: Timestamp

sprints/{sprintId}/pairs/{pairId}    ← 서브컬렉션
├── manitoId: string (uid)           ← 칭찬해주는 사람
└── targetId: string (uid)           ← 칭찬받는 사람

praises/{praiseId}
├── sprintId: string
├── teamId: string
├── fromUserId: string               ← 공개 전 UI에서 숨김 처리
├── toUserId: string
├── content: string                  ← 10~500자
├── categories: string[]             ← 최대 3개 선택
└── createdAt: Timestamp

nudgeLogs/{logId}                    ← 칭찬 조르기 이력 (하루 1회 제한)
├── sprintId: string
├── requesterId: string              ← 조른 사람 (칭찬 받을 사람)
├── toUserId: string                 ← 조름 받은 마니또
└── createdAt: Timestamp
```

### 칭찬 익명 처리 전략

Firestore는 필드 수준 마스킹 불가 → **앱 레이어에서 처리**

- 수신자가 칭찬 목록을 조회할 때 `fromUserId` 를 UI에 표시하지 않음
- sprint.status가 `REVEALED`로 바뀐 시점부터 `fromUserId` 노출
- 소규모 팀 내부 앱 특성상 허용 가능한 트레이드오프

### 공개 차단 로직

스프린트 공개 전 아래 조건을 검사:

```
sprints/{sprintId}/pairs 의 모든 manitoId에 대해
praises where sprintId == sprintId AND fromUserId == manitoId 가 1건 이상 존재하는지 확인

→ 1건도 없는 manitoId 목록 = "미작성 팀원 목록"
→ 목록이 비어있을 때만 공개 허용
```

---

## 5. 화면 구조 (Navigation)

```
(auth)  ← 비로그인 진입점
  /login
  /register

(onboarding)  ← 로그인 후 소속 팀 없을 때 강제 진입
  /onboarding             → "팀 합류" / "팀 만들기" 선택
  /onboarding/join        → 6자리 초대 코드 입력
  /onboarding/create      → 팀 이름 입력 → 생성 → LEADER로 자동 등록

(app)  ← 하단 탭 4개
  [홈] /
    - 팀 선택 컨텍스트 헤더 (여러 팀 소속 시 드롭다운)
    - 현재 스프린트 현황 카드
    - 내 마니또 카드 (플립 애니메이션)
    - 보낸/받은 칭찬 수 (통계 카드)
    - 칭찬 쓰기 버튼
    - 칭찬 조르기 버튼 (하루 1회)
    - 진행 중 스프린트 없을 때: 직전 공개 스프린트 카드

  [칭찬] /praises
    - 보낸 칭찬 탭
    - 받은 칭찬 탭 (공개 전 발신자 익명)

  [팀] /teams
    - 내 팀 목록 (LEADER 뱃지 표시)
    - 팀 상세: 멤버 목록
    - 팀 합류 / 팀 만들기 버튼

  [프로필] /profile
    - 이름 / 아바타 수정
    - 한줄 소개 수정
    - 로그아웃

(stack screens)
  /praise/write                  ← 칭찬 작성
  /reveal/[sprintId]             ← 스프린트 공개 결과 (누구나 접근)
  /team/[teamId]/manage          ← LEADER 전용 팀 관리
    - 멤버 목록 + 초대 코드 공유
    - 미칭찬 멤버 현황 (스프린트 진행 중일 때)
    - 스프린트 목록 (생성 / 공개 / 삭제)
    - 공개 버튼 → 미작성자 있을 시 경고 모달 + 목록 표시, 공개 차단
```

---

## 6. 칭찬 카테고리

기존 웹 서비스와 동일하게 유지:

| 태그 | 설명 |
|------|------|
| 기술력 | |
| 협업 | |
| 커뮤니케이션 | |
| 리더십 | |
| 성장 | |
| 기타 | |

---

## 7. 개발 단계 (Phase)

### Phase 1 — 인증 & 프로필 ✅ 완료
**목표**: 회원가입 → 로그인 → 이름 설정까지 흐름 완성

- [x] 로그인 화면 (Firebase Auth 이메일/비밀번호)
- [x] 회원가입 화면 (이메일 + 비밀번호 + 이름)
- [x] 로그아웃
- [x] 로그인 상태 유지 (AsyncStorage persistence)
- [x] `AuthContext` — 전역 사용자 상태
- [x] 프로필 수정 화면 (이름, 아바타, 한줄 소개)
- [ ] Google 로그인 — **EAS 빌드 전환 후 구현** (Phase 7 이후)
  - Expo Go는 custom URL scheme 미등록으로 OAuth 리다이렉트 불가
  - EAS 빌드 시 `expo-auth-session/providers/google` + `androidClientId`/`iosClientId` 교체 예정

**산출물**: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `contexts/auth-context.tsx`, `app/(tabs)/profile.tsx`

---

### Phase 2 — 팀 관리 ✅ 완료
**목표**: 팀 생성 → 합류 → 멤버 조회까지 흐름 완성

- [x] 온보딩 화면 (팀 없는 신규 가입자 진입점)
- [x] 팀 생성 → 6자리 랜덤 초대 코드 자동 발급 → Firestore 저장
- [x] 초대 코드 입력으로 팀 합류 (membership 생성)
- [x] 다중 팀 컨텍스트: `TeamContext` — `selectedTeamId` AsyncStorage 저장
- [x] 팀 목록 화면 (`/teams`)
- [x] 팀 상세: 멤버 목록 (이름, 역할, 아바타)
- [x] LEADER 전용 팀 관리 화면 (`/team/[teamId]/index`)
  - [x] 초대 코드 표시 + 클립보드 복사
  - [x] 초대 코드 재발급

**산출물**: `app/(onboarding)/`, `app/(tabs)/teams.tsx`, `app/team/[teamId]/index.tsx`, `contexts/team-context.tsx`, `lib/teams.ts`

---

### Phase 3 — 스프린트 & 마니또 배정 ✅ 완료
**목표**: 스프린트 생성 → 마니또 자동 배정 → 홈 화면 표시

- [x] 스프린트 생성 폼 (LEADER, 이름/시작일/종료일 — DateTimePicker)
- [x] Fisher-Yates derangement 클라이언트 실행 → `sprints/{id}/pairs` 배치 저장
- [x] 스프린트 목록 + 상태 뱃지 (LEADER 팀 관리 화면 내)
- [x] 홈 화면 (`/`)
  - [x] 팀 선택 헤더 드롭다운 (다중 팀 소속 시)
  - [x] 현재 스프린트 현황 카드 (실시간 구독)
  - [x] 내 마니또 카드 (플립 애니메이션 — Reanimated v4 opacity+rotateY)
  - [x] 진행 중 스프린트 없을 때 직전 공개 스프린트 카드
- [ ] 보낸/받은 칭찬 수 통계 카드 → Phase 4에서 praises 구현 후 추가

**산출물**: `app/(tabs)/index.tsx`, `app/team/[teamId]/index.tsx`(스프린트 섹션), `lib/manito.ts`, `lib/sprints.ts`, `components/manito-card.tsx`

---

### Phase 4 — 칭찬 CRUD ✅ 완료
**목표**: 칭찬 작성 → 조회 → 조르기까지 흐름 완성

- [x] 칭찬 작성 화면 (`/praise/write`)
  - [x] 내 마니또 대상 자동 지정 (현재 팀 스프린트 기준)
  - [x] 10~500자 입력, 글자 수 카운터
  - [x] 카테고리 최대 3개 선택
  - [x] 전송 완료 후 보낸 칭찬 목록으로 이동
- [x] 칭찬 목록 화면 (`/praises`)
  - [x] 보낸/받은 탭 전환 + 실시간 구독
  - [x] 받은 칭찬: 공개 전 "익명의 팀원" 표시
  - [x] 카테고리 뱃지
- [x] 홈 화면 칭찬 통계 카드 (보낸/받은 수)
- [x] 칭찬 조르기 버튼 (홈 화면, 하루 1회 `nudgeLogs` 체크)

**산출물**: `app/praise/write.tsx`, `app/(tabs)/praises.tsx`, `lib/praises.ts`

---

### Phase 5 — 스프린트 공개 ✅ 완료
**목표**: 공개 조건 검사 → 공개 → 결과 화면 렌더링

- [x] LEADER 팀 관리 화면 — "공개하기" 버튼 (활성 스프린트 있을 때만)
  - [x] 공개 전 미칭찬 멤버 검사 (`checkRevealEligibility`)
    - pairs 전체 순회 → manitoId별 praise 존재 여부 확인
    - 미작성자 있으면 경고 모달 + 이름 목록 표시, 공개 차단
    - 모두 작성했을 때만 `status = 'REVEALED'` 업데이트
- [x] 공개 결과 화면 (`/reveal/[sprintId]`)
  - [x] 진입 시 confetti 효과 (react-native-confetti-cannon)
  - [x] 스프린트 이름 + 기간 + 총 칭찬 수
  - [x] 멤버별 카드: 아바타 + 마니또 관계 + 칭찬 목록 + 카테고리 뱃지
  - [x] 카드 탭 시 펼침/접힘 토글

**산출물**: `app/reveal/[sprintId].tsx`, `lib/sprints.ts`(checkRevealEligibility, revealSprint, getRevealData 추가)

---

### Phase 6 — UX 폴리싱 ✅ 완료
**목표**: 완성도 높은 사용자 경험

- [x] 로딩 스켈레톤 (칭찬 목록 — Animated 펄스)
- [x] 빈 상태 화면 (스프린트 없음, 칭찬 없음 — 이모지 + 안내 문구)
- [x] 칭찬 탭: 스프린트 없을 때 팀 전체 내역 표시
- [x] Firestore 실시간 리스너 (보낸/받은 칭찬 onSnapshot)
- [x] 앱 이름 '칭찬 마니또'로 변경, 스플래시 배경 purple 적용
- [ ] 다크 테마 완성도 — 추후 개선 (기본 기능 우선)

---

## 8. 푸쉬 알림 (추후 별도 작업)

아래 4종 알림은 Phase 1~6 완료 후 별도 요청으로 진행:

| 트리거 | 수신자 | 내용 |
|--------|--------|------|
| 스프린트 생성 | 팀원 전체 | "마니또가 배정되었어요" |
| 칭찬 작성 | 칭찬 수신자 | "마니또가 칭찬을 남겼어요" |
| 칭찬 조르기 | 마니또 | "칭찬을 기다리고 있어요" |
| 스프린트 공개 | 팀원 전체 | "마니또가 공개되었어요" |

> ⚠️ Firebase Cloud Functions 사용 필요 → Firebase Blaze 플랜 업그레이드 필요

---

## 9. 기술 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 상태 관리 | React Context + `useState` | 규모 상 Redux 불필요 |
| 팀 컨텍스트 저장 | AsyncStorage (`selectedTeamId`) | 앱 재시작 시 복원 |
| 마니또 배정 실행 위치 | 클라이언트 → Firestore 저장 | Cloud Functions 없이 동작 |
| 칭찬 익명 처리 | 앱 레이어 마스킹 | Firestore 필드 마스킹 불가 |
| 공개 조건 검사 위치 | 클라이언트 (LEADER 앱) | 단순, 서버 불필요 |
| 초대 방식 | 6자리 영문+숫자 코드 | 모바일에서 URL보다 입력 편리 |
| 실시간 업데이트 | Firestore `onSnapshot` | 칭찬 수신 즉시 반영 |

---

## 10. Firestore 보안 규칙 (개요)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 사용자 본인 정보만 수정 가능
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    // 팀: 팀원이면 읽기 가능, 생성은 누구든 가능
    match /teams/{teamId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/memberships/$(request.auth.uid + '_' + teamId));
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        get(/databases/$(database)/documents/memberships/$(request.auth.uid + '_' + teamId)).data.role == 'LEADER';
    }

    // 멤버십: 본인 것 읽기 + 팀 LEADER가 팀원 목록 읽기
    match /memberships/{membershipId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }

    // 스프린트: 팀원이면 읽기, LEADER만 쓰기
    match /sprints/{sprintId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/memberships/$(request.auth.uid + '_' + resource.data.teamId)).data.role == 'LEADER';

      // 페어: 팀원 읽기 (본인 것만 앱에서 필터), LEADER 쓰기
      match /pairs/{pairId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
    }

    // 칭찬: 발신자 또는 수신자만 읽기
    match /praises/{praiseId} {
      allow read: if request.auth != null && (
        resource.data.fromUserId == request.auth.uid ||
        resource.data.toUserId == request.auth.uid
      );
      allow create: if request.auth != null &&
        request.resource.data.fromUserId == request.auth.uid;
    }

    // 조르기 로그: 팀원 읽기, 본인만 생성
    match /nudgeLogs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
        request.resource.data.requesterId == request.auth.uid;
    }
  }
}
```

---

## 11. 예상 개발 일정

| Phase | 내용 | 예상 기간 |
|-------|------|----------|
| Phase 1 | 인증 & 프로필 | 2~3일 |
| Phase 2 | 팀 관리 | 2~3일 |
| Phase 3 | 스프린트 & 마니또 | 2~3일 |
| Phase 4 | 칭찬 CRUD | 2~3일 |
| Phase 5 | 스프린트 공개 | 1~2일 |
| Phase 6 | UX 폴리싱 | 2~3일 |
| **합계** | | **11~17일** |

---

*푸쉬 알림(Phase 7 예정)은 Phase 1~6 완료 후 별도 요청으로 진행*
