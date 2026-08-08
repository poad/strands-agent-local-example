# Frontend（ローカルエージェントと通信するチャット UI）

ローカルで動作するエージェントサーバー（Hono, ポート 8080）とストリーミング通信する、React + Vite 製のチャット UI です。Cognito によるサインインを行い、エージェントとの対話を SSE（Server-Sent Events）でリアルタイムに表示します。

## 概要

- **フレームワーク**：React 19 + Vite（TypeScript）
- **認証**：`@aws-amplify/ui-react` の `Authenticator` コンポーネントと `aws-amplify/auth` を使用し、Cognito User Pool でサインイン。取得したアクセストークンをエージェントサーバー呼び出し時の `Authorization` ヘッダーに付与
- **チャット UI**：`@chatscope/chat-ui-kit-react` を使用したメッセージリスト・入力欄
- **Markdown 表示**：`streamdown` を使い、ストリーミング中の Markdown をアニメーション付きで逐次レンダリング
- **エージェント通信**：`src/service/AgentCoreRuntimeService.ts` がローカルエージェントサーバーの `/invocations` エンドポイント（`http://localhost:8080/invocations`）に対して `fetch` で SSE ストリームを開始し、Strands Agents SDK が出力するイベント（テキスト差分・ツール呼び出し開始／差分／結果・メッセージ確定・終了理由）をパースする

## ディレクトリ構成

frontend/
├── src/
│   ├── main.tsx                          # エントリポイント。/amplifyconfiguration.json を取得して Amplify.configure()
│   ├── App.tsx                           # チャット画面本体。ストリーミングイベントのハンドリングとメッセージ表示
│   ├── components/
│   │   └── SignOut.tsx                   # サインアウトボタン
│   └── service/
│       └── AgentCoreRuntimeService.ts    # ローカルエージェントサーバーへの SSE リクエスト・イベントパース
├── public/
├── index.html
├── package.json
└── vite.config.ts

## 設定ファイル（実行時に取得）

このアプリはビルド時の環境変数ではなく、実行時に静的ファイルとして配信される 2 つの JSON を `fetch` して初期化します。ローカル開発時は `frontend/public/` に手動で配置してください。

| ファイル | 内容 | 用途 |
| --- | --- | --- |
| `/amplifyconfiguration.json` | Cognito `userPoolId` / `userPoolClientId` / `region` | `Amplify.configure()` に渡してサインイン機能を有効化 |
| `/config.json` | `runtimeBaseUrl`（エージェントサーバーのベース URL、例：`http://localhost:8080`） | エージェントの invocations エンドポイント URL を組み立てる |

### 配置例（`frontend/public/` 配下）

#### amplifyconfiguration.json

```json
{
  "Auth": {
    "Cognito": {
      "userPoolId": "us-east-1_xxxxxxxxx",
      "userPoolClientId": "xxxxxxxxxxxxxxxxxxxxxxxxxx",
      "region": "us-east-1"
    }
  }
}
```

#### config.json

```json
{
  "runtimeBaseUrl": "http://localhost:8080"
}
```

## セットアップ

```bash
cd frontend
pnpm install
```

## よく使うコマンド

```bash
pnpm dev         # 開発サーバーを起動（デフォルトで http://localhost:5173/）
pnpm build       # tsc による型チェック → vite build
pnpm preview     # ビルド成果物をローカルでプレビュー
pnpm lint        # ESLint
pnpm lint-fix    # ESLint（自動修正）
```

## 開発時の動作確認手順

1. **エージェントサーバーを起動**（別ターミナル）

   ```bash
   cd ../agent
   pnpm dev
   ```

2. **フロントエンドを起動**

   ```bash
   cd frontend
   pnpm dev
   ```

3. ブラウザで <http://localhost:5173/> を開き、Cognito でサインイン後、チャットを開始

## 関連

- 通信先のエージェント本体：[../agent/README.md](../agent/README.md)

## ライセンス

このディレクトリ配下のコードは `frontend/LICENSE`（MIT-0）に従います。
