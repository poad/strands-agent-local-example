import { runAgentTurn } from './service/AgentCoreRuntimeService.js';
import { InterruptPayload, History } from './types/index.js';
import { ChatWindow } from './components/chat-window.jsx';
import { InterruptModal } from './components/interrupt-modal.jsx';
import { useState } from 'react';
import './index.module.css';

type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'tool'; toolCall: ToolCall };

const endpoint = 'http://localhost:8080';
const url = `${endpoint}/invocations`;

type ToolCallStatus = 'streaming' | 'executing' | 'complete';

interface ToolCall {
  toolUseId: string
  name: string
  input: string
  result?: string
  status: ToolCallStatus
}

const streamEventHandler = async (
  event: unknown,
  updateMessage: (segments: MessageSegment[]) => void,
  setIsLoading: (state: boolean) => void,
) => {
  console.log(event);
  updateMessage([{
    type: 'text',
    content: event as string,
  }]);
  setIsLoading(false);
};

function App() {
  const [messages, setMessages] = useState<History[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [currentInterrupt, setCurrentInterrupt] = useState<InterruptPayload | null>(null);
  const [interruptResolve, setInterruptResolve] = useState<((response: string) => void) | null>(null);

  const updateMessage = (segments: MessageSegment[]) => {
    // Build content from text segments for backward compat
    const content = segments
      .filter((s): s is Extract<MessageSegment, { type: 'text' }> => s.type === 'text')
      .map((s) => s.content)
      .join('');

    setMessages((prev) => {
      const updated = [...prev];
      if (prev[prev.length - 1].sender === 'AI') {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          sender: 'AI',
          content: prev[prev.length - 1].content + content,
          segments: [...segments],
        };
      } else {
        updated.push({
          sender: 'AI',
          content: content,
          segments: segments,
        });
      }
      return updated;
    });
  };

  async function invoke({ message, sessionId }: { message: string, sessionId: string }) {
    setIsLoading(true);
    await runAgentTurn({
      endpoint: url,
      sessionId,
      prompt: message,
      onAskUser: async (interrupt: InterruptPayload) => {
        // Show modal and wait for user response
        return new Promise<string>((resolve) => {
          setCurrentInterrupt(interrupt);
          setInterruptResolve(() => resolve);
        });
      },
      onDelta: (text) => {
        // トークン単位で届く応答をそのままUIに追記していく
        streamEventHandler(text, updateMessage, setIsLoading);
      },
      onMessage: (event) => streamEventHandler(event, updateMessage, setIsLoading),
    },
    );
  }

  return (
    <main>
      <div style={{ position: 'relative', height: '75vh', width: '50vw' }}>
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSend={async (
            textContent: string) => {
            setMessages((history) => [...history, {
              content: textContent,
              sender: 'あなた',
              segments: [{
                type: 'text',
                content: textContent,
              }],
            }]);
            await invoke({ message: textContent, sessionId });
          }} />
        {currentInterrupt && interruptResolve && (
          <InterruptModal
            interrupt={currentInterrupt}
            onSubmit={(response) => {
              interruptResolve(response);
              setCurrentInterrupt(null);
              setInterruptResolve(null);
            }}
            onCancel={() => {
              interruptResolve('');
              setCurrentInterrupt(null);
              setInterruptResolve(null);
            }}
          />
        )}
      </div>
    </main>
  );
}

export default App;
