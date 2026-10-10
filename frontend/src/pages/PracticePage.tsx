import { useState } from "react";

import CallControls from "../components/CallControls";
import CallStatus from "../components/CallStatus";
import IMessagePanel from "../components/IMessagePanel";
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
  const [channel, setChannel] = useState<"voice" | "imessage">("imessage");
  const [isFinishing, setIsFinishing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  async function startCall() {
    try {
      setPageError(null);
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
      const result = await createDebrief(scenario.id, call.transcript);
      onComplete(result);
    } catch (reason) {
      setPageError(reason instanceof Error ? reason.message : "Could not create the debrief");
      setIsFinishing(false);
    }
  }

  return (
    <main className="page-shell practice-layout">
      <header className="page-header">
        <button type="button" className="text-action" onClick={onCancel} disabled={call.status !== "disconnected"}>
          ← Scenarios
        </button>
        <div>
          <p className="eyebrow">Training simulation</p>
          <h1>{scenario.title}</h1>
        </div>
      </header>

      <div className="channel-picker" aria-label="Choose a practice channel">
        <button
          type="button"
          className={channel === "imessage" ? "channel-choice channel-choice--active" : "channel-choice"}
          onClick={() => setChannel("imessage")}
          disabled={call.status !== "disconnected"}
        >
          iMessage
        </button>
        <button
          type="button"
          className={channel === "voice" ? "channel-choice channel-choice--active" : "channel-choice"}
          onClick={() => setChannel("voice")}
          disabled={call.status !== "disconnected"}
        >
          Browser voice
        </button>
      </div>

      {channel === "imessage" ? (
        <IMessagePanel scenario={scenario} onComplete={onComplete} />
      ) : (
        <>
          <section className="call-panel">
            <CallStatus status={call.status} isSpeaking={call.isSpeaking} />
            <p className="privacy-reminder">Use fictional information only. You can hang up at any time.</p>
            <CallControls
              status={call.status}
              isMuted={call.isMuted}
              isFinishing={isFinishing}
              onStart={startCall}
              onToggleMute={() => call.setMuted(!call.isMuted)}
              onHangUp={finishCall}
            />
            {(pageError || call.error) && <p className="error-message">{pageError ?? call.error}</p>}
          </section>

          <Transcript turns={call.transcript} />
        </>
      )}
    </main>
  );
}
