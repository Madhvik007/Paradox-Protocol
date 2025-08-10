// Main game class
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.inputManager = new InputManager();
        this.collisionSystem = new CollisionSystem();
        this.recorder = new ActionRecorder();
        
        // Game state
        this.currentLevel = null;
        this.currentLevelIndex = 0;
        this.levels = [];
        this.player = null;
        this.ghosts = [];
        this.currentLoop = 1;
        this.loopStartTime = 0;
        this.loopDuration = GAME_CONFIG.LOOP_DURATION;
        this.gameState = 'playing'; // 'playing', 'paused', 'completed'
        
        // UI elements
        this.timerElement = document.getElementById('timer');
        this.progressElement = document.getElementById('progressFill');
        this.loopCounterElement = document.getElementById('loopCounter');
        this.paradoxWarningElement = document.getElementById('paradoxWarning');
        
        // Paradox detection
        this.paradoxWarning = false;
        
        this.init();
    }
    
    init() {
        // Initialize levels
        this.initializeLevels();
        
        // Create current level
        this.currentLevelIndex = 0;
        this.currentLevel = this.levels[0]();
        
        // Create player
        this.player = new Player(
            this.currentLevel.playerSpawn.x,
            this.currentLevel.playerSpawn.y
        );
        
        // Setup collision system
        this.setupCollisionSystem();
        
        // Start first loop
        this.startNewLoop();
        
        // Try to load previous recordings
        this.recorder.loadFromStorage();
        
        // Start game loop
        this.gameLoop();
    }
    
    initializeLevels() {
        this.levels = [
            createTutorialLevel,
            createLevel2,
            createLevel3,
            createLevel4,
            createLevel5
        ];
        
        // Verify all level functions exist
        this.levels.forEach((levelFunc, index) => {
            if (typeof levelFunc !== 'function') {
                console.error(`Level ${index + 1} function is not defined!`);
            } else {
                console.log(`Level ${index + 1} function verified`);
            }
        });
    }
    
    loadLevel(levelIndex) {
        if (levelIndex >= 0 && levelIndex < this.levels.length) {
            this.currentLevelIndex = levelIndex;
            this.currentLevel = this.levels[levelIndex]();
            
            // Only reset if this is not the initial load
            if (this.player) {
                // Clear all recordings and ghosts for new level to prevent storage issues
                this.recorder.clearRecordings();
                this.ghosts = [];
                this.currentLoop = 1;
                
                // Reset player position
                this.player.position = this.currentLevel.playerSpawn.copy();
                this.player.velocity = new Vector2(0, 0);
                this.player.isActive = true;
                
                // Setup collision system for new level
                this.setupCollisionSystem();
                
                // Start fresh
                this.startNewLoop();
            }
            
            return true;
        }
        return false;
    }
    
    nextLevel() {
        console.log(`Current level: ${this.currentLevelIndex}, Total levels: ${this.levels.length}`);
        
        if (this.currentLevelIndex < this.levels.length - 1) {
            const nextLevelIndex = this.currentLevelIndex + 1;
            console.log(`Loading level ${nextLevelIndex + 1}`);
            
            try {
                // Manually set up the next level instead of calling loadLevel
                this.currentLevelIndex = nextLevelIndex;
                this.currentLevel = this.levels[nextLevelIndex]();
                
                // Clear state
                this.recorder.clearRecordings();
                this.ghosts = [];
                this.currentLoop = 1;
                this.gameState = 'playing';
                
                // Reset player
                if (this.player && this.currentLevel) {
                    this.player.position = this.currentLevel.playerSpawn.copy();
                    this.player.velocity = new Vector2(0, 0);
                    this.player.isActive = true;
                }
                
                // Setup collision system
                this.setupCollisionSystem();
                
                // Start new loop
                this.startNewLoop();
                
                console.log(`Successfully loaded level ${nextLevelIndex + 1}`);
                return true;
            } catch (error) {
                console.error('Error loading next level:', error);
                return false;
            }
        } else {
            console.log('Already at the last level');
            return false; // No more levels
        }
    }
    
    setupCollisionSystem() {
        try {
            // Clear existing bodies
            this.collisionSystem.staticBodies = [];
            
            // Add level collision bodies
            if (this.currentLevel && this.currentLevel.getCollisionBodies) {
                const bodies = this.currentLevel.getCollisionBodies();
                bodies.forEach(body => this.collisionSystem.addStaticBody(body));
                console.log(`Added ${bodies.length} collision bodies`);
            } else {
                console.warn('Current level does not have collision bodies');
            }
        } catch (error) {
            console.error('Error setting up collision system:', error);
        }
    }
    
    startNewLoop() {
        console.log('Starting new loop');
        
        this.loopStartTime = Date.now();
        this.gameState = 'playing';
        
        // Reset player to spawn position (only if player exists)
        if (this.player && this.currentLevel && this.currentLevel.playerSpawn) {
            this.player.position = this.currentLevel.playerSpawn.copy();
            this.player.velocity = new Vector2(0, 0);
            this.player.isActive = true;
            console.log('Player reset to spawn position');
        } else {
            console.warn('Player or level spawn point not available');
        }
        
        // Reset all ghosts
        this.ghosts.forEach(ghost => {
            if (ghost && ghost.reset) {
                ghost.reset();
            }
        });
        
        // Start recording
        if (this.recorder) {
            this.recorder.startRecording();
            console.log('Recording started');
        }
        
        // Reset level state
        if (this.currentLevel && this.currentLevel.reset) {
            this.currentLevel.reset();
            console.log('Level state reset');
        }
        
        // Update UI
        this.updateUI();
        
        console.log('New loop started successfully');
    }
    
    endCurrentLoop() {
        // Stop recording
        const recordingIndex = this.recorder.stopRecording();
        
        // Create ghost from recording if successful
        if (recordingIndex >= 0) {
            const recording = this.recorder.getRecording(recordingIndex);
            const ghost = new Ghost(recording, this.currentLoop);
            this.ghosts.push(ghost);
            
            // Limit number of ghosts to prevent memory issues
            const maxGhosts = 15;
            if (this.ghosts.length > maxGhosts) {
                this.ghosts.shift(); // Remove oldest ghost
            }
        }
        
        // Increment loop counter
        this.currentLoop++;
        
        // Save recordings (with built-in limits now)
        this.recorder.saveToStorage();
        
        // Start new loop
        this.startNewLoop();
    }
    
    resetAllLoops() {
        // Clear all recordings and ghosts
        this.recorder.clearRecordings();
        this.ghosts = [];
        this.currentLoop = 1;
        
        // Reset level
        if (this.currentLevel) {
            this.currentLevel.reset();
        }
        
        // Start fresh
        this.startNewLoop();
    }
    
    restartCurrentLoop() {
        // Stop current recording without saving it
        if (this.recorder.isRecording) {
            this.recorder.isRecording = false;
            this.recorder.currentRecording = null;
        }
        
        // Reset game state
        this.gameState = 'playing';
        
        // Reset player to spawn position
        if (this.player && this.currentLevel) {
            this.player.position = this.currentLevel.playerSpawn.copy();
            this.player.velocity = new Vector2(0, 0);
            this.player.isActive = true;
        }
        
        // Reset all ghosts to start of their recordings
        this.ghosts.forEach(ghost => {
            if (ghost && ghost.reset) {
                ghost.reset();
            }
        });
        
        // Reset level state
        this.currentLevel.reset();
        
        // Start recording again for the same loop
        this.loopStartTime = Date.now();
        this.recorder.startRecording();
        
        // Update UI
        this.updateUI();
    }
    
    update() {
        // Handle input even when not playing for resets and level transitions
        
        // Check for manual reset (restart current loop without creating ghost)
        if (this.inputManager.isKeyPressed('KeyR') && this.gameState === 'playing') {
            this.restartCurrentLoop();
            this.inputManager.update(); // Clear input state
            return;
        }
        
        // Check for full reset
        if (this.inputManager.isKeyPressed('KeyT')) {
            if (this.gameState === 'game_completed') {
                // Restart from level 1
                this.loadLevel(0);
            } else {
                // Reset current level
                this.resetAllLoops();
            }
            this.inputManager.update(); // Clear input state
            return;
        }
        
        // Check for next level (debug/skip)
        if (this.inputManager.isKeyPressed('KeyN')) {
            console.log('N key pressed, attempting to go to next level');
            
            // Simple direct level switch
            if (this.currentLevelIndex < this.levels.length - 1) {
                this.currentLevelIndex++;
                console.log(`Switching to level ${this.currentLevelIndex + 1}`);
                
                // Reset everything for new level
                this.recorder.clearRecordings();
                this.ghosts = [];
                this.currentLoop = 1;
                this.gameState = 'playing';
                
                // Create new level
                if (typeof this.levels[this.currentLevelIndex] === 'function') {
                    this.currentLevel = this.levels[this.currentLevelIndex]();
                    
                    // Reset player position
                    if (this.player && this.currentLevel && this.currentLevel.playerSpawn) {
                        this.player.position = this.currentLevel.playerSpawn.copy();
                        this.player.velocity = new Vector2(0, 0);
                        this.player.isActive = true;
                    }
                    
                    // Setup collision system
                    this.setupCollisionSystem();
                    
                    // Start new loop
                    this.loopStartTime = Date.now();
                    if (this.recorder) {
                        this.recorder.startRecording();
                    }
                    if (this.currentLevel && this.currentLevel.reset) {
                        this.currentLevel.reset();
                    }
                    
                    console.log(`Successfully switched to level ${this.currentLevelIndex + 1}`);
                } else {
                    console.error(`Level ${this.currentLevelIndex + 1} function not found!`);
                    this.currentLevelIndex--; // Revert
                }
            } else {
                console.log('Already at the last level');
                this.inputManager.update(); // Clear input state
                return;
            }
            this.inputManager.update(); // Clear input state
            return;
        }
        
        // Only continue with normal game logic if playing
        if (this.gameState !== 'playing') {
            this.inputManager.update();
            return;
        }
        
        // Check loop timer
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.loopStartTime;
        
        if (elapsedTime >= this.loopDuration) {
            this.endCurrentLoop();
            return;
        }
        
        // Update player
        this.player.handleInput(this.inputManager);
        this.collisionSystem.updateBody(this.player, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        // Update ghosts
        this.ghosts.forEach(ghost => ghost.update());
        
        // Handle interactions
        this.handleInteractions();
        
        // Update level
        this.currentLevel.update(this.collisionSystem);
        
        // Check win condition
        if (this.currentLevel.checkWinCondition(this.player)) {
            if (this.currentLevelIndex < this.levels.length - 1) {
                // More levels available, go to next level
                setTimeout(() => {
                    this.nextLevel();
                }, 2000); // 2 second delay to show completion message
                this.gameState = 'level_completed';
            } else {
                // All levels completed
                this.gameState = 'game_completed';
            }
        }
        
        // Record current frame
        const currentInteractions = this.getCurrentInteractions();
        this.recorder.recordFrame(this.player, currentInteractions);
        
        // Update UI
        this.updateUI();
        
        // Update input manager
        this.inputManager.update();
    }
    
    handleInteractions() {
        // Reset all interaction states
        this.currentLevel.interactables.forEach(obj => {
            if (obj instanceof Button || obj instanceof MovableBlock) {
                obj.activatedBy = [];
                obj.beingPushed = false;
            }
        });
        
        // Check player interactions
        if (this.inputManager.isKeyDown('KeyE')) {
            this.checkActorInteractions(this.player);
        }
        
        // Check ghost interactions
        this.ghosts.forEach(ghost => {
            if (ghost.isActive) {
                this.checkActorInteractions(ghost);
            }
        });
    }
    
    checkActorInteractions(actor) {
        this.currentLevel.interactables.forEach(obj => {
            if (actor.canInteractWith(obj)) {
                obj.interact(actor);
            }
        });
    }
    
    getCurrentInteractions() {
        const interactions = [];
        
        this.currentLevel.interactables.forEach((obj, index) => {
            if (obj.activatedBy.includes(this.player)) {
                interactions.push({
                    type: obj.type,
                    index: index,
                    state: obj.getState()
                });
            }
        });
        
        return interactions;
    }
    
    updateUI() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.loopStartTime;
        const remainingTime = Math.max(0, this.loopDuration - elapsedTime);
        
        // Update timer
        this.timerElement.textContent = formatTime(remainingTime);
        
        // Update progress bar
        const progress = (elapsedTime / this.loopDuration) * 100;
        this.progressElement.style.width = `${Math.min(progress, 100)}%`;
        
        // Update loop counter with level info
        this.loopCounterElement.textContent = `Level ${this.currentLevelIndex + 1} - Loop: ${this.currentLoop}`;
        
        // Handle paradox warning
        if (this.paradoxWarning) {
            this.paradoxWarningElement.classList.remove('hidden');
        } else {
            this.paradoxWarningElement.classList.add('hidden');
        }
        
        // Game state messages
        if (this.gameState === 'level_completed') {
            this.timerElement.textContent = 'LEVEL COMPLETED!';
            this.timerElement.style.color = '#00ff00';
        } else if (this.gameState === 'game_completed') {
            this.timerElement.textContent = 'ALL LEVELS COMPLETED!';
            this.timerElement.style.color = '#gold';
        } else {
            this.timerElement.style.color = '';
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render level
        this.currentLevel.render(this.ctx);
        
        // Render ghosts
        this.ghosts.forEach(ghost => ghost.render(this.ctx));
        
        // Render player
        this.player.render(this.ctx);
        
        // Render interaction prompts
        this.renderInteractionPrompts();
        
        // Render game completed message
        if (this.gameState === 'level_completed' || this.gameState === 'game_completed') {
            this.renderCompletedMessage();
        }
        
        // Editor overlay (if available)
        if (window.levelEditor && typeof window.levelEditor.renderOverlay === 'function' && window.levelEditor.active) {
            window.levelEditor.renderOverlay(this.ctx);
        }
    }
    
    renderInteractionPrompts() {
        this.currentLevel.interactables.forEach(obj => {
            if (this.player.canInteractWith(obj)) {
                const x = obj.bounds.centerX;
                const y = obj.bounds.y - 20;
                
                this.ctx.save();
                this.ctx.font = '12px Courier New';
                this.ctx.fillStyle = '#ffff00';
                this.ctx.textAlign = 'center';
                this.ctx.shadowColor = '#ffff00';
                this.ctx.shadowBlur = 3;
                this.ctx.fillText('[E] Interact', x, y);
                this.ctx.restore();
            }
        });
    }
    
    renderCompletedMessage() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Semi-transparent overlay
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Completion message
        if (this.gameState === 'level_completed') {
            drawText(this.ctx, 'LEVEL COMPLETED!', centerX, centerY - 40, 32, '#00ff00');
            drawText(this.ctx, `Level ${this.currentLevelIndex + 1} completed in ${this.currentLoop} loops`, centerX, centerY, 16, '#ffffff');
            drawText(this.ctx, 'Loading next level...', centerX, centerY + 30, 14, '#aaaaaa');
        } else if (this.gameState === 'game_completed') {
            drawText(this.ctx, 'ALL LEVELS COMPLETED!', centerX, centerY - 40, 32, '#gold');
            drawText(this.ctx, 'Congratulations! You mastered the Paradox Protocol!', centerX, centerY, 16, '#ffffff');
            drawText(this.ctx, 'Press T to restart from Level 1', centerX, centerY + 30, 14, '#aaaaaa');
        }
        
        this.ctx.restore();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}
