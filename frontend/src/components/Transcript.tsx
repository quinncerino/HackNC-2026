import type { TranscriptTurn } from "../types";

type TranscriptProps = {
  turns: TranscriptTurn[];
};

export default function Transcript({ turns }: TranscriptProps) {
  return (
    <section className="transcript" aria-live="polite">
      <h2>Live transcript</h2>
      {turns.length === 0 ? (
        <p className="empty-state">The conversation will appear here after the call begins.</p>
      ) : (
        turns.map((turn, index) => (
          <div className={`transcript-turn transcript-turn--${turn.role}`} key={`${index}-${turn.text}`}>
            <strong>{turn.role === "agent" ? "Caller" : "You"}</strong>
            <p>{turn.text}</p>
          </div>
        ))
      )}
    </section>
  );
}
