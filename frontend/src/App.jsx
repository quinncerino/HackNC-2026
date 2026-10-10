import { useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function Call() {
  const [messages, setMessages] = useState([]);
  const transcript = useRef([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const conversation = useConversation({
    onMessage: ({ message, source, role }) => {
      if (!message) return;
      const entry = { role: role === 'user' || source === 'user' ? 'user' : 'agent', text: message };
      transcript.current = [...transcript.current, entry];
      setMessages([...transcript.current]);
    },
    onDisconnect: () => setFinished(true),
    onError: (message) => setError(String(message)),
  });
  const idle = conversation.status === 'disconnected';
  async function start() {
    setBusy(true); setError(''); setFeedback(null); setFinished(false);
    transcript.current = []; setMessages([]);
    try {
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
      if (!agentId || agentId.startsWith('replace_')) throw new Error('Set your agent ID in frontend/.env.local and restart Vite.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      await conversation.startSession({ agentId, connectionType: 'webrtc' });
    } catch (e) { setError(e.message || 'Could not connect.'); }
    finally { setBusy(false); }
  }
  async function hangUp() {
    setBusy(true);
    try { await conversation.endSession(); setFinished(true); }
    catch (e) { setError(e.message || 'Could not end call.'); }
    finally { setBusy(false); }
  }
  async function review() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: transcript.current }),
      });
      if (!response.ok) throw new Error(`Feedback failed (${response.status}). Check the backend terminal.`);
      setFeedback(await response.json());
    } catch (e) { setError(e.message || 'Feedback unavailable.'); }
    finally { setBusy(false); }
  }
  return <main>
    <header><span className="badge">VOICE PRACTICE</span><h1>ScamSpar</h1><p>Practice the call. Recognize the pressure.</p></header>
    <section>
      <h2>Campus IT impersonation</h2>
      <p>A fictional caller claims your student account is at risk. Practice responding and deciding when to hang up.</p>
      <label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={!idle || busy} /> I understand this is AI training. I will use made-up information. My audio goes to ElevenLabs; reviewing sends the transcript to this app's backend.</label>
      <p aria-live="polite"><strong>{conversation.status}</strong>{conversation.status === 'connected' && (conversation.isSpeaking ? ' · Caller speaking' : ' · Listening to you')}</p>
      <div className="actions">
        <button onClick={start} disabled={!consent || !idle || busy}>Start practice</button>
        <button className="danger" onClick={hangUp} disabled={idle || busy}>Hang up</button>
        <button onClick={() => conversation.setMuted(!conversation.isMuted)} disabled={conversation.status !== 'connected'}>{conversation.isMuted ? 'Unmute' : 'Mute'}</button>
      </div>
      <p className="small">Fictional practice code: 000000. You can hang up whenever you choose.</p>
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    <section><h2>Conversation transcript</h2>
      <p className="small">Automatic transcription can contain mistakes. This starter does not reconcile interrupted or corrected agent messages.</p>
      {!messages.length && <p>Your conversation will appear here.</p>}
      <ol>{messages.map((m, i) => <li key={i}><strong>{m.role === 'user' ? 'You' : 'Caller'}:</strong> {m.text}</li>)}</ol>
      <button onClick={review} disabled={!finished || !idle || !messages.length || busy}>Review this call</button>
    </section>
    {feedback && <section><h2>Your practice review</h2><p>{feedback.summary}</p><p className="small">{feedback.method}</p>
      {feedback.checks.map(c => <article key={c.name}><h3>{c.name}</h3><p>{c.status}</p>{c.quote && <blockquote>{c.quote}</blockquote>}<p>{c.tip}</p></article>)}
      <p><strong>Try saying:</strong> “I'll contact IT using its official channel.”</p>
    </section>}
  </main>;
}
export default function App() { return <ConversationProvider><Call /></ConversationProvider>; }
