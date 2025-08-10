// Recording and playback system
class ActionRecorder {
    constructor() {
        this.isRecording = false;
        this.currentRecording = null;
        this.recordings = [];
        this.frameCounter = 0;
        this.recordInterval = 1; // Record every frame
    }
    
    startRecording() {
        this.isRecording = true;
        this.frameCounter = 0; // Reset frame counter
        this.currentRecording = {
            frames: [],
            interactions: [],
            startTime: Date.now()
        };
    }
    
    stopRecording() {
        if (this.isRecording && this.currentRecording) {
            this.isRecording = false;
            this.recordings.push(this.currentRecording);
            this.currentRecording = null;
            return this.recordings.length - 1; // Return recording index
        }
        return -1;
    }
    
    recordFrame(player, interactions = []) {
        if (!this.isRecording || !this.currentRecording) return;
        
        // Only record every nth frame to reduce storage usage
        this.frameCounter++;
        if (this.frameCounter % this.recordInterval !== 0) return;
        
        const frame = {
            timestamp: Date.now(),
            position: player.position.copy(),
            velocity: player.velocity.copy(),
            onGround: player.onGround,
            isActive: player.isActive,
            interactions: [...interactions]
        };
        
        this.currentRecording.frames.push(frame);
        
        // Limit frames per recording to prevent memory issues
        if (this.currentRecording.frames.length > 1800) { // ~60 seconds at 30fps
            this.currentRecording.frames.shift(); // Remove oldest frame
        }
    }
    
    getRecording(index) {
        return this.recordings[index] || null;
    }
    
    getAllRecordings() {
        return [...this.recordings];
    }
    
    clearRecordings() {
        this.recordings = [];
        this.currentRecording = null;
        this.isRecording = false;
    }
    
    // Save recordings to localStorage
    saveToStorage() {
        try {
            // Limit the number of recordings to prevent storage overflow
            const maxRecordings = 10; // Keep only last 10 recordings
            const recordingsToSave = this.recordings.slice(-maxRecordings);
            
            const data = {
                recordings: recordingsToSave,
                timestamp: Date.now()
            };
            
            const dataString = JSON.stringify(data);
            
            // Check if data is too large (> 4MB, leaving room for other data)
            if (dataString.length > 4 * 1024 * 1024) {
                console.warn('Recordings too large, clearing old data');
                // Keep only the last 5 recordings if still too large
                data.recordings = recordingsToSave.slice(-5);
            }
            
            localStorage.setItem('paradox_recordings', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save recordings to localStorage:', e);
            // Clear localStorage and try with minimal data
            try {
                localStorage.removeItem('paradox_recordings');
                const minimalData = {
                    recordings: [],
                    timestamp: Date.now()
                };
                localStorage.setItem('paradox_recordings', JSON.stringify(minimalData));
            } catch (e2) {
                console.error('Failed to clear and reset localStorage:', e2);
            }
        }
    }
    
    // Load recordings from localStorage
    loadFromStorage() {
        try {
            const data = localStorage.getItem('paradox_recordings');
            if (data) {
                const parsed = JSON.parse(data);
                this.recordings = parsed.recordings || [];
                
                // Convert plain objects back to Vector2 instances
                this.recordings.forEach(recording => {
                    recording.frames.forEach(frame => {
                        frame.position = new Vector2(frame.position.x, frame.position.y);
                        frame.velocity = new Vector2(frame.velocity.x, frame.velocity.y);
                    });
                });
                
                return true;
            }
        } catch (e) {
            console.warn('Failed to load recordings from localStorage:', e);
        }
        return false;
    }
}
