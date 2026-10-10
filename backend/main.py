import re
from typing import Literal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title='ScamSpar feedback')
app.add_middleware(CORSMiddleware, allow_origins=['http://127.0.0.1:5173', 'http://localhost:5173'], allow_methods=['POST', 'GET'], allow_headers=['Content-Type'])

class Message(BaseModel):
    role: Literal['user', 'agent']
    text: str = Field(min_length=1, max_length=5000)

class Review(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=200)

def analyze(messages):
    users = [m.text for m in messages if m.role == 'user']
    def find(pattern):
        return next((s for s in users if re.search(pattern, s, re.I)), None)
    verify = find(r"\b(contact|call|reach)\b.{0,70}\b(it|office|help\s?desk|official)\b")
    refusal = find(r"\b(won't|will not|not going to|refuse|don't trust|do not trust)\b")
    code_mentions = [s for s in users if re.search(r'\b0{6}\b|\bzero(?:[ ,.-]+zero){5}\b', s, re.I)]
    return {
        'summary': 'Review what you said and practice one safer response. This is not a measure of your real-world scam resistance.',
        'method': 'Starter feedback uses phrase matching on participant turns only. It can miss paraphrases or misunderstand negation. No pass/fail score is assigned.',
        'checks': [
            {'name': 'Independent verification', 'status': 'Possible verification response found' if verify else 'No matching phrase found', 'quote': verify, 'tip': 'End the call and contact the organization through a channel you already trust.'},
            {'name': 'Holding a boundary', 'status': 'Possible refusal found' if refusal else 'No matching phrase found', 'quote': refusal, 'tip': 'You can refuse and hang up without convincing the caller.'},
            {'name': 'Fictional code mention', 'status': 'Code appeared; review its context, including whether you refused to share it' if code_mentions else 'No fictional code detected in your turns', 'quote': code_mentions[0] if code_mentions else None, 'tip': 'Mentioning a code is not necessarily sharing it. This starter deliberately avoids treating this as an automatic failure.'},
        ]
    }

@app.get('/health')
def health():
    return {'ok': True}

@app.post('/feedback')
def feedback(review: Review):
    return analyze(review.messages)
