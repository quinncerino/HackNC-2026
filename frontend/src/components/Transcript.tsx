import { useEffect, useRef } from "react";

import userAvatar from "../assets/transcript-user.png";
import callerAvatar from "../assets/transcript-caller.png";

import type { TranscriptTurn } from "../types";

type TranscriptProps = {
  turns: TranscriptTurn[];
  scenarioId?: string;
};

const callerNames: Record<string, string> = {
  campus_it: "Alex",
  bank_alert: "Jeremy",
  package_delivery_problem: "Jones",
  job_offer_scam: "Sam",
  gift_card: "Robert",
  family_emergency: "Jim",
};

export default function Transcript({ turns, scenarioId }: TranscriptProps) {
  const callerName = scenarioId ? callerNames[scenarioId] ?? "Caller" : "Caller";
  const latestMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length === 0) return;

    // Follow the page bottom so the call controls remain visible.
    const frame = window.requestAnimationFrame(() => {
      const marker = latestMessageRef.current;
      if (!marker || marker.getClientRects().length === 0) return;

      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [turns]);

  return (
    <section className="transcript" aria-live="polite">
      <h2>Live transcript</h2>
      {turns.length === 0 ? (
        <p className="empty-state">The conversation will appear here after the call begins.</p>
      ) : (
        turns.map((turn, index) => (
          <div className={`transcript-turn transcript-turn--${turn.role}`} key={`${index}-${turn.text}`}>
            <span className="speaker-avatar" aria-hidden="true" style={{ background: "transparent" }}>
              <img
                src={turn.role === "agent" ? callerAvatar : userAvatar}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }}
              />
            </span>
            <strong>{turn.role === "agent" ? callerName : "You"}</strong>
            <p>{turn.text}</p>
          </div>
        ))
      )}
      <div ref={latestMessageRef} aria-hidden="true" />
    </section>
  );
}
