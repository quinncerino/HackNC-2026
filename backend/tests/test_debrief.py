import unittest

from services.debrief_service import build_debrief


GIFT_CARD = {
    "id": "gift_card",
    "tactics": ["Emotional pressure", "Urgency", "Secrecy", "Irreversible payment request"],
    "saferResponse": "I will not purchase anything until I verify this request with someone I trust.",
}


class DebriefTests(unittest.TestCase):
    def test_unusable_transcript_uses_requested_takeaway(self):
        result = build_debrief(GIFT_CARD, [])

        self.assertEqual(result["mainTakeaway"], "We couldn’t assess this attempt. Try again in a quiet space or use text mode.")
        self.assertFalse(result["transcriptUsable"])
        self.assertFalse(result["keyMoments"])
        self.assertEqual(result["skills"], [])


    def test_no_relevant_evidence_makes_no_personalized_success_claim(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "Good morning, how are you doing today?"},
            {"role": "user", "text": "I'll think about it."},
        ])

        self.assertTrue(result["transcriptUsable"])
        self.assertIn("not provide enough relevant evidence", result["mainTakeaway"])
        self.assertFalse(result["keyMoments"])
        self.assertEqual(result["skills"], [])
        self.assertNotIn("did well", result["mainTakeaway"])


    def test_gift_card_affordability_response_gets_specific_coaching(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "Buy gift cards now and read me the codes."},
            {"role": "user", "text": "I can't afford that."},
        ])

        moment = result["keyMoments"][0]
        self.assertEqual(moment["callerSaid"], "Buy gift cards now and read me the codes.")
        self.assertEqual(moment["youSaid"], "I can't afford that.")
        self.assertEqual(moment["assessment"], "left_opening")
        self.assertEqual(result["nextPracticeGoal"], "Refuse the payment directly instead of explaining why you can’t afford it.")
        self.assertEqual(result["skills"], [])


    def test_demonstrated_skills_are_tied_to_captured_actions(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "Buy gift cards now."},
            {"role": "user", "text": "No, I won't buy gift cards. I'll verify this with someone I trust and I'll hang up."},
        ])

        self.assertEqual([skill["name"] for skill in result["skills"][:3]], [
            "Set a clear boundary", "Verify independently", "End the conversation"
        ])
        self.assertEqual(result["keyMoments"][0]["assessment"], "helped")
        self.assertEqual(len(result["scenarioWarningSigns"]), 4)

    def test_variety_of_skills_are_reported_only_when_demonstrated(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "Buy gift cards and tell me your verification code now."},
            {"role": "user", "text": "No. I won't share my code. I'll check with my daughter and think it over."},
        ])

        skill_names = {skill["name"] for skill in result["skills"]}
        self.assertTrue({
            "Set a clear boundary",
            "Protect sensitive information",
            "Get a second opinion",
            "Pause before acting",
        }.issubset(skill_names))
        self.assertTrue(all("status" not in skill for skill in result["skills"]))

    def test_natural_language_refusal_and_verification_are_recognized(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "You must buy gift cards immediately."},
            {"role": "user", "text": "I'm not comfortable doing that. I'll check with my daughter first."},
        ])

        skill_names = {skill["name"] for skill in result["skills"]}
        self.assertIn("Set a clear boundary", skill_names)
        self.assertIn("Verify independently", skill_names)
        self.assertEqual(result["keyMoments"][0]["assessment"], "helped")

    def test_common_call_bank_and_code_refusal_phrases_are_recognized(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "Buy gift cards and read me the code."},
            {"role": "user", "text": "I won't give them the code. I'll call the bank myself and ask my daughter first."},
        ])

        skill_names = {skill["name"] for skill in result["skills"]}
        self.assertIn("Protect sensitive information", skill_names)
        self.assertIn("Verify independently", skill_names)
        self.assertIn("Get a second opinion", skill_names)

    def test_hang_up_phrasing_is_recognized(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "You need to buy the cards right now."},
            {"role": "user", "text": "I'm hanging up now."},
        ])

        self.assertIn("End the conversation", {skill["name"] for skill in result["skills"]})

    def test_ambiguous_reply_to_gift_card_pressure_gets_cautious_exchange(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "Please get gift cards and read me the codes."},
            {"role": "user", "text": "Let me think about it."},
        ])

        self.assertTrue(result["keyMoments"])
        self.assertIn("not proof you agreed", result["keyMoments"][0]["why"])
        self.assertEqual(result["keyMoments"][0]["assessment"], "left_opening")
        self.assertEqual(result["nextPracticeGoal"], "Refuse the requested action directly instead of explaining or negotiating.")


if __name__ == "__main__":
    unittest.main()