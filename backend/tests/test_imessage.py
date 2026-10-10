"""End-to-end route tests for the consented iMessage training flow."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

os.environ.setdefault("NICE_TRY_INTERNAL_TOKEN", "test-internal-token")
os.environ.setdefault("MEMORY_HASH_SECRET", "test-memory-secret")

from app import create_app  # noqa: E402
from services import memory_service  # noqa: E402


class IMessageFlowTest(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        memory_service.DATABASE_PATH = Path(self.temporary_directory.name) / "test.db"
        self.client = create_app().test_client()
        self.auth = {"Authorization": "Bearer test-internal-token"}

    def tearDown(self):
        self.temporary_directory.cleanup()

    @patch("routes.imessage.requests.post")
    def test_consent_start_conversation_reveal_and_memory(self, post: Mock):
        post.return_value.raise_for_status.return_value = None
        post.return_value.json.return_value = {"optInPhoneNumber": "+19195550999"}

        no_consent = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "campus_it", "firstName": "Taylor", "phoneNumber": "+19195550123", "consent": False},
        )
        self.assertEqual(no_consent.status_code, 400)

        started = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "campus_it", "firstName": "Taylor", "phoneNumber": "+19195550123", "consent": True},
        )
        self.assertEqual(started.status_code, 200)
        self.assertEqual(post.call_args.kwargs["json"]["firstName"], "Taylor")
        self.assertEqual(started.get_json()["optInPhoneNumber"], "+19195550999")
        session_id = started.get_json()["sessionId"]
        self.assertEqual(started.get_json()["memory"]["sessionsCompleted"], 0)

        began = self.client.post(
            "/api/imessage/event",
            headers=self.auth,
            json={"messageId": "message-start", "phoneNumber": "+19195550123", "text": "START"},
        )
        self.assertEqual(began.status_code, 200)
        self.assertIn("SIMULATION START", began.get_json()["reply"])

        challenged = self.client.post(
            "/api/imessage/event",
            headers=self.auth,
            json={
                "phoneNumber": "+19195550123",
                "messageId": "message-challenge",
                "text": "No, I will call back using the official website.",
            },
        )
        self.assertEqual(challenged.status_code, 200)

        duplicate = self.client.post(
            "/api/imessage/event",
            headers=self.auth,
            json={
                "phoneNumber": "+19195550123",
                "messageId": "message-challenge",
                "text": "No, I will call back using the official website.",
            },
        )
        self.assertEqual(duplicate.status_code, 200)
        self.assertTrue(duplicate.get_json()["duplicate"])

        revealed = self.client.post(
            "/api/imessage/event",
            headers=self.auth,
            json={"messageId": "message-reveal", "phoneNumber": "+19195550123", "text": "REVEAL"},
        )
        self.assertEqual(revealed.status_code, 200)
        self.assertIn("SIMULATION REVEALED", revealed.get_json()["reply"])

        status = self.client.get(f"/api/imessage/session/{session_id}")
        self.assertEqual(status.get_json()["status"], "complete")
        self.assertIn(
            "Chose to verify through an independent channel",
            status.get_json()["debrief"]["protectiveActions"],
        )

        second = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "bank_alert", "firstName": "Taylor", "phoneNumber": "+19195550123", "consent": True},
        )
        self.assertEqual(second.get_json()["memory"]["sessionsCompleted"], 1)
        self.assertIn(
            "Chose to verify through an independent channel",
            second.get_json()["memory"]["strengths"],
        )

    def test_internal_event_requires_authentication(self):
        response = self.client.post(
            "/api/imessage/event",
            json={"messageId": "message-unauthorized", "phoneNumber": "+19195550123", "text": "START"},
        )
        self.assertEqual(response.status_code, 401)

    def test_start_requires_first_name(self):
        response = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "campus_it", "phoneNumber": "+19195550123", "consent": True},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("first name", response.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
