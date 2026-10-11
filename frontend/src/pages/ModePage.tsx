type ModePageProps = {
  onHowItWorks: () => void;
  onChoose: (mode: "text" | "phone") => void;
};

export default function ModePage({ onChoose, onHowItWorks }: ModePageProps) {
  return (
    <main className="page-shell">
      <header className="hero">
        <h1 style={{ textAlign: "center" }}>Nice Try.</h1>
        <p>How would you like to practice spotting a scam?</p>
      </header>
      <div className="training-modes">
        <button className="scenario-card mode-card" onClick={() => onChoose("text")}>
          <svg viewBox="0 0 100 90" className="scenario-icon" aria-hidden="true">
            <path d="M10 10H90V64H42L22 80V64H10Z" fill="#bddbff" stroke="#080f50" strokeWidth="4" />
            <path d="M25 29H75M25 44H61" stroke="#065dff" strokeWidth="5" />
          </svg>
          <h2>Text Message</h2>
          <p>Practice a fictional scam conversation through iMessage on your phone.</p>
          <strong>Choose a scenario →</strong>
        </button>
        <button className="scenario-card mode-card" onClick={() => onChoose("phone")}>
          <svg viewBox="0 0 100 90" className="scenario-icon" aria-hidden="true">
            <path d="M23 10L40 29L30 42Q39 59 58 65L70 54L89 69Q75 91 54 80Q17 64 10 32Q6 20 23 10Z" fill="#bddbff" stroke="#080f50" strokeWidth="4" />
          </svg>
          <h2>Phone Call</h2>
          <p>Talk through a fictional scam call and practice responding in real time.</p>
          <strong>Choose a scenario →</strong>
        </button>
      </div>
      <div className="training-info-row">
        <button type="button" className="notice training-help" onClick={onHowItWorks}>
          <span aria-hidden="true">?</span>
          <strong>How It Works</strong>
        </button>
      </div>
      <p className="privacy-note">Safe training simulation. Use fictional information during practice.</p>
    </main>
  );
}
