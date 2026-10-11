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

  const followPageRef = useRef(true);

  useEffect(() => {
    let previousY = window.scrollY;
    let touchY: number | null = null;

    const pauseFollowing = () => {
      followPageRef.current = false;
      // Stop any smooth scroll already in progress when the user takes control.
      window.scrollTo({ top: window.scrollY, behavior: "instant" });
    };
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY < previousY - 1) {
        pauseFollowing();
      } else if (
        document.documentElement.scrollHeight - window.innerHeight - currentY <= 48
      ) {
        followPageRef.current = true;
      }
      previousY = currentY;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) pauseFollowing();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      if (currentY !== undefined && touchY !== null && currentY > touchY) {
        pauseFollowing();
      }
      touchY = currentY ?? null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))) return;
      if (["ArrowUp", "PageUp", "Home"].includes(event.key) ||
        (event.key === " " && event.shiftKey)) pauseFollowing();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (turns.length === 0 || !followPageRef.current) return;

    // Follow the page bottom so the call controls remain visible.
    const frame = window.requestAnimationFrame(() => {
      const marker = latestMessageRef.current;
      if (!followPageRef.current || !marker || marker.getClientRects().length === 0) return;

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
