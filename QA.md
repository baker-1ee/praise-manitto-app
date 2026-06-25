# QA 이슈 트래커 — 칭찬 마니또 앱

> 최초 작성: 2026-06-25 / 최종 업데이트: 2026-06-25  
> 이슈를 발견할 때마다 이 문서에 기록하고 상태를 업데이트한다.

---

## 버그 (Bugs)

### BUG-001 ✅ 해결됨
**제목**: 홈 탭 칭찬 통계 카드 → 칭찬 탭 이동 시 wrong 탭 선택  
**증상**:
- "내가 받은 칭찬" 카드 → 칭찬 탭 이동 시 "보낸 칭찬" 탭이 선택됨
- "내가 보낸 칭찬" 카드 → 칭찬 탭 이동 시 이전에 선택했던 탭이 그대로 유지됨

**원인**: `index.tsx`에서 두 카드 모두 `tab` 파라미터 없이 이동. `praises.tsx`는 파라미터가 `undefined`이면 현재 탭 상태를 유지해 이전 선택이 잔존  
**수정**: 보낸/받은 칭찬 카드 모두 `params: { tab: 'sent' / 'received' }` 명시적으로 전달. `praises.tsx`에서 `useLocalSearchParams`로 `tab` 파라미터 읽어 탭 전환

---

### BUG-002 ✅ 해결됨
**제목**: 칭찬 내용이 쌍따옴표 + 기울임체로 표시  
**증상**: 칭찬 탭 및 공개 결과 화면에서 칭찬 텍스트가 `"내용"` 형식 + 이탤릭체로 표시  
**원인**: `praises.tsx`, `reveal/[sprintId].tsx`에서 `"{praise.content}"` + `fontStyle: 'italic'`  
**수정**: 두 파일 모두 따옴표 제거 및 `fontStyle: 'italic'` 제거

---

### BUG-003 ✅ 해결됨 (코드 레벨)
**제목**: 스프린트 공개 후 로그아웃되고 다시 로그인이 안 됨  
**증상**:
1. "스프린트 공개하기" 버튼 → "공개하기 🎉" 누르면 앱이 로그아웃됨
2. 이후 로그인 시도 시 버튼 로딩 후 무한 대기

**원인 (추정)**: Alert `onPress` 콜백에 try-catch 없어 unhandled rejection 발생 → 앱 크래시. 재시작 후 Firestore `onSnapshot` error handler 없어 `setLoading(false)` 미호출 → 무한 로딩  
**수정**:
- 스프린트 공개 Alert onPress try-catch 추가 (`sprints.tsx`로 이동)
- `getRevealData` `.catch()` 추가
- `subscribeToUserProfile` / `subscribeToMyMemberships` error handler 추가

> Firestore 보안 규칙은 현재 전체 개방(~2026-07-24) 상태라 규칙 문제 아님. 기술 노트 참조.

---

## 기능 요청 (Feature Requests)

### FEAT-001 ✅ 해결됨
**제목**: 공개된 스프린트 칭찬 내역 — 팀원 모두 접근 가능  
**요청 내용**: 스프린트 공개 후 해당 팀원 전체가 누가 누구에게 어떤 칭찬을 했는지 확인할 수 있어야 함  
**수정**: 스프린트 탭(FEAT-005) 신설로 팀원 모두가 스프린트 이력 조회 및 공개된 스프린트 클릭으로 `/reveal/[sprintId]` 접근 가능

---

### FEAT-002 ✅ 해결됨
**제목**: 지난 스프린트 클릭으로 칭찬 내역 재확인  
**요청 내용**: 이미 지난 스프린트여도 클릭 시 칭찬 내역 공개 페이지로 언제든지 재진입 가능  
**수정**: 스프린트 탭의 "지난 스프린트" 목록에서 REVEALED/CLOSED 스프린트 전체 클릭 가능 → `/reveal/[sprintId]` 이동

---

### FEAT-003 ✅ 해결됨
**제목**: 스프린트 신규 생성 후 홈 탭 자동 이동 + 해당 팀 자동 선택  
**요청 내용**: 스프린트를 새로 생성하면 홈 탭으로 이동시키고 해당 팀이 자동 선택되도록  
**수정**: 스프린트 탭의 `handleCreateSprint` 성공 시 `setSelectedTeam(teamId)` + `router.replace('/(tabs)')` 이동

---

### FEAT-004 ✅ 해결됨
**제목**: 칭찬 탭 — 팀 선택 + 진행 중인 스프린트 기준만 조회  
**요청 내용**: 칭찬 탭에서 팀 선택 가능, 진행 중 스프린트의 칭찬만 표시, 홈에서 넘어올 때 팀 연동  
**수정**: 팀 선택 모달 추가, 스프린트 없을 때 폴백 쿼리 제거 후 빈 상태 표시, TeamContext 공유로 탭 간 팀 연동 자동 처리

---

### FEAT-005 ✅ 해결됨
**제목**: 스프린트 탭 신설  
**요청 내용**: 별도 스프린트 탭 분리. 팀원도 스프린트 이력 확인 및 공개 결과 재진입 가능. 생성·공개는 리더 전용  
**수정**:
- `app/(tabs)/sprints.tsx` 신규 생성
  - 팀 선택 드롭다운 (홈/칭찬 탭과 동일)
  - 진행 중 스프린트 카드 + 리더 전용 "공개하기 🎉" 버튼
  - 지난 스프린트 목록: 팀원 포함 전체 클릭 → `/reveal/[sprintId]`
  - 리더 전용 스프린트 생성 폼 (DateTimePicker)
  - `subscribeToTeamSprints` 실시간 구독
- `_layout.tsx`: 칭찬-팀 사이에 스프린트 탭 추가 (`flag.fill` 아이콘)
- `lib/sprints.ts`: `subscribeToTeamSprints` 함수 추가
- `team/[teamId]/index.tsx`: 스프린트 섹션 전체 제거 → 초대코드·멤버·나가기만 유지

---

## 탭 구조 현황

| 순서 | 탭 | 파일 | 접근 권한 |
|------|-----|------|----------|
| 1 | 홈 | `(tabs)/index.tsx` | 전체 |
| 2 | 칭찬 | `(tabs)/praises.tsx` | 전체 (진행 중 스프린트 기준) |
| 3 | 스프린트 | `(tabs)/sprints.tsx` | 조회: 전체 / 생성·공개: 리더 |
| 4 | 팀 | `(tabs)/teams.tsx` | 전체 |
| 5 | 프로필 | `(tabs)/profile.tsx` | 전체 |

---

## 기술 노트 (Technical Notes)

### Firestore 보안 규칙 현황 (2026-06-25 확인)

현재 배포된 규칙:
```javascript
match /praises/{praiseId} {
  allow read: if request.auth != null && (
    resource.data.fromUserId == request.auth.uid ||
    resource.data.toUserId == request.auth.uid ||
    get(...sprints/.../status).data.status in ['REVEALED', 'CLOSED']
  );
  allow create: if request.auth != null && ...;
}

// 전체 개방 (30일 무료 체험 규칙)
match /{document=**} {
  allow read, write: if request.time < timestamp.date(2026, 7, 24);
}
```

**⚠️ 2026-07-24 이전에 정식 보안 규칙 배포 필요**  
만료 이후 `praises`를 제외한 모든 컬렉션(users, teams, memberships, sprints 등)에 대한 접근이 전면 차단됨.
