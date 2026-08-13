export interface InterruptPayload {
  id: string;
  name: string;
  reason: unknown;
}

export interface History {
  content: string;
  sender: 'あなた' | 'AI';
  segments: MessageSegment[];
}
