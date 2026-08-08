# Agent（ローカル実行前提の AI エージェント）

[Strands Agents SDK](https://github.com/strands-agents/sdk)（TypeScript）を使って実装された、ローカルで動作する AI エージェントです。AWS のシステムアーキテクチャ設計を支援するアシスタントとして動作します。

## 概要

- **モデル**：Amazon Bedrock Nova Micro（`us.amazon.nova-micro-v1:0`、固定）
- **リージョン**：`us-east-1`
- **ツール**：`aws-knowledge-mcp-server`（`https://knowledge-mcp.global.api.aws`）を MCP（Model Context Protocol）経由で利用し、AWS ドキュメントに基づいた回答・アーキテクチャ提案を行う
- **システムプロンプト**：AWS 知識に基づいて回答し、情報がなければ「わからない」と明言する／出典を明示する／複数のアーキテクチャパターンを提示する／質問と同じ言語で応答する
- **実行環境**：Hono + `@hono/node-server` で HTTP サーバー（ポート 8080）を起動し、`POST /invocations` でリクエストを受け付け、SSE（Server-Sent Events）でテキストデルタをストリーミング返却
- **セッション管理**：プロセス内 `Map` で `sessionId` ごとの `Agent` インスタンスをキャッシュ（会話履歴・割り込み状態を保持）

## ディレクトリ構成

agent/
├── src/
│   ├── index.ts                          # エントリポイント（Hono サーバー、/invocations ハンドラ、SSE ストリーミング）
│   ├── agent.ts                          # Strands Agent の生成（BedrockModel、システムプロンプト、ツール登録）
│   ├── logger.ts                         # AWS Lambda Powertools ベースのロガー
│   ├── types.ts                          # リクエストスキーマ（Zod）：`message` または `interruptResponses`
│   ├── tools/
│   │   └── aws-tool.ts                   # aws-knowledge-mcp-server への MCP クライアント／ツール一覧取得
│   └── observability/
│       ├── exporters.ts                  # OTel の Trace/Logs/Metrics エクスポーター初期化（Databricks OTLP/HTTP 送信）
│       └── access-token-manager.ts       # Databricks OAuth M2M アクセストークンのメモリキャッシュ管理

## 実行方法

```bash
cd agent
pnpm dev          # 開発サーバー起動（ポート 8080、ファイル監視あり）
# または
pnpm build && node dist/index.js  # 本番ビルド後実行
```

### 環境変数（`.env` ファイルで指定）

```env
# 必須：Bedrock モデル呼び出し用
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# 任意：Observability（Databricks 送信）
ENABLE_TRACING=true
ENABLE_LOGS=true
ENABLE_METRICS=true
DATABRICKS_WORKSPACE_URL=https://...
DATABRICKS_OAUTH_CLIENT_ID=...
DATABRICKS_OAUTH_CLIENT_SECRET=...
DATABRICKS_UC_SCHEMA_NAME=...
DATABRICKS_UC_TABLE_PREFIX=...
```

## リクエスト仕様

`POST http://localhost:8080/invocations` で送信されるペイロードは以下のスキーマで検証されます。

| パターン | フィールド | 型 | 説明 |
| --- | --- | --- | --- |
| 新規発話 | `message` | string | ユーザーからの入力メッセージ |
| 割り込み応答 | `interruptResponses` | array | `interruptId` と `response` を含むオブジェクトの配列 |

### 応答（SSE イベント）

| イベント | データ | 説明 |
| --- | --- | --- |
| `messageDelta` | `{ text: string }` | トークン単位のテキスト差分（ストリーミング中） |
| `interrupt` | `{ interrupts: InterruptPayload[] }` | Agent Loop がユーザー入力待ちで停止（`interruptId`/`name`/`reason` を含む） |
| `message` | `{ message: any }` | 最終的な応答メッセージ（AgentResult.lastMessage） |

## Observability（可観測性）

以下の環境変数（`"true"` 文字列）により、OpenTelemetry の Trace・Logs・Metrics をそれぞれ有効化できます。有効化した場合、Databricks の OTLP/HTTP エンドポイント（Unity Catalog テーブル）へエクスポートされます。

| 環境変数 | 説明 |
| --- | --- |
| `ENABLE_TRACING` | トレース有効化 |
| `ENABLE_LOGS` | ログ有効化 |
| `ENABLE_METRICS` | メトリクス有効化 |

Databricks 側の設定が不足している場合は Observability 機能をスキップし、通常どおりエージェントは動作します。

## よく使うコマンド

```bash
pnpm build       # rimraf で dist をクリーンアップ → vite build
pnpm watch       # ファイル変更を監視してビルド
pnpm dev         # tsx で直接実行（開発用）
pnpm test        # vitest によるユニットテスト
pnpm lint        # ESLint
pnpm lint-fix    # ESLint（自動修正）
```

## 関連

- チャット UI：[../frontend/README.md](../frontend/README.md)
