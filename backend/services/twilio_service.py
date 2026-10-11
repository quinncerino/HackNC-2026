import os
from pathlib import Path

from dotenv import load_dotenv
from twilio.rest import Client


BACKEND_ENV = Path(__file__).resolve().parents[1] / ".env"


def send_sms(to_number: str, body: str) -> str:
    """Send a fictional SMS and return the message SID."""
    # Refresh local credentials at send time and prefer backend/.env over any
    # stale TWILIO_* variables inherited by the Flask process.
    load_dotenv(dotenv_path=BACKEND_ENV, override=True)

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")

    if not account_sid or not auth_token or not from_number:
        raise RuntimeError(f"Twilio credentials are not configured in {BACKEND_ENV}")

    client = Client(account_sid, auth_token)
    message = client.messages.create(body=body, from_=from_number, to=to_number)
    return message.sid
