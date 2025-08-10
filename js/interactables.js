// Interactive objects (buttons, doors, etc.)
class Interactable extends PhysicsBody {
    constructor(x, y, width, height, type) {
        super(x, y, width, height);
        this.type = type;
        this.isActive = false;
        this.activatedBy = [];
        this.solid = true;
    }
    
    interact(actor) {
        // Override in subclasses
    }
    
    update() {
        // Override in subclasses
        super.update();
    }
    
    render(ctx) {
        // Override in subclasses
    }
    
    getState() {
        return {
            isActive: this.isActive,
            activatedBy: [...this.activatedBy]
        };
    }
}

class Button extends Interactable {
    constructor(x, y) {
        super(x, y, 40, 20, 'button');
        this.solid = false;
        this.pressDepth = 5;
        this.connectedDoors = [];
        this.requiresHold = true;
        this.activationTime = 0;
        this.requiredHoldTime = 100; // milliseconds
    }
    
    interact(actor) {
        if (!this.activatedBy.includes(actor)) {
            this.activatedBy.push(actor);
        }
    }
    
    stopInteraction(actor) {
        const index = this.activatedBy.indexOf(actor);
        if (index > -1) {
            this.activatedBy.splice(index, 1);
        }
    }
    
    update() {
        super.update();
        
        const wasActive = this.isActive;
        this.isActive = this.activatedBy.length > 0;
        
        if (this.isActive) {
            this.activationTime += 16; // Approximate frame time
        } else {
            this.activationTime = 0;
        }
        
        // Update connected doors
        for (const door of this.connectedDoors) {
            if (this.requiresHold) {
                door.setOpen(this.isActive && this.activationTime >= this.requiredHoldTime);
            } else {
                door.setOpen(this.isActive);
            }
        }
    }
    
    connectToDoor(door) {
        this.connectedDoors.push(door);
    }
    
    render(ctx) {
        ctx.save();
        
        // Button base
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.position.x, this.position.y + this.pressDepth, this.size.x, this.size.y);
        
        // Button top
        const buttonTop = this.isActive ? this.position.y + this.pressDepth : this.position.y;
        ctx.fillStyle = this.isActive ? '#ff6600' : '#666666';
        ctx.fillRect(this.position.x, buttonTop, this.size.x, this.size.y - this.pressDepth);
        
        // Glow effect when active
        if (this.isActive) {
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.position.x, buttonTop, this.size.x, this.size.y - this.pressDepth);
        }
        
        // Progress indicator for hold time
        if (this.requiresHold && this.isActive) {
            const progress = Math.min(this.activationTime / this.requiredHoldTime, 1);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(
                this.position.x + 2,
                this.position.y - 8,
                (this.size.x - 4) * progress,
                4
            );
        }
        
        ctx.restore();
    }
}

class Door extends Interactable {
    constructor(x, y, width, height) {
        super(x, y, width, height, 'door');
        this.isOpen = false;
        this.targetY = this.position.y;
        this.closedY = this.position.y;
        this.openY = this.position.y - this.size.y; // Moves up when open
        this.animationSpeed = 3;
    }
    
    setOpen(open) {
        this.isOpen = open;
        this.targetY = open ? this.openY : this.closedY;
        this.solid = !open;
    }
    
    update() {
        // Animate door movement
        if (Math.abs(this.position.y - this.targetY) > 1) {
            const direction = this.targetY > this.position.y ? 1 : -1;
            this.position.y += direction * this.animationSpeed;
        } else {
            this.position.y = this.targetY;
        }
        
        super.update();
    }
    
    render(ctx) {
        ctx.save();
        
        // Door frame (always visible)
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 4;
        ctx.strokeRect(
            this.bounds.x - 2,
            this.closedY - 2,
            this.size.x + 4,
            this.size.y + 4
        );
        
        // Door panel
        if (this.position.y < this.closedY + this.size.y) {
            const visibleHeight = Math.max(0, this.closedY + this.size.y - this.position.y);
            
            ctx.fillStyle = this.isOpen ? '#00aa00' : '#666666';
            ctx.fillRect(
                this.position.x,
                Math.max(this.position.y, this.closedY),
                this.size.x,
                visibleHeight
            );
            
            // Door details
            ctx.fillStyle = '#333333';
            ctx.fillRect(
                this.position.x + 5,
                Math.max(this.position.y, this.closedY) + 5,
                this.size.x - 10,
                Math.max(0, visibleHeight - 10)
            );
            
            // Glow effect when open
            if (this.isOpen) {
                ctx.shadowColor = '#00aa00';
                ctx.shadowBlur = 8;
                ctx.strokeStyle = '#00aa00';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    this.position.x,
                    Math.max(this.position.y, this.closedY),
                    this.size.x,
                    visibleHeight
                );
            }
        }
        
        ctx.restore();
    }
}

class MovableBlock extends Interactable {
    constructor(x, y, width = 40, height = 40) {
        super(x, y, width, height, 'movable_block');
        this.beingPushed = false;
        this.pushForce = 2;
    }
    
    interact(actor) {
        this.beingPushed = true;
        
        // Calculate push direction based on actor position
        const actorCenter = actor.center;
        const blockCenter = this.center;
        
        if (actorCenter.x < blockCenter.x) {
            // Push right
            this.velocity.x = this.pushForce;
        } else {
            // Push left
            this.velocity.x = -this.pushForce;
        }
    }
    
    stopInteraction(actor) {
        this.beingPushed = false;
    }
    
    update() {
        super.update();
        
        if (!this.beingPushed) {
            this.velocity.x *= 0.9; // Slow down when not being pushed
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // Block body
        ctx.fillStyle = this.beingPushed ? '#ffaa00' : '#888888';
        ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
        
        // Block outline
        ctx.strokeStyle = this.beingPushed ? '#ffaa00' : '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
        
        // Grid pattern
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        const gridSize = 10;
        for (let x = this.position.x; x < this.position.x + this.size.x; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, this.position.y);
            ctx.lineTo(x, this.position.y + this.size.y);
            ctx.stroke();
        }
        for (let y = this.position.y; y < this.position.y + this.size.y; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(this.position.x, y);
            ctx.lineTo(this.position.x + this.size.x, y);
            ctx.stroke();
        }
        
        // Glow effect when being pushed
        if (this.beingPushed) {
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
        }
        
        ctx.restore();
    }
}
