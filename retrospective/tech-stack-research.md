# 칭찬 마니또 앱 기술 스택 이해 자료
### (React Native / Expo / EAS / Firebase)

지식공유회 발표 준비를 위한 배경 조사 자료입니다. 각 기술의 등장배경, 역사, 시장점유율, 강점/약점, 경쟁 서비스를 정리했습니다.

> **⚠️ 참고**: 등장배경·역사 서술은 Wikipedia, 공식 문서, 엔지니어링 블로그 등 신뢰도 높은 출처에 기반했습니다. 반면 "시장점유율(%)" 수치는 조사기관마다 편차가 크고, 일부는 SEO 목적의 블로그성 콘텐츠라 신뢰도가 낮습니다(예: RN 점유율이 자료마다 35%/38%/42%로 제각각). 발표 자료에 구체적인 %를 못박아 넣기보다는 "Flutter와 React Native가 크로스플랫폼 시장을 양분하고 있다" 정도의 정성적 표현으로 쓰거나, 발표 전 Statista·SlashData 등 1차 출처를 직접 확인하시길 권합니다.

---

## 1. React Native

### 등장배경

2012년 마크 저커버그는 "회사가 저지른 가장 큰 실수는 네이티브 대신 HTML5에 너무 많이 베팅한 것"이라고 말했습니다. 당시 페이스북 모바일 앱은 HTML5 기반이라 반응이 느리고 불안정했고, 이 실패를 계기로 "웹 개발의 생산성"과 "네이티브 앱의 성능"을 동시에 잡는 방법을 찾기 시작했습니다.

2013년 여름, 페이스북 내부 해커톤에서 조던 월크(Jordan Walke)가 JavaScript로 iOS UI를 백그라운드 스레드에서 생성하는 실험을 했고, 이것이 React Native의 시초가 되었습니다.

### 역사

- **2015년 1월**: React.js Conf에서 최초 프리뷰 공개
- **2015년 3월 25일**: F8 컨퍼런스에서 iOS용 오픈소스 공개
- **2015년 9월 14일**: Android 지원 공개
- 이후 Discord, Shopify, Coinbase, Tesla 앱 등 다수의 글로벌 서비스가 채택
- 2018년경 페이스북이 "New Architecture"(Fabric, TurboModules) 개발 착수, 2024년 New Architecture가 기본값으로 전환되며 성능 이슈를 상당 부분 해소

### 시장점유율

- Flutter와 React Native가 크로스플랫폼 시장의 80% 이상을 양분
- 조사 기관에 따라 수치는 다르지만 대략 Flutter 42~46%, React Native 35~42% 수준으로 보고됨
- JavaScript/TypeScript 생태계 덕분에 개발자 채용 풀은 Flutter(Dart) 대비 3~5배 넓음 (LinkedIn 기준 채용 공고도 수 배 많음)
- Discord는 iOS/Android 코드의 98%를 공유하며 React Native 사용 중인 대표 사례

### 강점

- **하나의 코드베이스로 iOS/Android 동시 개발** → 개발 리소스 절감
- **JavaScript/TypeScript 기반** → 웹 개발자가 빠르게 적응 가능(수일 내 생산성 발휘)
- **거대한 생태계와 커뮤니티** → npm 패키지, 라이브러리, 레퍼런스 풍부
- **네이티브에 가까운 UI/UX** → 플랫폼별 고유 UI 컴포넌트 활용 가능
- 배터리 소모 적고 앱 시작 속도가 Flutter보다 다소 빠르다는 벤치마크 존재(약 200ms, 배터리 12%↓)

### 약점

- 그래픽/애니메이션이 매우 무거운 앱에서는 Flutter 대비 다소 느림 (Flutter 58~60fps vs RN Fabric 51fps 벤치마크 사례)
- 일부 기능은 iOS/Android용 네이티브 코드를 별도로 작성해야 함
- 네이티브 모듈 연동 시 여전히 iOS/Android 지식이 필요한 경우 존재
- 과거(New Architecture 이전) 브릿지 방식으로 인한 성능 오버헤드 문제가 있었음(현재는 대부분 개선)

