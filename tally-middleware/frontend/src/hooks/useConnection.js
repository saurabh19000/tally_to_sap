import { useState, useEffect, useCallback } from "react";
import { tallyAPI } from "../api/tallyAPI";

export function useConnection() {
  const [state, setState] = useState({ loading: true });

  const check = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [health, ping, btpPing] = await Promise.all([
        tallyAPI.health().catch(() => null),
        tallyAPI.ping().catch((e) => ({ connected: false, error: e.message })),
        tallyAPI.btpPing().catch(() => ({ connected: false })),
      ]);
      setState({
        loading: false,
        backendOk: !!health?.ok,
        btpConfigured: !!health?.btpConfigured,
        tallyConnected: ping?.connected ?? false,
        tallyLatency: ping?.latencyMs ?? null,
        tallyError: ping?.error ?? null,
        tallyUrl: ping?.url ?? "http://localhost:9000",
        btpConnected: btpPing?.connected ?? false,
        btpError: btpPing?.error ?? null,
        error: !health ? "Backend not running (port 4000)" : null,
      });
    } catch (e) {
      setState({ loading: false, backendOk: false, tallyConnected: false, btpConnected: false, error: e.message });
    }
  }, []);

  useEffect(() => { check(); }, [check]);
  return { ...state, refresh: check };
}