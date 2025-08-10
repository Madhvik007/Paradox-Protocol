class LevelEditor {
    constructor(game, canvas) {
        this.game = game;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.active = false;
        this.currentTool = 'select';
        this.isDragging = false;
        this.dragStart = null;
        this.tempRect = null;
        this.selectedObject = null;
        this.linkSource = null; // button to link from
        this.gridSize = 10;

        this._onMouseDown = this.onMouseDown.bind(this);
        this._onMouseMove = this.onMouseMove.bind(this);
        this._onMouseUp = this.onMouseUp.bind(this);
        this._onKeyDown = this.onKeyDown.bind(this);

        canvas.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
        window.addEventListener('keydown', this._onKeyDown);
    }

    setTool(tool) {
        this.currentTool = tool;
        this.linkSource = null;
    }

    snap(value) {
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    getMousePos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (evt.clientX - rect.left) * scaleX;
        const y = (evt.clientY - rect.top) * scaleY;
        return { x: this.snap(x), y: this.snap(y) };
    }

    newLevel() {
        const level = new Level();
        level.addPlatform(0, GAME_CONFIG.CANVAS_HEIGHT - 50, GAME_CONFIG.CANVAS_WIDTH, 50);
        level.addPlatform(0, 0, 20, GAME_CONFIG.CANVAS_HEIGHT);
        level.addPlatform(GAME_CONFIG.CANVAS_WIDTH - 20, 0, 20, GAME_CONFIG.CANVAS_HEIGHT);
        level.addPlatform(0, 0, GAME_CONFIG.CANVAS_WIDTH, 20);
        this.game.currentLevel = level;
        this.applyLevelToGame();
    }

    applyLevelToGame() {
        const g = this.game;
        // Reset state and apply level
        if (g.recorder) g.recorder.clearRecordings();
        g.ghosts = [];
        g.currentLoop = 1;
        g.gameState = 'playing';
        if (g.player && g.currentLevel) {
            g.player.position = g.currentLevel.playerSpawn.copy();
            g.player.velocity = new Vector2(0, 0);
            g.player.isActive = true;
        }
        g.setupCollisionSystem();
        g.startNewLoop();
    }

    saveToLocalStorage() {
        const data = this.game.currentLevel.toJSON();
        localStorage.setItem('customLevel', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const raw = localStorage.getItem('customLevel');
        if (!raw) return;
        try {
            const data = JSON.parse(raw);
            this.importJSON(data);
        } catch (e) {
            console.error('Failed to parse saved level', e);
        }
    }

    exportJSON() {
        const data = this.game.currentLevel.toJSON();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'level.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importJSON(data) {
        const level = Level.fromJSON(data);
        this.game.currentLevel = level;
        this.applyLevelToGame();
    }

    findObjectAt(x, y) {
        const pt = { x, y };
        // Check interactables (topmost first)
        for (let i = this.game.currentLevel.interactables.length - 1; i >= 0; i--) {
            const obj = this.game.currentLevel.interactables[i];
            const b = obj.bounds;
            if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
                return obj;
            }
        }
        // Check platforms
        for (let i = this.game.currentLevel.platforms.length - 1; i >= 0; i--) {
            const p = this.game.currentLevel.platforms[i];
            const b = p.bounds;
            if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
                return p;
            }
        }
        // Exit zone
        const ez = this.game.currentLevel.exitZone;
        if (ez && x >= ez.x && x <= ez.x + ez.width && y >= ez.y && y <= ez.y + ez.height) {
            return { __type: 'exitZone' };
        }
        return null;
    }

    onMouseDown(evt) {
        if (!this.active) return;
        const { x, y } = this.getMousePos(evt);
        this.isDragging = true;
        this.dragStart = { x, y };
        this.tempRect = null;

        if (this.currentTool === 'select') {
            this.selectedObject = this.findObjectAt(x, y);
            this.dragOffset = this.selectedObject ? { dx: x - (this.selectedObject.position ? this.selectedObject.position.x : 0), dy: y - (this.selectedObject.position ? this.selectedObject.position.y : 0) } : null;
        } else if (this.currentTool === 'eraser') {
            const target = this.findObjectAt(x, y);
            if (target) this.deleteObject(target);
            this.isDragging = false;
        } else if (this.currentTool === 'link') {
            const target = this.findObjectAt(x, y);
            if (target instanceof Button) {
                this.linkSource = target;
            } else if (target instanceof Door && this.linkSource) {
                this.linkSource.connectToDoor(target);
                this.linkSource = null;
            }
            this.isDragging = false;
        } else if (this.currentTool === 'button' || this.currentTool === 'block' || this.currentTool === 'spawn') {
            // Single click tools
            if (this.currentTool === 'button') {
                this.game.currentLevel.addInteractable(new Button(x, y));
            } else if (this.currentTool === 'block') {
                this.game.currentLevel.addInteractable(new MovableBlock(x, y));
            } else if (this.currentTool === 'spawn') {
                this.game.currentLevel.playerSpawn = new Vector2(x, y);
            }
            this.applyLevelToGame();
            this.isDragging = false;
        } else {
            // Drag-create tools: platform, door, exit
            this.tempRect = { x1: x, y1: y, x2: x, y2: y };
        }
    }

    onMouseMove(evt) {
        if (!this.active) return;
        const { x, y } = this.getMousePos(evt);

        if (this.isDragging && this.tempRect) {
            this.tempRect.x2 = x;
            this.tempRect.y2 = y;
        }

        if (this.isDragging && this.currentTool === 'select' && this.selectedObject) {
            if (this.selectedObject.bounds) {
                const b = this.selectedObject.bounds;
                const newX = x - (this.dragOffset ? this.dragOffset.dx : 0);
                const newY = y - (this.dragOffset ? this.dragOffset.dy : 0);
                if (this.selectedObject.position) {
                    this.selectedObject.position.x = this.snap(newX);
                    this.selectedObject.position.y = this.snap(newY);
                    // Keep door internals consistent when moved
                    if (this.selectedObject instanceof Door) {
                        const door = this.selectedObject;
                        door.closedY = door.position.y;
                        door.openY = door.closedY - door.size.y;
                        door.targetY = door.isOpen ? door.openY : door.closedY;
                    }
                } else if (this.selectedObject.__type === 'exitZone') {
                    // no drag for exit via select for now
                }
            }
        }
    }

    onMouseUp(evt) {
        if (!this.active) return;
        if (!this.isDragging) return;
        this.isDragging = false;

        const { x, y } = this.getMousePos(evt);

        if (this.tempRect) {
            const x1 = Math.min(this.tempRect.x1, x);
            const y1 = Math.min(this.tempRect.y1, y);
            const x2 = Math.max(this.tempRect.x1, x);
            const y2 = Math.max(this.tempRect.y1, y);
            const w = Math.max(1, this.snap(x2 - x1));
            const h = Math.max(1, this.snap(y2 - y1));
            const sx = this.snap(x1);
            const sy = this.snap(y1);

            if (this.currentTool === 'platform') {
                this.game.currentLevel.addPlatform(sx, sy, w, h);
            } else if (this.currentTool === 'door') {
                this.game.currentLevel.addInteractable(new Door(sx, sy, w, h));
            } else if (this.currentTool === 'exit') {
                this.game.currentLevel.setExitZone(sx, sy, w, h);
            }

            this.tempRect = null;
            this.applyLevelToGame();
        }

        if (this.currentTool === 'select' && this.selectedObject) {
            this.applyLevelToGame();
        }
    }

    onKeyDown(evt) {
        if (!this.active) return;
        if (evt.code === 'Delete' || evt.code === 'Backspace') {
            if (this.selectedObject) {
                this.deleteObject(this.selectedObject);
                this.selectedObject = null;
                this.applyLevelToGame();
            }
        }
    }

    deleteObject(obj) {
        const lvl = this.game.currentLevel;
        if (obj instanceof PhysicsBody && obj.type === 'platform') {
            const i = lvl.platforms.indexOf(obj);
            if (i >= 0) lvl.platforms.splice(i, 1);
        } else if (obj instanceof Interactable) {
            // Remove connections to this door if needed
            if (obj instanceof Door) {
                lvl.interactables.forEach(o => {
                    if (o instanceof Button) {
                        o.connectedDoors = o.connectedDoors.filter(d => d !== obj);
                    }
                });
            }
            const i = lvl.interactables.indexOf(obj);
            if (i >= 0) lvl.interactables.splice(i, 1);
        } else if (obj && obj.__type === 'exitZone') {
            lvl.exitZone = null;
        }
    }

    renderOverlay(ctx) {
        // Draw grid
        ctx.save();
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 1;
        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(this.canvas.width, y + 0.5);
            ctx.stroke();
        }

        // Highlight selected
        if (this.selectedObject && this.selectedObject.bounds) {
            const b = this.selectedObject.bounds;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.width, b.height);
        }

        // Draw temp rect
        if (this.tempRect) {
            const x1 = Math.min(this.tempRect.x1, this.tempRect.x2);
            const y1 = Math.min(this.tempRect.y1, this.tempRect.y2);
            const w = Math.abs(this.tempRect.x2 - this.tempRect.x1);
            const h = Math.abs(this.tempRect.y2 - this.tempRect.y1);
            ctx.strokeStyle = '#00ffff';
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x1, y1, w, h);
            ctx.setLineDash([]);
        }

        // Draw connections: Button -> Door
        for (const obj of this.game.currentLevel.interactables) {
            if (obj instanceof Button) {
                for (const door of obj.connectedDoors) {
                    ctx.strokeStyle = '#00aa00';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([4, 4]);
                    const sx = obj.bounds.centerX;
                    const sy = obj.bounds.centerY;
                    const dx = door.bounds.centerX;
                    const dy = door.bounds.centerY;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(dx, dy);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        // Tool label
        drawText(ctx, `Editor (${this.currentTool})`, 70, this.canvas.height - 10, 12, '#00ff00', 'left');

        ctx.restore();
    }
} 