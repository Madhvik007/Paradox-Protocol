````markdown
# Paradox Protocol — Detailed Design & Implementation Guide

---

## Table of Contents
1. [Game Overview](#game-overview)  
2. [Core Gameplay Loop](#core-gameplay-loop)  
3. [Mechanics & Systems](#mechanics--systems)  
   - [Time Loop Timer](#time-loop-timer)  
   - [Ghost Replay System](#ghost-replay-system)  
   - [Player Interactions](#player-interactions)  
   - [Timeline/Paradox System](#timelineparadox-system)  
4. [Example Level Flow](#example-level-flow)  
5. [User Interface & Feedback](#user-interface--feedback)  
6. [Data Structures & Storage](#data-structures--storage)  
7. [Tech Stack & Libraries](#tech-stack--libraries)  
8. [Prototype (MVP) Scope & Roadmap](#prototype-mvp-scope--roadmap)  
9. [Future Expansion & Advanced Features](#future-expansion--advanced-features)  

---

## Game Overview

**Title:** Paradox Protocol  
**Genre:** 2D Puzzle-Platformer with Time-Loop Mechanics  
**Target Platform:** Web (Desktop / Mobile browser)  
**Core Hook:** Solve intricate, multi-layered puzzles by coordinating with “ghost” versions of yourself across repeated 60-second time loops—without causing a paradox.

**High-level Objective:**  
Escape a sabotaged space station room by using past selves (ghosts) to perform time-sensitive tasks in perfect sync.

---

## Core Gameplay Loop

```text
Start Loop → Explore & Act → Timer Hits 0 or Manual Reset → Record Completed → Spawn New Loop → Ghosts Replay → Coordinate → Solve Puzzle → Repeat
````

1. **Start Loop**

   * All existing ghosts start replaying.
   * Player gains control of a new “active self.”

2. **Explore & Act (0–60s)**

   * Move, jump, interact with environment.
   * Record all input events and positions.

3. **Loop End**

   * At 60s (or on manual “reset”): freeze active self, finalize recording.

4. **Ghost Replay**

   * Previous loops’ recordings replay as non-interactive ghost actors.

5. **Coordination**

   * Use ghosts and present self to hold switches, move objects, open doors.

6. **Progress**

   * Upon meeting puzzle conditions, unlock new area or complete objective.

7. **Repeat**

   * Continue next loop with cumulative ghosts until the room is escaped.

---

## Mechanics & Systems

### Time Loop Timer

* **Duration:** 60 seconds per loop.
* **UI:**

  * Digital countdown (mm\:ss).
  * Circular or horizontal progress bar.
* **Behavior:**

  * When 0 is reached (or on player-triggered reset), trigger loop end logic.

---

### Ghost Replay System

* **Recording:**
* **Replaying:**

  * Instantiate a ghost actor for each past loop.
  * Replay recorded frames exactly, including collisions and physics.
  * Render with semi-transparent / shader effect.
* **Labeling:**

  * Display loop index tag (e.g., “Loop 1”) above each ghost.

---

### Player Interactions

| Interaction        | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| **Switch/Button**  | Press & hold; ghost holds to keep door open.                      |
| **Door/Gate**      | Opens when powered or button-held; closes otherwise.              |
| **Movable Block**  | Push/pull to create new platforms or press switches.              |
| **Terminal**       | Activate after delay; ghost can hold sequence of inputs.          |
| **Gravity Toggle** | Flip local gravity for a duration; ghost experiences same effect. |

---

### Timeline/Paradox System

* **Detection:** If a ghost’s recorded action no longer matches the environment (e.g., door is closed when ghost expects it open), flag a paradox.
* **Effects:**

  * **Warning:** Screen glitch, audio distortion.
  * **Soft Fail:** Reset current loop immediately.
  * **Hard Fail:** Roll back all loops (full-level restart).
* **Design Note:** Paradox system can be toggled for “hard” or “soft” puzzles.

---

## Example Level Flow

1. **Goal:** Reach exit door requiring “button held for 5s.”
2. **Loop 1:**

   * Player runs to Button A, holds for 5s, loop ends.
3. **Loop 2:**

   * Ghost from Loop 1 holds Button A.
   * Player runs through now-open Door B → reaching next checkpoint.
4. **Loop 3+:**

   * Introduce second button/lever for next puzzle.

---

## User Interface & Feedback

* **Timer HUD:** Top-center; numeric + progress bar.
* **Ghost Visuals:**

  * Low-alpha fill or scanline shader.
  * Loop number tag above head.
* **Paradox Alerts:**

  * Red flicker border + warning icon when timeline conflict detected.
* **Interaction Prompts:**

  * Contextual “Press \[E] to interact” when near buttons/terminals.

---

## Data Structures & Storage

* **In-Memory Loop Buffer:** Array of frame records for current loop.
* **Persistent Loops List:** Array of all completed loop recordings.
* **Saving (Optional):**

  * Use `localStorage` (key: “paradox\_loops”) or IndexedDB to persist partial progress for reload/resume.

---

## Prototype (MVP) Scope & Roadmap

| Phase       | Features                                                                                | Estimated Effort |
| ----------- | --------------------------------------------------------------------------------------- | ---------------- |
| **Phase 1** | Single room, 60s timer, player movement, one button/door puzzle, ghost recording/replay | 1–2 weeks        |
| **Phase 2** | Multi-ghost support, movable blocks, 2-step puzzles                                     | 1 week           |
| **Phase 3** | Paradox detection, UI polish, shader effects                                            | 1 week           |
| **Phase 4** | Level select menu, save/load support, mobile optimizations                              | 1 week           |
| **Phase 5** | Advanced puzzles (terminals, gravity toggle), narrative elements                        | 2 weeks          |

---

## Future Expansion & Advanced Features

1. **Branching Timelines:** Alternate endings based on paradox management.
2. **Online Co-op Mode:** Real-time multi-player “ghost” synchronization.
3. **Level Editor:** Players craft and share custom loop puzzles.
4. **Procedural Rooms:** Generate puzzles algorithmically for endless replayability.
5. **Narrative Integration:** Logs, audio diaries, and AI-driven anomalies as story beats.

---

*End of Design Document*

```
```
