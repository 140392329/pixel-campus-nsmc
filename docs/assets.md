# 素材来源与许可

## 当前美术实现

美术分两层：

1. **程序化底图**（`src/art/textures.ts`）：地面瓦片、水面、树木道具、玩家与 NPC 角色、以及没有配照片的建筑立面，都由代码在 `BootScene` 阶段用 Phaser Graphics 画到 canvas 纹理，按 32px 网格与统一调色板生成。
2. **实景照片像素化立面**（`scripts/pixelize.cjs` → `public/pix/` → `src/art/pseudo3d.ts`）：从学校官网公开新闻图里裁出建筑正面，面积平均缩放后逐像素吸附到 DB32 调色板，再由 `ensureBuildingBox()` 合成到建筑贴图上，叠屋顶明暗、檐口落影、左右侧面暗带与接地阴影，形成伪 3D 体块。

角色为 4 方向行走动画（程序化逐帧），与计划中"32×48 主角图集"的规格对齐。

### 已接入实景立面的建筑

配置在 `scripts/facades/<building-id>.json`，改完跑 `node scripts/pixelize.cjs` 重新生成：

| 建筑 | 照片内容 | 贴法 |
| --- | --- | --- |
| `gate_south` 南门 | 红砂岩门楼、四开间门洞、斗拱挑檐、居中匾额 | `full` + `keyOut`（门洞镂空） |
| `center_info` 图情信息中心 | 浅灰石材柱 + 深蓝绿玻璃幕墙门厅 | `wall` + `anchor: bottom`（贴楼底，上层程序化续） |
| `hall_hongyi` 弘医楼 | 红色穿孔板挑檐 + 白色竖柱廊 + 大玻璃带 | `wall` |
| `academy_songlin` 松林书院 | 红通柱 + 深色大玻璃带 + 灰坡屋顶 | `wall` |
| `academic_center` 学术交流中心 | 曲面玻璃塔楼 | `wall` |
| `bld_sun` 太阳城 | 白色大挑檐 + 中间架空门架 + 红墙两翼 | `wall`，wallTop 0.18 |
| `yuan_ke` 可园 | 白色墙面 + 通长浅蓝玻璃窗带 + 白色线脚 | `wall` |
| `yuan_rui` 瑞园（研究生公寓） | 弧形转角、深灰蓝窗带 + 白色出挑线脚（楼顶立牌可读「研究生公寓」） | `wall` |

其余 10 栋仍用程序化立面，也已叠加同样的体积感处理。**未找到可用照片的建筑**：`bld_boji` 博济楼、`tech_park` 大学科技园 —— 官网新闻图里没有能确认是它们、且立面不被遮挡的照片，按"不硬凑"原则留空，用程序化立面。

### 调色说明

DB32 是为奇幻题材调的色板，几乎没有砖红、朱砂、米白这些中国高校建筑最常见的颜色。硬吸附会把红色栏板变成洋红 `d77bba`、把米白墙变成冷灰。所以 `pixelize.cjs` 对**饱和暖色**与**近中性色**直接保留原 RGB（量化到 8 级台阶），只对其它颜色吸附到 DB32，既保住真实配色又保留像素画的块面感。

## 计划中的开源底料（若后续替换正式美术）

以下为实施计划推荐的免费/CC0 素材方向，收录于此备查；当前版本尚未引入，使用前须再次核对许可：

| 资产 | 用途 | 许可（需使用前复核） |
|---|---|---|
| Kenney RPG Urban Pack / UI Pack | 现代道具、UI 图标 | CC0 |
| Ninja Adventure (Pixel-Boy) | 坡屋顶/木构造型参考 | CC0 |
| LimeZu Modern Exteriors / Modern Interiors（免费版） | 地面、道路、室内家具 | 免费商用，禁止转售原始素材 |
| Fusion Pixel Font 12px（缝合像素字体） | 中文像素字体 | OFL-1.1，需在 about 页署名 |

统一规范：32×32 瓦片、DB32 调色板、最近邻缩放、固定左上光源。

## 实景照片来源

`refs/` 是开发期采集的原始照片，**不打包进构建产物、不对外分发**：

- `refs/raw2/`：从学校官网新闻页抓取的 45 张高清图（含运动会、迎新、参观等），是像素化立面的原始素材。仅 `refs/raw2/` 里少数几张真正拍到建筑正面的被采用，其余为人物/展板。
- `refs/raw/`：早期抓的 9 张（南门、东区宿舍、主干道等）。
- `refs/thumbs/`、`refs/raw2/thumbs/`：900px 缩略图，供挑选。
- `refs/contact-sheet.jpg`：45 张候选的带编号总览图。
- 来源：川北医学院官网新闻 https://www.nsmc.edu.cn/news/ （迎新、运动会等报道配图）。

照片是**真实校区的新闻摄影**，仅作学习作品的素材使用；本作与学校官方无关，地图为示意性复现，非真实比例。

## 校园事实资料来源

NPC 对话知识库 `src/data/campusFacts.ts` 与场景细节整理自以下公开页面（网页内容仅作事实素材）：

- 学校简介：https://www.nsmc.edu.cn/xxgk/xxjj.htm
- 历史沿革：https://www.nsmc.edu.cn/xxgk/lsyg.htm
- 教学院系：https://www.nsmc.edu.cn/jgsz/jxyx.htm
- 2025 级新生入驻临江校区：https://www.nsmc.edu.cn/news/info/1601/164541.htm
- 新校区建设报道（网易）：https://www.163.com/dy/article/H6VDT9QG0525P02M.html
- 高德地点页（地址/坐标）：https://map.gaode.com/place/B0K1TZTEQ0

