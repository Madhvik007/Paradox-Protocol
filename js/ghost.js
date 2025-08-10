// Ghost replay system
class Ghost {
    constructor(recording, loopNumber) {
        this.recording = recording;
        this.loopNumber = loopNumber;
        this.currentFrame = 0;
        this.position = new Vector2(0, 0);
        this.velocity = new Vector2(0, 0);
        this.size = new Vector2(30, 40);
        this.onGround = false;
        this.alpha = GAME_CONFIG.GHOST_ALPHA;
        this.color = this.getGhostColor(loopNumber);
        this.isActive = true;
    }
    
    getGhostColor(loopNumber) {
        // Generate different colors for different loop numbers
        const hue = (loopNumber * 60) % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }
    
    get bounds() {
        return new Rectangle(
            this.position.x,
            this.position.y,
            this.size.x,
            this.size.y
        );
    }
    
    get center() {
        return new Vector2(
            this.position.x + this.size.x / 2,
            this.position.y + this.size.y / 2
        );
    }
    
    update() {
        if (this.currentFrame < this.recording.frames.length) {
            const frame = this.recording.frames[this.currentFrame];
            
            // Update position and state from recording
            this.position = frame.position.copy();
            this.velocity = frame.velocity.copy();
            this.onGround = frame.onGround;
            this.isActive = frame.isActive;
            
            this.currentFrame++;
        } else {
            // Recording finished, ghost becomes inactive
            this.isActive = false;
        }
    }
    
    canInteractWith(interactable) {
        if (!this.isActive) return false;
        
        const interactionBounds = new Rectangle(
            this.position.x - 25,
            this.position.y - 25,
            this.size.x + 50,
            this.size.y + 50
        );
        
        return interactionBounds.intersects(interactable.bounds);
    }
    
    render(ctx) {
        if (!this.isActive) return;
        
        ctx.save();
        
        // Set ghost transparency
        ctx.globalAlpha = this.alpha;
        
        // Draw ghost body with scanline effect
        this.drawGhostBody(ctx);
        
        // Draw loop number label
        this.drawLoopLabel(ctx);
        
        ctx.restore();
    }
    
    drawGhostBody(ctx) {
        // Main ghost body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
        
        // Glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
        
        // Scanline effect
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        for (let y = this.position.y; y < this.position.y + this.size.y; y += 4) {
            ctx.beginPath();
            ctx.moveTo(this.position.x, y);
            ctx.lineTo(this.position.x + this.size.x, y);
            ctx.stroke();
        }
        
        // Reset alpha for eyes
        ctx.globalAlpha = this.alpha;
        
        // Draw eyes
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(this.position.x + 8, this.position.y + 8, 4, 4);
        ctx.fillRect(this.position.x + 18, this.position.y + 8, 4, 4);
    }
    
    drawLoopLabel(ctx) {
        // Draw loop number above ghost
        const labelY = this.position.y - 10;
        const labelX = this.position.x + this.size.x / 2;
        
        ctx.globalAlpha = 0.8;
        ctx.font = '12px Courier New';
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 3;
        ctx.fillText(`Loop ${this.loopNumber}`, labelX, labelY);
    }
    
    reset() {
        this.currentFrame = 0;
        this.isActive = true;
    }
    
    // Get current interaction state for paradox detection
    getInteractionState() {
        if (!this.isActive || this.currentFrame >= this.recording.frames.length) {
            return null;
        }
        
        const frame = this.recording.frames[this.currentFrame];
        return frame.interactions || [];
    }
}
