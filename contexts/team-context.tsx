import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import {
  createTeam as fsCreateTeam,
  joinTeamByCode,
  leaveMembership,
  Membership,
  subscribeToMyMemberships,
  Team,
  TeamWithRole,
} from '@/lib/teams';

const SELECTED_TEAM_KEY = '@selected_team_id';

interface TeamContextType {
  myTeams: TeamWithRole[];
  selectedTeamId: string | null;
  selectedTeam: TeamWithRole | null;
  loading: boolean;
  setSelectedTeam: (teamId: string) => void;
  createTeam: (name: string) => Promise<string>;
  joinTeam: (code: string) => Promise<string>;
  leaveTeam: (teamId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [myTeams, setMyTeams] = useState<TeamWithRole[]>([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // selectedTeamId 초기화 여부 (AsyncStorage 로드 전 덮어쓰기 방지)
  const initializedRef = useRef(false);

  // memberships 실시간 구독 → 팀 문서 일괄 조회
  useEffect(() => {
    if (!user) {
      setMyTeams([]);
      setSelectedTeamIdState(null);
      setLoading(false);
      initializedRef.current = false;
      return;
    }

    setLoading(true);
    initializedRef.current = false;

    const unsub = subscribeToMyMemberships(user.uid, async (memberships: Membership[]) => {
      if (memberships.length === 0) {
        setMyTeams([]);
        setLoading(false);
        if (!initializedRef.current) {
          initializedRef.current = true;
          setSelectedTeamIdState(null);
        }
        return;
      }

      // 팀 문서 일괄 조회
      const teamDocs = await Promise.all(
        memberships.map(async (m) => {
          const snap = await getDoc(doc(db, 'teams', m.teamId));
          if (!snap.exists()) return null;
          return {
            id: snap.id,
            ...(snap.data() as Omit<Team, 'id'>),
            role: m.role,
            membershipId: m.id,
          } as TeamWithRole;
        }),
      );
      const validTeams = teamDocs.filter((t): t is TeamWithRole => t !== null);
      setMyTeams(validTeams);
      setLoading(false);

      // selectedTeamId 초기화 (최초 1회만 AsyncStorage 참조)
      if (!initializedRef.current) {
        initializedRef.current = true;
        const saved = await AsyncStorage.getItem(SELECTED_TEAM_KEY);
        const exists = validTeams.some((t) => t.id === saved);
        setSelectedTeamIdState(exists ? saved : (validTeams[0]?.id ?? null));
      } else {
        // 이후에는 현재 선택이 여전히 유효한지만 보정
        setSelectedTeamIdState((prev) => {
          if (prev && validTeams.some((t) => t.id === prev)) return prev;
          return validTeams[0]?.id ?? null;
        });
      }
    }, () => setLoading(false));

    return unsub;
  }, [user?.uid]);

  // selectedTeamId 변경 시 AsyncStorage 저장
  useEffect(() => {
    if (!initializedRef.current) return;
    if (selectedTeamId) {
      AsyncStorage.setItem(SELECTED_TEAM_KEY, selectedTeamId);
    } else {
      AsyncStorage.removeItem(SELECTED_TEAM_KEY);
    }
  }, [selectedTeamId]);

  const setSelectedTeam = (teamId: string) => setSelectedTeamIdState(teamId);

  const selectedTeam = myTeams.find((t) => t.id === selectedTeamId) ?? null;

  const createTeam = async (name: string): Promise<string> => {
    if (!user) throw new Error('로그인이 필요합니다.');
    return fsCreateTeam(user.uid, name);
  };

  const joinTeam = async (code: string): Promise<string> => {
    if (!user) throw new Error('로그인이 필요합니다.');
    return joinTeamByCode(user.uid, code);
  };

  const leaveTeam = async (teamId: string): Promise<void> => {
    const membership = myTeams.find((t) => t.id === teamId);
    if (!membership) throw new Error('해당 팀의 멤버가 아닙니다.');
    if (membership.role === 'LEADER') throw new Error('리더는 팀을 나갈 수 없습니다. 팀을 삭제하거나 리더를 위임해주세요.');
    await leaveMembership(membership.membershipId);
  };

  return (
    <TeamContext.Provider
      value={{ myTeams, selectedTeamId, selectedTeam, loading, setSelectedTeam, createTeam, joinTeam, leaveTeam }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam(): TeamContextType {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used within TeamProvider');
  return ctx;
}
