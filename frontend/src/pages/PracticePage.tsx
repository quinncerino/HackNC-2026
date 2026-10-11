import { useEffect, useState } from "react";

import CallControls from "../components/CallControls";
import CallStatus from "../components/CallStatus";
import Transcript from "../components/Transcript";
import { useScamCall } from "../hooks/useScamCall";
import { createDebrief } from "../services/api";
import type { Debrief, Scenario } from "../types";

type PracticePageProps = {
  scenario: Scenario;
  onCancel: () => void;
  onComplete: (debrief: Debrief) => void;
};

export default function PracticePage({ scenario, onCancel, onComplete }: PracticePageProps) {
  const call = useScamCall();
  const [isFinishing, setIsFinishing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (call.status !== "connected" || isFinishing) return;
    const startedAt = performance.now();
    setElapsedSeconds(0);
    const updateDuration = () => {
      setElapsedSeconds(Math.floor((performance.now() - startedAt) / 1000));
    };
    const timer = window.setInterval(updateDuration, 250);
    return () => {
      window.clearInterval(timer);
      updateDuration();
    };
  }, [call.status, isFinishing]);

  const duration = `${Math.floor(elapsedSeconds / 60).toString().padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`;

  async function startCall() {
    try {
      setPageError(null);
      setElapsedSeconds(0);
      await call.start(scenario.id);
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "Could not start the call");
    }
  }

  async function finishCall() {
    try {
      setIsFinishing(true);
      setPageError(null);
      await call.stop();
      const result = await createDebrief(scenario.id, call.getLatestTranscript());
      onComplete(result);
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "Could not create the debrief");
      setIsFinishing(false);
    }
  }

  const showStartButton = call.status === "disconnected" || call.status === "error";
  const controls = (
    <CallControls
        status={call.status}
        isMuted={call.isMuted}
        isFinishing={isFinishing}
        onStart={startCall}
        onToggleMute={() => call.setMuted(!call.isMuted)}
        onHangUp={finishCall}
      />
  );

  return (
    <main className="page-shell practice-layout">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <span
          aria-label={`Call duration: ${Math.floor(elapsedSeconds / 60)} minutes and ${elapsedSeconds % 60} seconds`}
          style={{ fontSize: "16px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
        >
          Call duration: {duration}
        </span>
      </div>
      <header className="page-header">
        <button type="button" className="text-action" onClick={onCancel} disabled={call.status !== "disconnected"}>
          ← Scenarios
        </button>
        <div>
          <p className="eyebrow">Training simulation</p>
          <h1>{scenario.title}</h1>
        </div>
      </header>

      <section className="call-panel">
        <CallStatus status={call.status} isSpeaking={call.isSpeaking} />
        <p className="privacy-reminder">Use fictional information only. You can hang up at any time.</p>
        {showStartButton && <div className="start-row">{controls}</div>}
      </section>

      {(call.status === "connected" || call.transcript.length > 0) && (
        <Transcript turns={call.transcript} scenarioId={scenario.id} />
      )}

      {!showStartButton && controls}
      {(pageError || call.error) && <p className="error-message">{pageError ?? call.error}</p>}
    </main>
  );
}
