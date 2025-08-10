// Player character class
class Player extends PhysicsBody {
    constructor(x, y) {
        super(x, y, 30, 40);
        this.color = '#00ff00';
        this.interactionRange = 50;
        this.isActive = true;
    }
    
    handleInput(inputManager) {
        if (!this.isActive) return;
        
        // Horizontal movement
        let moveInput = 0;
        if (inputManager.isKeyDown('KeyA') || inputManager.isKeyDown('ArrowLeft')) {
            moveInput -= 1;
        }
        if (inputManager.isKeyDown('KeyD') || inputManager.isKeyDown('ArrowRight')) {
            moveInput += 1;
        }
        
        this.velocity.x = moveInput * GAME_CONFIG.PLAYER_SPEED;
        
        // Jumping
        if ((inputManager.isKeyPressed('KeyW') || inputManager.isKeyPressed('ArrowUp') || 
             inputManager.isKeyPressed('Space')) && this.onGround) {
            this.velocity.y = GAME_CONFIG.JUMP_FORCE;
            this.onGround = false;
        }
    }
    
    getInteractionBounds() {
        return new Rectangle(
            this.position.x - this.interactionRange / 2,
            this.position.y - this.interactionRange / 2,
            this.size.x + this.interactionRange,
            this.size.y + this.interactionRange
        );
    }
    
    canInteractWith(interactable) {
        if (!this.isActive) return false;
        return this.getInteractionBounds().intersects(interactable.bounds);
    }
    
    render(ctx) {
        // Draw player body
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
        
        // Draw glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
        
        // Draw eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.position.x + 8, this.position.y + 8, 4, 4);
        ctx.fillRect(this.position.x + 18, this.position.y + 8, 4, 4);
        
        ctx.restore();
        
        // Debug: Draw interaction range (optional)
        if (false) { // Set to true for debugging
            const interactionBounds = this.getInteractionBounds();
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.strokeRect(
                interactionBounds.x,
                interactionBounds.y,
                interactionBounds.width,
                interactionBounds.height
            );
            ctx.restore();
        }
    }
    
    // Create a snapshot of current state for recording
    getSnapshot() {
        return {
            position: this.position.copy(),
            velocity: this.velocity.copy(),
            onGround: this.onGround,
            isActive: this.isActive
        };
    }
    
    // Restore state from snapshot
    restoreFromSnapshot(snapshot) {
        this.position = snapshot.position.copy();
        this.velocity = snapshot.velocity.copy();
        this.onGround = snapshot.onGround;
        this.isActive = snapshot.isActive;
    }
}
