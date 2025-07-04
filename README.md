# Renode Runtime Manager

🚀 **自動化されたクロスプラットフォーム Renode・Mono・ARM開発ツール配布システム**

このプロジェクトは、Renode（MIT）・Mono（MIT/LGPL）・ARM GNU Toolchain・OpenOCD等の組み込み開発ツールを GitHub Actions で自動ビルド・配布し、VSCode拡張や他のアプリケーションから簡単にインストールできるようにするシステムです。

> **🔒 セルフホスト方式の採用**: 公式バイナリURLの不安定性を避けるため、すべてのツールをソースからビルドし、GitHub Releasesでセルフホスト配布しています。これにより、安定したURL・バージョン管理・長期サポートを実現しています。

## 🎯 特徴

- ✅ **自動上流監視**: Renode・Mono・ARM Toolchain・OpenOCDの新しいリリースを自動検出
- ✅ **クロスプラットフォームビルド**: Linux/macOS/Windows対応（完全ソースビルド）  
- ✅ **セルフホスト配布**: GitHub Releases で自動配布（公式バイナリへの依存なし）
- ✅ **簡単インストール**: ワンコマンドでユーザー環境に展開
- ✅ **ライセンス準拠**: MIT/LGPL要件に沿った再配布

## 🔧 サポートツール

| ツール | 用途 | ライセンス | 配布方法 |
|--------|------|------------|----------|
| **Renode** | システム全体シミュレーション | MIT | ソースビルド＋セルフホスト |
| **Mono** | .NET Framework | MIT/LGPL | ソースビルド＋セルフホスト |
| **ARM GNU Toolchain** | ARM Cortex クロスコンパイル | GPL | GitHub Releases |
| **OpenOCD** | JTAG/SWDデバッガー | GPL | GitHub Releases |

## 📁 インストール構成

```
~/.emby/renode/
├── Renode.exe
├── mono/
│   └── bin/mono
├── renode                 ← 実行ラッパー（mac/linux）
└── renode.bat             ← 実行ラッパー（windows）
```

## 🛠️ セットアップ

### 1. リポジトリをフォーク/作成

このリポジトリを自分の GitHub アカウントにフォークするか、新しいリポジトリを作成してファイルをコピーしてください。

### 2. GitHub Actions の設定

リポジトリの Settings > Actions > General で以下を有効化：

- ✅ Allow all actions and reusable workflows
- ✅ Read and write permissions

### 3. 環境変数の設定（オプション）

リポジトリの Settings > Secrets and variables > Actions で設定：

```bash
GITHUB_TOKEN  # 自動で設定されます（変更不要）
```

### 4. 初回実行

```bash
# 手動で初回ビルドを開始
gh workflow run build.yml
```

または GitHub のウェブインターフェースから「Actions」タブで `Build Renode Runtime` ワークフローを手動実行。

## 📦 自動ダウンロード・インストール

### Node.js/TypeScript から使用

```typescript
import { RenodeInstaller } from 'tekitounix/embedded-tools-installer';

const installer = new RenodeInstaller('tekitounix', 'embedded-tools-installer');

// インストール
await installer.install();

// ステータス確認
await installer.status();

// アンインストール
await installer.uninstall();
```

### コマンドラインから使用

```bash
# インストール
npx tekitounix/embedded-tools-installer install

# ARM開発ツールのインストール
npx tekitounix/embedded-tools-installer install-embedded

# ステータス確認
npx tekitounix/embedded-tools-installer status

# アンインストール
npx tekitounix/embedded-tools-installer uninstall
```

### 環境変数で設定をカスタマイズ

```bash
# リポジトリ設定
export RENODE_REPO_OWNER="tekitounix"
export RENODE_REPO_NAME="embedded-tools-installer"

# インストール実行
node dist/installRenode.js install
```

## 🔄 GitHub Actions ワークフロー

### `check-upstream.yml`
- **実行頻度**: 毎日 UTC 9:00 (JST 18:00)
- **機能**: Renode と Mono の新しいリリースを監視
- **動作**: 新しいバージョンが見つかると `build.yml` を自動実行

### `build.yml`
- **トリガー**: 上流更新検知、手動実行、VERSION ファイル変更
- **機能**: 
  - Mono をソースからクロスプラットフォームビルド
  - Renode をソースからクロスプラットフォームビルド（セルフホスト配布）
  - 統合パッケージを作成してGitHub Releasesで配布

## 🔧 VSCode拡張での使用例

```typescript
import * as vscode from 'vscode';
import { RenodeInstaller } from 'tekitounix/embedded-tools-installer';

export async function activate(context: vscode.ExtensionContext) {
    const installer = new RenodeInstaller('tekitounix', 'embedded-tools-installer');
    
    // 拡張初回起動時にインストール
    const isInstalled = await installer.isInstalled();
    if (!isInstalled) {
        vscode.window.showInformationMessage('Installing Renode Runtime...');
        try {
            await installer.install();
            vscode.window.showInformationMessage('Renode Runtime installed successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Installation failed: ${error}`);
        }
    }
    
    // コマンド登録
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.installRenode', () => installer.install(true)),
        vscode.commands.registerCommand('extension.renodeStatus', () => installer.status())
    );
}
```

## 📋 サポートプラットフォーム

| OS | アーキテクチャ | ステータス |
|---|---|---|
| Linux | x64 | ✅ サポート |
| macOS | x64 | ✅ サポート |
| Windows | x64 | ✅ サポート |

## 🔍 トラブルシューティング

### ビルドが失敗する場合

1. **依存関係の確認**:

   ```bash
   npm install
   npm run build
   ```

2. **GitHub Actions ログの確認**:
   リポジトリの「Actions」タブでビルドログを確認

3. **権限の確認**:
   Repository Settings > Actions > General で write 権限が有効か確認

### インストールが失敗する場合

1. **ネットワーク接続の確認**
2. **ディスク容量の確認** (約500MB必要)
3. **権限の確認** (`~/.emby/renode/` への書き込み権限)

## 📜 ライセンス

- **このプロジェクト**: MIT License
- **Renode**: MIT License  
- **Mono**: MIT/LGPL License

## 🤝 貢献

Issues や Pull Requests を歓迎します！

## 🔗 関連リンク

- [Renode 公式サイト](https://renode.io/)
- [Mono プロジェクト](https://www.mono-project.com/)
- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)

## ⚠️ 配布方式：なぜセルフホストなのか

このプロジェクトでは、以下の理由により**セルフホスト方式**（ソースからビルドしてGitHub Releasesで配布）を採用しています：

### 🔗 公式バイナリの問題点

- **URLの不安定性**: 公式のNightly/Releaseのダウンロードリンクが予告なく変更される
- **アクセス制限**: 一部の環境でのダウンロード制限やアクセス障害
- **バージョン管理**: 特定バージョンへの永続的なアクセスが困難

### ✅ セルフホストの利点

- **安定したURL**: GitHub Releases による永続的なダウンロードリンク
- **バージョン固定**: 特定バージョンの長期保持・アクセス保証
- **カスタマイズ可能**: ビルドオプションの調整・最適化
- **ライセンス透明性**: MIT/LGPLライセンスに完全準拠した再配布

### 📈 実装状況

| コンポーネント | 配布方式 | ステータス |
|---|---|---|
| Renode | ソースビルド＋セルフホスト | ✅ 実装済み |
| Mono | ソースビルド＋セルフホスト | ✅ 実装済み |
| ARM Toolchain | 公式リンク（安定） | ✅ 実装済み |
| OpenOCD | 公式リンク（安定） | ✅ 実装済み |
