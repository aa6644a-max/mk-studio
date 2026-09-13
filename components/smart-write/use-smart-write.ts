"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ACTIVE_STAGES, type Brief, type RunView } from "@/lib/writing/types";

const LAST_RUN = "mk-smart-write-last-run";
type Config = { storage: "local" | "postgres"; modelReady: boolean; tools: { id: string; available: boolean }[] };
async function responseJson(response: Response) {
  const data = await response.json().catch(() => ({ error: "서버 응답을 읽지 못했습니다." }));
  if (!response.ok) throw new Error(data.error || "요청을 완료하지 못했습니다.");
  return data;
}
function remember(id: string | null) {
  try { if (id) localStorage.setItem(LAST_RUN, id); else localStorage.removeItem(LAST_RUN); } catch { /* storage may be disabled */ }
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("run", id); else url.searchParams.delete("run");
  window.history.replaceState(null, "", url);
}
export function useSmartWrite() {
  const [config, setConfig] = useState<Config | null>(null);
  const [run, setRun] = useState<RunView | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [automatic, setAutomatic] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const creation = useRef<{ fingerprint: string; id: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const config = await responseJson(await fetch("/api/smart-write/runs", { cache: "no-store" }));
        if (!alive) return;
        setConfig(config);
        let id = new URL(window.location.href).searchParams.get("run");
        if (!id) { try { id = localStorage.getItem(LAST_RUN); } catch { /* optional */ } }
        if (id) {
          try {
            const data = await responseJson(await fetch(`/api/smart-write/runs/${encodeURIComponent(id)}`, { cache: "no-store" }));
            if (alive) { setRun(data.run); remember(id); }
          } catch (e) { if (alive) { setError((e as Error).message); remember(null); } }
        }
      } catch (e) { if (alive) setError((e as Error).message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const command = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    if (!run || inFlight.current) return false;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/smart-write/runs/${run.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: run.version, ...payload }) });
      if (response.status === 409) {
        const data = await responseJson(await fetch(`/api/smart-write/runs/${run.id}`, { cache: "no-store" }));
        setRun(data.run); setAutomatic(false);
        setError("최신 작업 상태를 불러왔습니다. 다른 요청이 끝난 뒤 이어서 진행해주세요.");
        return false;
      }
      const data = await responseJson(response);
      setRun(data.run);
      if (["cancelled", "failed", "awaiting_input", "ready", "needs_review"].includes(data.run.stage)) setAutomatic(false);
      return true;
    } catch (e) { setError((e as Error).message); setAutomatic(false); return false; }
    finally { inFlight.current = false; setBusy(false); }
  }, [run]);

  useEffect(() => {
    if (!automatic || busy || !run || !ACTIVE_STAGES.includes(run.stage)) return;
    const timer = setTimeout(() => { void command("advance"); }, 300);
    return () => clearTimeout(timer);
  }, [automatic, busy, run, command]);

  async function start(brief: Brief) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const fingerprint = JSON.stringify(brief);
      if (creation.current?.fingerprint !== fingerprint) creation.current = { fingerprint, id: crypto.randomUUID() };
      const data = await responseJson(await fetch("/api/smart-write/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: creation.current.id, brief }) }));
      setRun(data.run); remember(data.run.id); setAutomatic(true);
    } catch (e) { setError((e as Error).message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function reset() { if (inFlight.current) return; setAutomatic(false); setRun(null); setError(""); creation.current = null; remember(null); }
  return { config, run, busy, loading, automatic, setAutomatic, error, setError, command, start, reset };
}
