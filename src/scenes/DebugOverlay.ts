import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.ts';
import { formatDebugLines, publishDebugInfo, type DebugInfo } from '../systems/debug.ts';

/** Debug panel in the top-left corner. Hidden until toggled with the toggle_debug action. */
export class DebugOverlay {
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(8, 8, '', { fontFamily: FONTS.mono, fontSize: '12px', color: '#7CFC9A', padding: { x: 6, y: 4 } })
      .setBackgroundColor(`#${COLORS.debugBackground.toString(16).padStart(6, '0')}cc`)
      .setDepth(1000)
      .setVisible(false);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.text.setVisible(this.visible);
  }

  update(info: DebugInfo): void {
    publishDebugInfo(globalThis, info);
    if (this.visible) this.text.setText(formatDebugLines(info));
  }
}
