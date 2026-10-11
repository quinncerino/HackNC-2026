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

    @patch("routes.imessage.get_imessage_chat_reply")
    @patch("routes.imessage.requests.post")
    def test_consent_start_conversation_reveal_and_memory(self, post: Mock, chat_reply: Mock):
        post.return_value.raise_for_status.return_value = None
        post.return_value.json.return_value = {"optInPhoneNumber": "+19195550999"}
        chat_reply.side_effect = [
            ("SIMULATION START — Campus IT Helpdesk.", "elevenlabs-test-conversation"),
            ("Please verify the request through the official channel.", "elevenlabs-test-conversation"),
        ]

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
        self.assertEqual(
            status.get_json()["elevenlabsConversationId"], "elevenlabs-test-conversation"
        )
        self.assertTrue(
            any(
                "You mentioned checking through a separate channel." in item
                for item in status.get_json()["debrief"]["protectiveActions"]
            )
        )

        second = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "bank_alert", "firstName": "Taylor", "phoneNumber": "+19195550123", "consent": True},
        )
        self.assertEqual(second.get_json()["memory"]["sessionsCompleted"], 1)
        self.assertTrue(
            any(
                "You mentioned checking through a separate channel." in item
                for item in second.get_json()["memory"]["strengths"]
            )
        )

    def test_internal_event_requires_authentication(self):
        response = self.client.post(
            "/api/imessage/event",
            json={"messageId": "message-unauthorized", "phoneNumber": "+19195550123", "text": "START"},
        )
        self.assertEqual(response.status_code, 401)

    @patch("routes.imessage.end_imessage_chat")
    @patch("routes.imessage.get_imessage_chat_reply")
    @patch("routes.imessage.requests.post")
    def test_agent_declaring_simulation_complete_finishes_session(
        self, post: Mock, chat_reply: Mock, end_chat: Mock
    ):
        post.return_value.raise_for_status.return_value = None
        post.return_value.json.return_value = {"optInPhoneNumber": "+19195550999"}
        chat_reply.side_effect = [
            ("Hello, this is your bank.", "conversation-final"),
            (
                "Since you refused the code, you avoided the scam. The simulation is now complete.",
                "conversation-final",
            ),
        ]

        started = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "bank_alert", "firstName": "Taylor", "phoneNumber": "+19195550123", "consent": True},
        )
        session_id = started.get_json()["sessionId"]
        self.client.post(
            "/api/imessage/event",
            headers=self.auth,
            json={"messageId": "auto-finish-start", "phoneNumber": "+19195550123", "text": "START"},
        )

        response = self.client.post(
            "/api/imessage/event",
            headers=self.auth,
            json={"messageId": "auto-finish-reply", "phoneNumber": "+19195550123", "text": "I won't share the code."},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["completed"])
        end_chat.assert_called_once_with(session_id)
        status = self.client.get(f"/api/imessage/session/{session_id}").get_json()
        self.assertEqual(status["status"], "complete")
        self.assertIsNotNone(status["debrief"])
        self.assertIn("Protect sensitive information", [skill["name"] for skill in status["debrief"]["skills"]])

    def test_event_without_active_session_is_ignored(self):
        response = self.client.post(
            "/api/imessage/event",
            headers=self.auth,
            json={
                "messageId": "message-without-session",
                "phoneNumber": "+19195550123",
                "text": "Hello",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"ignored": True})

    def test_start_requires_first_name(self):
        response = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "campus_it", "phoneNumber": "+19195550123", "consent": True},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("first name", response.get_json()["error"])

    @patch("routes.imessage.requests.post")
    def test_cancel_session_releases_phone_for_another_session(self, post: Mock):
        post.return_value.raise_for_status.return_value = None
        post.return_value.json.return_value = {"optInPhoneNumber": "+19195550999"}
        started = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "campus_it", "firstName": "Taylor", "phoneNumber": "+19195550123", "consent": True},
        )
        session_id = started.get_json()["sessionId"]

        cancelled = self.client.post(f"/api/imessage/session/{session_id}/cancel")

        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.get_json(), {"status": "cancelled"})
        status = self.client.get(f"/api/imessage/session/{session_id}")
        self.assertEqual(status.get_json()["status"], "cancelled")

        restarted = self.client.post(
            "/api/imessage/start",
            json={"scenarioId": "campus_it", "firstName": "Taylor", "phoneNumber": "+19195550123", "consent": True},
        )
        self.assertEqual(restarted.status_code, 200)


if __name__ == "__main__":
    unittest.main()
