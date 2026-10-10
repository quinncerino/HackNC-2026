type CallStatusProps = {
  status: "disconnected" | "connecting" | "connected" | "error";
  isSpeaking: boolean;
};

export default function CallStatus({ status, isSpeaking }: CallStatusProps) {
  let label = "Ready to begin";
  if (status === "connecting") label = "Connecting securely…";
  if (status === "connected") label = isSpeaking ? "Caller is speaking" : "Listening to you";
  if (status === "error") label = "Connection error";

  return (
    <div className={`call-status call-status--${status}`} role="status">
      <span aria-hidden="true" />
      {label}
    </div>
  );
}
