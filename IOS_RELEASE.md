# iOS 앱스토어 첫 출시 준비 기록

칭찬 마니또 앱을 처음으로 App Store에 제출하기 위한 작업 로그. 나중에 회고할 때
"왜 이렇게 했는지"를 다시 찾아볼 수 있도록 결정 배경과 진행 상황을 남겨둔다.

## 배경 — 왜 Android와 다른 방식을 쓰나

이 프로젝트는 Android는 `android/keystore.properties`로 서명을 로컬에 구성해두고
`./gradlew bundleRelease`를 사용자가 직접 실행하는 방식을 쓴다 (`.claude/skills/android-release-build/SKILL.md` 참고).

iOS는 처음이라 아래 두 가지 이유로 같은 방식(로컬 Xcode Archive)을 쓰지 않고
**EAS Build**를 쓰기로 했다 (2026-07-14 결정):

1. 개발 머신(M2 Air)에 Xcode가 설치돼 있지 않음 — Command Line Tools만 있고,
   `xcodebuild`가 동작하지 않는 상태였음. Xcode 풀 설치는 15GB+로 무거움.
2. 이번이 첫 제출이라 배포 인증서·프로비저닝 프로파일을 Apple Developer 포털에서
   수동으로 만드는 과정이 가장 까다로운 부분인데, EAS Build의 `eas credentials`가
   이 부분을 자동화해줌.

Xcode는 나중에 실기기 테스트/디버깅용으로 필요하면 그때 따로 설치하는 걸로 하고,
**릴리즈 빌드/제출 파이프라인만** EAS로 간다.

## 팀 구성

Apple Developer Program 계정은 배우자 명의로 가입/결제됨:

- **계정 소유자**: `studio.doosle@gmail.com` (김한슬), Team ID `23NF8794R3`
- **관리자로 합류**: `ljw8628@daum.net` (LEEJINUNG, 본인) — App Store Connect
  "사용자 및 액세스"에서 관리자 역할로 초대받아 합류 완료 (2026-07-14)

둘 다 같은 팀에서 작업하니 Apple 개발자 프로그램은 **한 번만 결제하면 됨**. 인증서/
프로비저닝 프로파일도 한쪽이 EAS로 최초 생성해두면 같은 Expo 프로젝트를 쓰는 이상
서로 재로그인 없이 재사용된다.

## 현재 상태

- [x] `eas.json`에 iOS `development`(시뮬레이터) / `preview`(시뮬레이터) /
      `production`(스토어 배포) 빌드 프로필 추가
