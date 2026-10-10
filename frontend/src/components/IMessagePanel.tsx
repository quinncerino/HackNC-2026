import { useEffect, useRef, useState } from "react";

import Transcript from "./Transcript";
import { getIMessageSession, startIMessageSession } from "../services/api";
import type { Debrief, IMessageMemory, Scenario, TranscriptTurn } from "../types";

type IMessagePanelProps = {
  scenario: Scenario;
  onComplete: (debrief: Debrief) => void;
};

export default function IMessagePanel({ scenario, onComplete }: IMessagePanelProps) {
  const [firstName, setFirstName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [optInPhoneNumber, setOptInPhoneNumber] = useState<string | null>(null);
  const [memory, setMemory] = useState<IMessageMemory | null>(null);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const completed = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    let disposed = false;
    async function refresh() {
      try {
        const session = await getIMessageSession(sessionId!);
        if (disposed) return;
        setStatus(session.status);
        setTranscript(session.transcript);
        if (session.debrief && !completed.current) {
          completed.current = true;
          onComplete(session.debrief);
        }
      } catch (reason) {
        if (!disposed) {
          setError(reason instanceof Error ? reason.message : "Could not refresh the session");
        }
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 2000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [onComplete, sessionId]);

  async function sendInvitation() {
    try {
      setError(null);
      setStatus("sending");
      const result = await startIMessageSession(scenario.id, firstName, phoneNumber, consent);
      setSessionId(result.sessionId);
      setMaskedPhone(result.maskedPhone);
      setOptInPhoneNumber(result.optInPhoneNumber);
      setMemory(result.memory);
      setStatus(result.status);
    } catch (reason) {
      setStatus("idle");
      setError(reason instanceof Error ? reason.message : "Could not send the invitation");
    }
  }

  if (sessionId) {
    return (
      <>
        <section className="call-panel imessage-active" aria-live="polite">
          <div className={`call-status call-status--${status === "active" ? "connected" : "connecting"}`}>
            <span aria-hidden="true" />
            {status === "active" ? "Simulation in progress" : "Waiting for START"}
          </div>
          <p>
            Training prepared for <strong>{maskedPhone}</strong>. Photon&apos;s shared lines require
            you to send the first message.
          </p>
          {optInPhoneNumber && status !== "active" && (
            <a
              className="primary-action"
              href={`sms:${optInPhoneNumber}&body=START`}
            >
              Open Messages and text START
            </a>
          )}
          {optInPhoneNumber && status !== "active" && (
            <p className="privacy-reminder">
              If Messages does not open, text <strong>START</strong> to <strong>{optInPhoneNumber}</strong>.
            </p>
          )}
          <p className="privacy-reminder">
            Text <strong>REVEAL</strong> for the debrief or <strong>STOP</strong> to end immediately.
          </p>
          {memory && memory.sessionsCompleted > 0 && (
            <div className="memory-note">
              <strong>Memory found:</strong> {memory.sessionsCompleted} previous session
              {memory.sessionsCompleted === 1 ? "" : "s"}.
              {memory.strengths[0] && ` Previous strength: ${memory.strengths[0]}.`}
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
        </section>
        <Transcript turns={transcript} />
      </>
    );
  }

  return (
    <section className="call-panel imessage-form">
      <div className="channel-icon" aria-hidden="true">💬</div>
      <h2>Start iMessage training</h2>
      <p>
        We register your number with Photon, then you send START to begin the fictional scenario.
      </p>
      <label>
        First name
        <input
          type="text"
          autoComplete="given-name"
          maxLength={50}
          placeholder="Taylor"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
      </label>
      <label>
        Mobile number
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+1 919 555 0123"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
        />
      </label>
      <label className="consent-row">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          This is my number, or I have the recipient's explicit permission. I agree that the
          first name and phone number will be shared with Photon to deliver this iMessage training,
          and that message contents will be processed by ElevenLabs to generate agent replies and
          maintain the conversation transcript.
        </span>
      </label>
      <button
        type="button"
        onClick={sendInvitation}
        disabled={!firstName.trim() || !phoneNumber.trim() || !consent || status === "sending"}
      >
        {status === "sending" ? "Preparing…" : "Prepare iMessage training"}
      </button>
      <p className="privacy-reminder">
        Nice Try hashes the number for local training memory and retains only its last four digits
        for display. Photon receives the number for iMessage delivery; ElevenLabs receives the
        conversation text but not the participant&apos;s phone number.
      </p>
      {error && <p className="error-message">{error}</p>}
    </section>
  );
}
