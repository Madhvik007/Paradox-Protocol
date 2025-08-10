// Level design and management
class Level {
    constructor() {
        this.platforms = [];
        this.interactables = [];
        this.playerSpawn = new Vector2(50, 400);
        this.exitZone = null;
        this.backgroundColor = '#1a1a2e';
        this.completed = false;
    }
    
    addPlatform(x, y, width, height) {
        const platform = new PhysicsBody(x, y, width, height);
        platform.solid = true;
        platform.type = 'platform';
        this.platforms.push(platform);
        return platform;
    }
    
    addInteractable(interactable) {
        this.interactables.push(interactable);
        return interactable;
    }
    
    setExitZone(x, y, width, height) {
        this.exitZone = new Rectangle(x, y, width, height);
    }
    
    checkWinCondition(player) {
        if (this.exitZone && this.exitZone.contains(player.center)) {
            // Check if all doors are open or other win conditions are met
            const allDoorsOpen = this.interactables
                .filter(obj => obj instanceof Door)
                .every(door => door.isOpen);
            
            if (allDoorsOpen) {
                this.completed = true;
                return true;
            }
        }
        return false;
    }
    
    reset() {
        this.completed = false;
        // Reset all interactables
        this.interactables.forEach(obj => {
            if (obj instanceof Door) {
                obj.setOpen(false);
            } else if (obj instanceof Button) {
                obj.activatedBy = [];
                obj.activationTime = 0;
            } else if (obj instanceof MovableBlock) {
                obj.velocity = new Vector2(0, 0);
                obj.beingPushed = false;
            }
        });
    }
    
