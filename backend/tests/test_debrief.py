import unittest

from services.debrief_service import build_debrief, digits_from, shared_code


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
        self.assertTrue(all(skill["status"] == "Not enough evidence" for skill in result["skills"]))


    def test_no_relevant_evidence_makes_no_personalized_success_claim(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "Buy gift cards right away."},
            {"role": "user", "text": "I'll think about it."},
        ])

        self.assertTrue(result["transcriptUsable"])
        self.assertIn("not provide enough relevant evidence", result["mainTakeaway"])
        self.assertFalse(result["keyMoments"])
        self.assertTrue(all(skill["status"] == "Not enough evidence" for skill in result["skills"]))
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
        self.assertTrue(all(skill["status"] == "Not demonstrated" for skill in result["skills"]))


    def test_demonstrated_skills_are_tied_to_captured_actions(self):
        result = build_debrief(GIFT_CARD, [
            {"role": "agent", "text": "Buy gift cards now."},
            {"role": "user", "text": "No, I won't buy gift cards. I'll verify this with someone I trust and I'll hang up."},
        ])

        self.assertEqual([skill["status"] for skill in result["skills"]], [
            "Demonstrated", "Demonstrated", "Demonstrated"
        ])
        self.assertEqual(result["keyMoments"][0]["assessment"], "helped")
        self.assertEqual(len(result["scenarioWarningSigns"]), 4)

    def test_digits_from_supports_numeric_and_spoken_forms(self):
        self.assertEqual(digits_from("483921"), "483921")
        self.assertEqual(digits_from("483 921"), "483921")
        self.assertEqual(digits_from("four eight three nine two one"), "483921")

    def test_shared_code_checks_only_participant_turns(self):
        transcript = [
            {"role": "agent", "text": "The code is four eight three nine two one."},
            {"role": "user", "text": "I will not share my code."},
            {"role": "user", "text": "I read it aloud, it is 483921."},
            {"role": "user", "text": "I am not giving this code to you."},
        ]

        self.assertTrue(shared_code(transcript, "483921"))
        self.assertFalse(shared_code(transcript, "123456"))
        self.assertFalse(shared_code([
            {"role": "user", "text": "I refuse to share it."},
            {"role": "agent", "text": "Please read the code four eight three nine two one."},
        ], "483921"))


if __name__ == "__main__":
    unittest.main()