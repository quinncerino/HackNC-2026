type HowItWorksPageProps = {
  onPractice: () => void;
};

export default function HowItWorksPage({ onPractice }: HowItWorksPageProps) {
  return (
    <main className="page-shell how-it-works">
      <header className="hero">
        <h1>How it <span>Works</span></h1>
        <p>Practice spotting a scam in calls and text messages.</p>
      </header>
      <div className="debrief-grid">
        <section className="feedback-card">
          <h2>01. Pick a scenario</h2>
          <p>Choose Text Message or Phone Call, then pick a scenario. Each one puts you in a different situation.</p>
        </section>
        <section className="feedback-card">
          <h2>02. Start practicing</h2>
          <p>For calls, allow microphone access and start the call. For texts, enter your first name and phone number, confirm permission, then text START to the assigned iMessage number. Respond on your phone and follow the conversation here.</p>
        </section>
        <section className="feedback-card feedback-card--positive">
          <h2>03. Review your response</h2>
          <p>End the call, or text REVEAL to receive feedback. Review the tactics used and a safer response for next time. Text STOP to cancel text training.</p>
        </section>
      </div>
      <div className="notice">Use fictional information only. Never share real passwords, payment details, or verification codes.</div>
      <div className="start-row">
        <button className="primary-action" onClick={onPractice}>Back to Practice</button>
      </div>
    </main>
  );
}
