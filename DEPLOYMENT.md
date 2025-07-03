# 🚀 配布セットアップガイド

このガイドは、自分のGitHubアカウントでRenode Runtime Manager配布システムをセットアップする手順です。

## 📋 前提条件

- GitHubアカウント
- Git がインストール済み
- Node.js 18+ がインストール済み（開発する場合のみ）

## 🔧 セットアップ手順

### 1. リポジトリの準備

```bash
# このプロジェクトをフォーク、または新しいリポジトリを作成
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# package.json を編集（必須）
# - "author": 自分の名前とメールアドレス
# - "repository": 自分のリポジトリURL
# - "homepage": 自分のリポジトリURL  
# - "bugs": 自分のリポジトリのissuesURL
```

### 2. GitHub Actions の有効化

1. **リポジトリ設定**:
   - Settings > Actions > General へ移動
   - "Allow all actions and reusable workflows" を選択
   - "Read and write permissions" を選択
   - "Allow GitHub Actions to create and approve pull requests" を有効化

2. **確認**: Actions タブで以下のワークフローが表示されることを確認
   - 🔍 Check Upstream Releases (毎日実行)
   - 🔨 Build Renode Runtime (手動/自動実行)
   - 🔄 Check All Upstream (手動実行)  
   - 🛠️ Build Embedded Tools (手動/自動実行)

### 3. 初回ビルドの実行

**オプション A: GitHub ウェブインターフェース**
1. リポジトリの「Actions」タブに移動
2. 「Build Renode Runtime」ワークフローを選択
3. 「Run workflow」ボタンをクリック
4. 「Run workflow」を確認

**オプション B: GitHub CLI**
```bash
# GitHub CLI をインストール済みの場合
gh workflow run build.yml
gh workflow run build-embedded-tools.yml
```

### 4. ビルド結果の確認

1. **ビルド完了の確認**:
   - Actions タブでワークフローが緑色（成功）になることを確認
   - 通常 15-30 分程度でビルド完了

2. **リリースの確認**:
   - リポジトリの「Releases」タブに移動
   - 以下のリリースが作成されることを確認:
     - `renode-runtime-v1.15.3` (Renode + Mono)
     - `arm-gnu-toolchain-v13.3.1` (ARM開発ツール)
     - `openocd-v0.12.0` (デバッガー)

### 5. 利用者への配布

ビルドが完了したら、利用者は以下の方法でツールをインストールできます：

**Node.js/TypeScript プロジェクトの場合**:
```bash
npm install YOUR_USERNAME/YOUR_REPO_NAME
```

**直接ダウンロード**:
```bash
# Renode のインストール
npx YOUR_USERNAME/YOUR_REPO_NAME install

# ARM開発ツールのインストール  
npx YOUR_USERNAME/YOUR_REPO_NAME install-embedded
```

**VSCode拡張での利用**:
```typescript
import { RenodeInstaller } from 'YOUR_USERNAME/YOUR_REPO_NAME';

const installer = new RenodeInstaller('YOUR_USERNAME', 'YOUR_REPO_NAME');
await installer.install();
```

## 🔄 自動更新システム

セットアップ完了後は、システムが自動で以下を実行します：

- **毎日 JST 18:00**: 上流リポジトリの新しいリリースをチェック
- **新バージョン検出時**: 自動でビルド・リリースを実行
- **手動実行**: いつでも Actions タブから手動でビルド可能

## 🐛 トラブルシューティング

### ビルドが失敗する場合

1. **Actions権限の確認**:
   - Settings > Actions > General で適切な権限が設定されているか確認

2. **ビルドログの確認**:
   - Actions タブでエラーログを確認
   - よくある問題: ディスク容量不足、ネットワークタイムアウト

3. **再実行**:
   - 「Re-run failed jobs」で失敗したジョブのみ再実行可能

### 利用者がインストールできない場合

1. **リリースの確認**: Releases タブにファイルが正しく配布されているか確認
2. **権限の確認**: リポジトリがPublicに設定されているか確認  
3. **ネットワークの確認**: 利用者のネットワーク環境でGitHubアクセス可能か確認

## 📊 利用状況の確認

- **Releases**: 各リリースのダウンロード数を確認可能
- **Traffic**: Settings > Insights > Traffic で利用統計を確認可能
- **Issues**: ユーザーからの問題報告やフィードバックを受付

## 🔗 参考リンク

- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)
- [GitHub Releases ドキュメント](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Renode 公式サイト](https://renode.io/)
- [ARM GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain)
