# 川北医学院 · 临江校区像素校园

一个基于 **Phaser 3 + TypeScript + Vite** 的 2D 像素校园交互作品。玩家在川北医学院临江校区（示意性复现）中行走，与 10 位 NPC 自由对话，进入若干建筑，体验昼夜变化。

## 功能

- 俯视角像素地图：中轴石桥、图情信息中心、四大书院、四大生活园、运动场等。
- 键盘（WASD / 方向键）与手机虚拟摇杆移动，E 键 / 触屏按钮交谈。
- 10 位有各自人设、日程、活动区域的 NPC；时间驱动的活动与位置变化。
- LLM 自由对话：在「设置」中填写 OpenAI 兼容接口的 Base URL / 模型 / API Key（前端直连，Key 存在本地 localStorage）；不填则使用预设台词。
- 图情信息中心、弘医楼、临江书院、大学科技园、雅园食堂可进入；昼夜光照与路灯效果。
- 虚拟时钟（现实 1 秒 = 游戏 1 分钟，可在设置里调 0.5×/1×/2×）；对话记忆持久化到 localStorage，刷新不丢失。
- 自动存档（每 30 秒）与手动存档。
- **实景照片立面 + 伪 3D 楼体**：从学校官网新闻图裁出真实建筑正面，像素化到 DB32 调色板后贴到建筑上，并叠屋顶明暗、檐口落影、侧面暗带与接地阴影，让楼在俯视视角下有厚度。

## 运行

```bash
npm install
npm run dev       # 开发
npm run build     # tsc --noEmit && vite build
npm run preview   # 预览构建产物
npm run check     # tsc --noEmit && eslint . && vitest run
npm test          # Vitest
```

美术分两层：程序化底图（`src/art/textures.ts`，无外部依赖开箱即跑）与实景照片立面（`public/pix/`，已生成好随仓库提供）。修改建筑立面照片后跑 `node scripts/pixelize.cjs` 重新生成，配置约定见 `scripts/facades/README.md`。

验收与素材说明见 `docs/checklist.md`（手动验收清单）与 `docs/assets.md`（素材来源与许可）。

## 资料来源

校园背景事实整理自以下公开页面（作为 NPC 对话知识库 `src/data/campusFacts.ts` 与场景细节的依据）：

- 学校简介：https://www.nsmc.edu.cn/xxgk/xxjj.htm
- 历史沿革：https://www.nsmc.edu.cn/xxgk/lsyg.htm
- 教学院系：https://www.nsmc.edu.cn/jgsz/jxyx.htm
- 2025 级新生入驻临江校区：https://www.nsmc.edu.cn/news/info/1601/164541.htm
- 新校区建设报道（网易）：https://www.163.com/dy/article/H6VDT9QG0525P02M.html

本作为学习作品，地图为示意性复现，非真实比例。详细设计决策见 `像素校园交互地图计划_2026-11-20_13-15.md`。
