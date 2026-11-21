// 由 scripts/pixelize.cjs 自动生成，请勿手改。
// 每项对应 public/ 下一张已经像素化的实景照片立面。
export interface PhotoFacade {
  url: string;
  w: number;
  h: number;
  /** full：照片是完整立面；wall：只有墙身，需要程序化屋顶兜住。 */
  mode?: 'full' | 'wall';
  /** wall 模式下墙身顶端相对高度（0~1）。 */
  wallTop?: number;
  /** 照片贴墙身的位置：top=上缘（整面立面照）；bottom=楼底（入口/门厅照）。 */
  anchor?: 'top' | 'bottom';
}

export const PHOTO_FACADES: Record<string, PhotoFacade> = {
  'academic_center': { url: 'pix/academic_center.png', w: 240, h: 172, mode: 'wall', wallTop: 0.22 },
  'academy_songlin': { url: 'pix/academy_songlin.png', w: 320, h: 78, mode: 'wall', wallTop: 0.26 },
  'bld_sun': { url: 'pix/bld_sun.png', w: 240, h: 39, mode: 'wall', wallTop: 0.18 },
  'center_info': { url: 'pix/center_info.png', w: 480, h: 51, mode: 'wall', wallTop: 0.05, anchor: 'bottom' },
  'gate_south': { url: 'pix/gate_south.png', w: 320, h: 149, mode: 'full' },
  'hall_hongyi': { url: 'pix/hall_hongyi.png', w: 320, h: 64, mode: 'wall', wallTop: 0.22 },
  'yuan_ke': { url: 'pix/yuan_ke.png', w: 320, h: 139, mode: 'wall', wallTop: 0.3 },
  'yuan_rui': { url: 'pix/yuan_rui.png', w: 240, h: 126, mode: 'wall', wallTop: 0.3 },
};
