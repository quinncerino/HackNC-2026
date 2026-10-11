import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import Transcript from "../components/Transcript";
import { cancelIMessageSession, getIMessageSession, startIMessageSession } from "../services/api";
import type { Debrief, IMessageSession, IMessageStartResponse, Scenario } from "../types";

type TextPracticePageProps = {
  scenario: Scenario;
  onCancel: () => void;
  onComplete: (debrief: Debrief) => void;
};

export default function TextPracticePage({ scenario, onCancel, onComplete }: TextPracticePageProps) {
  const [firstName, setFirstName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [start, setStart] = useState<IMessageStartResponse | null>(null);
  const [session, setSession] = useState<IMessageSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!start) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const next = await getIMessageSession(start!.sessionId);
        if (cancelled) return;
        setSession((previous) => ({
          ...next,
          transcript: previous && JSON.stringify(previous.transcript) === JSON.stringify(next.transcript)
            ? previous.transcript
            : next.transcript,
        }));
        setError(null);
        if (["complete", "cancelled", "failed"].includes(next.status)) return;
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Could not refresh the session.");
      }
      if (!cancelled) timer = setTimeout(refresh, 2000);
    }
    void refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [start]);

  async function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      setStart(await startIMessageSession(scenario.id, firstName.trim(), phoneNumber.trim(), consent));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start text training.");
    } finally {
      setStarting(false);
    }
  }

  const ended = session && ["complete", "cancelled", "failed"].includes(session.status);

  useEffect(() => {
    if (session?.status === "complete" && session.debrief) onComplete(session.debrief);
  }, [session?.status, session?.debrief, onComplete]);

  async function returnToScenarios() {
    if (starting || leaving) return;
    if (start && !ended) {
      setLeaving(true);
      setError(null);
      try {
        await cancelIMessageSession(start.sessionId);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not end the training session.");
        setLeaving(false);
        return;
      }
    }
    onCancel();
  }

  return (
    <main className="page-shell text-practice">
      <button className="text-action" onClick={returnToScenarios} disabled={starting || leaving}>
        {leaving ? "Ending training…" : "← Scenarios"}
      </button>
      <header className="hero">
        <h1>{scenario.title}</h1>
        <p>Text message training</p>
      </header>
      {error && <p className="error-message" role="alert">{error}</p>}
      {!start ? (
        <form className="text-setup feedback-card" onSubmit={begin}>
          <h2>Set up your practice</h2>
          <p>Use your real number to connect iMessage. Use fictional information in the training conversation.</p>
          <label>
            First name
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name" maxLength={50} required disabled={starting} />
          </label>
          <label>
            Phone number
            <input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)}
              autoComplete="tel" placeholder="+1 555 123 4567" required disabled={starting} />
          </label>
          <label className="text-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}
              required disabled={starting} />
            <span>This is my number, or I have permission to use it for this training.</span>
          </label>
          <button type="submit" disabled={starting || !consent}>
            {starting ? "Preparing training…" : "Start text training"}
          </button>
        </form>
      ) : (
        <>
          <section className="feedback-card text-instructions" aria-live="polite">
            <h2>{ended ? "Training ended" : session?.status === "active" ? "Training in progress" : "Ready on your phone"}</h2>
            <p>Your number: {start.maskedPhone}</p>
            <p>Open iMessage and text <strong>START</strong> to:</p>
            <p className="text-line">{start.optInPhoneNumber}</p>
            <p>Continue the conversation on your phone. Text <strong>REVEAL</strong> for feedback or <strong>STOP</strong> to cancel.</p>
            <p>The conversation updates below automatically.</p>
            {session?.status === "cancelled" && <p>Training was cancelled. No further messages will be sent.</p>}
            {session?.status === "failed" && <p>The session failed. You can return to scenarios and try again.</p>}
          </section>
          <Transcript turns={session?.transcript ?? []} scenarioId={scenario.id} />
        </>
      )}
    </main>
  );
}