### 경쟁 서비스

| 프레임워크 | 특징 |
|---|---|
| **Flutter** (Google) | Dart 언어, 자체 렌더링 엔진(Skia/Impeller)으로 픽셀 단위 일관성과 높은 애니메이션 성능. 학습 곡선(Dart 적응 2~3주)이 단점 |
| **Ionic / Capacitor** | 웹 기술(HTML/CSS/JS) 기반, WebView 구동 → 성능은 상대적으로 낮음 |
| **Native (Swift/Kotlin)** | 최고 성능·완전한 플랫폼 제어, 그러나 플랫폼별 두 벌의 코드 유지 필요 |
| **Lynx** (ByteDance, 최근 등장) | 틱톡 팀이 공개한 신규 크로스플랫폼 프레임워크, 아직 초기 단계 |

---

## 2. Expo

### 등장배경

2012년 Charlie Cheever(Quora CTO, 前 페이스북 초기 엔지니어)는 Quora의 iOS/Android 앱을 만들면서 "몇 주면 될 줄 알았던" 네이티브 개발이 플랫폼당 수개월씩 걸리고 개발 경험도 매우 나쁘다는 것을 체감했습니다. "웹 개발의 좋은 점을 모바일 개발에도 가져오자"는 목표로 James Ide와 함께 실험을 시작한 것이 Expo의 출발점입니다.

### 역사

- **2015년**: 페이스북 출신 엔지니어들과 Charlie Cheever가 Expo(당시 이름 "Exponent") 창업. 공교롭게도 React Native가 오픈소스로 공개된 시점과 겹침
- **2017년**: "Exponent"에서 발음/기억이 쉬운 "Expo"로 리브랜딩
- React Native 위에서 동작하는 개발 도구/SDK 모음으로 시작 → Create React App과 유사하게 "설정 없이 바로 개발 시작" 경험 제공이 목표
- 이후 EAS(빌드/배포 클라우드 서비스), Expo Router, Expo Go 앱 등으로 확장하며 React Native 개발의 표준 스타터 키트로 자리잡음

### Expo vs Bare React Native

- 2026년 기준 "약 95%의 신규 프로젝트는 Expo로 시작하는 것이 권장"된다는 평가가 다수
- 과거엔 "Expo Managed Workflow는 네이티브 커스터마이징이 막혀있다(lock-in)"는 비판이 있었지만, `expo prebuild` 명령으로 필요 시 언제든 Bare Workflow로 전환 가능해지며 이 우려는 크게 해소됨

### 강점

- Xcode/Android Studio 설치 없이 빠르게 프로젝트 시작 가능 (Expo Go 앱으로 즉시 실행/테스트)
- 50개 이상의 검증된 네이티브 모듈을 표준 SDK로 제공 (카메라, 위치, 알림 등)
- EAS Update로 스토어 심사 없이 JS/에셋 변경사항을 OTA(무선)로 배포 가능 → 핫픽스에 유용
- 버전 업그레이드가 상대적으로 수월(Continuous Native Generation)
- 앱스토어 배포 파이프라인(EAS Build/Submit)까지 통합 제공

### 약점

- Expo SDK 버전이 특정 React Native 버전에 맞춰 릴리즈되므로, 최신 RN 기능 도입이 다소 지연될 수 있음
- 프레임워크 계층이 하나 추가되므로 앱 크기·추상화 오버헤드가 약간 존재(대부분의 앱엔 무시할 수준)
- 매우 특수한 네이티브 SDK를 다뤄야 하는 극단적 케이스에선 여전히 Bare 워크플로우가 필요

### 경쟁/대안

