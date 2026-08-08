import { createAgent } from './agent.js';
import { init } from './observability/exporters.js';
import { ChatRequest } from './types.js';
import { getAccessToken } from './observability/access-token-manager.js';
import { setupTracer } from '@strands-agents/sdk/telemetry';
import { NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Agent, AgentResult, AgentStreamEvent, Interrupt, InterruptResponseContent, AfterInvocationEvent } from '@strands-agents/sdk';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { cors } from 'hono/cors';

/** SDKの Interrupt から、フロントエンドに渡す分だけを取り出した型 */
type InterruptPayload = Pick<Interrupt, 'id' | 'name' | 'reason'>;

/** リクエストボディを agent.stream() に渡す InvokeArgs に変換する */
function toInvokeArgs(request: ChatRequest): string | InterruptResponseContent[] {
  if ('message' in request) {
    return request.message;
  }
  return request.interruptResponses.map(
    (r) => new InterruptResponseContent({ interruptId: r.interruptId, response: r.response }),
  );
}

function attachResumeQueue(agent: Agent, drainQueue: () => string | null) {
  agent.addHook(AfterInvocationEvent, (event) => {
    const next = drainQueue();
    if (next) {
      event.resume = next;
    }
  });
}

const app = new Hono();
app.use('/*', cors());

app.post('/invocations', async (c) => {
  const token = await getAccessToken();

  const request = await c.req.json();

  if (token) {
    const exporters = await init(token);
    if (exporters.trace) {
      const provider = new NodeTracerProvider({
        spanProcessors: [
          // Configure OTLP endpoint programmatically
          new SimpleSpanProcessor(
            exporters.trace,
          ),
        ],
      });
      setupTracer({
        provider,
        exporters: { otlp: true, console: false },
      });
    }
  }

  const sessionId = c.req.header()['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'];
  const session = { queue: [] as string[] };
  const agent = await createAgent({ session: sessionId });
  attachResumeQueue(agent, () => session.queue.shift() ?? null);
  const args = toInvokeArgs(request);

  // agent.stream() は AsyncGenerator<AgentStreamEvent, AgentResult, undefined>。
  // for-await では戻り値(最終的なAgentResult)が取れないため、
  // .next() を手動で回してイベントと最終結果の両方を受け取る。
  const streamGen = await agent.stream(args);
  let step: IteratorResult<AgentStreamEvent, AgentResult> = await streamGen.next();

  return streamSSE(c, async (stream) => {
    while (!step.done) {
      const event = step.value;

      // トークン単位のテキストデルタをそのままSSEで流す
      if (event.type === 'modelStreamUpdateEvent' && event.event.type === 'modelContentBlockDeltaEvent' && event.event.delta?.type === 'textDelta') {
        stream.writeSSE({ event: 'messageDelta', data: JSON.stringify({ text: event.event.delta.text }) });
      }

      step = await streamGen.next();
    }

    // ループを抜けた時点で step.done は true。
    // step.value は AsyncGenerator の第2型引数 (AgentResult)。
    const result: AgentResult = step.value;

    if (result.stopReason === 'interrupt') {
      // Agent Loop がユーザー入力待ちで停止。
      // フロントエンドはこのイベントを受けて質問を表示し、
      // 同じ sessionId で interruptResponses を送り返す。
      const interrupts: InterruptPayload[] = (result.interrupts ?? []).map((i) => ({
        id: i.id,
        name: i.name,
        reason: i.reason,
      }));

      stream.writeSSE({ event: 'interrupt', data: JSON.stringify({ interrupts }) });
    }

    stream.writeSSE({ event: 'message', data: JSON.stringify({ message: result.lastMessage }) });
  });
});

const server = serve({
  fetch: app.fetch,
  port: 8080,
});
// graceful shutdown
process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
