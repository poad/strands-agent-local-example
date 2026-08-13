import { History } from '../types/index.js';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  MessageInput,
  Message,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import { useRef } from 'react';
import { Streamdown } from 'streamdown';
import 'streamdown/styles.css';

export function ChatWindow({
  messages,
  isLoading,
  onSend,
}: {
  messages: History[],
  isLoading: boolean,
  onSend: (input: string) => Promise<void>
}) {
  const inputRef = useRef(null);

  return (
    <MainContainer>
      <ChatContainer>
        <MessageList>
          {
            messages.map((message, index) => (
              <Message
                key={`message-${index}`}
                model={{
                  sender: message.sender,
                  direction: message.sender === 'あなた' ? 'incoming' : 'outgoing',
                  position: 'normal',
                }}>
                <Message.CustomContent>
                  <div>
                    <Streamdown
                      key={index}
                      animated
                      // plugins={{ code, mermaid, math, cjk }}
                      isAnimating={true}
                    >
                      {message.content}
                    </Streamdown>
                  </div>
                </Message.CustomContent>
              </Message>
            ))
          }
          {
            isLoading ? <TypingIndicator content="thinking" /> : <></>
          }
        </MessageList>
        <MessageInput
          ref={inputRef}
          placeholder="メッセージを入力..."
          onSend={onSend}
        />
      </ChatContainer>
    </MainContainer>

  );
}
