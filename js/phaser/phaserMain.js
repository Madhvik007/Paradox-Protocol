/* Phaser 3 bootstrap for Paradox Protocol */

(function() {
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  const config = {
    type: Phaser.AUTO,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    parent: 'phaserContainer',
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 1400 },
        debug: false
      }
    },
    scene: [GameScene]
  };

  // Expose config so it can be tuned quickly if needed
  window.PHASEX_CONFIG = config;

  // Boot game
  window.addEventListener('load', () => {
    // eslint-disable-next-line no-new
    const game = new Phaser.Game(config);
    window.phaserGame = game;
  });
})();


