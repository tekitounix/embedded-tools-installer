必ず使える
  - Node.js (VSCode自体がElectron/Node.jsで動作)
  - npm (Node.js付属)
  - Git (VSCodeのGit統合機能で使用)
  - JavaScript/TypeScript実行環境

  VSCode API経由で使える
  - Terminal/Shell
  - Task実行環境
  - Problem Matcher ($gcc等)
  - WebView (HTML/CSS/JS)
  - File System API
  - Process実行 (child_process)

  つまり追加インストールが必要なのは

  必須
  - arm-none-eabi-gcc (または Podman/Docker)
  - Make
  - Python 3 (一部ツール用)

  オプション
  - logue-cli
  - XMake
  - clangd

  VSCodeユーザーならNode.js、npm、Git、Terminalは既に
  使える環境にあるため、実質的に必要なのはARMコンパイ
  ラ（またはコンテナ環境）とMakeだけです。

  他にも同様のことを行いたいものがいくつかあります。
https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads
これを使うのが良さそう
https://github.com/marketplace/actions/arm-none-eabi-gcc-gnu-arm-embedded-toolchain

https://github.com/STMicroelectronics/OpenOCD