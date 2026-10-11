import { useCallback, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";

import { createSession } from "../services/api";
import type { TranscriptTurn } from "../types";

function stripToneMarkers(text: string): string {
  return text
    .replace(/\[(?:[A-Za-z]+)\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeMessage(message: unknown): TranscriptTurn | null {
  if (!message || typeof message !== "object") return null;

  const record = message as Record<string, unknown>;
  const text = typeof record.message === "string" ? stripToneMarkers(record.message) : "";
  const source = record.source ?? record.role;
  if (!text) return null;

  if (source === "user") return { role: "user", text };
  if (source === "ai" || source === "agent") return { role: "agent", text };
  return null;
}

export function useScamCall() {
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const transcriptRef = useRef<TranscriptTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const addMessage = useCallback((message: unknown) => {
    const turn = normalizeMessage(message);
    if (!turn) return;

    const previous = transcriptRef.current.at(-1);
    if (previous?.role === turn.role && previous.text === turn.text) return;
    const next = [...transcriptRef.current, turn];
    transcriptRef.current = next;
    setTranscript(next);
  }, []);

  const conversation = useConversation({
    onMessage: addMessage,
    onError: (message) => setError(String(message)),
  });

  async function start(scenarioId: string, requestedSessionId?: string | null) {
    setError(null);
    transcriptRef.current = [];
    setTranscript([]);
    setSessionId(requestedSessionId ?? null);

    const media = await navigator.mediaDevices.getUserMedia({ audio: true });
    media.getTracks().forEach((track) => track.stop());

    const session = await createSession(scenarioId, requestedSessionId ?? undefined);
    conversation.startSession({
      conversationToken: session.conversationToken,
      dynamicVariables: {
        ...session.dynamicVariables,
        training_code: String(session.dynamicVariables.training_code ?? "000000"),
      },
    });
    setConversationId(session.conversationId);
  }

  async function stop() {
    await conversation.endSession();
  }

  return {
    conversationId,
    sessionId,
    transcript,
    error,
    status: conversation.status,
    getLatestTranscript: () => transcriptRef.current,
    isSpeaking: conversation.isSpeaking,
    isMuted: conversation.isMuted,
    setMuted: conversation.setMuted,
    start,
    stop,
  };
}
