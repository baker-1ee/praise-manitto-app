# QA 이슈 트래커 — 칭찬 마니또 앱

> 최초 작성: 2026-06-25 / 최종 업데이트: 2026-07-11  
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

### BUG-003 ✅ 해결됨
**제목**: 스프린트 공개 후 로그아웃되고 다시 로그인이 안 됨  
**증상**:
1. "스프린트 공개하기" 버튼 → "공개하기 🎉" 누르면 앱이 로그아웃됨
2. 이후 로그인 시도 시 버튼 로딩 후 무한 대기

**원인 (추정)**: Alert `onPress` 콜백에 try-catch 없어 unhandled rejection 발생 → 앱 크래시. 재시작 후 Firestore `onSnapshot` error handler 없어 `setLoading(false)` 미호출 → 무한 로딩  
**수정**:
- 스프린트 공개 Alert onPress try-catch 추가 (`sprints.tsx`로 이동)
- `getRevealData` `.catch()` 추가
- `subscribeToUserProfile` / `subscribeToMyMemberships` error handler 추가

> 실사용 검증 완료 (2026-07-11).

---

### BUG-006 ✅ 해결됨
**제목**: 구글 로그인 실패 (Play 앱 서명 키 SHA-1 미등록)  
**증상**: Play 스토어 배포 빌드에서 구글 로그인 시도 시 실패  
**원인**: Play 앱 서명(App Signing Key)이 적용되면서 실제 배포 빌드의 서명 SHA-1 지문이 Firebase/Google Cloud OAuth 클라이언트에 등록된 지문과 불일치  
**수정**: Play 앱 서명 키 SHA-1 지문 등록(`6d1e28d`) 후 누락된 지문 추가 등록(`338ee70`). 실기기 배포 빌드로 재검증 완료

---

### BUG-007 ✅ 해결됨
**제목**: 로그인 후 (onboarding) 라우트 네비게이션 오류  
**증상**: 로그인 직후 온보딩 라우트로 진입 시 라우트 미등록/네비게이션 오류 발생  
**원인**: `(onboarding)` Stack이 조건부로만 마운트되어 네비게이션 시점에 라우트가 아직 등록되지 않음  
**수정**: `(onboarding)` Stack을 항상 렌더링하도록 변경 (`c9d8616`, `6b82c5b`, `3122eda`)

---

### BUG-008 ✅ 해결됨
**제목**: 스프린트 삭제·생성 시 permission-denied  
**증상**: 스프린트 삭제 또는 생성 시 Firestore permission-denied 오류 발생  
**수정**: 관련 Firestore 보안 규칙 조건 수정 (`3d41cda`)

---

### BUG-009 ✅ 해결됨
**제목**: Firestore 복합 인덱스 오류  
**증상**: 특정 쿼리 실행 시 복합 인덱스 미존재로 인한 오류 발생  
**수정**: 복합 인덱스가 필요 없도록 단일 필드 쿼리로 전면 교체 (`90b21f1`)

---

### BUG-010 ✅ 해결됨 (FB-001에서 승격)
**제목**: 칭찬 작성 화면 — 키보드가 입력 중인 텍스트를 가림  
**증상**: 칭찬 작성 시 자판(키보드)이 화면을 덮어 지금 작성 중인 텍스트가 실시간으로 보이지 않음  
**원인**: `app/praise/write.tsx`에 `KeyboardAvoidingView`가 없어 키보드가 올라오면 `ScrollView`가 밀리지 않고 하단 `TextInput`/버튼을 그대로 가림  
**수정**: 로그인/회원가입/온보딩 화면과 동일한 패턴으로 `KeyboardAvoidingView`(`behavior: iOS는 'padding', Android는 'height'`)로 `ScrollView`를 감쌈  
**제보일**: 2026-07-10

---

### BUG-004 ✅ 해결됨
**제목**: 홈 탭 칭찬 통계 카드 — 탭 재진입 시 카운트 갱신 안 됨  
**증상**: 칭찬을 보내거나 받은 후 다른 탭 갔다가 홈 탭으로 돌아와도 "내가 보낸 칭찬" / "내가 받은 칭찬" 숫자가 업데이트되지 않음  
**원인**: `getPraiseStats` 호출이 `activeSprint?.id` / `user?.uid` 변경 시에만 트리거 → 탭 재진입 시 재호출 없음  
**수정**: `useFocusEffect` + `useCallback` 으로 탭 포커스될 때마다 `getPraiseStats` 재호출

---

