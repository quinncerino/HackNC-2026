type CallControlsProps = {
  status: "disconnected" | "connecting" | "connected" | "error";
  isMuted: boolean;
  isFinishing: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  onHangUp: () => void;
};

export default function CallControls({
  status,
  isMuted,
  isFinishing,
  onStart,
  onToggleMute,
  onHangUp,
}: CallControlsProps) {
  if (status === "disconnected" || status === "error") {
    return (
      <button type="button" className="primary-action" onClick={onStart} disabled={isFinishing}>
        Start practice call
      </button>
    );
  }

  return (
    <div className="call-controls">
      <button type="button" aria-pressed={isMuted} onClick={onToggleMute} disabled={status !== "connected"}>
        {isMuted ? "Unmute" : "Mute"}
      </button>
      <button type="button" className="danger-action" onClick={onHangUp} disabled={isFinishing}>
        {isFinishing ? "Preparing debrief…" : "End call"}
      </button>
    </div>
  );
}
