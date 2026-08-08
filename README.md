# Strands Agents Example

[Strands Agents SDK](https://github.com/strands-agents/sdk) を使った TypeScript 製 AI エージェントのローカル実行サンプルです。

AWS のアーキテクチャ設計を支援するチャットエージェントを題材に、以下を含んでいます。

- ローカルで動作するエージェントアプリケーション（Node.js / Strands Agents SDK / Hono）
- Cognito 認証付きのチャット UI（React + Vite）

## 構成

このリポジトリは pnpm workspace によるモノレポです。

| ディレクトリ | 役割 | 詳細 README |
| --- | --- | --- |
| [`agent/`](./agent) | ローカルで動くエージェント本体（Strands Agents SDK + Hono） | [agent/README.md](./agent/README.md) |
| [`frontend/`](./frontend) | エージェントとストリーミング通信するチャット UI（React + Vite） | [frontend/README.md](./frontend/README.md) |

## アーキテクチャ概要

ブラウザ（React SPA, Vite 開発サーバー）
│  Cognito User Pool でサインイン
│  アクセストークンを Authorization ヘッダーに付与
▼
ローカルエージェントサーバー（Hono, ポート 8080）
│
  ▼
Strands Agent（Node.js） ── aws-knowledge-mcp-server を MCP 経由で利用
│
├─ Amazon Bedrock（基盤モデル呼び出し）
└─ Databricks（OTel Trace/Logs/Metrics を UC テーブルへ送信、任意）

エージェントは AWS の設計・構築を支援するアシスタントとして動作し、`aws-knowledge-mcp-server` を MCP ツールとして呼び出しながら回答します。フロントエンドは Server-Sent Events でエージェントの応答をストリーミング表示します。

## セットアップ

### 前提条件

- Node.js（`package.json` の `devEngines` で指定：`^24.19.0` 相当）
- pnpm（`^11.20.0` 相当）
- 適切な権限を持つ AWS 認証情報（Bedrock モデル呼び出し用）
- Cognito User Pool の設定（フロントエンド認証用）

### インストール

```bash
pnpm install
```

### ビルド・Lint（全パッケージ一括）

```bash
pnpm build
pnpm lint
pnpm lint-fix
```

内部的には `pnpm run -r --parallel --if-present` で各ワークスペースの同名スクリプトを並列実行します。

## 開発・実行の流れ

### 1. エージェントサーバーを起動

```bash
cd agent
pnpm dev
```

- ポート 8080 で Hono サーバーが起動します
- `POST http://localhost:8080/invocations` でリクエストを受け付けます
- ファイル変更を監視する場合は `pnpm watch`

### 2. フロントエンドを開発サーバーで起動

```bash
cd frontend
pnpm dev
```

- デフォルトで <http://localhost:5173/> が開きます
- 実行時に `/amplifyconfiguration.json` と `/config.json` を fetch して初期化します
- ローカル開発時は、これらのファイルを `frontend/public/` に配置してください（`config.json` の `runtimeBaseUrl` を `http://localhost:8080` に設定）

### 環境変数（エージェント側）

`agent/` 配下で `.env` ファイルを作成し、以下を設定：

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

## CI/CD

`.github/workflows/` に以下のワークフローがあります。

- `ci.yml`：Lint・ビルドなどの CI（PR 時・手動実行）
- `codeql-analysis.yml`：CodeQL によるコード解析（main ブランチ push 時・週次スケジュール）
- `auto-merge.yml`：Dependabot PR 等の自動マージ

## ライセンス

各サブディレクトリのライセンス表記に従います（`frontend/LICENSE` など）。