- **Bare React Native CLI**: 완전한 네이티브 제어가 필요한 팀이 선택. 네이티브 지식 보유 인력 필수
- **Ignite (Infinite Red)**: 커뮤니티 보일러플레이트/CLI 도구, Expo보다 사용 빈도는 낮음

---

## 3. EAS (Expo Application Services)

### 등장배경 / 정의

EAS는 Expo 팀이 만든 **클라우드 기반 빌드·배포·업데이트 서비스**입니다. 기존에는 iOS 빌드를 위해 Mac(Xcode)이 반드시 필요했고, 인증서/프로비저닝 프로파일 관리, 스토어 제출 등 배포 과정 자체가 복잡했습니다. EAS는 이 전체 파이프라인을 클라우드에서 대행해 "Mac 없이도 iOS 앱을 빌드/배포"할 수 있게 한 것이 핵심 등장 배경입니다.

### 핵심 기능 3가지

1. **EAS Build**: 클라우드에서 iOS/Android 앱을 컴파일·서명 (커스텀 네이티브 코드 포함 가능)
2. **EAS Submit**: 빌드된 앱을 CLI 한 줄로 App Store/Play Store에 제출
3. **EAS Update**: 스토어 심사 없이 JS 번들만 OTA로 즉시 업데이트 (다른 CI/CD 도구엔 없는 차별점)

### 강점

- 인증서·프로비저닝 프로파일을 EAS가 자동 생성·관리·갱신 → Apple Developer 포털을 직접 만질 일이 거의 없음
- Mac(Mac mini 등 초기비용 약 $599) 없이도 iOS 빌드/배포 가능 → 소규모 팀·1인 개발자에게 특히 유리
- EAS Update의 OTA 배포는 핫픽스·A/B 테스트에 강력함
- Expo 생태계와 완전 통합되어 별도 CI 설정 부담이 적음

### 약점 / 대안 대비 트레이드오프

- 무료 티어의 빌드 큐/크레딧 제한이 있어 사용량이 많아지면 유료 플랜 필요
- 클라우드 빌드이므로 완전한 커스텀 빌드 환경 제어는 Fastlane 등 셀프호스팅 대비 제한적
- OTA 업데이트(EAS Update)는 앱스토어 심사를 우회하는 방식이라, 정책상 네이티브 코드 변경은 반영 불가 (JS/에셋만 가능)

### 경쟁 서비스

| 서비스 | 특징 |
|---|---|
| **Fastlane** | Ruby 기반 오픈소스 자동화 도구. 로컬/CI 어디서든 실행 가능하지만 인증서는 `match`로 직접 관리(Git 저장소에 암호화 저장) 필요 |
| **Codemagic** | React Native/Flutter 특화 CI/CD. 자체 CodePush형 OTA 서비스도 제공(월 $99~) |
| **Bitrise** | 범용 모바일 CI/CD, 다양한 통합 제공하나 설정 복잡도는 EAS보다 높음 |
| **App Center (Microsoft)** | 과거 많이 쓰였으나 2025년 이후 서비스 축소/단종 수순 |

---

## 4. Firebase

### 등장배경

Firebase는 2011년 James Tamplin과 Andrew Lee가 만든 채팅 API 스타트업 **Envolve**에서 출발했습니다. Envolve는 웹사이트에 실시간 채팅 기능을 붙여주는 API였는데, 개발자들이 이 실시간 동기화 인프라를 채팅이 아니라 **게임 상태 등 일반 애플리케이션 데이터를 실시간 동기화**하는 용도로 쓰고 있다는 걸 발견했습니다. 이에 채팅 기능과 실시간 동기화 엔진을 분리해 별도 회사로 설립한 것이 Firebase입니다.

### 역사

