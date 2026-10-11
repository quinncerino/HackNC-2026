import re, secrets, time
from flask import Blueprint, request, jsonify
from services.twilio_service import send_sms

sms_bp = Blueprint("sms", __name__)
E164 = re.compile(r"^\+[1-9]\d{7,14}$")

# in memory like the rest of the starter: session_id -> {"code", "phone", "created"}
code_sessions = {}

@sms_bp.post("/api/sms/code")
def send_code():
    data = request.get_json(force=True)
    phone = data.get("phone", "")
    if not E164.match(phone) or not data.get("consent"):
        return jsonify({"error": "Valid phone number and consent required"}), 400

    code = f"{secrets.randbelow(10**6):06d}"
    session_id = secrets.token_urlsafe(16)
    code_sessions[session_id] = {"code": code, "phone": phone, "created": time.time()}

    send_sms(
        phone,
        f"NICE TRY TRAINING (fictional): your practice code is {code}. "
        "This is NOT a real code. Never read real codes to a caller. Reply STOP to opt out.",
    )
    return jsonify({"session_id": session_id})