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

interface ToolConfig {
  name: string;
  repoOwner: string;
  repoName: string;
  assetPattern: string;
  installSubdir: string;
}

class EmbeddedToolsInstaller {
  private readonly installDir: string;
  private readonly tools: ToolConfig[];
  
  constructor() {
    this.installDir = join(homedir(), '.emby', 'embedded-tools');
    
    // 組み込み開発に必要なツール設定
    this.tools = [
      {
        name: 'Renode',
        repoOwner: 'renode',
        repoName: 'renode',
        assetPattern: 'linux-portable.tar.gz',
        installSubdir: 'renode'
      },
      // ARM Toolchain は直接ダウンロード URL を使用
      // OpenOCD は別途対応
    ];
  }

  /**
   * 現在のプラットフォームに対応するアセット名を取得
   */
  private getPlatformAssetPattern(basePattern: string): string {
    const os = platform();
    
    switch (os) {
      case 'linux':
        return basePattern.replace('platform', 'linux');
      case 'darwin':
        return basePattern.replace('platform', 'linux'); // macOS fallback
      case 'win32':
        return basePattern.replace('platform', 'windows').replace('.tar.gz', '.zip');
      default:
        throw new Error(`Unsupported platform: ${os}`);
    }
  }

  /**
   * ARM GNU Toolchain を直接ダウンロード
   */
  private async installArmToolchain(): Promise<void> {
    console.log('📦 Installing ARM GNU Toolchain...');
    
    const os = platform();
    const osArch = process.arch; // x64, arm64
    const version = '14.2.1-1.1'; // 最新版
    let downloadUrl: string;
    let fileName: string;
    
    // xpack ARM GCC の GitHub リリースを使用
    const baseUrl = 'https://github.com/xpack-dev-tools/arm-none-eabi-gcc-xpack/releases/download';
    
    switch (os) {
      case 'linux':
        downloadUrl = `${baseUrl}/v${version}/xpack-arm-none-eabi-gcc-${version}-linux-x64.tar.gz`;
        fileName = 'arm-toolchain-linux.tar.gz';
        break;
      case 'darwin':
        // M1 Macかx64かによって分岐
        const arch = osArch === 'arm64' ? 'arm64' : 'x64';
        downloadUrl = `${baseUrl}/v${version}/xpack-arm-none-eabi-gcc-${version}-darwin-${arch}.tar.gz`;
        fileName = 'arm-toolchain-macos.tar.gz';
        break;
      case 'win32':
        downloadUrl = `${baseUrl}/v${version}/xpack-arm-none-eabi-gcc-${version}-win32-x64.zip`;
        fileName = 'arm-toolchain-windows.zip';
        break;
      default:
        throw new Error(`Unsupported platform for ARM Toolchain: ${os}`);
    }
    
    const installPath = join(this.installDir, 'arm-toolchain');
    const downloadPath = join(this.installDir, fileName);
    
    try {
      console.log(`Downloading from: ${downloadUrl}`);
      await this.downloadFile(downloadUrl, downloadPath);
      
      await fs.mkdir(installPath, { recursive: true });
      await this.extractArchive(downloadPath, installPath);
      await fs.unlink(downloadPath);
      
      // 実行権限を設定
      if (os !== 'win32') {
        const binDir = join(installPath, 'bin');
        try {
          const files = await fs.readdir(binDir);
          for (const file of files) {
            await fs.chmod(join(binDir, file), 0o755);
          }
        } catch (error) {
          console.warn('Failed to set executable permissions for ARM toolchain:', error);
        }
      }
      
      console.log('✅ ARM GNU Toolchain installed');
      
    } catch (error) {
      console.error('❌ ARM GNU Toolchain installation failed:', error);
      throw error;
    }
  }

