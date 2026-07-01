import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import {
  getPastSprintsPaged,
  getLastRevealedSprint,
  getMyPair,
  ManitoPair,
  Sprint,
  subscribeToActiveSprint,
} from '@/lib/sprints';
import { getUserProfile, UserProfile } from '@/lib/users';
import { Praise, subscribeToSentPraises, subscribeToReceivedPraises } from '@/lib/praises';

interface SprintContextValue {
  activeSprint: Sprint | null | undefined; // undefined = 로딩 중
  myPair: ManitoPair | null;
  targetProfile: UserProfile | null;
  lastRevealedSprint: Sprint | null;
  sentPraises: Praise[];
  receivedPraises: Praise[];
  pastSprints: Sprint[];
  loadingPast: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

const SprintContext = createContext<SprintContextValue>({
  activeSprint: undefined,
  myPair: null,
  targetProfile: null,
  lastRevealedSprint: null,
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
  const [myPair, setMyPair] = useState<ManitoPair | null>(null);
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [lastRevealedSprint, setLastRevealedSprint] = useState<Sprint | null>(null);
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
    setMyPair(null);
    setTargetProfile(null);
    setLastRevealedSprint(null);
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

  // 내 마니또 배정 + 마니또 대상 프로필 (ACTIVE 스프린트일 때만, 변하지 않음)
  useEffect(() => {
    if (!user || activeSprint === undefined) return;
    if (!activeSprint || activeSprint.status !== 'ACTIVE') {
      setMyPair(null);
      setTargetProfile(null);
      return;
    }
    getMyPair(activeSprint.id, user.uid).then((pair) => {
      setMyPair(pair);
      if (pair?.targetId) {
        getUserProfile(pair.targetId).then(setTargetProfile);
      } else {
        setTargetProfile(null);
      }
    });
  }, [activeSprint?.id, user?.uid]);

  // 직전 공개 스프린트 (ACTIVE 없을 때만, 변하지 않음)
  useEffect(() => {
    if (activeSprint === undefined) return;
    if (activeSprint || !selectedTeamId) { setLastRevealedSprint(null); return; }
    getLastRevealedSprint(selectedTeamId).then(setLastRevealedSprint);
  }, [activeSprint?.id, selectedTeamId]);

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
    <SprintContext.Provider value={{
      activeSprint, myPair, targetProfile, lastRevealedSprint,
      sentPraises, receivedPraises,
      pastSprints, loadingPast, hasMore, loadMore,
    }}>
      {children}
    </SprintContext.Provider>
  );
}

export function useSprint() {
  return useContext(SprintContext);
}