- **2011년**: Firebase 설립 (Envolve에서 분사)
- **2012년 4월**: 퍼블릭 베타 출시
- **2012년 5월**: 시드 펀딩 110만 달러 유치
- **2013년 6월**: 시리즈 A 560만 달러 유치
- **2014년 10월**: **구글이 Firebase 인수**
- 이후 구글이 Firestore, Cloud Functions, Authentication, Crashlytics, Remote Config, Hosting 등을 통합하며 종합 "모바일/웹 백엔드 플랫폼(BaaS)"으로 확장
- 2026년 기준 PostgreSQL 지원을 위한 Data Connect 도입 등 NoSQL 편중 이슈에 대응 중

### 시장점유율

- 오랫동안 BaaS(Backend as a Service) 시장의 절대 강자였으나, 2025~2026년 사이 오픈소스 기반 **Supabase**가 급성장 (BaaS 시장 점유율 2025년 12% → 2026년 1분기 28%로 보고됨)
- Firebase는 신규 가입자 증가세가 전년 대비 약 15% 둔화된 것으로 나타남
- 다만 절대 규모로는 여전히 압도적: SDK 저장소 21만+ GitHub 스타, 주간 npm 다운로드 1,000만+ , StackOverflow 질문 5만+ 건
- 시장은 크게 3진영으로 분화: Postgres 진영(Supabase 선두), 문서형 DB 진영(Firebase 선두), 클라우드 네이티브 진영(AWS Amplify)

### 강점

- **Auth + Firestore + Cloud Functions + Hosting**이 즉시 통합 제공되어 프론트엔드 개발자만으로도 완전한 백엔드 구축 가능 (1인/2인 스타트업에 특히 유리)
- Firestore의 실시간 리스너로 협업 기능, 실시간 동기화 구현이 쉬움
- 오프라인 동기화, 푸시 알림 등 모바일 앱에 최적화된 기능 다수
- 구글 클라우드 생태계와의 연동성

### 약점

- **쿼리 모델이 제한적**: 컬렉션 간 JOIN 불가, 임의의 복잡한 쿼리 불가, 전문(full-text) 검색은 외부 서비스 연동 필요
- **과금 예측이 어려움**: 읽기/쓰기 단위 과금(Blaze 요금제)에 상한이 없어 트래픽 급증 시 비용이 급격히 증가 (월 $50 → $5,000 사례도 보고됨)
- **벤더 락인**: Firestore는 독자적인 NoSQL 데이터 모델을 사용해 이후 다른 DB로 마이그레이션하기 어려움
- 이미 서비스가 커진 뒤 비용 문제를 인지하는 경우가 많아, 그 시점엔 이미 생태계에 깊이 종속되어 있는 경우가 흔함

### 경쟁 서비스

| 서비스 | 특징 |
|---|---|
| **Supabase** | PostgreSQL 기반 오픈소스 BaaS, Firebase 대비 40~60% 저렴하다는 평가, SQL 기반이라 관계형 쿼리 자유도 높음. 최근 가장 빠르게 성장 중 |
| **AWS Amplify** | AppSync, DynamoDB, Cognito, S3, Lambda를 코드로 자동 프로비저닝. HIPAA/FedRAMP 등 규제 산업에 강점 |
| **Appwrite** | 셀프호스팅 가능한 오픈소스 BaaS |
| **MongoDB Atlas / Back4App** | 각각 문서형 DB, Parse 기반 오픈소스 대안 |

---

## 5. 종합 비교 요약

