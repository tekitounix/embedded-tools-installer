#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform, arch } from 'os';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { extract } from 'tar';
import { Extract } from 'unzipper';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: ReleaseAsset[];
}

class RenodeInstaller {
  private readonly installDir: string;
  private readonly repoOwner: string;
  private readonly repoName: string;
  
  constructor(repoOwner: string = 'renode', repoName: string = 'renode') {
    this.installDir = join(homedir(), '.emby', 'renode');
    this.repoOwner = repoOwner;
    this.repoName = repoName;
  }

  /**
   * 現在のプラットフォームに対応するアセット名を取得
   */
  private getPlatformAssetName(): string {
    const os = platform();
    
    switch (os) {
      case 'linux':
        return 'linux-portable.tar.gz';
      case 'darwin':
        // macOS用のビルドが無い場合はLinux版を使用（MonoがあればOK）
        return 'linux-portable.tar.gz';
      case 'win32':
        return 'windows-portable.zip';
      default:
        throw new Error(`Unsupported platform: ${os}`);
    }
  }

  /**
   * GitHub Releases から最新リリース情報を取得
   */
  private async getLatestRelease(): Promise<GitHubRelease> {
    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`;
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'renode-runtime-installer/1.0.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Response status: ${response.status}`);
      console.error(`Response body: ${errorText}`);
      throw new Error(`Failed to fetch release info: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<GitHubRelease>;
  }

  /**
   * ファイルをダウンロード
   */
  private async downloadFile(url: string, filePath: string): Promise<void> {
    console.log(`Downloading from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
    
    const totalSize = parseInt(response.headers.get('content-length') || '0');
    let downloadedSize = 0;
    
    const fileStream = createWriteStream(filePath);
    
    if (response.body) {
      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          fileStream.write(Buffer.from(value));
          downloadedSize += value.length;
          
          if (totalSize > 0) {
            const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
            process.stdout.write(`\rProgress: ${progress}%`);
          }
        }
        console.log(); // 改行
      } finally {
        fileStream.end();
      }
    }
  }

  /**
   * アーカイブファイルを展開
   */
  private async extractArchive(archivePath: string, extractPath: string): Promise<void> {
    const fileExtension = archivePath.split('.').pop();
    
    await fs.mkdir(extractPath, { recursive: true });
    
    if (fileExtension === 'gz') {
      // tar.gz ファイルの展開
      await pipeline(
        createReadStream(archivePath),
        extract({ cwd: extractPath, strip: 1 })
      );
    } else if (fileExtension === 'zip') {
      // zip ファイルの展開
      await pipeline(
        createReadStream(archivePath),
        Extract({ path: extractPath })
      );
    } else {
      throw new Error(`Unsupported archive format: ${fileExtension}`);
    }
  }

  /**
   * インストール済みかチェック
   */
  private async isInstalled(): Promise<boolean> {
    try {
      const executablePath = join(this.installDir, platform() === 'win32' ? 'renode.bat' : 'renode');
      await fs.access(executablePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 実行権限を設定（Unix系のみ）
   */
  private async setExecutablePermissions(): Promise<void> {
    if (platform() === 'win32') return;
    
    const executablePath = join(this.installDir, 'renode');
    const monoPath = join(this.installDir, 'mono', 'bin', 'mono');
    
    try {
      await fs.chmod(executablePath, 0o755);
      await fs.chmod(monoPath, 0o755);
      console.log('Set executable permissions');
    } catch (error) {
      console.warn('Failed to set executable permissions:', error);
    }
  }

  /**
   * Renode Runtime をインストール
   */
  async install(force: boolean = false): Promise<void> {
    console.log('🔧 Renode Runtime Installer');
    console.log(`📁 Install directory: ${this.installDir}`);
    
    // 既にインストール済みかチェック
    if (!force && await this.isInstalled()) {
      console.log('✅ Renode is already installed. Use --force to reinstall.');
      return;
    }
    
    try {
      // 最新リリース情報を取得
      console.log('🔍 Checking for latest release...');
      const release = await this.getLatestRelease();
      console.log(`📦 Latest version: ${release.tag_name}`);
      
      // プラットフォーム対応アセットを検索
      const assetPattern = this.getPlatformAssetName();
      const asset = release.assets.find(a => a.name.includes(assetPattern));
      
      if (!asset) {
        console.log('Available assets:');
        release.assets.forEach(a => console.log(`  - ${a.name}`));
        throw new Error(`Asset not found for platform: ${assetPattern}`);
      }
      
      console.log(`📥 Downloading ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)} MB)`);
      
      // インストールディレクトリを作成
      await fs.mkdir(this.installDir, { recursive: true });
      
      // ダウンロード
      const downloadPath = join(this.installDir, asset.name);
      await this.downloadFile(asset.browser_download_url, downloadPath);
      
      // 展開
      console.log('📦 Extracting archive...');
      await this.extractArchive(downloadPath, this.installDir);
      
      // 実行権限を設定
      await this.setExecutablePermissions();
      
      // ダウンロードファイルを削除
      await fs.unlink(downloadPath);
      
      console.log('✅ Installation completed successfully!');
      console.log(`🚀 You can now run: ${join(this.installDir, platform() === 'win32' ? 'renode.bat' : 'renode')}`);
      
    } catch (error) {
      console.error('❌ Installation failed:', error);
      throw error;
    }
  }

  /**
   * インストール状況を確認
   */
  async status(): Promise<void> {
    console.log('📊 Renode Runtime Status');
    console.log(`📁 Install directory: ${this.installDir}`);
    
    if (await this.isInstalled()) {
      console.log('✅ Status: Installed');
      
      // バージョン情報を取得試行
      try {
        const versionPath = join(this.installDir, 'VERSION');
        const version = await fs.readFile(versionPath, 'utf-8');
        console.log(`📋 Version: ${version.trim()}`);
      } catch {
        console.log('📋 Version: Unknown');
      }
    } else {
      console.log('❌ Status: Not installed');
    }
  }

  /**
   * Renode Runtime をアンインストール
   */
  async uninstall(): Promise<void> {
    console.log('🗑️  Uninstalling Renode Runtime...');
    
    try {
      await fs.rm(this.installDir, { recursive: true, force: true });
      console.log('✅ Uninstalled successfully');
    } catch (error) {
      console.error('❌ Uninstall failed:', error);
      throw error;
    }
  }
}

// CLI インターフェース
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'install';
  const force = args.includes('--force');
  
  // リポジトリ設定（環境変数またはコマンドライン引数から）
  const repoOwner = process.env.RENODE_REPO_OWNER || 'renode';
  const repoName = process.env.RENODE_REPO_NAME || 'renode';
  
  const installer = new RenodeInstaller(repoOwner, repoName);
  
  try {
    switch (command) {
      case 'install':
        await installer.install(force);
        break;
      case 'status':
        await installer.status();
        break;
      case 'uninstall':
        await installer.uninstall();
        break;
      case 'help':
      case '--help':
      case '-h':
        console.log(`
🔧 Renode Runtime Installer

Usage:
  node installRenode.js [command] [options]

Commands:
  install     Install Renode Runtime (default)
  status      Show installation status
  uninstall   Remove Renode Runtime
  help        Show this help

Options:
  --force     Force reinstall even if already installed

Environment Variables:
  RENODE_REPO_OWNER    GitHub repository owner (default: your-username)
  RENODE_REPO_NAME     GitHub repository name (default: renode-runtime)

Examples:
  node installRenode.js install
  node installRenode.js install --force
  node installRenode.js status
  RENODE_REPO_OWNER=myorg node installRenode.js install
`);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// ESModuleとして実行された場合のみmainを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RenodeInstaller };
