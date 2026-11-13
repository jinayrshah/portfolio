/**
 * Where the tree is drawn this frame, written by the Creation scene and read
 * by the Work chapter so the light trail sits exactly on the branches.
 * Positions are in frame units: the screen is 2 high, x runs with the aspect.
 */
export const treeNow = {
  ready: false,
  /** The foot of the tree on the screen. */
  x: 0,
  y: 0,
  /** Height of the tree picture. */
  scale: 2,
  /** 0 when the tree stands alone, 1 while it holds the projects. */
  focus: 0,
};
