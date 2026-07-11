/**
 * 마니또 배정 알고리즘
 *
 * 팀 전체가 항상 하나의 순환 고리(Hamiltonian cycle)를 이루도록 배정한다.
 * (여러 개의 분리된 순환 그룹이 생기면 마니또 공개 화면의 꼬리물기 체인이
 *  첫 번째 그룹만 표시하고 나머지를 누락시키는 문제가 있었음 — QA.md BUG-005)
 *
 * 과거 스프린트 이력을 반영해 최근에 겹쳤던 마니또 쌍은 피하고,
 * 오래 안 만난(또는 한 번도 안 만난) 쌍을 우선 배정한다.
 * 자세한 설계 배경은 README.md의 "마니또 배정 알고리즘" 절 참고.
 */

// ─── 이력 조회 깊이 M(N) ───────────────────────────────────────────────────

const HISTORY_DEPTH_MIN = 3;
const HISTORY_DEPTH_MAX = 20;

/** 팀원 수(N)에 따라 참고할 과거 스프린트 개수 M을 계산
 *  M(N) = clamp(⌈(N-1)/2⌉, 3, 20) — 전체 쌍(C(N,2))을 한 바퀴 도는 데 필요한
 *  스프린트 수(≈(N-1)/2)만큼만 참고하면 충분하다는 시뮬레이션 결과에 근거 */
export function getHistoryDepth(memberCount: number): number {
  return Math.min(HISTORY_DEPTH_MAX, Math.max(HISTORY_DEPTH_MIN, Math.ceil((memberCount - 1) / 2)));
}

// ─── 가중치 계산 (지수 감쇠) ─────────────────────────────────────────────────

const HALF_LIFE_SPRINTS = 2;

function pairKey(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export interface PastPair {
  manitoId: string;
  targetId: string;
}

/**
 * 과거 스프린트별 배정 쌍(최근 순, index 0 = 가장 최근)을 받아
 * 쌍(pair)마다 "최근에 얼마나 자주 겹쳤는지"를 나타내는 가중치 맵을 만든다.
 * 하드 컷오프 없이 지수 감쇠(half-life 2스프린트)를 적용 — 오래된 이력일수록
 * 자연스럽게 잊혀지며, 팀 규모별로 별도 튜닝이 필요 없다.
 */
export function buildPairWeights(pastAssignments: PastPair[][]): Map<string, number> {
  const weights = new Map<string, number>();
  pastAssignments.forEach((pairs, idx) => {
    const age = idx + 1; // 1 = 바로 직전 스프린트
    const weight = Math.pow(0.5, (age - 1) / HALF_LIFE_SPRINTS);
    for (const { manitoId, targetId } of pairs) {
      const key = pairKey(manitoId, targetId);
      weights.set(key, (weights.get(key) ?? 0) + weight);
    }
  });
  return weights;
}

// ─── 순환 비용 ──────────────────────────────────────────────────────────────

function cycleCost(order: string[], weights: Map<string, number>): number {
  let cost = 0;
  for (let i = 0; i < order.length; i++) {
    const a = order[i];
    const b = order[(i + 1) % order.length];
    cost += weights.get(pairKey(a, b)) ?? 0;
  }
  return cost;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── N ≤ 8: 전수탐색 ─────────────────────────────────────────────────────────

const EXHAUSTIVE_SEARCH_LIMIT = 8;

/** 가능한 모든 순환((N-1)!개, N≤8이면 최대 5040개)을 탐색해 완전 최적해를 찾는다 */
function findOptimalCycleExhaustive(memberIds: string[], weights: Map<string, number>): string[] {
  const [anchor, ...rest] = shuffle(memberIds);
  let bestCost = Infinity;
  let candidates: string[][] = [];

  const permute = (remaining: string[], acc: string[]) => {
    if (remaining.length === 0) {
      const order = [anchor, ...acc];
      const cost = cycleCost(order, weights);
      if (cost < bestCost) {
        bestCost = cost;
        candidates = [order];
      } else if (cost === bestCost) {
        candidates.push(order);
      }
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      const next = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      permute(next, [...acc, remaining[i]]);
    }
  };

  permute(rest, []);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── N > 8: 그리디 구성 + 2-opt 로컬서치 ──────────────────────────────────────

const GREEDY_START_COUNT = 10;

/** 시작점에서 가중치가 가장 낮은(=가장 안 겹친) 미방문 노드로 계속 연결 */
function greedyNearestNeighbor(memberIds: string[], startId: string, weights: Map<string, number>): string[] {
  const remaining = new Set(memberIds);
  remaining.delete(startId);
  const order = [startId];
  let current = startId;

  while (remaining.size > 0) {
    let bestNext: string | null = null;
    let bestWeight = Infinity;
    for (const candidate of remaining) {
      const w = weights.get(pairKey(current, candidate)) ?? 0;
      if (w < bestWeight) {
        bestWeight = w;
        bestNext = candidate;
      }
    }
    order.push(bestNext!);
    remaining.delete(bestNext!);
    current = bestNext!;
  }
  return order;
}

/** 두 구간을 뒤집어 비용이 줄어들면 채택 — 더 이상 개선 안 될 때까지 반복 */
function twoOptImprove(order: string[], weights: Map<string, number>): { order: string[]; cost: number } {
  let best = order;
  let bestCost = cycleCost(best, weights);
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [...best];
        const segment = candidate.slice(i + 1, j + 1).reverse();
        candidate.splice(i + 1, segment.length, ...segment);
        const cost = cycleCost(candidate, weights);
        if (cost < bestCost) {
          bestCost = cost;
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return { order: best, cost: bestCost };
}

function findOptimalCycleHeuristic(memberIds: string[], weights: Map<string, number>): string[] {
  const starts = shuffle(memberIds).slice(0, Math.min(GREEDY_START_COUNT, memberIds.length));
  let bestCost = Infinity;
  let candidates: string[][] = [];

  for (const start of starts) {
    const constructed = greedyNearestNeighbor(memberIds, start, weights);
    const { order, cost } = twoOptImprove(constructed, weights);
    if (cost < bestCost) {
      bestCost = cost;
      candidates = [order];
    } else if (cost === bestCost) {
      candidates.push(order);
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

/**
 * 마니또 배정. 항상 팀 전체가 하나의 순환 고리를 이루는 순열을 반환한다.
 * pairWeights를 생략하면(신규 팀 등 이력이 없는 경우) 완전 랜덤 순환을 반환한다.
 */
export function assignManito(
  memberIds: string[],
  pairWeights: Map<string, number> = new Map(),
): Array<{ manitoId: string; targetId: string }> {
  if (memberIds.length < 2) throw new Error('팀원이 최소 2명 이상이어야 합니다.');

  const order =
    memberIds.length <= EXHAUSTIVE_SEARCH_LIMIT
      ? findOptimalCycleExhaustive(memberIds, pairWeights)
      : findOptimalCycleHeuristic(memberIds, pairWeights);

  return order.map((id, idx) => ({
    manitoId: id,
    targetId: order[(idx + 1) % order.length],
  }));
}
