# 宿舍人物志 · 云上展厅

一个 3D 虚拟展厅网站：访客以第一人称漫游展厅，19 间宿舍的青春故事以画框形式挂在墙上，点击画框即可查看文章详情。基于 Vite + TypeScript + Three.js，纯静态部署，无需后端。

> 展厅主题：宿舍 PK 赛系列文章 · 青春驻留地

## 功能特性

- **3D 漫游展厅**：第一人称视角，键盘 / 触屏控制行走与转向
- **画框展陈**：19 幅画框沿展厅两侧自动排布，点击查看宿舍故事
- **访客计数器**：实时显示累计访客数（基于 Abacus 免费 API）
- **移动端适配**：虚拟摇杆 + 滑动转视角，横屏引导，光源降级优化
- **合规机制**：版权声明、隐私政策弹窗、撤下机制
- **容错处理**：封面图加载失败自动生成占位图，加载超时自动跳入展厅

## 技术栈

- **Vite 6** — 构建工具，`base: './'` 相对路径，适配任意子路径部署
- **TypeScript 5** — 类型安全
- **Three.js 0.170** — 3D 渲染引擎

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开终端中提示的地址（默认 http://localhost:5173）。

手机测试：加 `--host` 参数，手机与电脑同一 WiFi 下访问局域网地址。

```bash
npm run dev -- --host
```

## 构建与预览

```bash
npm run build     # 产物输出到 dist/
npm run preview   # 本地预览构建产物
```

## 部署

### Vercel（推荐）

1. 在 [Vercel](https://vercel.com) 导入 GitHub 仓库 `daka-agent/CloudExhibition`
2. Framework Preset 选 **Vite**，Build Command 填 `npm run build`，Output Directory 填 `dist`（通常会自动识别）
3. 点击 Deploy，之后每次 push 会自动重新部署

### GitHub Pages

1. 本地执行 `npm run build`
2. 用 gh-pages 分支发布：
   ```bash
   npm install -D gh-pages
   npx gh-pages -d dist
   ```
3. 项目已设置 `base: './'`（相对路径），仓库名子路径可直接访问

## 操作方式

### 电脑

- 点击画面锁定鼠标，移动鼠标转动视角
- `W A S D` 或方向键移动
- `Esc` 释放鼠标
- 准星对准画框点击查看详情

### 手机

- 左下角虚拟摇杆控制移动
- 右侧滑动控制视角
- 对准画框轻触查看详情
- 建议横屏浏览以获得最佳体验

## 新增 / 修改展品

1. 编辑 `public/content/exhibits.json`，按格式添加一条记录：
   ```json
   {
     "id": "020",
     "title": "作品标题",
     "author": "宿舍号",
     "cover": "content/images/020.jpg",
     "summary": "作品简介（200字以内）",
     "link": "公众号原文链接"
   }
   ```
2. 把封面图片放进 `public/content/images/`（建议横版 jpg，约 640×420）
3. 封面加载失败时会自动生成带标题的占位图
4. 重新 `npm run build` 并部署。画框沿展厅两侧墙面自动均匀排布，增删展品无需改代码

## 目录结构

```
index.html                  # 入口页（canvas + UI 覆盖层 DOM）
public/
  content/
    exhibits.json           # 展品数据（标题、作者、摘要、封面、原文链接）
    images/                 # 展品封面图（001.jpg ~ 019.jpg）
src/
  main.ts                   # 入口：初始化场景、渲染循环、UI 绑定、访客计数
  config.ts                 # exhibits.json 的类型定义与加载
  visitor-counter.ts        # 访客计数器模块（Abacus API）
  style.css                 # 全局样式
  museum/
    scene.ts                # 场景、灯光、雾效、渲染器（含移动端光源降级）
    hall.ts                 # 展厅建筑：地板、墙、天花板、画框、展签
    controls.ts             # 第一人称漫游（PC 指针锁定 + 手机摇杆）
  ui/
    overlay.ts              # 作品详情弹窗
    hud.ts                  # 欢迎页、操作提示、加载进度、法律弹窗
```

## 许可

展品内容（文章及封面图）版权归原作者所有，本展厅仅作展示用途。如需撤下任何内容，请联系仓库维护者。
