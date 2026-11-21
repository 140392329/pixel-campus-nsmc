# 实景照片 → 像素立面：配置约定

`scripts/pixelize.cjs` 从本目录逐文件读取配置，**一栋建筑一个 JSON**，
这样多人（或多个子智能体）并行处理不同建筑时不会互相改同一个文件。

## 文件命名

`<building-id>.json`，`id` 必须等于 `src/data/campus.ts` 里的 building id。

## 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 建筑 id，必须与 `campus.ts` 一致 |
| `file` | 是 | 照片路径，相对项目根目录 |
| `crop` | 是 | `{left, top, right, bottom}`，**0~1 相对比例** |
| `targetW` | 否 | 输出宽度，默认 240。楼越大可以给 320 |
| `mode` | 否 | `full`=照片含完整立面（连屋顶）；`wall`=只有墙身，默认 `wall` |
| `wallTop` | 否 | 仅 `wall` 模式：墙身顶端相对高度，默认 0.3 |
| `sourceUrl` | 是 | 照片来源页 URL，会写进 `docs/assets.md` |
| `note` | 否 | 一句话说明拍的是什么 |

## 硬性规则

1. **crop 只能留建筑本体**：天空、地面、人群、车辆必须裁掉。留一条天空，拼进地图就会变成"悬浮的天空"。
2. **不要裁到只剩一小块**：尽量保留整栋楼的左右边界和大台阶/门厅，缩到 240px 后细节就没了。
3. `mode: full` 只在照片**本身就是一张完整正立面**时用（如南门）；日常街拍一般是 `wall`，
   屋顶交给程序化贴图兜住。
4. 改完跑一次自检：

   ```
   node scripts/pixelize.cjs --only <id>
   ```

   `--only` 只生成这一张、**不动共用的 manifest**，可以安全并行。
   PNG 写到 `public/pix/<id>.png`，用 read_image 看一眼：有没有残留天空/人群、建筑是否居中。

## 收尾

所有人做完后，由一个人跑一次不带参数的 `node scripts/pixelize.cjs`，
它会全量生成并重写 `src/art/photoManifest.ts`。