    update(collisionSystem) {
        // Update all interactables
        this.interactables.forEach(obj => {
            if (obj instanceof MovableBlock) {
                // Apply physics to movable blocks
                collisionSystem.updateBody(obj, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
            } else {
                obj.update();
            }
        });
    }
    
    render(ctx) {
        // Clear background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        // Render platforms
        this.platforms.forEach(platform => {
            ctx.fillStyle = '#444444';
            ctx.fillRect(platform.position.x, platform.position.y, platform.size.x, platform.size.y);
            
            // Platform outline
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;
            ctx.strokeRect(platform.position.x, platform.position.y, platform.size.x, platform.size.y);
        });
        
        // Render interactables
        this.interactables.forEach(obj => obj.render(ctx));
        
        // Render exit zone
        if (this.exitZone) {
            ctx.save();
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(this.exitZone.x, this.exitZone.y, this.exitZone.width, this.exitZone.height);
            
            // Exit label
            drawText(ctx, 'EXIT', 
                this.exitZone.x + this.exitZone.width / 2, 
                this.exitZone.y + this.exitZone.height / 2, 
                16, '#00ff00', 'center');
            
            ctx.restore();
        }
    }
    
    getCollisionBodies() {
        const bodies = [...this.platforms];
        
        // Add solid interactables
        this.interactables.forEach(obj => {
            if (obj.solid) {
                bodies.push(obj);
            }
        });
        
        return bodies;
    }
}

// Add serialization support for Level
Level.prototype.toJSON = function() {
    const doorToIndex = new Map();
    this.interactables.forEach((obj, idx) => {
        if (obj instanceof Door) {
            doorToIndex.set(obj, idx);
        }
    });

    const interactablesData = this.interactables.map((obj) => {
        if (obj instanceof Button) {
            const connections = obj.connectedDoors
                .map(d => doorToIndex.has(d) ? doorToIndex.get(d) : -1)
                .filter(i => i >= 0);
            return {
                type: 'button',
                x: obj.position.x,
                y: obj.position.y,
                requiresHold: obj.requiresHold,
                requiredHoldTime: obj.requiredHoldTime,
                connections
            };
        } else if (obj instanceof Door) {
            return {
                type: 'door',
                x: obj.closedY !== undefined ? obj.bounds.x : obj.position.x,
                y: obj.closedY !== undefined ? obj.closedY : obj.position.y,
                width: obj.size.x,
                height: obj.size.y
            };
        } else if (obj instanceof MovableBlock) {
            return {
                type: 'movable_block',
                x: obj.position.x,
                y: obj.position.y,
                width: obj.size.x,
                height: obj.size.y
            };
        } else {
            return { type: obj.type || 'unknown' };
        }
    });

    return {
        version: 1,
        backgroundColor: this.backgroundColor,
        playerSpawn: { x: this.playerSpawn.x, y: this.playerSpawn.y },
        exitZone: this.exitZone ? { x: this.exitZone.x, y: this.exitZone.y, width: this.exitZone.width, height: this.exitZone.height } : null,
        platforms: this.platforms.map(p => ({ x: p.position.x, y: p.position.y, width: p.size.x, height: p.size.y })),
        interactables: interactablesData
    };
};

Level.fromJSON = function(data) {
    const level = new Level();
    if (data.backgroundColor) level.backgroundColor = data.backgroundColor;
    if (data.playerSpawn) level.playerSpawn = new Vector2(data.playerSpawn.x, data.playerSpawn.y);
    if (data.exitZone) level.setExitZone(data.exitZone.x, data.exitZone.y, data.exitZone.width, data.exitZone.height);

    if (Array.isArray(data.platforms)) {
        data.platforms.forEach(pl => level.addPlatform(pl.x, pl.y, pl.width, pl.height));
    }

    const createdInteractables = [];
    if (Array.isArray(data.interactables)) {
        for (const it of data.interactables) {
            if (!it || !it.type) { createdInteractables.push(null); continue; }
            switch (it.type) {
                case 'button': {
                    const btn = new Button(it.x || 0, it.y || 0);
                    if (typeof it.requiresHold === 'boolean') btn.requiresHold = it.requiresHold;
                    if (typeof it.requiredHoldTime === 'number') btn.requiredHoldTime = it.requiredHoldTime;
                    level.addInteractable(btn);
                    createdInteractables.push(btn);
                    break;
                }
                case 'door': {
                    const door = new Door(it.x || 0, it.y || 0, it.width || 20, it.height || 100);
                    level.addInteractable(door);
                    createdInteractables.push(door);
                    break;
                }
                case 'movable_block': {
                    const blk = new MovableBlock(it.x || 0, it.y || 0, it.width || 40, it.height || 40);
                    level.addInteractable(blk);
                    createdInteractables.push(blk);
                    break;
                }
                default: {
                    createdInteractables.push(null);
                    break;
                }
            }
        }

        // Resolve connections (buttons -> doors)
        data.interactables.forEach((it, idx) => {
            if (it && it.type === 'button' && Array.isArray(it.connections)) {
                const btn = createdInteractables[idx];
                if (btn) {
                    it.connections.forEach(ci => {
                        const target = createdInteractables[ci];
                        if (target instanceof Door) btn.connectToDoor(target);
                    });
                }
            }
        });
    }

    return level;
};

// Factory function to create the tutorial level
function createTutorialLevel() {
    const level = new Level();
    
    // Add ground platforms
    level.addPlatform(0, 550, 800, 50);     // Main floor
    level.addPlatform(200, 450, 150, 20);   // First platform
    level.addPlatform(450, 350, 150, 20);   // Second platform
    level.addPlatform(650, 250, 150, 20);   // Third platform
    
    // Add walls
    level.addPlatform(0, 0, 20, 600);       // Left wall
    level.addPlatform(780, 0, 20, 600);     // Right wall
    level.addPlatform(0, 0, 800, 20);       // Ceiling
    
    // Create button and door
    const button1 = new Button(100, 530);
    const door1 = new Door(300, 400, 20, 100);
    button1.connectToDoor(door1);
    
    // Create second button and door for more complex puzzle
    const button2 = new Button(500, 330);
    const door2 = new Door(600, 200, 20, 100);
    button2.connectToDoor(door2);
    button2.requiredHoldTime = 2000; // Requires 2 seconds of holding
    
    // Add movable block
    const block1 = new MovableBlock(400, 510);
    
    // Add interactables to level
    level.addInteractable(button1);
    level.addInteractable(door1);
    level.addInteractable(button2);
    level.addInteractable(door2);
    level.addInteractable(block1);
    
    // Set exit zone
    level.setExitZone(700, 200, 50, 50);
    
    return level;
}

// Factory function to create a simple test level
function createSimpleLevel() {
    const level = new Level();
    
    // Simple layout for testing
    level.addPlatform(0, 550, 800, 50);     // Ground
    level.addPlatform(300, 450, 200, 20);   // Platform
    
    // Walls
    level.addPlatform(0, 0, 20, 600);
    level.addPlatform(780, 0, 20, 600);
    level.addPlatform(0, 0, 800, 20);
    
    // Simple button-door puzzle
    const button = new Button(100, 530);
    const door = new Door(400, 400, 20, 100);
    button.connectToDoor(door);
    
    level.addInteractable(button);
    level.addInteractable(door);
    
    // Exit zone
    level.setExitZone(600, 400, 50, 50);
    
    return level;
}

// Level 2: Multi-Button Coordination
function createLevel2() {
    const level = new Level();
    
    // Ground and platforms
    level.addPlatform(0, 550, 800, 50);     // Main floor
    level.addPlatform(150, 450, 100, 20);   // Button platform 1
    level.addPlatform(350, 350, 100, 20);   // Button platform 2
    level.addPlatform(550, 450, 100, 20);   // Button platform 3
    level.addPlatform(600, 250, 150, 20);   // Exit platform
    
    // Walls
    level.addPlatform(0, 0, 20, 600);
    level.addPlatform(780, 0, 20, 600);
    level.addPlatform(0, 0, 800, 20);
    
    // Create three buttons that must be pressed simultaneously
    const button1 = new Button(175, 430);
    const button2 = new Button(375, 330);
    const button3 = new Button(575, 430);
    
    // All buttons control the same door
    const door1 = new Door(500, 200, 20, 100);
    button1.connectToDoor(door1);
    button2.connectToDoor(door1);
    button3.connectToDoor(door1);
    
    // Override door behavior - only opens when ALL buttons are pressed
    const originalUpdate = door1.update.bind(door1);
    door1.update = function() {
        const allPressed = button1.isActive && button2.isActive && button3.isActive;
        this.setOpen(allPressed);
        originalUpdate();
    };
    
    level.addInteractable(button1);
    level.addInteractable(button2);
    level.addInteractable(button3);
    level.addInteractable(door1);
    
    level.setExitZone(650, 200, 50, 50);
    
    return level;
}

// Level 3: Block Puzzles and Timing
function createLevel3() {
    const level = new Level();
    
    // Complex platform layout
    level.addPlatform(0, 550, 800, 50);     // Main floor
    level.addPlatform(100, 450, 80, 20);    // First platform
    level.addPlatform(250, 380, 80, 20);    // Second platform  
    level.addPlatform(400, 300, 80, 20);    // Third platform
    level.addPlatform(600, 450, 100, 20);   // Block destination
    level.addPlatform(650, 200, 100, 20);   // Exit platform
    
    // Walls
    level.addPlatform(0, 0, 20, 600);
    level.addPlatform(780, 0, 20, 600);
    level.addPlatform(0, 0, 800, 20);
    
    // Movable blocks for puzzle solving
    const block1 = new MovableBlock(120, 410);
    const block2 = new MovableBlock(270, 340);
    
    // Buttons that require blocks to be placed on them
    const button1 = new Button(620, 530);    // Ground level button
    const button2 = new Button(620, 430);    // Platform button (needs block)
    
    // Sequential doors
    const door1 = new Door(300, 250, 20, 100);  // First door
    const door2 = new Door(550, 350, 20, 100);  // Second door
    
    button1.connectToDoor(door1);
    button2.connectToDoor(door2);
    button2.requiredHoldTime = 3000; // 3 seconds
    
    level.addInteractable(block1);
    level.addInteractable(block2);
    level.addInteractable(button1);
    level.addInteractable(button2);
    level.addInteractable(door1);
    level.addInteractable(door2);
    
    level.setExitZone(680, 150, 50, 50);
    
    return level;
}

// Level 4: Vertical Challenge
function createLevel4() {
    const level = new Level();
    
    // Vertical tower layout
    level.addPlatform(0, 550, 800, 50);     // Ground
    level.addPlatform(100, 480, 100, 20);   // Level 1
    level.addPlatform(300, 410, 100, 20);   // Level 2
    level.addPlatform(500, 340, 100, 20);   // Level 3
    level.addPlatform(300, 270, 100, 20);   // Level 4
    level.addPlatform(100, 200, 100, 20);   // Level 5
    level.addPlatform(500, 130, 100, 20);   // Level 6
    level.addPlatform(650, 60, 100, 20);    // Exit level
    
    // Walls
    level.addPlatform(0, 0, 20, 600);
    level.addPlatform(780, 0, 20, 600);
    level.addPlatform(0, 0, 800, 20);
    
    // Elevator system - multiple doors that open in sequence
    const button1 = new Button(125, 460);   // Bottom button
    const button2 = new Button(325, 390);   // Mid button
    const button3 = new Button(125, 180);   // Top button
    
    const door1 = new Door(250, 430, 20, 70);   // Blocks path to level 2
    const door2 = new Door(450, 290, 20, 70);   // Blocks path to level 4
    const door3 = new Door(450, 80, 20, 70);    // Blocks path to exit
    
    button1.connectToDoor(door1);
    button2.connectToDoor(door2);
    button3.connectToDoor(door3);
    
    // Long hold requirements
    button1.requiredHoldTime = 2000;
    button2.requiredHoldTime = 4000;
    button3.requiredHoldTime = 1000;
    
    level.addInteractable(button1);
    level.addInteractable(button2);
    level.addInteractable(button3);
    level.addInteractable(door1);
    level.addInteractable(door2);
    level.addInteractable(door3);
    
    level.setExitZone(675, 10, 50, 50);
    
    return level;
}

// Level 5: Master Challenge - Complex Multi-Phase Puzzle
function createLevel5() {
    const level = new Level();
    
    // Complex multi-area layout
    level.addPlatform(0, 550, 800, 50);     // Ground
    
    // Left area
    level.addPlatform(50, 450, 150, 20);    // Left platform
    level.addPlatform(50, 350, 80, 20);     // Left upper
    
    // Center area  
    level.addPlatform(300, 480, 200, 20);   // Center main
    level.addPlatform(350, 380, 100, 20);   // Center upper
    level.addPlatform(250, 280, 300, 20);   // Bridge
    
    // Right area
    level.addPlatform(600, 450, 150, 20);   // Right platform
    level.addPlatform(670, 350, 80, 20);    // Right upper
    level.addPlatform(620, 180, 130, 20);   // Exit area
    
    // Walls and barriers
    level.addPlatform(0, 0, 20, 600);
    level.addPlatform(780, 0, 20, 600);
    level.addPlatform(0, 0, 800, 20);
    level.addPlatform(220, 300, 20, 250);   // Left barrier
    level.addPlatform(560, 300, 20, 250);   // Right barrier
    
    // Multiple movable blocks
    const block1 = new MovableBlock(75, 410);
    const block2 = new MovableBlock(325, 440);
    const block3 = new MovableBlock(625, 410);
    const block4 = new MovableBlock(400, 240);
    
    // Phase 1: Open access to center
    const button1 = new Button(100, 430);
    const door1 = new Door(220, 500, 20, 50);  // Left barrier door
    button1.connectToDoor(door1);
    
    // Phase 2: Coordination puzzle in center
    const button2 = new Button(375, 360);       // Center button
    const button3 = new Button(75, 330);        // Left upper button
    const door2 = new Door(400, 230, 20, 50);   // Bridge access
    button2.connectToDoor(door2);
    button3.connectToDoor(door2);
    
    // Phase 3: Open access to right area
    const button4 = new Button(400, 260);       // Bridge button
    const door3 = new Door(560, 500, 20, 50);   // Right barrier door
    button4.connectToDoor(door3);
    
    // Final phase: Complex timing puzzle
    const button5 = new Button(695, 330);       // Right upper
    const button6 = new Button(125, 530);       // Ground left  
    const button7 = new Button(675, 530);       // Ground right
    const finalDoor = new Door(570, 130, 20, 50); // Exit door
    
    button5.connectToDoor(finalDoor);
    button6.connectToDoor(finalDoor);
    button7.connectToDoor(finalDoor);
    
    // All final buttons must be held simultaneously
    const originalFinalDoorUpdate = finalDoor.update.bind(finalDoor);
    finalDoor.update = function() {
        const allPressed = button5.isActive && button6.isActive && button7.isActive;
        this.setOpen(allPressed);
        originalFinalDoorUpdate();
    };
    
    // Set long hold times for difficulty
    button2.requiredHoldTime = 3000;
    button4.requiredHoldTime = 2000;
    button5.requiredHoldTime = 1000;
    button6.requiredHoldTime = 1000;
    button7.requiredHoldTime = 1000;
    
    // Add all interactables
    level.addInteractable(block1);
    level.addInteractable(block2);
    level.addInteractable(block3);
    level.addInteractable(block4);
    level.addInteractable(button1);
    level.addInteractable(button2);
    level.addInteractable(button3);
    level.addInteractable(button4);
    level.addInteractable(button5);
    level.addInteractable(button6);
    level.addInteractable(button7);
    level.addInteractable(door1);
    level.addInteractable(door2);
    level.addInteractable(door3);
    level.addInteractable(finalDoor);
    
    level.setExitZone(650, 130, 50, 50);
    
    return level;
}