| 구분 | React Native | Expo | EAS | Firebase |
|---|---|---|---|---|
| 창시 배경 | 페이스북 모바일 웹뷰(HTML5) 실패 극복 | Quora 창업자의 네이티브 개발 고통 해소 | 모바일 빌드/배포 파이프라인 복잡성 해소 | 채팅 API에서 실시간 동기화 니즈 발견 |
| 최초 공개 | 2015 | 2015 (Exponent) | Expo 확장 서비스로 이후 등장 | 2012 (베타) |
| 소유 주체 | Meta (오픈소스) | Expo(회사) | Expo(회사) | Google (2014 인수) |
| 시장 위치 | 크로스플랫폼 2강 중 하나 (Flutter와 경쟁) | RN 개발 사실상 표준 스타터 | RN/Expo 빌드·배포 사실상 표준 | BaaS 선두주자, Supabase가 빠르게 추격 |
| 최대 경쟁자 | Flutter | Bare RN CLI | Fastlane, Codemagic | Supabase, AWS Amplify |
| 핵심 강점 | 하나의 코드로 양 플랫폼, JS 생태계 | 빠른 시작, 통합 SDK | Mac 없이 빌드/배포, OTA 업데이트 | 올인원 백엔드, 실시간 동기화 |
| 핵심 약점 | 고성능 그래픽엔 약간 열세 | 최신 RN 기능 반영 지연 가능 | 클라우드 빌드 큐 제한 | 과금 예측 어려움, 벤더 락인 |

---

## 6. 칭찬 마니또 앱 맥락에서의 시사점 (발표 포인트 제안)

- **왜 이 스택을 선택했는가**: 1인/소규모 개발로 iOS·Android 동시 대응이 필요할 때, React Native(교차 플랫폼) + Expo(빠른 시작·통합 SDK) + EAS(Mac 없이 스토어 배포) + Firebase(서버 구축 없이 인증·DB·알림) 조합은 "처음 앱을 만들어 스토어까지 배포"하는 목표에 가장 학습 곡선이 낮은 조합이라는 점을 강조할 수 있습니다.
- **회고 포인트**: Firebase의 과금 구조, Firestore 쿼리 제약, EAS 빌드 큐 대기시간 등 실제 겪었던 이슈가 있다면 위 "약점" 항목과 연결해 실제 경험담으로 발표하면 설득력이 높아집니다.
- **향후 확장 시 고려사항**: 트래픽이 커질 경우 Firebase 비용 구조나 Supabase 등 대안 검토 여지가 있다는 점도 언급 가능합니다.

---

## 출처

- [React Native - Wikipedia](https://en.wikipedia.org/wiki/React_Native)
- [The History of React Native - TechAhead](https://www.techaheadcorp.com/knowledge-center/history-of-react-native/)
- [React Native for Android - Meta Engineering](https://engineering.fb.com/2015/09/14/developer-tools/react-native-for-android-how-we-built-the-first-cross-platform-react-native-app/)
- [Flutter vs React Native: 46% vs 35% Market Share [2026] - Tech Insider](https://tech-insider.org/flutter-vs-react-native-2026/)
- [React Native vs Flutter 2026 - SharpSkill](https://sharpskill.dev/en/blog/react-native/react-native-vs-flutter-comparison)
- [History and Current Status of Expo - Medium](https://medium.com/dooboolab/history-and-current-status-of-expo-30eeb329ad18)
- [Cross-platform mobile development with Expo - Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/expo)
- [React Native vs Expo in 2026 - Brilworks](https://www.brilworks.com/blog/react-native-vs-expo/)
- [Expo Application Services - Expo Docs](https://docs.expo.dev/eas/)
- [Expo EAS vs Fastlane vs Bitrise 2026 - PkgPulse](https://www.pkgpulse.com/guides/expo-eas-vs-fastlane-vs-bitrise-react-native-cicd-2026)
- [Firebase - Wikipedia](https://en.wikipedia.org/wiki/Firebase)
- [How to Build a Product Loved by Millions and Get Acquired by Google: The Firebase Story](https://foundercollective.medium.com/how-to-build-a-product-loved-by-millions-and-get-acquired-by-google-the-firebase-story-82dab4e3e80c)
- [Supabase vs Firebase 2026 - Tech Insider](https://tech-insider.org/supabase-vs-firebase-2026/)
- [Firebase Key Advantages and Disadvantages - Back4App](https://blog.back4app.com/firebase-advantages-and-disadvantages/)
- [Firebase pricing 2026 - Sashido](https://www.sashido.io/en/blog/firebase-guide-and-pricing-traps-2026)
