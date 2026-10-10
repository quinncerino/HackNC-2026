# Nice Try iMessage MVP setup

This flow uses three local processes:

1. React renders the scenario picker, consent form, live transcript, and debrief.
2. Flask validates the request, owns the scenario state, and stores privacy-conscious memory.
3. The Spectrum TypeScript service sends and receives iMessages through Photon.

The Spectrum service and Flask authenticate to each other with one shared internal token. Photon credentials exist only in the Spectrum service.

## 1. Create the Photon project

1. Sign in at [app.photon.codes/dashboard](https://app.photon.codes/dashboard).
2. Apply promo code `HACKWITHPHOTON`.
3. Create a Spectrum project and connect iMessage.
4. Copy the project ID and project secret from project settings.

Use a Photon-managed cloud line for the hackathon. The Pro shared pool is sufficient for direct messages.

## 2. Configure Flask

Create or update `backend/.env`:

```dotenv
NICE_TRY_INTERNAL_TOKEN=generate-a-long-random-value
MEMORY_HASH_SECRET=generate-a-different-long-random-value
SPECTRUM_SERVICE_URL=http://127.0.0.1:5051
```

Keep the existing ElevenLabs values if browser voice should remain available. Generate the two random values with a password manager or `openssl rand -hex 32`.

Memory is stored in `backend/data/nice_try.db`, which is ignored by Git. Phone numbers are keyed by an HMAC hash. Only the last four digits are stored separately for display.

## 3. Configure the Spectrum service

Copy `spectrum-service/.env.example` to `spectrum-service/.env`, then fill in:

```dotenv
SPECTRUM_PROJECT_ID=your-project-id
SPECTRUM_PROJECT_SECRET=your-project-secret
# Optional locally after `photon auth login`; required for unattended deployment.
PHOTON_API_TOKEN=your-project-management-token
NICE_TRY_API_URL=http://127.0.0.1:5000
NICE_TRY_INTERNAL_TOKEN=the-exact-same-value-used-by-Flask
PORT=5051
```

Do not put Photon credentials in `frontend/.env` or any variable beginning with `VITE_`; Vite exposes those values to the browser.

When a participant consents, the Spectrum service uses the official Photon CLI to find or add
that phone number to the project's user allowlist before sending the training message. The form
collects only a first name and phone number. Photon requires the remaining user fields, so Nice
Try supplies `Participant` as the last name and a deterministic, non-personal `example.com`
address. It also requests Photon's onboarding invitation so a newly registered participant can
bind to their assigned shared line. Local development can use credentials saved by
`photon auth login`. An unattended deployment should set `PHOTON_API_TOKEN` to a management token
provided by Photon.

## 4. Install and verify

From `HackNC-2026`:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

cd spectrum-service
npm install
npm run build

cd ../frontend
npm install
npm run build
```

Run the Flask tests:

```bash
cd backend
../.venv/bin/python -m unittest discover -s tests -v
```

## 5. Start all three processes

Terminal 1:

```bash
cd backend
../.venv/bin/python app.py
```

Terminal 2:

```bash
cd spectrum-service
npm run dev
```

Terminal 3:

```bash
cd frontend
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

## 6. Demo the flow

1. Select a scenario.
2. Leave `iMessage` selected.
3. Enter your own mobile number and check the consent box.
4. Select **Prepare iMessage training**.
5. Use **Open Messages and text START**. Photon shared lines require the participant to send the first message.
6. Challenge or comply with the simulated request.
7. Reply `REVEAL` to end the simulation and see the browser debrief.
8. Start a second scenario with the same number. The browser and opening message will recognize prior practice, while the stored strengths and focus areas carry forward.

At any time, `STOP` cancels the active session. A number cannot begin a second session while another is pending or active.

## Current MVP boundary

The first version uses deterministic, scenario-aware dialogue so it can be tested without introducing another model credential. The transport, session state, consent controls, adaptive branches, transcript, debrief, and persistent memory are real. A model-backed response generator can replace `backend/services/imessage_agent_service.py` later without changing the Spectrum transport or frontend.
