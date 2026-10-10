import phoneImage from "../assets/retro-phone.png";

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
      <img className="retro-phone" src={phoneImage} alt="" />
      <div className="meter-panel"><div className="meter-label">{label}</div><div className={`segment-meter ${status === "connected" && isSpeaking ? "segment-meter--speaking" : ""}`} aria-hidden="true">{Array.from({ length: 20 }, (_, index) => <i key={index} className={status === "connected" && index < (isSpeaking ? 13 : 3) ? "lit" : ""} />)}</div></div>
    </div>
  );
}
