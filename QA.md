# QA 이슈 트래커 — 칭찬 마니또 앱

> 기준일: 2026-06-25  
> 이슈를 발견할 때마다 이 문서에 기록하고 상태를 업데이트한다.

---

## 버그 (Bugs)

### BUG-001 ✅ 해결됨
**제목**: 홈 탭 칭찬 통계 카드 → 칭찬 탭 이동 시 wrong 탭 선택  
**증상**:
- "내가 받은 칭찬" 카드 → 칭찬 탭 이동 시 "보낸 칭찬" 탭이 선택됨
- "내가 보낸 칭찬" 카드 → 칭찬 탭 이동 시 이전에 선택했던 탭이 그대로 유지됨 (예: 이전에 받은 칭찬 탭 선택 상태면 받은 칭찬으로 이동)

**기대 동작**: 보낸 칭찬 카드 → 보낸 칭찬 탭, 받은 칭찬 카드 → 받은 칭찬 탭  
**원인**: `index.tsx`에서 두 카드 모두 `tab` 파라미터 없이 이동. `praises.tsx`는 파라미터가 `undefined`이면 현재 탭 상태를 유지해 이전 선택이 잔존  
**수정**: 보낸/받은 칭찬 카드 모두 `params: { tab: 'sent' / 'received' }` 명시적으로 전달. `praises.tsx`에서 `useLocalSearchParams`로 `tab` 파라미터 읽어 탭 전환

---

### BUG-002 ✅ 해결됨
**제목**: 칭찬 내용이 쌍따옴표 + 기울임체로 표시  
**증상**: "보낸 칭찬" / "받은 칭찬" 탭 및 공개 결과 화면에서 칭찬 텍스트가 `"내용"` 형식 + 이탤릭체로 표시됨  
**기대 동작**: 따옴표 없이 일반 텍스트로 표시  
**원인**: `praises.tsx`의 `PraiseCard`에서 `"{praise.content}"` + `fontStyle: 'italic'`. `reveal/[sprintId].tsx`의 `PairCard`에서도 동일  
**수정**: 두 파일 모두 따옴표 제거 및 `fontStyle: 'italic'` 제거

---

### BUG-003 🔧 부분 해결
**제목**: 스프린트 공개 후 로그아웃되고 다시 로그인이 안 됨  
**증상**:
1. "스프린트 공개하기" 버튼 → 공개 확인 대화상자 → "공개하기 🎉" 누르면 앱이 로그아웃됨
2. 이후 로그인 시도 시 버튼 로딩 후 무한 대기 (앱이 아무 반응 없음)

**추정 원인 (우선순위순)**:
1. **Alert `onPress` 콜백 try-catch 누락**: `revealSprint()` 또는 `router.push()` 실패 시 unhandled rejection → 앱 크래시
2. **`getRevealData` `.catch()` 누락**: 공개 결과 화면 진입 시 praises 쿼리 실패 → unhandled rejection
3. **Firestore `onSnapshot` error handler 없음**: 앱 재시작 후 `subscribeToUserProfile` / `subscribeToMyMemberships` 실패 시 `setLoading(false)` 미호출 → 무한 로딩
4. **Firestore 보안 규칙 가능성** (아래 "기술 노트" 참조)

**코드 수정**: Alert onPress try-catch 추가, getRevealData .catch() 추가, onSnapshot error handler 추가  
**Firestore 규칙 수정 필요** → 아래 기술 노트 참조

---

## 기능 요청 (Feature Requests)

### FEAT-001 📋 예정
**제목**: 공개된 스프린트 칭찬 내역 확인 페이지 — 멤버 접근 경로 추가  
**요청 내용**: 스프린트가 공개됐으면 해당 스프린트에 속한 사용자들이 누가 누구에게 어떤 칭찬을 했는지 확인할 수 있어야 함  
**현황**: `/reveal/[sprintId]` 페이지는 이미 존재. 리더는 공개 직후 자동으로 이 페이지로 이동됨. 홈 탭에서도 "마니또가 공개됐어요!" 카드로 최근 공개 스프린트에 접근 가능  
**추가 구현 필요**: 팀 관리 화면의 스프린트 목록에서 공개된(REVEALED/CLOSED) 스프린트 항목 클릭 시 공개 결과 페이지 이동 ✅ 해결됨

---

### FEAT-002 ✅ 해결됨
**제목**: 지난 스프린트 클릭으로 칭찬 내역 재확인  
**요청 내용**: 이미 지난 스프린트여도 스프린트 클릭 시 칭찬 내역 공개 페이지로 언제든지 재진입 가능  
**수정**: 팀 관리 화면의 스프린트 목록에서 REVEALED/CLOSED 상태의 스프린트 항목을 `TouchableOpacity`로 변경, 클릭 시 `/reveal/[sprintId]`로 이동

---

### FEAT-003 ✅ 해결됨
**제목**: 스프린트 신규 생성 후 홈 탭 자동 이동 + 해당 팀 자동 선택  
**요청 내용**: 스프린트를 새로 생성하면 홈 탭으로 이동시키고 해당 스프린트의 팀이 자동 선택되도록  
**수정**: `handleCreateSprint` 성공 시 `setSelectedTeam(teamId)` 호출 후 `router.replace('/(tabs)')` 이동

---

### FEAT-004 ✅ 해결됨
**제목**: 칭찬 탭 — 팀 선택 + 진행 중인 스프린트 기준만 조회  
**요청 내용**:
1. 칭찬 탭에서도 홈 탭처럼 팀 선택이 가능해야 함
2. 칭찬 목록은 진행 중인 스프린트 것만 조회 (스프린트 없으면 빈 상태 표시)
3. 홈 탭에서 칭찬 탭으로 이동 시 현재 선택된 팀이 동일하게 적용되어야 함
**현황**: 현재 스프린트 없을 때 팀 전체 내역을 보여주는 폴백 쿼리 존재. 팀 선택 UI 없음  
**수정**: 팀 선택 모달 추가, 폴백 쿼리 제거, 진행 중 스프린트 없으면 빈 상태 표시. TeamContext `selectedTeamId` 공유로 홈↔칭찬 탭 팀 연동은 자동 처리됨

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

**⚠️ 중요: 2026-07-24 이후 전체 개방 규칙 만료**  
만료 이후 `praises`를 제외한 모든 컬렉션(users, teams, memberships, sprints 등)에 대한 접근이 차단됨. 앱이 동작하려면 **만료 전에 정식 보안 규칙을 작성하여 배포**해야 함.

BUG-003의 로그아웃 문제는 Firestore 규칙 문제가 아닌 것으로 확인됨 (전체 개방 규칙 활성 중). 코드 레벨의 unhandled rejection(Alert onPress try-catch 누락)이 원인일 가능성이 높음. 코드 수정 완료.
