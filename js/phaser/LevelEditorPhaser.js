/* Minimal Phaser-based level editor wiring to mirror existing tools */

class LevelEditorPhaser {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.currentTool = 'select';
    this.isDragging = false;
    this.dragStart = null;
    this.tempRect = null;
    this.selected = null;
    this.previewShape = null;
    this.gridGraphics = this.scene.add.graphics();
    this.gridGraphics.setDepth(1000);
    this.previewGraphics = this.scene.add.graphics();
    this.previewGraphics.setDepth(1001);

    this.toolSelect = document.getElementById('editorTool');
    this.playtestBtn = document.getElementById('playtestBtn');
    this.newBtn = document.getElementById('newLevelBtn');
    this.saveBtn = document.getElementById('saveLocalBtn');
    this.loadBtn = document.getElementById('loadLocalBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.importBtn = document.getElementById('importBtn');
    this.importFile = document.getElementById('importFile');

    this.bindUI();
    this.bindPointer();

    // Link mode state
    this.linkSource = null; // button object idx
  }

  bindUI() {
    if (this.toolSelect) this.toolSelect.addEventListener('change', e => this.currentTool = e.target.value);
    if (this.playtestBtn) this.playtestBtn.addEventListener('click', () => { this.active = false; });
    if (this.newBtn) this.newBtn.addEventListener('click', () => this.newLevel());
    if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.saveLocal());
    if (this.loadBtn) this.loadBtn.addEventListener('click', () => this.loadLocal());
    if (this.exportBtn) this.exportBtn.addEventListener('click', () => this.exportJSON());
    if (this.importBtn) this.importBtn.addEventListener('click', () => this.importFile.click());
    if (this.importFile) this.importFile.addEventListener('change', e => this.handleImport(e));
  }

  bindPointer() {
    const input = this.scene.input;
    input.on('pointerdown', (p) => this.onDown(p));
    input.on('pointermove', (p) => this.onMove(p));
    input.on('pointerup', (p) => this.onUp(p));
  }

  snap(n) { return Math.round(n / 10) * 10; }

  getLevel() { return this.scene.levels[this.scene.levelIndex]; }

  newLevel() {
    const lvl = { backgroundColor: '#1a1a2e', playerSpawn: { x: 100, y: 500 }, platforms: [], interactables: [], links: [], exitZone: { x: 700, y: 500, w: 50, h: 50 } };
    this.scene.levels[this.scene.levelIndex] = lvl;
    this.scene.buildLevel(lvl);
    this.scene.startNewLoop();
  }

  saveLocal() {
    const db = { levels: this.scene.levels };
    localStorage.setItem('phaser_levels', JSON.stringify(db));
  }

  loadLocal() {
    const raw = localStorage.getItem('phaser_levels');
    if (!raw) return;
    try {
      const db = JSON.parse(raw);
      if (db && Array.isArray(db.levels)) {
        this.scene.levels = db.levels;
        this.scene.levelIndex = 0;
        this.scene.buildLevel(this.scene.levels[0]);
        this.scene.startNewLoop();
      }
    } catch (e) { console.warn('Failed to load levels', e); }
  }

  exportJSON() {
    const blob = new Blob([JSON.stringify({ levels: this.scene.levels }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'levels.json'; a.click();
    URL.revokeObjectURL(url);
  }

  handleImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const db = JSON.parse(rd.result);
        if (db && db.levels) {
          this.scene.levels = db.levels;
          this.scene.levelIndex = 0;
          this.scene.buildLevel(this.scene.levels[0]);
          this.scene.startNewLoop();
        }
      } catch (err) { console.error('Import failed', err); }
    };
    rd.readAsText(file);
    e.target.value = '';
  }

  onDown(p) {
    if (!this.active) return;
    this.isDragging = true;
    this.dragStart = { x: this.snap(p.x), y: this.snap(p.y) };
    this.tempRect = null;

    if (this.currentTool === 'button') {
      this.getLevel().interactables.push({ type: 'button', x: this.dragStart.x - 20, y: this.dragStart.y - 10, idx: Date.now(), holdMs: 100 });
      this.scene.buildLevel(this.getLevel()); this.scene.startNewLoop(); this.isDragging = false; return;
    }
    if (this.currentTool === 'block') {
      this.getLevel().interactables.push({ type: 'block', x: this.dragStart.x - 20, y: this.dragStart.y - 20, w: 40, h: 40, idx: Date.now() });
      this.scene.buildLevel(this.getLevel()); this.scene.startNewLoop(); this.isDragging = false; return;
    }
    if (this.currentTool === 'spawn') {
      this.getLevel().playerSpawn = { x: this.dragStart.x, y: this.dragStart.y };
      this.scene.buildLevel(this.getLevel()); this.scene.startNewLoop(); this.isDragging = false; return;
    }
    if (this.currentTool === 'eraser') {
      this.eraseAt(this.dragStart.x, this.dragStart.y);
      this.scene.buildLevel(this.getLevel()); this.scene.startNewLoop(); this.isDragging = false; return;
    }
    if (this.currentTool === 'link') {
      // Click a button then a door to create link
      const hit = this.hitTest(this.dragStart.x, this.dragStart.y);
      if (hit && hit.type === 'button') {
        this.linkSource = hit.idx;
      } else if (hit && hit.type === 'door' && this.linkSource != null) {
        const lvl = this.getLevel();
        lvl.links.push({ buttonIdx: this.linkSource, doorIdx: hit.idx });
        this.linkSource = null;
        this.scene.buildLevel(lvl); this.scene.startNewLoop();
      }
      this.isDragging = false;
      return;
    }
    if (['platform', 'door', 'exit'].includes(this.currentTool)) {
      this.tempRect = { x1: this.dragStart.x, y1: this.dragStart.y, x2: this.dragStart.x, y2: this.dragStart.y };
      this.renderPreview();
    }
  }

  onMove(p) {
    if (!this.active) return;
    // Draw grid always when editor active
    this.renderOverlay();
    if (!this.isDragging || !this.tempRect) return;
    this.tempRect.x2 = this.snap(p.x);
    this.tempRect.y2 = this.snap(p.y);
    this.renderPreview();
  }

  onUp(p) {
    if (!this.active || !this.isDragging) return;
    this.isDragging = false;
    if (!this.tempRect) return;
    const x1 = Math.min(this.tempRect.x1, this.tempRect.x2);
    const y1 = Math.min(this.tempRect.y1, this.tempRect.y2);
    const w = Math.max(10, Math.abs(this.tempRect.x2 - this.tempRect.x1));
    const h = Math.max(10, Math.abs(this.tempRect.y2 - this.tempRect.y1));
    const lvl = this.getLevel();
    if (this.currentTool === 'platform') {
      lvl.platforms.push({ x: x1, y: y1, w, h });
    } else if (this.currentTool === 'door') {
      lvl.interactables.push({ type: 'door', x: x1, y: y1, w, h, idx: Date.now() });
    } else if (this.currentTool === 'exit') {
      lvl.exitZone = { x: x1, y: y1, w, h };
    }
    this.tempRect = null;
    this.previewGraphics.clear();
    this.scene.buildLevel(lvl);
    this.scene.startNewLoop();
  }

  eraseAt(x, y) {
    const lvl = this.getLevel();
    // Remove interactable under cursor
    const foundIdx = lvl.interactables.findIndex(it => x >= it.x && x <= (it.x + (it.w || 40)) && y >= it.y && y <= (it.y + (it.h || 20)));
    if (foundIdx >= 0) {
      const removed = lvl.interactables.splice(foundIdx, 1)[0];
      // Remove links to removed door
      if (removed.type === 'door') {
        lvl.links = lvl.links.filter(l => l.doorIdx !== removed.idx);
      }
      return;
    }
    // Remove platform under cursor
    const pfIdx = lvl.platforms.findIndex(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (pfIdx >= 0) lvl.platforms.splice(pfIdx, 1);
  }
}

