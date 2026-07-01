import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTeam } from '@/contexts/team-context';
import { Sprint, subscribeToActiveSprint } from '@/lib/sprints';
import { Praise, subscribeToSentPraises, subscribeToReceivedPraises } from '@/lib/praises';

interface SprintContextValue {
  activeSprint: Sprint | null | undefined; // undefined = 로딩 중
  sentPraises: Praise[];
  receivedPraises: Praise[];
}

const SprintContext = createContext<SprintContextValue>({
  activeSprint: undefined,
  sentPraises: [],
  receivedPraises: [],
});

export function SprintProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { selectedTeamId } = useTeam();

  const [activeSprint, setActiveSprint] = useState<Sprint | null | undefined>(undefined);
  const [sentPraises, setSentPraises] = useState<Praise[]>([]);
  const [receivedPraises, setReceivedPraises] = useState<Praise[]>([]);

  useEffect(() => {
    if (!selectedTeamId) { setActiveSprint(null); return; }
    setActiveSprint(undefined);
    return subscribeToActiveSprint(selectedTeamId, setActiveSprint);
  }, [selectedTeamId]);

  useEffect(() => {
    if (!user || !activeSprint) { setSentPraises([]); return; }
    return subscribeToSentPraises(activeSprint.id, user.uid, setSentPraises);
  }, [activeSprint?.id, user?.uid]);

  useEffect(() => {
    if (!user || !activeSprint) { setReceivedPraises([]); return; }
    return subscribeToReceivedPraises(activeSprint.id, user.uid, setReceivedPraises);
  }, [activeSprint?.id, user?.uid]);

  return (
    <SprintContext.Provider value={{ activeSprint, sentPraises, receivedPraises }}>
      {children}
    </SprintContext.Provider>
  );
}

export function useSprint() {
  return useContext(SprintContext);
}
