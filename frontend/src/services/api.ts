import type { Debrief, Scenario, SessionResponse, TranscriptTurn } from "../types";

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with status ${response.status}`);
  }
  return body as T;
}

export function getScenarios(): Promise<Scenario[]> {
  return apiRequest<Scenario[]>("/api/scenarios");
}

export function createSession(scenarioId: string): Promise<SessionResponse> {
  return apiRequest<SessionResponse>("/api/session", {
    method: "POST",
    body: JSON.stringify({ scenarioId }),
  });
}

export function createDebrief(
  scenarioId: string,
  transcript: TranscriptTurn[],
): Promise<Debrief> {
  return apiRequest<Debrief>("/api/debrief", {
    method: "POST",
    body: JSON.stringify({ scenarioId, transcript }),
  });
}