- [x] Apple Developer Program 가입 확인 — Team ID `23NF8794R3`, Active
- [x] 본인(`ljw8628@daum.net`)을 App Store Connect에 관리자로 추가 완료
- [x] `npx eas-cli login` — Expo 계정 로그인
- [x] `npx eas-cli build --platform ios --profile production` 최초 실행 —
      **와이프(`studio.doosle@gmail.com`) 계정으로 로그인해서 진행.** 배포
      인증서(Serial `303CD1...`)/프로비저닝 프로파일(`N5AS5SJFHH`) 정상 생성,
      APNs Push Key도 같이 생성해서 프로젝트에 연결 완료. 빌드는 EAS 클라우드에서
      큐잉됨 (로그: https://expo.dev/accounts/studiojinung/projects/praise-manitto-app/builds/70e98808-1717-45f5-b6b9-45dee036ae60)
- [x] 빌드 완료 확인 — `expo-build-properties`의 `extraPods` modular header 수정
      이후 `pod install` 통과, 빌드 성공
- [x] App Store Connect에 앱 레코드 생성 (번들 ID `com.jinung.praise.manitto`,
      이름 "칭찬 마니또", SKU `com.jinung.praise.manitto`)
- [x] `npx eas-cli submit --platform ios --profile production` — ASC API Key를
      새로 생성해서 저장(다음부터는 Apple 재로그인 없이 제출 가능), TestFlight
      업로드 완료 확인함
- [x] Sign in with Apple 코드 구현 완료 — `expo-apple-authentication` 설치,
      `app.json`에 플러그인 등록(entitlement 자동 추가), `lib/apple-auth.ts`
      (nonce 생성/네이티브 로그인), `auth-context.tsx`의 `signInWithApple`/
      `isAppleAccount`(탈퇴 재인증 포함), `use-apple-sign-in.ts` 훅,
      login/register 화면에 iOS 전용 Apple 버튼 추가
  - [x] Firebase 콘솔 → Authentication → Sign-in method에서 Apple 제공업체 활성화 완료
  - [x] entitlement 반영된 새 빌드 → TestFlight 업로드까지 완료 (본인 계정으로 진행)
  - [x] 실기기(dev-client)에서 실제 Apple 로그인 테스트 완료 — 정상 동작 확인
- [x] 실기기 개발 워크플로우(dev-client) 구축 완료 — 아래 "실기기 개발 워크플로우" 참고
- [x] 개인정보처리방침 호스팅 확인 — `https://praise-manitto-f7e38.web.app/privacy-policy.html`
      (Firebase Hosting)로 실제 공개돼 있음을 확인
- [x] 개인정보처리방침/이용약관에 Apple 로그인 반영 — 기존 문서엔 Google 로그인만
      명시돼 있어서 수집 항목(Apple 로그인 시 이메일/이름)과 가입 방식(제3조)을
      갱신하고 Firebase Hosting에 재배포함
- [x] iOS 앱 아이콘 알파 채널 문제 수정 — `assets/images/whale-icon-ios.png`를
      알파 채널 없이 새로 만들어 `app.json`의 `ios.icon`에 연결 (알파 채널이
      있으면 App Store 업로드 자체가 거부됨). Android 적응형 아이콘 원본은
      투명도가 필요해서 그대로 둠
- [ ] App Privacy(데이터 수집) 설문 작성 — App Store Connect에서 직접 채워야 함.
      개인정보처리방침 기준: 이메일 주소, 이름(Google/Apple 로그인), 닉네임/
      자기소개/아바타(선택), 사용자 콘텐츠(칭찬 메시지), 기기 푸시 토큰
- [ ] 스크린샷, 앱 설명/키워드/카테고리, 연령 등급, 가격/배포 국가 — 아직 미착수
- [ ] 심사에 제출할 빌드를 버전에 연결
- [ ] 심사용 테스트 계정 준비 (소셜 로그인만 있으면 심사관이 못 들어갈 수 있음 —
      다만 이메일/비밀번호 가입도 가능해서 필수는 아님, 있으면 권장)

## 실기기 개발 워크플로우 (구축 완료)

Xcode 없이도 Android(`expo run:android`)처럼 실기기에서 실시간 리로드하며
개발하는 방법 — TestFlight을 매번 거치지 않아도 됨. 아래 순서로 진행해서 정상
동작 확인함:

1. `npx eas-cli device:create` — Website 방식 선택 → 나온 URL을 아이폰 Safari로
   열어서 UDID 자동 등록 (Provisioning Profile `AW3ZMBV8RN`, 기기: iPhone).
   **와이프(`studio.doosle@gmail.com`) 계정으로 로그인해서 진행** — 본인 계정은
   여전히 팀 연결이 안 돼 있어서 이 단계도 같은 에러가 남 (이슈 로그 참고)
2. `eas.json`의 `development` 프로필에서 `ios.simulator: true` 제거 →
   `production`처럼 실기기용(ad-hoc) 빌드로 변경
3. `npm install expo-dev-client` (eas build가 필요하다고 안내해서 설치)
4. `eas build --profile development --platform ios` 빌드 → 로그 페이지의 설치
   QR/링크를 아이폰 Safari 또는 카메라로 열어서 설치
5. 최초 실행 시 아이폰 **설정 → 개인정보 보호 및 보안 → 개발자 모드** 켜야
   실행됨 (iOS 16+ 필수, 재시작 후 팝업에서 "켜기")
6. **설정 → 일반 → VPN 및 기기 관리**에서 개발자 프로필 신뢰(Trust) 필요할 수 있음
7. `npx expo start --dev-client` 실행 후 앱에서 QR 스캔하면 연결 — 이후 코드
   저장할 때마다 실시간 리로드 (Android와 동일한 경험)

이 dev-client 빌드에서 **Sign in with Apple도 실기기로 테스트 완료** — entitlement가
같은 번들 ID(App ID)에 묶여있어서 배포 방식(ad-hoc/TestFlight/App Store)과
무관하게 동일하게 동작함.

**참고 — 헷갈리기 쉬운 계정 3종류:**
- `eas build`가 물어보는 Apple ID 로그인 = 인증서/프로파일 관리용 **개발자 팀 계정**(와이프)
- 아이폰에 설치되는 것 자체 = ad-hoc 프로파일에 등록된 **기기 UDID** 기준이라
  폰에 로그인된 iCloud 계정과는 무관
- 앱 안에서 "Sign in with Apple" 버튼을 누를 때 = **사용자 개인 Apple ID**(본인
  iCloud 계정) 그대로 사용하면 됨 — 개발자 계정과 무관

**참고 — 와이프의 별도 앱과의 관계:** 와이프는 본인 앱을 별도 Expo 계정으로
개발 중. Expo/EAS 계정과 빌드 사용량은 계정별로 완전히 분리되고, Apple
Developer Program은 앱 개수가 아니라 계정(팀) 단위 연 결제라 **하나의 Apple
개발자 계정으로 여러 앱을 추가 비용 없이 등록 가능** — 두 앱 다 와이프 계정
하나로 App Store에 낼 수 있음. 기기 등록(최대 100대/년)만 유일하게 공유되는
자원인데 전혀 문제 될 규모가 아님.

## 다음 사람이 할 일 (순서대로)

1. Apple Developer Program 가입돼 있는지 확인 (연 $99, 없으면 먼저 가입)
2. `npx eas-cli login`
3. `npx eas-cli build --platform ios --profile production` 실행하고 안내에 따라
   서명 설정 진행
4. 빌드 끝나면 App Store Connect에서 앱 레코드 생성 (아직 없다면)
5. `npx eas-cli submit --platform ios --profile production`으로 TestFlight 업로드
6. TestFlight에서 한 번 실제로 설치해서 확인
7. 그 다음에 Sign in with Apple 작업 착수 (이 문서와 별개로 진행)

## 이슈 로그

- **"You are not registered as an Apple Developer" 에러** (`eas build --platform
  ios` 최초 실행 시): 결제·본인확인을 이미 마쳤는데도 발생. Apple 쪽 등록 처리가
  아직 반영 안 된 시점이어서 난 것으로 보이고, 시간이 지나 Developer Portal
  접속이 정상화되면서 해소됨. 재발하면 [developer.apple.com/account/#/membership](https://developer.apple.com/account/#/membership)에서
  Membership 상태가 Active인지부터 확인할 것.
- **팀원 초대 시 결제 화면이 다시 뜬 문제**: App Store Connect에서 관리자로
  초대됐는데도, `developer.apple.com`의 일반 "Apple Developer Program 등록"
  링크로 직접 들어가면 본인 명의의 **별도 유료 가입** 화면이 뜸 — 이건 팀 초대
  수락 경로와 무관한 화면이라 결제하면 안 됨.
- **`eas build`가 "You have no team associated with your Apple account"로 실패**:
  App Store Connect엔 관리자로 정상 표시(`ljw8628@daum.net`)됐는데도
  `developer.apple.com/account`에서는 본인 계정이 "대기 중" + 멤버십 구입 요구
  상태였음. 와이프 계정이 **Individual(개인) 타입** Apple Developer 계정이라
  팀원 추가가 Organization 계정보다 까다로운 것으로 보임. Apple Developer
  Agreement 서명 확인 메일(`Agreement signed: Apple Developer Agreement`)까지는
  받았으나, 이 문제 자체는 근본적으로 해결하지 않고 **와이프 계정으로 첫 빌드를
  진행하는 우회로**를 택함 — 한쪽이 EAS로 인증서/프로파일을 한 번 만들어두면
  같은 Expo 프로젝트에서는 이후 Apple 재인증 없이 빌드되므로, 본인 계정의 팀
  연결 문제는 급하지 않으면 나중에 Apple Developer Support에 문의해서 정리하면 됨.
  → **추가 확인**: `eas device:create` 실행 시 본인 계정으로도 동일하게
  "no team associated" 에러 재발 확인 — 본인 계정의 Developer Portal 팀 연결
  문제는 아직 미해결 상태. 와이프 계정으로 우회하는 패턴이 계속 필요함.
- **`pod install` 실패 — "AppCheckCore ... GoogleUtilities and RecaptchaInterop,
  which do not define modules"**: `@react-native-google-signin/google-signin`이
  끌어오는 GoogleSignIn iOS SDK 9.x가 Swift pod `AppCheckCore`에 의존하는데, 이게
  정적 라이브러리로 빌드될 때 `GoogleUtilities`/`RecaptchaInterop`에 modular
  header가 필요해서 남. `ios/`가 EAS 클라우드 빌드 때마다 새로 prebuild되므로
  로컬에서 Podfile을 직접 고쳐도 소용없고, config plugin으로 넣어야 함.
  - 1차 시도로 `expo-build-properties`에 `ios.useModularHeaders: true`를 넣었는데
    **이 옵션 자체가 설치된 버전(1.0.10)엔 없는 옵션**이라 조용히 무시되고 같은
    에러 재발 (`node_modules/expo-build-properties/build/pluginConfig.js`에서
    실제 스키마 확인함).
  - 실제로 맞는 옵션은 `ios.extraPods` 배열에 `{ name, modular_headers: true }`
    형태로 pod별 지정하는 것 — `GoogleUtilities`, `RecaptchaInterop` 두 개에
    적용해서 해결.

## 참고

- `eas.json`의 `cli.appVersionSource`가 `"remote"`라서 iOS의 buildNumber는
  EAS가 서버 쪽에서 알아서 증가시켜준다 — Android처럼 `app.json`과 별도 파일을
  손으로 맞출 필요는 없음.
- Android는 이 파이프라인과 완전히 무관 — 계속 로컬 Gradle로 간다.