### BUG-005 ✅ 해결됨 (테스터 제보로 발견)
**제목**: 마니또 배정이 여러 순환 그룹으로 나뉠 경우, 공개 화면에서 일부 그룹이 누락됨  
**제보**: "마니또 랜덤 배정 시 서로 마니또가 되는 상황(상호 배정)이 발생하는지, 발생한다면 칭찬 공개하기 때 순환 구조 버그가 생기지 않는지" 문의 (2026-07-10)  
**증상**: 팀원이 4명 이상이고 배정이 하나의 큰 순환 고리가 아니라 여러 개의 작은 순환 그룹으로 나뉘는 경우(예: A↔B, C↔D 두 쌍), 마니또 공개 화면에 첫 번째 그룹만 표시되고 나머지 그룹의 칭찬은 화면에 전혀 나타나지 않음  
**원인**:
- 기존 `assignManito`(`lib/manito.ts`)는 Fisher-Yates 셔플 + "자기 자신 배정 불가(derangement)"만 검증. 전체가 하나의 순환 고리를 이루도록 강제하지 않음 → 상호 배정(2-cycle)이나 여러 분리된 순환 그룹이 통계적으로 발생 가능
- `buildChain`(`app/reveal/[sprintId].tsx:17-32`)은 하나의 체인만 순회하다 이미 방문한 노드를 만나면 중단 → 분리된 그룹은 렌더링에서 누락
**수정**: 마니또 배정 알고리즘을 전면 재설계 — 항상 팀 전체가 하나의 순환 고리를 이루도록 배정하는 방식으로 변경 (구조적으로 여러 그룹 분리가 불가능해짐). 겸사겸사 과거 배정 이력을 반영해 최근에 겹쳤던 쌍을 회피하는 기능도 함께 추가. 자세한 내용은 README.md의 "마니또 배정 알고리즘" 절 참고

---

### BUG-011 ✅ 해결됨
**제목**: "조르기" 대상 방향이 반대로 되어 있음  
**증상**: "마니또에게 칭찬 조르기" 버튼이 실제로는 "내가 칭찬해야 할 사람"(`myPair.targetId`)에게 나가고 있었음. 정작 "나를 칭찬해야 할 사람"에게는 아무 것도 안 감  
**원인**: `getMyPair`는 "내가 마니또인 대상"만 조회하고, 반대 방향("나를 타겟으로 하는 사람") 조회 함수가 아예 없었음  
**수정**: `lib/sprints.ts`에 `getMyManitoPair`(역방향 조회) 추가, `SprintContext`에 `myManitoId` 추가, 조르기가 이 값을 사용하도록 수정

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

### FEAT-006 ✅ 해결됨
**제목**: 보낸 칭찬 — 작성 후 10분 이내 수정 가능 (삭제는 미지원)  
**요청 내용**: 칭찬 탭 "보낸 칭찬"에서 작성 후 10분 이내라면 내용/카테고리를 수정할 수 있어야 함  
**수정**:
- `lib/praises.ts`: `PRAISE_EDIT_WINDOW_MS`(10분), `isPraiseEditable`, `getPraiseById`, `updatePraise` 추가
- `app/praise/edit/[praiseId].tsx` 신규 생성 — `write.tsx`와 동일한 UI로 내용/카테고리만 수정, 수신자는 표시만 하고 변경 불가
- `app/(tabs)/praises.tsx`: 보낸 칭찬 카드에 10분 이내일 때만 "수정하기" 버튼 노출 (30초 주기로 만료 여부 재확인)
- `firestore.rules`: `praises` `allow update`를 작성자 본인 + 작성 후 10분 이내 + `content`/`categories` 필드만 변경 가능하도록 서버 측에서도 강제

---

