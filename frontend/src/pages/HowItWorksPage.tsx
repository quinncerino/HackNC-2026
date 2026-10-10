type HowItWorksPageProps = {
  onPractice: () => void;
};

export default function HowItWorksPage({ onPractice }: HowItWorksPageProps) {
  return (
    <main className="page-shell how-it-works">
      <header className="hero">
        <h1>How it <span>Works</span></h1>
        <p>Practice spotting a scam before a real caller catches you off guard.</p>
      </header>
      <div className="debrief-grid">
        <section className="feedback-card">
          <h2>01. Pick a scenario</h2>
          <p>Choose a fictional scam call to practice. Each scenario puts you in a different situation.</p>
        </section>
        <section className="feedback-card">
          <h2>02. Take the call</h2>
          <p>Allow microphone access, start the call, and respond in your own words. Listen for pressure, suspicious requests, and promises that sound too good to be true.</p>
        </section>
        <section className="feedback-card feedback-card--positive">
          <h2>03. Review your response</h2>
          <p>End the call to review the tactics used, actions that protected you, and a safer response to practice next time.</p>
        </section>
      </div>
      <div className="notice">Use fictional information only. Never share real passwords, payment details, or verification codes.</div>
      <div className="start-row">
        <button className="primary-action" onClick={onPractice}>Back to Practice</button>
      </div>
    </main>
  );
}
