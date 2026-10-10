# Scamnasium

Scamnasium is an interactive scam-call training application for HackNC 2026. It lets participants practice responding to realistic but fictional social-engineering calls in a safe environment. After each simulated conversation, the application reviews the transcript, identifies the pressure tactics used by the caller, recognizes protective actions taken by the participant, and suggests safer responses they can use in the future.

The hackathon MVP focuses on three fictional scenarios:

- A caller impersonating a campus IT help desk.
- A fake bank fraud alert.
- A caller demanding payment with gift cards.

Scamnasium is intended to run locally. The React interface runs in the participant's browser on `localhost`, while a local Flask server handles trusted application logic. Real-time voice processing is provided by ElevenLabs, so an internet connection is still required for simulated calls.

## User experience

1. The participant chooses a fictional scam scenario.
2. The application explains that the call is a training simulation and requests microphone access.
3. An AI caller responds to the participant in real time and adapts its tactics to the conversation.
4. The participant can challenge the caller, refuse the request, verify independently, or hang up.
5. The application presents a transcript-based debrief with warning signs, protective actions, risky disclosures, and a safer response to practice.

The MVP should keep each call to approximately 60–90 seconds so the complete experience fits comfortably into a hackathon demonstration.

## Architecture

The project is divided into a React frontend and a Flask backend.

```text
React frontend
  |-- Displays scenarios and call controls
  |-- Requests microphone permission
  |-- Connects audio directly to ElevenLabs
  |-- Displays the live transcript and debrief
  |
  +-- HTTP requests to Flask
          |-- Loads approved scenario definitions
          |-- Requests short-lived ElevenLabs session tokens
          |-- Applies transcript rules and LLM-assisted analysis
          +-- Returns structured feedback
```

Live audio should travel directly between the React client and ElevenLabs rather than through Flask. Flask keeps API credentials out of frontend code and controls which scenario settings may be used.

## Project structure

```text
.
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   ├── routes/
│   │   ├── scenarios.py
│   │   ├── sessions.py
│   │   └── debrief.py
│   ├── services/
│   │   ├── elevenlabs_service.py
│   │   └── debrief_service.py
│   └── scenarios/
│       ├── campus_it.json
│       ├── bank_alert.json
│       └── gift_card.json
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── PracticePage.tsx
│       │   └── ResultsPage.tsx
│       ├── components/
│       │   ├── ScenarioCard.tsx
│       │   ├── CallControls.tsx
│       │   ├── CallStatus.tsx
│       │   ├── Transcript.tsx
│       │   └── DebriefPanel.tsx
│       ├── hooks/
│       │   └── useScamCall.ts
│       ├── services/
│       │   └── api.ts
│       ├── types/
│       │   └── index.ts
│       └── styles/
│           └── app.css
├── README.md
└── .gitignore
```

Every scaffolded implementation file currently contains only a short description of its intended responsibility. No application logic, dependencies, or scenario content has been implemented yet.

## Backend responsibilities

The Flask backend will eventually expose a small API:

- `GET /api/scenarios` returns safe public information about the available scenarios.
- `POST /api/session` validates a scenario selection and requests a short-lived ElevenLabs conversation token.
- `POST /api/debrief` accepts a completed transcript and returns structured coaching feedback.
- `GET /api/health` reports whether the local backend is running.

Scenario JSON files will define each fictional caller's identity, objective, tactics, escalation behavior, safe exit condition, and evaluation rubric. They must never contain real credentials, personal information, or instructions to request genuine verification codes.

## Frontend responsibilities

The React frontend will eventually provide:

- Scenario selection and training disclosures.
- Microphone permission and readiness checks.
- Start, mute, hang-up, and call-status controls.
- Live participant and caller transcript entries.
- Loading and failure states for voice and analysis services.
- A debrief showing detected warning signs, supporting transcript moments, protective decisions, and safer phrases.

## Debrief approach

The planned evaluation combines deterministic checks with LLM-assisted coaching. Rules should identify clear events such as refusing a request, attempting independent verification, sharing a numeric code, or ending the call. The language model can then recognize paraphrased behavior and produce a concise explanation.

The debrief should be educational rather than punitive. It should explain what happened, cite evidence from the conversation, and give the participant one concrete behavior to practice.

## Safety and privacy

- Clearly identify every experience as a fictional training simulation before microphone access begins.
- Tell participants not to provide real names, passwords, account numbers, payment details, or verification codes.
- Use fictional organizations rather than impersonating real banks or university departments.
- Do not clone a real person's voice.
- Keep API keys on the Flask side and out of frontend source code.
- Disable unnecessary audio retention and retain transcripts only as long as the demonstration requires.
- Provide a visible hang-up control throughout the simulation.

Before adding secrets to `backend/.env`, configure `.gitignore` so local environment files cannot be committed.

## MVP priorities

Development should begin with one complete campus IT scenario. The first milestone is a reliable path from scenario selection to live call to debrief. The bank-alert and gift-card scenarios should reuse that same flow and be added only after the first scenario works end to end.

Accounts, a database, real telephone calls, leaderboards, voice cloning, and production installers are outside the initial hackathon scope.

## Current status

The repository contains the agreed project scaffold and documentation only. Implementation has not started.