### FEAT-007 ✅ 해결됨
**제목**: 푸시 알림 (칭찬 수신 / 스프린트 시작 / 스프린트 공개 / 조르기) + 알림 끄기 설정  
**요청 내용**: FB-003, FB-004 참고 — 칭찬 받았을 때, 스프린트 시작/공개 시 알림. 이후 조르기 시 알림도 추가 요청  
**방식**: 백엔드(Cloud Functions) 없이 클라이언트가 Expo Push API를 직접 호출 (Firebase Blaze 요금제 전환 불필요)  
**수정**:
- `lib/notifications.ts`: `registerForPushNotifications`, `sendPushNotifications`(pushEnabled === false인 대상은 API 호출 자체를 안 함) 추가
- `lib/users.ts`: `UserProfile.pushToken`/`pushEnabled` 필드, `savePushToken`, `setPushEnabled`, `getUserProfilesByIds` 추가
- `contexts/auth-context.tsx`: 로그인/세션 복원 시 자동 토큰 등록 (단, `pushEnabled === false`면 건너뜀 — 안 그러면 꺼놔도 재로그인 시 자동으로 다시 켜지는 문제 있었음)
- `lib/praises.ts` `writePraise`/`recordNudge`, `lib/sprints.ts` `createSprint`/`revealSprint`: 각 이벤트 시점에 발송
- `app/(tabs)/profile.tsx`: 푸시 알림 켜기/끄기 토글 추가 (끌 때 토큰은 유지, 켤 때 토큰 있으면 권한 재요청 없이 재사용)
- Expo 프로젝트(EAS) 신규 연결 + Firebase 서비스 계정 키를 FCM V1 자격증명으로 Expo에 업로드 (Expo Push → FCM 라우팅에 필요)
- 발송 요청에 `priority: 'high'` + `channelId: 'default'` 누락으로 화면 꺼짐/잠금 상태에서 즉시 표시 안 되던 문제 수정
- `public/privacy-policy.html`: 푸시 토큰 수집 및 Expo(650 Industries) 처리위탁 명시

---

## 계획 중 (Planned, 미착수)

### FEAT-008 📋 설계 완료 (미구현)
**제목**: 팀 초대 코드 → 앱 링크 공유 (딥링크)  
**요청 내용**: 팀 관리 화면의 "초대 코드 복사"에 더해, 링크로 공유할 수 있게. 링크 클릭 시 앱 설치돼 있으면 바로 팀 가입, 없으면 Play스토어로 이동  
**설계 방향**:
- Firebase Dynamic Links는 Google이 신규 사용 중단 + 종료 예정이라 사용 불가 → **Android App Links**로 구현
- `https://praise-manitto-f7e38.web.app/join/{code}` 형태 링크, Firebase Hosting에 `.well-known/assetlinks.json`(릴리즈 서명 SHA-256 필요) + 앱 미설치 시 Play스토어 유도 랜딩 페이지 추가
- `app.json`에 `android.intentFilters` 추가 → **네이티브 설정 변경이라 새 릴리즈 빌드 필요** (기존 사용자도 업데이트해야 반영)
- 앱에서는 기존 `(onboarding)/join.tsx`의 `joinTeam(code)` 로직 재사용 (딥링크로 들어온 코드 자동 입력 + 로그인 필요시 로그인 후 자동 가입)
- 팀 관리 화면에 RN `Share` API로 "링크 공유" 버튼 추가
- iOS는 지금까지 빌드 이력이 없어 이번 범위에서는 제외 (Android만)

---

## 베타 테스터 피드백 (Tester Feedback)

> 비공개 테스트 중 테스터가 제보한 의견을 기록. 검토 후 버그/기능요청으로 승격하거나 대응 방침 결정.

### FB-002 ✅ 조치 완료
**제목**: 작성한 칭찬 오타 수정 방법 부재  
**증상**: 칭찬 작성 후 오타를 발견했을 때 수정할 수 있는 방법을 찾지 못함 (수정 기능 부재로 추정)  
**조치**: FEAT-006으로 승격 — 보낸 칭찬을 작성 후 10분 이내에는 내용/카테고리 수정 가능하도록 기능 추가  
**제보일**: 2026-07-10

---

### FB-003 ✅ 조치 완료
**제목**: 칭찬 수신 시 푸시 알림 요청  
**요청 내용**: 칭찬을 받았을 때 푸시 알림이 왔으면 좋겠다는 의견  
**조치**: FEAT-007로 승격 — 푸시 알림 기능 전체 추가  
**제보일**: 2026-07-10

---

### FB-004 ✅ 조치 완료
**제목**: "마니또에게 칭찬 조르기" 클릭 시 상대방 푸시 알림 여부 문의  
**문의 내용**: 조르기 버튼을 눌렀을 때 상대방에게 푸시 알림이 가는지 궁금하다는 의견  
**조치**: FEAT-007로 승격 — 조르기 시에도 푸시 알림 발송하도록 추가 (겸사겸사 조르기 대상 방향이 반대로 돼 있던 기존 버그도 같이 수정, BUG-011 참고)  
**제보일**: 2026-07-10

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

### Firestore 보안 규칙 현황 (2026-07-11 확인) ✅ 정식 규칙 배포 완료

전체 개방(임시 체험) 규칙 제거, 리소스별(users/teams/memberships/sprints/pairs/praises/nudgeLogs) 세부 권한으로 정식 배포 완료 (`firestore.rules` 참조). 만료 관련 이슈 해소.
