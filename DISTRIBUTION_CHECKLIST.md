# 🚀 配布前チェックリスト

このプロジェクトを他のユーザーに配布する前に、以下の項目を確認してください。

## ✅ 必須設定項目

### 📝 package.json の編集
- [ ] `"author"`: 自分の名前とメールアドレスに変更
- [ ] `"repository"`: 自分のGitHubリポジトリURLに変更  
- [ ] `"homepage"`: 自分のリポジトリのホームページURLに変更
- [ ] `"bugs"`: 自分のリポジトリのissues URLに変更

### 📄 ドキュメント更新
- [ ] `README.md`: 「YOUR_USERNAME/YOUR_REPO_NAME」を実際の値に変更
- [ ] `DEPLOYMENT.md`: セットアップ手順で「YOUR_USERNAME/YOUR_REPO_NAME」を変更
- [ ] `LICENSE`: 「[Your Name]」を実際の名前に変更

### ⚙️ GitHub設定
- [ ] リポジトリを作成済み
- [ ] Settings > Actions > General で適切な権限を設定済み
  - [ ] "Allow all actions and reusable workflows"
  - [ ] "Read and write permissions"  
  - [ ] "Allow GitHub Actions to create and approve pull requests"

## 🔧 動作確認項目

### 🏗️ ビルド確認
- [ ] `npm run build` が正常に完了する
- [ ] `dist/` フォルダに以下のファイルが生成される:
  - [ ] `installRenode.js`
  - [ ] `installEmbeddedTools.js`

### 🎯 GitHub Actions確認
- [ ] Actions タブで以下のワークフローが表示される:
  - [ ] Check Upstream Releases
  - [ ] Build Renode Runtime  
  - [ ] Check All Upstream
  - [ ] Build Embedded Tools
- [ ] 手動でビルドワークフローを実行して成功する
- [ ] Releases タブに成果物が配布される

### 📦 インストール確認
- [ ] `npm run test` でRenode自動インストールが成功する
- [ ] `npm run test-embedded` でARM開発ツール自動インストールが成功する
- [ ] `~/.emby/renode/` と `~/.emby/embedded-tools/` に正しくファイルが展開される

## 🌐 配布準備

### 🔐 リポジトリ公開設定
- [ ] リポジトリをPublicに設定（他のユーザーがアクセス可能にする）
- [ ] READMEに適切な使用方法を記載済み
- [ ] Releasesタブで成果物が公開配布される

### 📚 ドキュメント整備
- [ ] `README.md`: 利用者向けの明確な使用方法を記載
- [ ] `DEPLOYMENT.md`: 配布者向けのセットアップ手順を記載
- [ ] `LICENSE`: 適切なライセンス表記と第三者ソフトウェアライセンス情報

### 🔄 継続運用設定
- [ ] 上流監視が毎日自動実行される（JST 18:00）
- [ ] 新しいリリースが検出された時に自動ビルドが実行される
- [ ] 成果物が自動でGitHub Releasesに配布される

## 🎉 配布完了

すべての項目をチェックできたら、プロジェクトの配布準備が完了です！

利用者は以下の方法でツールを利用できます：

```bash
# NPMパッケージとしてインストール
npm install YOUR_USERNAME/YOUR_REPO_NAME

# 直接実行
npx YOUR_USERNAME/YOUR_REPO_NAME install
npx YOUR_USERNAME/YOUR_REPO_NAME install-embedded
```

## 📞 トラブルシューティング

問題が発生した場合は：

1. **GitHub Actions ログ**: Actions タブでエラー詳細を確認
2. **Issues**: リポジトリのissuesで問題を報告・質問
3. **再実行**: 失敗したワークフローは「Re-run failed jobs」で再実行可能

---

**配布開始後は、定期的にActions タブとReleases タブで自動更新が正常に動作していることを確認してください！**
