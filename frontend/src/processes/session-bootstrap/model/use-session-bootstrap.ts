"use client";

import { useCallback, useEffect, useState } from "react";

import { AppUser } from "@/entities/user/model/types";
import { clearSession, loadSession, saveSession, SessionSnapshot } from "@/shared/lib/session-storage";

interface SessionState {
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: AppUser | null;
}

interface UseSessionBootstrapResult extends SessionState {
  setSession: (snapshot: SessionSnapshot) => void;
  resetSession: () => void;
}

export function useSessionBootstrap(): UseSessionBootstrapResult {
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    accessToken: null,
    refreshToken: null,
    user: null,
  });

  useEffect(() => {
    const snapshot = loadSession();
    const timer = setTimeout(() => {
      if (!snapshot) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      setState({
        isLoading: false,
        accessToken: snapshot.accessToken,
        refreshToken: snapshot.refreshToken,
        user: snapshot.user,
      });
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const setSession = useCallback((snapshot: SessionSnapshot) => {
    saveSession(snapshot);
    setState({
      isLoading: false,
      accessToken: snapshot.accessToken,
      refreshToken: snapshot.refreshToken,
      user: snapshot.user,
    });
  }, []);

  const resetSession = useCallback(() => {
    clearSession();
    setState({
      isLoading: false,
      accessToken: null,
      refreshToken: null,
      user: null,
    });
  }, []);

  return {
    ...state,
    setSession,
    resetSession,
  };
}
