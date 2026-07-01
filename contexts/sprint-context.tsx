import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import { getPastSprintsPaged, Sprint, subscribeToActiveSprint } from '@/lib/sprints';
import { Praise, subscribeToSentPraises, subscribeToReceivedPraises } from '@/lib/praises';

interface SprintContextValue {
  activeSprint: Sprint | null | undefined; // undefined = 로딩 중
  sentPraises: Praise[];
  receivedPraises: Praise[];
  pastSprints: Sprint[];
  loadingPast: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

const SprintContext = createContext<SprintContextValue>({
  activeSprint: undefined,
  sentPraises: [],
  receivedPraises: [],
  pastSprints: [],
  loadingPast: false,
  hasMore: false,
  loadMore: () => {},
});

export function SprintProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { selectedTeamId } = useTeam();

  const [activeSprint, setActiveSprint] = useState<Sprint | null | undefined>(undefined);
  const [sentPraises, setSentPraises] = useState<Praise[]>([]);
  const [receivedPraises, setReceivedPraises] = useState<Praise[]>([]);

  const [pastSprints, setPastSprints] = useState<Sprint[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  // 활성 스프린트 실시간 구독
  useEffect(() => {
    if (!selectedTeamId) { setActiveSprint(null); return; }
    setActiveSprint(undefined);
    return subscribeToActiveSprint(selectedTeamId, setActiveSprint);
  }, [selectedTeamId]);

  // 보낸/받은 칭찬 구독
  useEffect(() => {
    if (!user || !activeSprint) { setSentPraises([]); return; }
    return subscribeToSentPraises(activeSprint.id, user.uid, setSentPraises);
  }, [activeSprint?.id, user?.uid]);

  useEffect(() => {
    if (!user || !activeSprint) { setReceivedPraises([]); return; }
    return subscribeToReceivedPraises(activeSprint.id, user.uid, setReceivedPraises);
  }, [activeSprint?.id, user?.uid]);

  // 팀 변경 시 지난 스프린트 첫 페이지 로드
  useEffect(() => {
    if (!selectedTeamId) { setPastSprints([]); setHasMore(false); lastDocRef.current = null; return; }
    setLoadingPast(true);
    setPastSprints([]);
    lastDocRef.current = null;
    getPastSprintsPaged(selectedTeamId).then(({ sprints, lastDoc, hasMore: hm }) => {
      setPastSprints(sprints);
      lastDocRef.current = lastDoc;
      setHasMore(hm);
      setLoadingPast(false);
    });
  }, [selectedTeamId]);

  // 활성 스프린트가 사라지면(공개/삭제) 지난 목록 리셋
  const prevActiveIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentActiveId = activeSprint?.status === 'ACTIVE' ? activeSprint.id : undefined;
    const hadActive = prevActiveIdRef.current !== undefined;
    prevActiveIdRef.current = currentActiveId;

    if (hadActive && currentActiveId === undefined && selectedTeamId) {
      setLoadingPast(true);
      setPastSprints([]);
      lastDocRef.current = null;
      getPastSprintsPaged(selectedTeamId).then(({ sprints, lastDoc, hasMore: hm }) => {
        setPastSprints(sprints);
        lastDocRef.current = lastDoc;
        setHasMore(hm);
        setLoadingPast(false);
      });
    }
  }, [activeSprint?.id, activeSprint?.status]);

  const loadMore = async () => {
    if (!selectedTeamId || !hasMore || loadingPast || !lastDocRef.current) return;
    setLoadingPast(true);
    const { sprints, lastDoc, hasMore: hm } = await getPastSprintsPaged(selectedTeamId, lastDocRef.current);
    setPastSprints((prev) => {
      const ids = new Set(prev.map((s) => s.id));
      return [...prev, ...sprints.filter((s) => !ids.has(s.id))];
    });
    lastDocRef.current = lastDoc;
    setHasMore(hm);
    setLoadingPast(false);
  };

  return (
    <SprintContext.Provider value={{ activeSprint, sentPraises, receivedPraises, pastSprints, loadingPast, hasMore, loadMore }}>
      {children}
    </SprintContext.Provider>
  );
}

export function useSprint() {
  return useContext(SprintContext);
}
