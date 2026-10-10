from elevenlabs.client import ElevenLabs
from elevenlabs import  save
import os
import signal
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation
from elevenlabs.conversational_ai.default_audio_interface import DefaultAudioInterface
load_dotenv()

agent_id = os.getenv("AGENT_ID")
api_key = os.getenv("ELEVENLABS_API_KEY")

elevenlabs = ElevenLabs(api_key=api_key)


conversation = Conversation(
    # API client and agent ID.
    elevenlabs,
    agent_id,
    # Assume auth is required when API_KEY is set.
    requires_auth=bool(api_key),
    # Use the default audio interface.
    audio_interface=DefaultAudioInterface(),
    # Simple callbacks that print the conversation to the console.
    callback_agent_response=lambda response: print(f"Agent: {response}"),
    callback_agent_response_correction=lambda original, corrected: print(f"Agent: {original} -> {corrected}"),
    callback_user_transcript=lambda transcript: print(f"User: {transcript}")
)
def stop_conversation(sig, frame):
    print("\nEnding conversation...")
    conversation.end_session()

signal.signal(signal.SIGINT, stop_conversation)

print("Connecting to ElevenLabs agent...")
conversation.start_session()


try:
    conversation_id = conversation.wait_for_session_end()
    print(f"Conversation ended. ID: {conversation_id}")
except KeyboardInterrupt:
    conversation.end_session()


