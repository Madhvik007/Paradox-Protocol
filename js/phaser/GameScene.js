/* Main Phaser scene mapping existing mechanics */

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.loopDurationMs = 10000;
    this.currentLoop = 1;
    this.loopStartTs = 0;
    this.recorder = new PhaserActionRecorder();
    this.ghosts = [];
    this.levelIndex = 0;
    this.levels = [];
  }

  preload() {
    this.load.json('levels', 'data/levels.json');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.createHUD();
    const data = this.cache.json.get('levels');
    this.levels = data && data.levels ? data.levels : [];
    if (this.levels.length === 0) {
      this.loadLevels();
    }
    this.buildLevel(this.levels[this.levelIndex]);
    this.startNewLoop();

    // Basic editor toggle hookup
    const toggleBtn = document.getElementById('toggleEditorBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (!this.editor) this.editor = new LevelEditorPhaser(this);
        this.editor.active = !this.editor.active;
        toggleBtn.textContent = `Edit: ${this.editor.active ? 'ON' : 'OFF'}`;
      });
    }

    this.input.keyboard.on('keydown-R', () => this.restartCurrentLoop());
    this.input.keyboard.on('keydown-T', () => this.resetAll());
    this.input.keyboard.on('keydown-N', () => this.nextLevel());
  }

  createHUD() {
    const w = this.scale.width;
    this.timerText = this.add.text(w / 2, 16, '01:00', { fontFamily: 'Courier New', fontSize: 24, color: '#00ff00' }).setOrigin(0.5, 0);
    this.loopText = this.add.text(this.scale.width - 10, 10, 'Loop: 1', { fontFamily: 'Courier New', fontSize: 16, color: '#00ff00' }).setOrigin(1, 0);

    // Simple progress bar
    this.progressBg = this.add.rectangle(w / 2, 48, 200, 10, 0x000000, 0).setStrokeStyle(1, 0x00ff00);
    this.progressFill = this.add.rectangle(w / 2 - 100, 48, 0, 10, 0x00aa00).setOrigin(0, 0.5);
    this.interactText = this.add.text(0, 0, '[E] Interact', { fontFamily: 'Courier New', fontSize: 12, color: '#ffff00' }).setOrigin(0.5);
    this.interactText.setVisible(false);
  }

  loadLevels() {
    // For now, decode from existing hardcoded levels to a simple JSON structure
    // We mirror tutorial layout minimally
    this.levels = [
      {
        backgroundColor: '#1a1a2e',
        playerSpawn: { x: 50, y: 400 },
        platforms: [
          { x: 0, y: 550, w: 800, h: 50 },
          { x: 200, y: 450, w: 150, h: 20 },
          { x: 450, y: 350, w: 150, h: 20 },
          { x: 650, y: 250, w: 150, h: 20 },
          { x: 0, y: 0, w: 20, h: 600 },
          { x: 780, y: 0, w: 20, h: 600 },
          { x: 0, y: 0, w: 800, h: 20 }
        ],
        interactables: [
          { type: 'button', x: 100, y: 530, idx: 0 },
          { type: 'door', x: 300, y: 400, w: 20, h: 100, idx: 1 },
          { type: 'button', x: 500, y: 330, idx: 2, holdMs: 2000 },
          { type: 'door', x: 600, y: 200, w: 20, h: 100, idx: 3 },
          { type: 'block', x: 400, y: 510, w: 40, h: 40, idx: 4 }
        ],
        links: [
          { buttonIdx: 0, doorIdx: 1 },
          { buttonIdx: 2, doorIdx: 3 }
        ],
        exitZone: { x: 700, y: 200, w: 50, h: 50 }
      }
    ];
  }

  buildLevel(levelData) {
    // Clear previous
    this.physics.world.colliders.destroy();
    if (this.platforms) this.platforms.clear(true, true);
    if (this.interactables) this.interactables.clear(true, true);
    if (this.player) this.player.destroy();
    this.ghosts.forEach(g => g.destroy());
    this.ghosts = [];

    // Groups
    this.platforms = this.add.group();
    this.interactables = this.add.group();

    this.cameras.main.setBackgroundColor(levelData.backgroundColor || '#1a1a2e');

    // Platforms (static)
    levelData.platforms.forEach(p => {
      const rect = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x444444);
      rect.setStrokeStyle(2, 0x666666);
      this.physics.add.existing(rect, true);
      this.platforms.add(rect);
    });

    // Player
    this.player = this.add.rectangle(levelData.playerSpawn.x, levelData.playerSpawn.y, 30, 40, 0x00ff00);
    this.player.setStrokeStyle(2, 0x00ff00);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(30, 40);
    this.player.body.setBounce(0);
    this.physics.add.collider(this.player, this.platforms.getChildren());

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keySPACE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Interactables
    this.buttons = [];
    this.doors = [];
    this.blocks = [];
    levelData.interactables.forEach(it => {
      if (it.type === 'button') {
        const btn = this.createButton(it.x, it.y, it.holdMs || 100);
        this.buttons[it.idx] = btn;
      } else if (it.type === 'door') {
        const door = this.createDoor(it.x, it.y, it.w, it.h);
        if (it.requiresAllButtons) door.requiresAllButtons = true;
        this.doors[it.idx] = door;
      } else if (it.type === 'block') {
        const blk = this.createBlock(it.x, it.y, it.w || 40, it.h || 40);
        this.blocks[it.idx] = blk;
      }
    });

    // Links
    levelData.links.forEach(l => {
      const btn = this.buttons[l.buttonIdx];
      const door = this.doors[l.doorIdx];
      if (btn && door) {
        btn.targets.push(door);
        // Track reverse mapping for requiresAllButtons
        door.requiredButtons = door.requiredButtons || new Set();
        door.requiredButtons.add(btn);
      }
    });

    // Exit
    this.exit = this.add.rectangle(levelData.exitZone.x + levelData.exitZone.w / 2, levelData.exitZone.y + levelData.exitZone.h / 2, levelData.exitZone.w, levelData.exitZone.h);
    this.exit.setStrokeStyle(3, 0x00ff00);
    this.exit.setFillStyle(0x000000, 0);
    this.physics.add.existing(this.exit, true);

    // Colliders
    this.blocks.forEach(b => {
      if (!b) return;
      this.physics.add.collider(b, this.platforms.getChildren());
      this.physics.add.collider(b, this.player);
    });

    // Block <-> Door colliders
    this.blocks.forEach(b => {
      if (!b) return;
      this.doors.forEach(d => { if (d) this.physics.add.collider(b, d); });
    });
  }

  // Interactables helpers
  createButton(x, y, holdMs) {
    const btnBase = this.add.rectangle(x + 20, y + 10 + 5, 40, 20, 0x333333);
    const btnTop = this.add.rectangle(x + 20, y + 10, 40, 15, 0x666666);
    const container = this.add.container(0, 0, [btnBase, btnTop]);
    this.physics.add.existing(container, true);
    container.isActive = false;
    container.holdMs = holdMs;
    container.heldTime = 0;
    container.targets = [];
    container.interact = () => {
      container.isActive = true;
    };
    container.resetInteract = () => {
      container.isActive = false;
    };
    container.updateButton = (dt) => {
      if (container.isActive) container.heldTime += dt; else container.heldTime = 0;
      const ready = container.heldTime >= container.holdMs;
      btnTop.fillColor = container.isActive ? 0xff6600 : 0x666666;
      container.targets.forEach(d => {
        if (d.requiresAllButtons) {
          // Only open if all required buttons are currently ready
          const allReady = Array.from(d.requiredButtons || []).every(b => (b.heldTime || 0) >= (b.holdMs || 0));
          d.setOpen(allReady);
        } else {
          d.setOpen(ready && container.isActive);
        }
      });
    };
    this.interactables.add(container);
    return container;
  }

  createDoor(x, y, w, h) {
    const frame = this.add.rectangle(x + w / 2, y + h / 2, w + 4, h + 4);
    frame.setStrokeStyle(4, 0x444444);
    const door = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x666666);
    this.physics.add.existing(door, true);
    door.isOpen = false;
    door.closedY = door.y;
    door.openY = door.y - h;
    door.targetY = door.closedY;
    door.setOpen = (open) => {
      door.isOpen = open;
      door.targetY = open ? door.openY : door.closedY;
      door.body.enable = !open;
      door.fillColor = open ? 0x00aa00 : 0x666666;
    };
    door.requiresAllButtons = false;
    door.updateDoor = () => {
      if (Math.abs(door.y - door.targetY) > 1) {
        const dir = door.targetY > door.y ? 1 : -1;
        door.y += dir * 3;
        door.body.position.y = door.y - h / 2;
      } else {
        door.y = door.targetY;
        door.body.position.y = door.y - h / 2;
      }
    };
    this.interactables.add(door);
    // collide with player & blocks when closed
    this.physics.add.collider(this.player, door);
    this.blocks.forEach(b => b && this.physics.add.collider(b, door));
    return door;
  }

  createBlock(x, y, w, h) {
    const blk = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x888888).setStrokeStyle(2, 0x666666);
    this.physics.add.existing(blk);
    blk.body.setCollideWorldBounds(true);
    blk.beingPushed = false;
    blk.pushForce = 200;
    blk.interact = (actor) => {
      blk.beingPushed = true;
      const dir = actor.x < blk.x ? 1 : -1;
      blk.body.setVelocityX(dir * blk.pushForce);
    };
    blk.resetInteract = () => { blk.beingPushed = false; };
    this.interactables.add(blk);
    return blk;
  }

  // Loop management
  startNewLoop() {
    this.loopStartTs = this.time.now;
    this.recorder.startRecording();
    this.ghosts.forEach(g => g.frame = 0);
    this.loopText.setText(`Level ${this.levelIndex + 1} - Loop: ${this.currentLoop}`);

    // Reset player to spawn
    const lvl = this.levels[this.levelIndex];
    if (lvl && this.player && this.player.body) {
      this.player.body.setVelocity(0, 0);
      this.player.body.reset(lvl.playerSpawn.x, lvl.playerSpawn.y);
    }

    // Reset interactables state
    if (this.interactables) {
      this.interactables.getChildren().forEach(obj => {
        if (obj.updateDoor && obj.setOpen) obj.setOpen(false);
        if (obj.updateButton) { obj.isActive = false; obj.heldTime = 0; }
      });
    }
  }

  endCurrentLoop() {
    const idx = this.recorder.stopRecording();
    if (idx >= 0) {
      const rec = this.recorder.getRecording(idx);
      this.ghosts.push(new GhostReplay(this, rec, this.currentLoop));
      if (this.ghosts.length > 15) {
        const g = this.ghosts.shift();
        g.destroy();
      }
    }
    this.currentLoop += 1;
    this.startNewLoop();
  }

  restartCurrentLoop() {
    this.recorder.isRecording = false;
    this.recorder.currentRecording = null;
    const lvl = this.levels[this.levelIndex];
    this.buildLevel(lvl);
    this.startNewLoop();
  }

  resetAll() {
    this.recorder.clearRecordings();
    this.ghosts.forEach(g => g.destroy());
    this.ghosts = [];
    this.currentLoop = 1;
    const lvl = this.levels[this.levelIndex];
    this.buildLevel(lvl);
    this.startNewLoop();
  }

  nextLevel() {
    if (this.levelIndex < this.levels.length - 1) {
      this.levelIndex += 1;
      this.resetAll();
    }
  }

  // Interactions
  tryInteract() {
    const px = this.player.x;
    const py = this.player.y;
    const range = 50;
    const bounds = new Phaser.Geom.Rectangle(px - range / 2, py - range / 2, 30 + range, 40 + range);
    let any = false;
    let promptAt = null;
    this.interactables.getChildren().forEach(obj => {
      const r = obj.getBounds ? obj.getBounds() : new Phaser.Geom.Rectangle(obj.x, obj.y, 0, 0);
      if (Phaser.Geom.Rectangle.Overlaps(bounds, r) && obj.interact) {
        obj.interact(this.player);
        any = true;
        if (!promptAt) promptAt = { x: r.centerX, y: r.y - 12 };
      }
    });
    this.interactText.setVisible(any);
    if (any) { this.interactText.x = promptAt.x; this.interactText.y = promptAt.y; }
  }

  update(time, delta) {
    // Reset interaction flags before processing
    this.interactables.getChildren().forEach(obj => { if (obj.resetInteract) obj.resetInteract(); });

    // Input & movement
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.keySPACE);

    const speed = 250;
    if (left) this.player.body.setVelocityX(-speed);
    else if (right) this.player.body.setVelocityX(speed);
    else this.player.body.setVelocityX(0);

    if (jumpPressed && this.player.body.blocked.down) {
      this.player.body.setVelocityY(-600);
    }

    // Player interaction prompt visibility check
    const px = this.player.x;
    const py = this.player.y;
    const range = 50;
    const pBounds = new Phaser.Geom.Rectangle(px - range / 2, py - range / 2, 30 + range, 40 + range);
    let promptVisible = false;
    let promptAt = null;
    this.interactables.getChildren().forEach(obj => {
      const r = obj.getBounds ? obj.getBounds() : new Phaser.Geom.Rectangle(obj.x, obj.y, 0, 0);
      if (Phaser.Geom.Rectangle.Overlaps(pBounds, r) && obj.interact) {
        promptVisible = true;
        if (!promptAt) promptAt = { x: r.centerX, y: r.y - 12 };
      }
    });
    this.interactText.setVisible(promptVisible);
    if (promptVisible && promptAt) { this.interactText.x = promptAt.x; this.interactText.y = promptAt.y; }

    // Interact when E held
    if (this.keyE.isDown) { this.tryInteract(); }

    // Ghost interactions: proximity without input
    this.ghosts.forEach(g => {
      const gx = g.sprite.x;
      const gy = g.sprite.y;
      const range = 50;
      const gb = new Phaser.Geom.Rectangle(gx - range / 2, gy - range / 2, 30 + range, 40 + range);
      this.interactables.getChildren().forEach(obj => {
        const r = obj.getBounds ? obj.getBounds() : new Phaser.Geom.Rectangle(obj.x, obj.y, 0, 0);
        if (Phaser.Geom.Rectangle.Overlaps(gb, r) && obj.interact) obj.interact(g);
      });
    });

    // Update interactables
    this.interactables.getChildren().forEach(obj => {
      if (obj.updateDoor) obj.updateDoor();
      if (obj.updateButton) obj.updateButton(delta);
    });

    // Ghosts
    this.ghosts.forEach(g => g.update());

    // Record
    this.recorder.recordFrame(this.player);

    // Timer/HUD
    const elapsed = time - this.loopStartTs;
    const remaining = Math.max(0, this.loopDurationMs - elapsed);
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const sec = seconds % 60;
    this.timerText.setText(`${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
    const p = Phaser.Math.Clamp(elapsed / this.loopDurationMs, 0, 1);
    this.progressFill.width = 200 * p;

    if (elapsed >= this.loopDurationMs) {
      this.endCurrentLoop();
    }

    // Win condition
    if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.exit.getBounds())) {
      const allDoorsOpen = this.interactables.getChildren().filter(o => o.updateDoor).every(d => d.isOpen);
      if (allDoorsOpen) {
        this.timerText.setText('LEVEL COMPLETED!');
        this.time.delayedCall(2000, () => this.nextLevel());
      }
    }

    // Editor overlay
    if (this.editor && this.editor.active && this.editor.renderOverlay) {
      this.editor.renderOverlay();
    }
  }
}


