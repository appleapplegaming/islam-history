import Phaser from 'phaser';
import { CHAPTER_MARKERS, COLORS, FONTS, GAME, MAP_REGIONS, type ChapterMarker } from '../config.ts';
import { onAction } from './actions.ts';
import { DebugOverlay } from './DebugOverlay.ts';

/** Map hub with placeholder shapes. Each chapter marker will open its chapter. */
export class MapScene extends Phaser.Scene {
  private debug!: DebugOverlay;
  private message!: Phaser.GameObjects.Text;
  private selected = 0;
  private markerRings: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('map');
  }

  create(): void {
    this.add
      .text(GAME.width / 2, 40, 'Stories of the Prophets', { fontFamily: FONTS.ui, fontSize: '30px', color: COLORS.text })
      .setOrigin(0.5);

    for (const region of MAP_REGIONS) {
      const rect = this.add
        .rectangle(region.x, region.y, region.width, region.height, COLORS.region)
        .setOrigin(0)
        .setStrokeStyle(2, COLORS.regionStroke)
        .setInteractive();
      rect.on('pointerover', () => rect.setFillStyle(COLORS.regionHover));
      rect.on('pointerout', () => rect.setFillStyle(COLORS.region));
      this.add.text(region.x + 10, region.y + 8, region.name, {
        fontFamily: FONTS.ui,
        fontSize: '16px',
        color: COLORS.textMuted,
      });
    }

    CHAPTER_MARKERS.forEach((marker, i) => this.addMarker(marker, i));

    this.message = this.add
      .text(GAME.width / 2, GAME.height - 36, 'Choose a chapter (Enter or click)', {
        fontFamily: FONTS.ui,
        fontSize: '16px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.debug = new DebugOverlay(this);
    onAction(this, (action) => {
      if (action === 'toggle_debug') this.debug.toggle();
      if (action === 'interact') this.openChapter(this.selected);
      if (action === 'move_left' || action === 'move_up') this.select(this.selected - 1);
      if (action === 'move_right' || action === 'move_down') this.select(this.selected + 1);
    });
    this.select(0);
  }

  update(): void {
    const marker = CHAPTER_MARKERS[this.selected];
    this.debug.update({
      sceneId: this.scene.key,
      state: { selected: marker?.chapterId ?? 'none', playable: marker?.playable ?? false },
    });
  }

  private addMarker(marker: ChapterMarker, i: number): void {
    const region = MAP_REGIONS.find((r) => r.id === marker.regionId);
    if (!region) throw new Error(`Chapter marker "${marker.chapterId}" points to unknown region "${marker.regionId}"`);
    const x = region.x + region.width / 2;
    const y = region.y + region.height / 2 + 10;
    const ring = this.add.circle(x, y, 18).setStrokeStyle(2, COLORS.marker).setVisible(false);
    this.add.circle(x, y, 10, COLORS.marker).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.select(i);
      this.openChapter(i);
    });
    this.add
      .text(x, y + 26, marker.label, { fontFamily: FONTS.ui, fontSize: '15px', color: COLORS.text })
      .setOrigin(0.5, 0);
    this.markerRings.push(ring);
  }

  private select(index: number): void {
    const count = CHAPTER_MARKERS.length;
    this.selected = ((index % count) + count) % count;
    this.markerRings.forEach((ring, i) => ring.setVisible(i === this.selected));
  }

  private openChapter(index: number): void {
    const marker = CHAPTER_MARKERS[index];
    if (!marker) return;
    // Chapter scenes come in a later step; until then a marker only reports that it isn't built.
    this.message.setText(marker.playable ? `Opening ${marker.label}...` : `${marker.label}: this chapter is not built yet.`);
  }
}
