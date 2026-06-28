/**
 * Fisher-Yates 셔플 기반 마니또 배정 (derangement — 자기 자신 배정 불가)
 */
export function assignManito(
  userIds: string[],
): Array<{ manitoId: string; targetId: string }> {
  if (userIds.length < 2) throw new Error('팀원이 최소 2명 이상이어야 합니다.');

  let shuffled: string[];
  let attempts = 0;

  do {
    shuffled = [...userIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (++attempts > 100) throw new Error('마니또 배정에 실패했습니다. 다시 시도해주세요.');
  } while (shuffled.some((id, idx) => id === userIds[idx]));

  return userIds.map((id, idx) => ({
    manitoId: id,
    targetId: shuffled[idx],
  }));
}
