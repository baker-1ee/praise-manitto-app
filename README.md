# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## 마니또 배정 알고리즘

칭찬 마니또 앱의 핵심 로직 — 스프린트를 새로 만들 때마다 팀원 전체를 한 명씩 서로 연결하는 "마니또 배정"을 어떻게 계산하는지 정리한다. 구현은 [`lib/manito.ts`](lib/manito.ts)(순수 함수, Firestore 의존 없음)와 [`lib/sprints.ts`](lib/sprints.ts)(Firestore에서 과거 이력을 읽어 넘겨주는 부분)로 나뉘어 있다.

### 요구사항

1. 팀원 수(N)에 따라 적절한 과거 이력을 참고해서, 최대한 예전에 배정된 적이 없는 마니또 쌍을 우선 배정한다.
2. N이 아주 작거나, 스프린트 중간에 새로 합류한 팀원이 있어도 에러 없이 항상 배정에 성공한다.
3. (설계 중 추가로 발견된 요구사항) 팀 전체가 반드시 **하나의 순환 고리**를 이루어야 한다 — 여러 개의 분리된 순환 그룹으로 나뉘면 마니또 공개 화면(`app/reveal/[sprintId].tsx`)의 꼬리물기 체인이 첫 번째 그룹만 그리고 나머지를 누락시키는 문제가 있었다 (`QA.md` BUG-005). 이 요구사항 덕분에 그 버그가 알고리즘 차원에서 원천적으로 해결됐다.

### 파이프라인 3단계

#### 1) 이력 조회 깊이 계산 — `getHistoryDepth(N)`

```
M(N) = clamp(⌈(N-1)/2⌉, 3, 20)
```

팀원 N명이면 가능한 전체 쌍은 `C(N,2)`개, 한 스프린트는 그중 N개만 사용하므로 "전체 쌍을 한 바퀴 순회하는 데 필요한 스프린트 수"는 대략 `(N-1)/2`. 이보다 깊이 조회해봐야 감쇠(아래 2단계)로 인해 영향이 거의 없고, 오히려 오래된 신호가 섞여 정확도가 떨어지는 경향이 시뮬레이션으로 확인됐다. 최소 3, 최대 20으로 잘라 Firestore 읽기 비용도 제한한다.

| N | M(N) |
|---|---|
| 2~4 | 3 |
| 8 | 4 |
| 14 | 7 |
| 20 | 10 |
| 30 | 15 |
| 41 이상 | 20 (상한) |

#### 2) 쌍별 가중치 계산 (지수 감쇠) — `buildPairWeights`

조회된 M개 스프린트의 배정 쌍마다, "몇 스프린트 전이었는가"를 기준으로 지수 감쇠 가중치를 누적한다.

```
weight(pair) = Σ 0.5 ^ ((해당 스프린트가 몇 스프린트 전인가 - 1) / half-life)
half-life = 2 스프린트
```

하드 컷오프(예: "5개 이전은 무조건 무시") 대신 연속적인 감쇠를 쓰기 때문에 팀 규모별로 값을 따로 튜닝할 필요가 없다. 현재 팀원 목록에 둘 다 남아있는 쌍만 반영하므로 탈퇴한 팀원의 과거 기록은 자동으로 걸러지고, 새로 합류한 팀원은 이력이 전혀 없어 모든 쌍의 가중치가 0 — 별도 분기 없이 "아직 안 만난 사이"로 자연스럽게 최우선 배정 대상이 된다.

#### 3) 최소 비용 순환 탐색 — `assignManito`

"비용"은 순환을 이루는 인접 쌍들의 가중치 합. 이를 최소화하는 단일 순환을 찾는 문제로, 팀 규모에 따라 두 가지 방식을 쓴다.

- **N ≤ 8**: 가능한 모든 순환 `(N-1)!`개(최대 5040개)를 전수탐색해 완전 최적해를 찾는다.
- **N > 8**: `(N-1)!`이 너무 커서 전수탐색이 불가능하므로,
  1. 무작위 시작점 최대 10곳에서 **그리디 최근접 이웃 구성**(현재 노드에서 가중치가 가장 낮은 미방문 노드로 계속 연결)
  2. 각 결과에 **2-opt 로컬서치**(두 구간을 뒤집어서 비용이 줄면 채택, 더 이상 개선 안 될 때까지 반복)
  3. 10개 시작점 결과 중 최저 비용을 채택

  순수 무작위 셔플을 여러 번 시도해 최솟값을 고르는 방식도 검토했으나, N=14 기준 평균 비용 5.3(반복 쌍 다수 포함) vs 그리디+2-opt 평균 비용 0(반복 없음)으로 품질 차이가 커서 채택하지 않았다.

  성능 (시작점 10개 고정, 순수 JS 기준):

  | N | 소요시간 |
  |---|---|
  | 14 | ~2ms |
  | 30 | ~13ms |
  | 50 | ~45ms |
  | 100 | ~300ms |

동률 처리: 최적 비용이 여러 후보에서 동시에 나오면 그중 하나를 무작위로 선택해 매번 같은 배치가 나오지 않도록 한다.

### 예외 처리

| 상황 | 동작 |
|---|---|
| N < 2 | 명시적 에러 (`팀원이 최소 2명 이상이어야 합니다.`) |
| N = 2 | 가능한 순환이 A↔B 하나뿐 — 이력과 무관하게 항상 성공. (2명일 때 상호 배정은 구조적으로 불가피하며 버그 아님) |
| 이력이 전혀 없음 (신생 팀의 첫 스프린트) | 가중치 맵이 비어 있어 모든 후보 비용이 0 → 완전 랜덤 순환 |
| 스프린트 중간 합류한 신규 팀원 | 그 팀원과 관련된 모든 쌍 가중치가 0 → 에러 없이 "아직 안 만난 사이"로 우선 배정 |
| 탈퇴 후 팀원 목록에서 제외된 사용자의 과거 기록 | 가중치 계산 시 현재 팀원 목록에 없는 쪽은 자동 필터링되어 반영되지 않음 |

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
