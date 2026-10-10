export type Scenario = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
};

export type TranscriptTurn = {
  role: "agent" | "user";
  text: string;
};

export type SessionResponse = {
  conversationToken: string;
  conversationId: string | null;
  scenario: Pick<Scenario, "id" | "title" | "description">;
  dynamicVariables: Record<string, string | number | boolean>;
};

export type DebriefEvidence = {
  quote: string;
  explanation: string;
};

export type Debrief = {
  tactics: string[];
  protectiveActions: string[];
  riskyActions: string[];
  evidence: DebriefEvidence[];
  saferResponse: string;
};

export type IMessageMemory = {
  sessionsCompleted: number;
  strengths: string[];
  focusAreas: string[];
};

export type IMessageStartResponse = {
  sessionId: string;
  status: string;
  maskedPhone: string;
  optInPhoneNumber: string;
  memory: IMessageMemory;
};

export type IMessageSession = {
  id: string;
  scenarioId: string;
  status: string;
  stage: string;
  transcript: TranscriptTurn[];
  debrief: Debrief | null;
};
