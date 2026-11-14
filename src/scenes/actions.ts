import type Phaser from 'phaser';
import { INPUT_BINDINGS } from '../config.ts';
import { actionForCode } from '../systems/input.ts';

export type Action = keyof typeof INPUT_BINDINGS;

/** Calls `handler` with the mapped action for each key press. Scenes never read raw keys. */
export function onAction(scene: Phaser.Scene, handler: (action: Action) => void): void {
  scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
    const action = actionForCode(event.code, INPUT_BINDINGS);
    if (action !== undefined) handler(action);
  });
}
