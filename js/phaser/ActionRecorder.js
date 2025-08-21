// Lightweight recorder compatible with Phaser bodies
class PhaserActionRecorder {
  constructor() {
    this.isRecording = false;
    this.currentRecording = null;
    this.recordings = [];
    this.frameCounter = 0;
    this.recordInterval = 1;
  }

  startRecording() {
    this.isRecording = true;
    this.frameCounter = 0;
    this.currentRecording = { frames: [], startTime: Date.now() };
  }

  stopRecording() {
    if (this.isRecording && this.currentRecording) {
      this.isRecording = false;
      this.recordings.push(this.currentRecording);
      const idx = this.recordings.length - 1;
      this.currentRecording = null;
      return idx;
    }
    return -1;
  }

  recordFrame(sprite) {
    if (!this.isRecording || !this.currentRecording || !sprite) return;
    this.frameCounter++;
    if (this.frameCounter % this.recordInterval !== 0) return;
    this.currentRecording.frames.push({
      x: sprite.x,
      y: sprite.y,
      vx: sprite.body ? sprite.body.velocity.x : 0,
      vy: sprite.body ? sprite.body.velocity.y : 0,
      onGround: sprite.body ? sprite.body.blocked.down : false
    });
    if (this.currentRecording.frames.length > 1800) {
      this.currentRecording.frames.shift();
    }
  }

  getRecording(index) {
    return this.recordings[index] || null;
  }

  clearRecordings() {
    this.recordings = [];
    this.currentRecording = null;
    this.isRecording = false;
  }
}

// Simple ghost game object
class GhostReplay {
  constructor(scene, recording, loopNumber) {
    this.scene = scene;
    this.recording = recording;
    this.loopNumber = loopNumber;
    this.frame = 0;
    this.sprite = scene.add.rectangle(0, 0, 30, 40, 0xffffff, 0.35);
    this.sprite.setStrokeStyle(1, 0xffffff, 0.6);
    this.label = scene.add.text(0, 0, `Loop ${loopNumber}`, {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5, 1);
    const hue = (loopNumber * 60) % 360;
    const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.6);
    this.sprite.fillColor = color.color;
    this.sprite.strokeColor = color.color;
  }

  update() {
    if (!this.recording || this.frame >= this.recording.frames.length) return;
    const f = this.recording.frames[this.frame++];
    this.sprite.x = f.x;
    this.sprite.y = f.y;
    this.label.x = f.x + 15;
    this.label.y = f.y - 4;
  }

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
  }
}