  /**
   * tar.xz ファイルの展開 (macOS/Linux)
   */
  private async extractTarXz(archivePath: string, extractPath: string): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync(`tar -xJf "${archivePath}" -C "${extractPath}" --strip-components=1`);
    } catch (error) {
      throw new Error(`Failed to extract tar.xz file: ${error}`);
    }
  }

  /**
   * GitHub Releases から最新リリース情報を取得
   */
  private async getLatestRelease(repoOwner: string, repoName: string): Promise<GitHubRelease> {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'embedded-tools-installer/1.0.0',
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
   * 環境設定スクリプトを作成
   */
  private async createEnvironmentScript(): Promise<void> {
    const os = platform();
    let scriptContent: string;
    let scriptName: string;
    
    if (os === 'win32') {
      scriptName = 'setup-env.bat';
      scriptContent = `@echo off
set TOOLS_DIR=%~dp0
set PATH=%TOOLS_DIR%arm-toolchain\\bin;%TOOLS_DIR%openocd\\bin;%TOOLS_DIR%renode;%PATH%
echo Embedded development environment configured!
echo Available tools:
where arm-none-eabi-gcc >nul 2>&1 && echo   - arm-none-eabi-gcc: Available || echo   - arm-none-eabi-gcc: Not found
where openocd >nul 2>&1 && echo   - openocd: Available || echo   - openocd: Not found
echo   - renode: Available in %TOOLS_DIR%renode
`;
    } else {
      scriptName = 'setup-env.sh';
      scriptContent = `#!/bin/bash
TOOLS_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
export PATH="\$TOOLS_DIR/arm-toolchain/bin:\$TOOLS_DIR/openocd/bin:\$TOOLS_DIR/renode:\$PATH"
export LD_LIBRARY_PATH="\$TOOLS_DIR/renode/mono/lib:\$LD_LIBRARY_PATH"
echo "Embedded development environment configured!"
echo "Available tools:"
echo "  - arm-none-eabi-gcc: \$(arm-none-eabi-gcc --version 2>/dev/null | head -1 || echo 'Not found')"
echo "  - openocd: \$(openocd --version 2>&1 | head -1 || echo 'Not found')"
echo "  - renode: Available in \$TOOLS_DIR/renode"
`;
    }
    
    const scriptPath = join(this.installDir, scriptName);
    await fs.writeFile(scriptPath, scriptContent, { mode: 0o755 });
    console.log(`✅ Environment script created: ${scriptPath}`);
  }

  /**
   * 組み込み開発ツールをインストール
   */
  async install(force: boolean = false): Promise<void> {
    console.log('🔧 Embedded Development Tools Installer');
    console.log(`📁 Install directory: ${this.installDir}`);
    
    try {
      // インストールディレクトリを作成
      await fs.mkdir(this.installDir, { recursive: true });
      
      // ARM GNU Toolchain をインストール
      await this.installArmToolchain();
      
      // Renode をインストール (既存の機能を使用)
      console.log('📦 Installing Renode...');
      const renode = this.tools.find(t => t.name === 'Renode');
      if (renode) {
        const release = await this.getLatestRelease(renode.repoOwner, renode.repoName);
        const assetPattern = this.getPlatformAssetPattern(renode.assetPattern);
        const asset = release.assets.find(a => a.name.includes(assetPattern));
        
        if (asset) {
          const installPath = join(this.installDir, renode.installSubdir);
          const downloadPath = join(this.installDir, asset.name);
          
          await this.downloadFile(asset.browser_download_url, downloadPath);
          await this.extractArchive(downloadPath, installPath);
          await fs.unlink(downloadPath);
          
          console.log('✅ Renode installed');
        } else {
          console.warn('⚠️ Renode asset not found, skipping...');
        }
      }
      
      // 環境設定スクリプトを作成
      await this.createEnvironmentScript();
      
      console.log('✅ Installation completed successfully!');
      console.log('🚀 Run the following to configure your environment:');
      
      if (platform() === 'win32') {
        console.log(`   ${join(this.installDir, 'setup-env.bat')}`);
      } else {
        console.log(`   source ${join(this.installDir, 'setup-env.sh')}`);
      }
      
    } catch (error) {
      console.error('❌ Installation failed:', error);
      throw error;
    }
  }

  /**
   * インストール状況を確認
   */
  async status(): Promise<void> {
    console.log('📊 Embedded Development Tools Status');
    console.log(`📁 Install directory: ${this.installDir}`);
    
    // 各ツールの状況を確認
    const tools = ['arm-toolchain', 'renode', 'openocd'];
    
    for (const tool of tools) {
      const toolPath = join(this.installDir, tool);
      try {
        await fs.access(toolPath);
        console.log(`✅ ${tool}: Installed`);
      } catch {
        console.log(`❌ ${tool}: Not installed`);
      }
    }
  }

  /**
   * ツールをアンインストール
   */
  async uninstall(): Promise<void> {
    console.log('🗑️  Uninstalling Embedded Development Tools...');
    
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
  
  const installer = new EmbeddedToolsInstaller();
  
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
🔧 Embedded Development Tools Installer

Usage:
  node installEmbeddedTools.js [command] [options]

Commands:
  install     Install all embedded development tools (default)
  status      Show installation status
  uninstall   Remove all tools
  help        Show this help

Options:
  --force     Force reinstall even if already installed

Tools included:
  - ARM GNU Toolchain (arm-none-eabi-gcc)
  - Renode (embedded systems simulator)
  - OpenOCD (on-chip debugger) [planned]

Examples:
  node installEmbeddedTools.js install
  node installEmbeddedTools.js status
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

export { EmbeddedToolsInstaller };
