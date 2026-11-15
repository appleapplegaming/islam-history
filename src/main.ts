import Phaser from 'phaser';
import { GAME } from './config.ts';
import { MapScene } from './scenes/MapScene.ts';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME.width,
  height: GAME.height,
  backgroundColor: GAME.background,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MapScene],
});
