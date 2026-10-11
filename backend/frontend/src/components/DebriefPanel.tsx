import { useState } from "react";
import type { Debrief } from "../types";

type Props = {
  debrief: Debrief;
};

const skills = [
  {
    id: "boundary",
    title: "Set a clear boundary",
    description:
      'Clearly refuse the request: “I won’t share that code” or “I won’t make that payment.”',
  },
  {
    id: "verify",
    title: "Choose independent verification",
    description:
      "Explain that you will contact the organization or person through a channel you already trust.",
  },
  {
    id: "exit",
    title: "End the pressure",
    description:
      "End the conversation instead of negotiating with the caller.",
  },
];

export default function DebriefPanel({ debrief }: Props) {
  const [response, setResponse] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [saved, setSaved] = useState<{
    response: string;
    skills: string[];
  } | null>(null);

  function toggleSkill(id: string) {
    setChecked((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
    setSaved(null);
  }

  function savePractice() {
    if (!response.trim()) return;

    setSaved({
      response: response.trim(),
      skills: [...checked],
    });
  }

  return (
    <div className="debrief-grid">
      <section className="feedback-card feedback-card--wide">
        <p className="eyebrow">Your next practice goal</p>
        <h2>Pause. Set a boundary. Verify independently.</h2>
        <p>
          Choose one moment from this call and practice a response that
          makes your next action clear.
        </p>
      </section>

      <section className="feedback-card feedback-card--tactics">
        <h2>⚠ Understand the warning signs</h2>
        <p>
          Review these warning signs. Scenario guidance describes what to
          watch for; conversation evidence shows what was captured in
          this attempt.
        </p>

        {debrief.tactics.length > 0 ? (
          <ul className="debrief-insights">
            {debrief.tactics.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No warning signs were returned for this attempt.</p>
        )}
      </section>

      <section className="feedback-card">
        <h2>Your response review</h2>
        <p>
          Read these findings alongside the quotes below. Missing evidence
          does not mean a skill was demonstrated or missed.
        </p>
        <ul className="debrief-insights">
          {debrief.protectiveActions.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        {debrief.protectiveActions.length === 0 && (
          <p>No protective actions were identified in this attempt.</p>
        )}
      </section>

      {debrief.riskyActions.length > 0 && (
        <section className="feedback-card feedback-card--warning">
          <h2>What to practice differently</h2>
          <ul className="debrief-insights">
            {debrief.riskyActions.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p>
            Use the exercise below to replace a hesitant or risky response
            with a clear boundary and verification plan.
          </p>
        </section>
      )}

      <section className="feedback-card feedback-card--wide">
        <h2>Key moments from your call</h2>

        {debrief.evidence.length > 0 ? (
          debrief.evidence.slice(0, 3).map((item, index) => (
            <article className="debrief-moment" key={index}>
              <h3>Moment {index + 1}</h3>
              <blockquote>
                <p>“{item.quote}”</p>
                <footer>{item.explanation}</footer>
              </blockquote>
              <button
                type="button"
                onClick={() => {
                  setResponse(item.quote);
                  setChecked([]);
                  setSaved(null);
                  document
                    .getElementById("practice-response")
                    ?.focus();
                }}
              >
                Rewrite this response ↓
              </button>
            </article>
          ))
        ) : (
          <p>
            No supporting quotes were available. You can still practice
            the suggested response below, but this attempt cannot support
            a detailed comparison.
          </p>
        )}
      </section>

      <section className="feedback-card feedback-card--wide practice-phrase">
        <h2>▤ A response to practice</h2>
        <p>“{debrief.saferResponse}”</p>
        <p className="debrief-small">
          Say the boundary, end the conversation, and follow through on
          independent verification.
        </p>
      </section>

      <section className="feedback-card feedback-card--wide">
        <h2>Try a stronger response</h2>
        <p>
          Imagine the caller repeats the request and insists you act now.
          What would you say? Write one or two sentences in your own words.
        </p>

        <label htmlFor="practice-response">
          <strong>Your response</strong>
        </label>
        <textarea
          id="practice-response"
          className="debrief-response"
          rows={4}
          value={response}
          onChange={(event) => {
            setResponse(event.target.value);
            setSaved(null);
          }}
          placeholder="I won’t… I’ll verify by…"
        />

        <fieldset className="debrief-checklist">
          <legend>Check your response yourself</legend>
          {skills.map((skill) => (
            <label className="debrief-skill" key={skill.id}>
              <input
                type="checkbox"
                checked={checked.includes(skill.id)}
                onChange={() => toggleSkill(skill.id)}
              />
              <span>
                <strong>{skill.title}</strong>
                <small>{skill.description}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <button
          type="button"
          disabled={!response.trim()}
          onClick={savePractice}
        >
          Compare my responses
        </button>
        <p className="debrief-small">
          This exercise uses your own checklist selections. It is not an
          automated assessment. Your draft stays on this page and resets
          when you leave.
        </p>

        {saved && (
          <div className="debrief-comparison" role="status">
            <h3>Your practice comparison</h3>
            <div className="debrief-compare-grid">
              <div>
                <strong>Original evidence</strong>
                {debrief.evidence.length ? (
                  debrief.evidence.slice(0, 3).map((item, index) => (
                    <p key={index}>“{item.quote}”</p>
                  ))
                ) : (
                  <p>No original response available.</p>
                )}
              </div>
              <div>
                <strong>Your new response</strong>
                <p>“{saved.response}”</p>
              </div>
            </div>

            <h3>Your next step</h3>
            {saved.skills.length === skills.length ? (
              <p>
                You marked all three skills. Practice saying this aloud,
                then try another call and use the same approach when the
                caller pushes back.
              </p>
            ) : (
              <p>
                Strengthen:{" "}
                {skills
                  .filter((skill) => !saved.skills.includes(skill.id))
                  .map((skill) => skill.title.toLowerCase())
                  .join("; ")}
                . Revise your response and compare again.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}