# 暑假电子产品时间管控

这是一个 React + TypeScript + Vite 单页应用，用于管理徐诗涵和徐沐秋两位孩子的暑假电子产品使用时间。默认每人每周 90 分钟，包含电视、手机、平板、电脑、游戏机和其他设备。

两位孩子都可以通过学习任务获得额外额度：每天每项任务可打卡 1 次，每完成 1 项任务，本周电子产品时长增加 10 分钟。任务包括语文阅读理解、生字词、语文阅读、英语单词、英语阅读理解、数学计算和奥数。

## 运行方式

```bash
npm install
npm run dev
```

本机打开终端显示的 Vite 地址即可。局域网其他设备可访问 `http://本机IP:5173`。

## 构建

```bash
npm run build
npm run preview
```

## 公网部署与实时同步

静态部署可以使用 Vercel、Netlify、Cloudflare Pages 等平台。只部署静态文件时，应用会使用当前设备浏览器的 `localStorage`，不同设备之间不会共享数据。

如需不同网络、不同设备打开同一个网页并实时保存更新，请配置 Firebase Firestore。项目使用 Firestore REST 轻量同步，大约每 2 秒拉取一次云端变化：

1. 创建 Firebase 项目。
2. 创建 Web App，复制 Firebase 配置里的 `apiKey` 和 `projectId`。
3. 启用 Firestore Database。
4. 在部署平台配置 `.env.example` 中的 `VITE_FIREBASE_API_KEY` 和 `VITE_FIREBASE_PROJECT_ID`。
5. 给同一个家庭配置相同的 `VITE_HOUSEHOLD_ID`。

部署命令示例：

```bash
npm run deploy:vercel
```

或：

```bash
npm run deploy:netlify
```

## 文件结构

```text
src/
  components/       页面组件
  hooks/            计时、记录和同步状态逻辑
  services/         Firebase Firestore 可选同步层
  utils/            时间、存储、数据解析和额度工具
  App.tsx           单页应用编排
  main.tsx          React 入口
  styles.css        响应式视觉样式
```

## 关键逻辑

- 每周按 ISO 周键保存，格式如 `2026-W27`。
- 每个孩子独立统计本周记录。
- 两位孩子完成学习任务后，本周额度会按本周打卡次数动态增加，今天打卡后明天可以继续打卡。
- 正在计时的数据会保存，刷新页面后自动恢复。
- 达到 90 分钟会自动停止计时并提示休息。
- 补录超过剩余额度时只记录到 90 分钟上限。
- 修正减少会留下负向手动记录，便于追踪修改来源。
- 删除单条记录和重置本周都会二次确认。
