// Physics and collision detection
class PhysicsBody {
    constructor(x, y, width, height) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.size = new Vector2(width, height);
        this.onGround = false;
        this.solid = true;
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
    
    applyGravity() {
        this.velocity.y += GAME_CONFIG.GRAVITY;
    }
    
    applyFriction() {
        this.velocity.x *= GAME_CONFIG.FRICTION;
    }
    
    update() {
        this.position.add(this.velocity);
        this.onGround = false;
    }
}

class CollisionSystem {
    constructor() {
        this.staticBodies = [];
    }
    
    addStaticBody(body) {
        this.staticBodies.push(body);
    }
    
    checkCollision(body1, body2) {
        return body1.bounds.intersects(body2.bounds);
    }
    
    resolveCollision(movingBody, staticBody) {
        const bounds1 = movingBody.bounds;
        const bounds2 = staticBody.bounds;
        
        if (!bounds1.intersects(bounds2)) return;
        
        // Calculate overlap on each axis
        const overlapX = Math.min(bounds1.right - bounds2.left, bounds2.right - bounds1.left);
        const overlapY = Math.min(bounds1.bottom - bounds2.top, bounds2.bottom - bounds1.top);
        
        // Resolve collision on the axis with smallest overlap
        if (overlapX < overlapY) {
            // Horizontal collision
            if (bounds1.centerX < bounds2.centerX) {
                // Moving body is to the left
                movingBody.position.x = bounds2.left - movingBody.size.x;
            } else {
                // Moving body is to the right
                movingBody.position.x = bounds2.right;
            }
            movingBody.velocity.x = 0;
        } else {
            // Vertical collision
            if (bounds1.centerY < bounds2.centerY) {
                // Moving body is above
                movingBody.position.y = bounds2.top - movingBody.size.y;
                movingBody.onGround = true;
            } else {
                // Moving body is below
                movingBody.position.y = bounds2.bottom;
            }
            movingBody.velocity.y = 0;
        }
    }
    
    checkWorldBounds(body, worldWidth, worldHeight) {
        // Left boundary
        if (body.position.x < 0) {
            body.position.x = 0;
            body.velocity.x = 0;
        }
        
        // Right boundary
        if (body.position.x + body.size.x > worldWidth) {
            body.position.x = worldWidth - body.size.x;
            body.velocity.x = 0;
        }
        
        // Top boundary
        if (body.position.y < 0) {
            body.position.y = 0;
            body.velocity.y = 0;
        }
        
        // Bottom boundary
        if (body.position.y + body.size.y > worldHeight) {
            body.position.y = worldHeight - body.size.y;
            body.velocity.y = 0;
            body.onGround = true;
        }
    }
    
    updateBody(body, worldWidth, worldHeight) {
        // Apply physics
        body.applyGravity();
        body.update();
        
        // Check collisions with static bodies
        for (const staticBody of this.staticBodies) {
            if (staticBody.solid) {
                this.resolveCollision(body, staticBody);
            }
        }
        
        // Check world boundaries
        this.checkWorldBounds(body, worldWidth, worldHeight);
        
        // Apply friction if on ground
        if (body.onGround) {
            body.applyFriction();
        }
    }
}
