// Utility functions and constants
const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    LOOP_DURATION: 10000,
    GRAVITY: 0.4,
    FRICTION: 0.85,
    JUMP_FORCE: -10,
    PLAYER_SPEED: 2.5,
    GHOST_ALPHA: 0.5,
    RECORDING_FPS: 60
};

class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    copy() {
        return new Vector2(this.x, this.y);
    }
    
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    
    subtract(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
    
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }
    
    distance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    get left() { return this.x; }
    get right() { return this.x + this.width; }
    get top() { return this.y; }
    get bottom() { return this.y + this.height; }
    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }
    
    intersects(other) {
        return this.left < other.right &&
               this.right > other.left &&
               this.top < other.bottom &&
               this.bottom > other.top;
    }
    
    contains(point) {
        return point.x >= this.left &&
               point.x <= this.right &&
               point.y >= this.top &&
               point.y <= this.bottom;
    }
}

// Input handling
class InputManager {
    constructor() {
        this.keys = {};
        this.keysPressed = {};
        this.keysReleased = {};
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.keysPressed[e.code] = true;
            }
            this.keys[e.code] = true;
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keysReleased[e.code] = true;
            e.preventDefault();
        });
    }
    
    isKeyDown(keyCode) {
        return !!this.keys[keyCode];
    }
    
    isKeyPressed(keyCode) {
        return !!this.keysPressed[keyCode];
    }
    
    isKeyReleased(keyCode) {
        return !!this.keysReleased[keyCode];
    }
    
    update() {
        this.keysPressed = {};
        this.keysReleased = {};
    }
}

// Utility functions
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function drawText(ctx, text, x, y, fontSize = 16, color = '#00ff00', align = 'center') {
    ctx.save();
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawRect(ctx, rect, color = '#00ff00', filled = false) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    
    if (filled) {
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    } else {
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    ctx.restore();
}