LevelEditorPhaser.prototype.hitTest = function(x, y) {
  const lvl = this.getLevel();
  for (let i = lvl.interactables.length - 1; i >= 0; i--) {
    const it = lvl.interactables[i];
    const w = it.w || (it.type === 'button' ? 40 : 20);
    const h = it.h || (it.type === 'button' ? 20 : 20);
    if (x >= it.x && x <= it.x + w && y >= it.y && y <= it.y + h) return it;
  }
  return null;
};

// Overlay & preview
LevelEditorPhaser.prototype.renderOverlay = function() {
  const g = this.gridGraphics;
  g.clear();
  if (!this.active) return;
  g.lineStyle(1, 0x003300, 0.5);
  const w = this.scene.scale.width;
  const h = this.scene.scale.height;
  for (let x = 0; x <= w; x += 10) { g.lineBetween(x, 0, x, h); }
  for (let y = 0; y <= h; y += 10) { g.lineBetween(0, y, w, y); }
};

LevelEditorPhaser.prototype.renderPreview = function() {
  const g = this.previewGraphics;
  g.clear();
  if (!this.tempRect) return;
  const x1 = Math.min(this.tempRect.x1, this.tempRect.x2);
  const y1 = Math.min(this.tempRect.y1, this.tempRect.y2);
  const w = Math.max(10, Math.abs(this.tempRect.x2 - this.tempRect.x1));
  const h = Math.max(10, Math.abs(this.tempRect.y2 - this.tempRect.y1));
  g.lineStyle(2, 0x00ffff, 1);
  g.strokeRect(x1 + 0.5, y1 + 0.5, w, h);
};


