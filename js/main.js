// Main entry point
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // Disable context menu on canvas
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Initialize game
    const game = new Game(canvas);
    
    // Initialize level editor
    window.levelEditor = new LevelEditor(game, canvas);
    
    // Wire editor UI controls
    const toggleBtn = document.getElementById('toggleEditorBtn');
    const toolSelect = document.getElementById('editorTool');
    const newLevelBtn = document.getElementById('newLevelBtn');
    const playtestBtn = document.getElementById('playtestBtn');
    const saveLocalBtn = document.getElementById('saveLocalBtn');
    const loadLocalBtn = document.getElementById('loadLocalBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    function updateToggleText() {
        toggleBtn.textContent = `Edit: ${window.levelEditor.active ? 'ON' : 'OFF'}`;
    }

    toggleBtn.addEventListener('click', () => {
        window.levelEditor.active = !window.levelEditor.active;
        updateToggleText();
    });
    updateToggleText();

    toolSelect.addEventListener('change', () => {
        window.levelEditor.setTool(toolSelect.value);
    });

    newLevelBtn.addEventListener('click', () => {
        window.levelEditor.newLevel();
    });

    playtestBtn.addEventListener('click', () => {
        window.levelEditor.active = false;
        updateToggleText();
        // Reset and playtest current level
        window.levelEditor.applyLevelToGame();
    });

    saveLocalBtn.addEventListener('click', () => {
        window.levelEditor.saveToLocalStorage();
    });

    loadLocalBtn.addEventListener('click', () => {
        window.levelEditor.loadFromLocalStorage();
    });

    exportBtn.addEventListener('click', () => {
        window.levelEditor.exportJSON();
    });

    importBtn.addEventListener('click', () => {
        importFile.click();
    });
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                window.levelEditor.importJSON(data);
            } catch (err) {
                console.error('Failed to import level JSON', err);
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be chosen again later
        e.target.value = '';
    });

    // Keyboard toggle for editor (F2)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'F2') {
            window.levelEditor.active = !window.levelEditor.active;
            updateToggleText();
        }
    });
    
    // Add global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Prevent default behavior for game keys
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyR', 'KeyT'].includes(e.code)) {
            e.preventDefault();
        }
    });
    
    // Handle window focus/blur for pause functionality
    let wasPaused = false;
    
    window.addEventListener('blur', () => {
        wasPaused = game.gameState === 'paused';
        if (game.gameState === 'playing') {
            // Optional: Auto-pause when window loses focus
            // game.gameState = 'paused';
        }
    });
    
    window.addEventListener('focus', () => {
        if (!wasPaused && game.gameState === 'paused') {
            game.gameState = 'playing';
        }
    });
    
    // Handle window resize
    function handleResize() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Optional: Implement responsive canvas sizing
        // For now, keep fixed size as defined in HTML
    }
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Add debug information in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Paradox Protocol - Debug Mode');
        console.log('Controls:');
        console.log('  WASD/Arrow Keys: Move');
        console.log('  Space: Jump');
        console.log('  E: Interact');
        console.log('  R: Reset current loop');
        console.log('  T: Reset all loops');
        
        // Expose game instance for debugging
        window.game = game;
    }
    
    // Add touch controls for mobile (basic implementation)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        touchEndX = touch.clientX;
        touchEndY = touch.clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const threshold = 30;
        
        // Simple gesture detection
        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0) {
                    // Swipe right - move right
                    game.inputManager.keys['KeyD'] = true;
                    setTimeout(() => game.inputManager.keys['KeyD'] = false, 200);
                } else {
                    // Swipe left - move left
                    game.inputManager.keys['KeyA'] = true;
                    setTimeout(() => game.inputManager.keys['KeyA'] = false, 200);
                }
            } else {
                // Vertical swipe
                if (deltaY < 0) {
                    // Swipe up - jump
                    game.inputManager.keysPressed['Space'] = true;
                }
            }
        } else {
            // Tap - interact
            game.inputManager.keysPressed['KeyE'] = true;
        }
    });
    
    // Prevent scrolling on mobile
    document.body.addEventListener('touchstart', (e) => {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.body.addEventListener('touchend', (e) => {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.body.addEventListener('touchmove', (e) => {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
});
