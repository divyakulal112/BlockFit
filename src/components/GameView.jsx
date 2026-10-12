import { useState, useEffect, useRef, useCallback } from 'react';
import { ICONS, SIZE, SHAPES, THEMES, PARTICLES } from '../constants/gameData';
import { playSound, vibrate } from '../services/audio';

const DRAG_LIFT = 78;

function createInitialBoard(gameMode) {
  const newBoard = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  if (gameMode?.mode === 'level' && gameMode.obstacles > 0) {
    let placed = 0;
    let attempts = 0;
    while (placed < gameMode.obstacles && attempts < 200) {
      attempts++;
      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      if (!newBoard[r][c]) {
        newBoard[r][c] = 'OBSTACLE';
        placed++;
      }
    }
  }
  return newBoard;
}

function shapeDims(cells) {
  let mr = 0;
  let mc = 0;
  for (const [r, c] of cells) {
    mr = Math.max(mr, r);
    mc = Math.max(mc, c);
  }
  return { rows: mr + 1, cols: mc + 1 };
}

export default function GameView({
  profile,
  settings,
  bestScore,
  gameMode,
  onUpdateScore,
  onGameOver,
  onLevelWin,
  onLevelFail,
  onGoHome,
  onOpenSettings,
  onConsumePowerup,
  onAddLifetimePoints,
}) {
  const getThemeColors = useCallback(() => {
    return (THEMES[profile.equipped?.theme] || THEMES.classic).colors;
  }, [profile.equipped?.theme]);

  const getRandomShape = useCallback(() => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const colors = getThemeColors();
    return {
      cells: shape,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }, [getThemeColors]);

  const [board, setBoard] = useState(() => createInitialBoard(gameMode));
  const [tray, setTray] = useState(() => [getRandomShape(), getRandomShape(), getRandomShape()]);
  const [score, setScore] = useState(0);
  const [bombMode, setBombMode] = useState(false);
  const [floatingScore, setFloatingScore] = useState(null);
  const [comboBanner, setComboBanner] = useState(null);
  const [isBoardShaking, setIsBoardShaking] = useState(false);
  const [isBoardFlashing, setIsBoardFlashing] = useState(false);
  const [hintGlowCells, setHintGlowCells] = useState(new Set());
  const [clearingCells, setClearingCells] = useState(new Set());
  const [dragHover, setDragHover] = useState(null);
  const [activeGhost, setActiveGhost] = useState(null);
  const [jigglingPowerup, setJigglingPowerup] = useState(null);

  const boardElRef = useRef(null);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const particleRafRef = useRef(null);
  const dragStateRef = useRef(null);
  const dragCleanupRef = useRef(null);
  const activeTimeoutsRef = useRef(new Set());
  const isGameOverRef = useRef(false);
  const isLevelWonRef = useRef(false);

  // Safe timeout helper that tracks IDs for unmount cleanup
  const safeTimeout = useCallback((fn, delay) => {
    const id = setTimeout(() => {
      activeTimeoutsRef.current.delete(id);
      fn();
    }, delay);
    activeTimeoutsRef.current.add(id);
    return id;
  }, []);

  // Cleanup all timers and animation frames on unmount
  useEffect(() => {
    const timeouts = activeTimeoutsRef.current;
    return () => {
      if (particleRafRef.current) {
        cancelAnimationFrame(particleRafRef.current);
        particleRafRef.current = null;
      }
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
        dragCleanupRef.current = null;
      }
    };
  }, []);

  // Play audio on initial tray delivery
  useEffect(() => {
    playSound('newSet', settings.sound);
  }, [settings.sound]);

  const canPlaceOnBoard = useCallback((b, cells, top, left) => {
    for (const [r, c] of cells) {
      const rr = top + r;
      const cc = left + c;
      if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return false;
      if (b[rr][cc]) return false;
    }
    return true;
  }, []);

  const anyPlacementOnBoard = useCallback((b, cells) => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (canPlaceOnBoard(b, cells, r, c)) return true;
      }
    }
    return false;
  }, [canPlaceOnBoard]);

  const firstPlacementOnBoard = useCallback((b, cells) => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (canPlaceOnBoard(b, cells, r, c)) return { row: r, col: c };
      }
    }
    return null;
  }, [canPlaceOnBoard]);

  // Particle Engine
  const spawnParticles = useCallback((cellRects, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const style = PARTICLES[profile.equipped?.particle]?.name || 'Classic Spark';
    const countEach = style.includes('Fireworks') ? 16 : style.includes('Confetti') ? 14 : style.includes('Star') ? 13 : 11;

    cellRects.forEach(({ x, y, size }) => {
      for (let i = 0; i < countEach; i++) {
        particlesRef.current.push({
          x: x + size / 2,
          y: y + size / 2,
          vx: (Math.random() - 0.5) * 11,
          vy: (Math.random() - 1.1) * 11,
          size: size * 0.24 * (0.6 + Math.random() * 0.9),
          color: style.includes('Confetti')
            ? ['#ff5a3c', '#33e6d8', '#b56bff', '#ffcf4d'][Math.floor(Math.random() * 4)]
            : color,
          life: 1,
          decay: 0.015 + Math.random() * 0.018,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.35,
        });
      }
    });

    if (!particleRafRef.current) {
      const step = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.vy += 0.35;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          p.life -= p.decay;

          if (p.life <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(p.life, 0);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }

        if (particlesRef.current.length > 0) {
          particleRafRef.current = requestAnimationFrame(step);
        } else {
          particleRafRef.current = null;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      particleRafRef.current = requestAnimationFrame(step);
    }
  }, [profile.equipped?.particle]);

  // Adjust canvas size
  useEffect(() => {
    const handleResize = () => {
      if (boardElRef.current && canvasRef.current) {
        canvasRef.current.width = boardElRef.current.clientWidth * 1.4;
        canvasRef.current.height = boardElRef.current.clientHeight * 1.4;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check game over
  const checkAfterMove = useCallback((currentBoard, currentTray, currentScore) => {
    // If level target already achieved or level marked won, do not trigger lose
    if (isLevelWonRef.current || (gameMode?.mode === 'level' && currentScore >= gameMode.target)) {
      return;
    }

    let hasMove = false;
    for (const piece of currentTray) {
      if (piece && anyPlacementOnBoard(currentBoard, piece.cells)) {
        hasMove = true;
        break;
      }
    }

    if (!hasMove) {
      isGameOverRef.current = true;
      if (gameMode?.mode === 'endless') {
        const earned = Math.floor(currentScore / 18);
        playSound('lose', settings.sound);
        safeTimeout(() => {
          onGameOver(currentScore, earned);
        }, 320);
      } else {
        playSound('lose', settings.sound);
        safeTimeout(() => {
          onLevelFail(currentScore, gameMode.target);
        }, 320);
      }
    }
  }, [anyPlacementOnBoard, gameMode, onGameOver, onLevelFail, safeTimeout, settings.sound]);

  // Clear completed rows/cols
  const clearCompletedLines = useCallback((newBoard, currentScore) => {
    const fullRows = [];
    const fullCols = [];

    for (let r = 0; r < SIZE; r++) {
      if (newBoard[r].every((v) => v !== null)) fullRows.push(r);
    }
    for (let c = 0; c < SIZE; c++) {
      let full = true;
      for (let r = 0; r < SIZE; r++) {
        if (!newBoard[r][c]) {
          full = false;
          break;
        }
      }
      if (full) fullCols.push(c);
    }

    if (fullRows.length === 0 && fullCols.length === 0) {
      return { board: newBoard, effectiveBoard: newBoard, score: currentScore, cleared: false };
    }

    const boardEl = boardElRef.current;
    let cellSize = 40;
    let boardWidth = 320;
    if (boardEl) {
      const rect = boardEl.getBoundingClientRect();
      const padding = 9;
      const gap = 5;
      cellSize = (rect.width - padding * 2 - gap * 7) / SIZE + gap;
      boardWidth = rect.width;
    }

    const cellsToClear = new Map();
    fullRows.forEach((r) => {
      for (let c = 0; c < SIZE; c++) cellsToClear.set(`${r},${c}`, newBoard[r][c]);
    });
    fullCols.forEach((c) => {
      for (let r = 0; r < SIZE; r++) cellsToClear.set(`${r},${c}`, newBoard[r][c]);
    });

    const rects = [];
    const clearSet = new Set();
    // effectiveBoard represents the board with cleared lines freed up
    const effectiveBoard = newBoard.map((row) => [...row]);

    cellsToClear.forEach((v, key) => {
      const [r, c] = key.split(',').map(Number);
      clearSet.add(`${r},${c}`);
      effectiveBoard[r][c] = null;
      rects.push({
        x: c * cellSize + boardWidth * 0.2,
        y: r * cellSize + boardWidth * 0.2,
        size: cellSize,
        color: v === 'OBSTACLE' ? '#888' : v,
      });
    });

    const lines = fullRows.length + fullCols.length;
    setClearingCells(clearSet);

    spawnParticles(rects, rects[0] ? rects[0].color : '#ff6b4a');
    playSound('clear', settings.sound, { lines });
    vibrate(lines > 1 ? [10, 30, 10, 30, 20] : [15, 20, 15], settings.haptics);

    if (lines > 1) {
      setIsBoardShaking(true);
      safeTimeout(() => setIsBoardShaking(false), 350);

      const labels = { 2: 'DOUBLE!', 3: 'TRIPLE!', 4: 'MEGA!' };
      setComboBanner(labels[lines] || 'LEGENDARY!');
      safeTimeout(() => setComboBanner(null), 750);
    }

    setIsBoardFlashing(true);
    safeTimeout(() => setIsBoardFlashing(false), 460);

    const bonus = cellsToClear.size * 2 + (lines - 1) * 14;
    const addedScore = Math.max(bonus, 0);
    const updatedScore = currentScore + addedScore;

    setFloatingScore(`+${addedScore}`);
    safeTimeout(() => setFloatingScore(null), 1000);

    onAddLifetimePoints(addedScore);

    // Apply clearance after animation
    safeTimeout(() => {
      setBoard((prev) => {
        const next = prev.map((row) => [...row]);
        cellsToClear.forEach((_, key) => {
          const [r, c] = key.split(',').map(Number);
          next[r][c] = null;
        });
        return next;
      });
      setClearingCells(new Set());
    }, 300);

    return { board: newBoard, effectiveBoard, score: updatedScore, cleared: true };
  }, [onAddLifetimePoints, safeTimeout, settings.haptics, settings.sound, spawnParticles]);

  // Check level win
  useEffect(() => {
    if (gameMode?.mode === 'level' && !isLevelWonRef.current && score >= gameMode.target) {
      isLevelWonRef.current = true;
      playSound('levelWin', settings.sound);

      let stars = 1;
      if (score >= gameMode.target * 2) stars = 3;
      else if (score >= gameMode.target * 1.5) stars = 2;

      safeTimeout(() => {
        onLevelWin(gameMode.levelId, score, stars, gameMode.reward);
      }, 450);
    }
  }, [gameMode, onLevelWin, safeTimeout, score, settings.sound]);

  // Target Cell Calculation
  const getTargetCell = (x, y, dragState) => {
    const { cellSize, rows, cols, boardRect } = dragState;
    const anchorX = x - (cellSize * cols) / 2;
    const anchorY = y - DRAG_LIFT - cellSize * rows;
    const relX = anchorX - boardRect.left - 9;
    const relY = anchorY - boardRect.top - 9;
    return {
      row: Math.round(relY / cellSize),
      col: Math.round(relX / cellSize),
    };
  };

  // Drag and Drop Logic
  const handleTrayPointerDown = (e, idx) => {
    if (isGameOverRef.current || isLevelWonRef.current || bombMode) return;
    const piece = tray[idx];
    if (!piece) return;

    e.preventDefault();
    playSound('pick', settings.sound);

    const boardEl = boardElRef.current;
    if (!boardEl) return;
    const boardRect = boardEl.getBoundingClientRect();
    const cellSize = (boardRect.width - 8) / SIZE;
    const { rows, cols } = shapeDims(piece.cells);

    const dragState = {
      idx,
      piece,
      cellSize,
      rows,
      cols,
      boardRect,
      active: true,
    };
    dragStateRef.current = dragState;

    // Set initial ghost
    setActiveGhost({
      piece,
      x: e.clientX - (cellSize * cols) / 2,
      y: e.clientY - DRAG_LIFT - cellSize * rows,
      cellSize,
      rows,
      cols,
    });

    const updateHints = (cx, cy) => {
      const { row, col } = getTargetCell(cx, cy, dragState);
      const valid = canPlaceOnBoard(board, piece.cells, row, col);
      const hoverCells = [];
      for (const [r, c] of piece.cells) {
        const rr = row + r;
        const cc = col + c;
        if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) {
          hoverCells.push(`${rr},${cc}`);
        }
      }
      setDragHover({ valid, cells: hoverCells });
    };

    updateHints(e.clientX, e.clientY);

    const onPointerMove = (ev) => {
      if (!dragStateRef.current?.active) return;
      setActiveGhost({
        piece,
        x: ev.clientX - (cellSize * cols) / 2,
        y: ev.clientY - DRAG_LIFT - cellSize * rows,
        cellSize,
        rows,
        cols,
      });
      updateHints(ev.clientX, ev.clientY);
    };

    const cleanupDragListeners = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      dragCleanupRef.current = null;
    };

    const onPointerUp = (ev) => {
      cleanupDragListeners();
      setDragHover(null);
      setActiveGhost(null);

      if (!dragStateRef.current?.active) return;
      const { row, col } = getTargetCell(ev.clientX, ev.clientY, dragStateRef.current);

      if (canPlaceOnBoard(board, piece.cells, row, col)) {
        playSound('place', settings.sound);
        vibrate(12, settings.haptics);

        // Place piece
        const nextBoard = board.map((r) => [...r]);
        for (const [r, c] of piece.cells) {
          nextBoard[row + r][col + c] = piece.color;
        }

        const addedScore = piece.cells.length;
        const newScore = score + addedScore;
        setScore(newScore);
        onUpdateScore(newScore);
        onAddLifetimePoints(addedScore);

        // Remove from tray
        const nextTray = [...tray];
        nextTray[idx] = null;

        // Clear completed lines
        const clearResult = clearCompletedLines(nextBoard, newScore);
        const finalScore = clearResult.score;
        setBoard(nextBoard);
        setScore(finalScore);
        onUpdateScore(finalScore);

        // Fill tray if all slots empty
        let currentTray = nextTray;
        if (nextTray.every((p) => p === null)) {
          currentTray = [getRandomShape(), getRandomShape(), getRandomShape()];
          setTray(currentTray);
          playSound('newSet', settings.sound);
        } else {
          setTray(nextTray);
        }

        // Check if game continues (use effectiveBoard which has cleared rows freed)
        checkAfterMove(clearResult.effectiveBoard, currentTray, finalScore);
      }

      dragStateRef.current = null;
    };

    const onPointerCancel = () => {
      cleanupDragListeners();
      setDragHover(null);
      setActiveGhost(null);
      dragStateRef.current = null;
    };

    dragCleanupRef.current = cleanupDragListeners;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  };

  // Bomb Placement Click
  const handleBoardPointerDown = (e) => {
    if (!bombMode || (profile.powerups?.bomb || 0) <= 0) return;
    const boardEl = boardElRef.current;
    if (!boardEl) return;

    let row;
    let col;

    // Direct cell click detection
    const cellEl = e.target.closest('.cell');
    if (cellEl && cellEl.dataset.r !== undefined && cellEl.dataset.c !== undefined) {
      row = parseInt(cellEl.dataset.r, 10);
      col = parseInt(cellEl.dataset.c, 10);
    } else {
      const rect = boardEl.getBoundingClientRect();
      const padding = 9;
      const gap = 5;
      const cellSize = (rect.width - padding * 2 - gap * 7) / SIZE + gap;
      col = Math.floor((e.clientX - rect.left - padding) / cellSize);
      row = Math.floor((e.clientY - rect.top - padding) / cellSize);
    }

    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;

    onConsumePowerup('bomb');
    setBombMode(false);

    const rect = boardEl.getBoundingClientRect();
    const padding = 9;
    const gap = 5;
    const cellSize = (rect.width - padding * 2 - gap * 7) / SIZE + gap;

    const nextBoard = board.map((r) => [...r]);
    const rects = [];

    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
        if (nextBoard[r][c]) {
          const color = nextBoard[r][c] === 'OBSTACLE' ? '#888' : nextBoard[r][c];
          rects.push({
            x: c * cellSize + rect.width * 0.2,
            y: r * cellSize + rect.height * 0.2,
            size: cellSize,
            color,
          });
          nextBoard[r][c] = null;
        }
      }
    }

    setBoard(nextBoard);
    if (rects.length) spawnParticles(rects, rects[0].color);
    playSound('clear', settings.sound, { lines: 1 });
    vibrate([20, 30, 20], settings.haptics);

    setIsBoardShaking(true);
    safeTimeout(() => setIsBoardShaking(false), 350);

    checkAfterMove(nextBoard, tray, score);
  };

  // Power-up triggers
  const handleUsePowerup = (kind) => {
    if (isGameOverRef.current || isLevelWonRef.current) return;

    if ((profile.powerups?.[kind] || 0) <= 0) {
      setJigglingPowerup(kind);
      safeTimeout(() => setJigglingPowerup(null), 160);
      return;
    }

    if (kind === 'shuffle') {
      onConsumePowerup('shuffle');
      const nextTray = tray.map((p) => (p ? getRandomShape() : p));
      setTray(nextTray);
      playSound('newSet', settings.sound);
      vibrate(10, settings.haptics);
    } else if (kind === 'bomb') {
      setBombMode((prev) => !prev);
    } else if (kind === 'hint') {
      // Find the first piece in tray that can be placed on the board
      let targetPiece = null;
      let spot = null;
      for (const p of tray) {
        if (p) {
          const s = firstPlacementOnBoard(board, p.cells);
          if (s) {
            targetPiece = p;
            spot = s;
            break;
          }
        }
      }

      if (targetPiece && spot) {
        onConsumePowerup('hint');
        playSound('powerup', settings.sound);

        const glowSet = new Set();
        for (const [r, c] of targetPiece.cells) {
          const rr = spot.row + r;
          const cc = spot.col + c;
          if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) {
            glowSet.add(`${rr},${cc}`);
          }
        }
        setHintGlowCells(glowSet);
        safeTimeout(() => setHintGlowCells(new Set()), 1400);
      } else {
        // No moves exist for any piece in tray
        setJigglingPowerup('hint');
        safeTimeout(() => setJigglingPowerup(null), 160);
      }
    }
  };

  const targetPct =
    gameMode?.mode === 'level'
      ? Math.min(100, Math.round((score / gameMode.target) * 100))
      : 0;

  return (
    <div className="screen active" id="screen-game">
      <div className="level-label" id="levelLabel">
        <span>{gameMode?.mode === 'level' ? `LEVEL ${gameMode.levelId}` : 'ENDLESS MODE'}</span>
      </div>

      <div className="game-topbar">
        <button
          className="icon-btn"
          id="btnGameHome"
          onClick={onGoHome}
          aria-label="Home"
          dangerouslySetInnerHTML={{ __html: ICONS.home }}
        />
        <div className="score-cluster">
          <div className="score-box">
            <div className="label">Score</div>
            <div className="value" id="score">
              {score}
            </div>
          </div>
          <div className="score-box">
            <div className="label">Best</div>
            <div className="value" id="best">
              {Math.max(score, bestScore)}
            </div>
          </div>
        </div>
        <button
          className="icon-btn"
          id="btnGameMenu"
          onClick={onOpenSettings}
          aria-label="Settings"
          dangerouslySetInnerHTML={{ __html: ICONS.gear }}
        />
      </div>

      {gameMode?.mode === 'level' && (
        <div className="target-bar-wrap" id="targetBarWrap">
          <div className="target-bar">
            <div
              className="target-bar-fill"
              id="targetBarFill"
              style={{ width: `${targetPct}%` }}
            />
          </div>
          <div className="target-label" id="targetLabel">
            {score} / {gameMode.target}
          </div>
        </div>
      )}

      <div
        id="board-perspective"
        className={isBoardShaking ? 'shake' : ''}
      >
        <div id="board-wrap">
          <div id="board" ref={boardElRef} onPointerDown={handleBoardPointerDown}>
            {board.map((row, r) =>
              row.map((val, c) => {
                const key = `${r},${c}`;
                const isObstacle = val === 'OBSTACLE';
                const isFilled = val && !isObstacle;
                const isClearing = clearingCells.has(key);
                const isHintGlow = hintGlowCells.has(key);

                let hintClass = '';
                if (dragHover?.cells.includes(key)) {
                  hintClass = dragHover.valid ? ' hint-valid' : ' hint-invalid';
                }

                return (
                  <div
                    key={key}
                    className={`cell${isFilled ? ' filled' : ''}${isObstacle ? ' obstacle' : ''}${isClearing ? ' clearing' : ''}${isHintGlow ? ' hint-glow' : ''}${hintClass}`}
                    style={isFilled ? { background: val } : {}}
                    data-r={r}
                    data-c={c}
                  />
                );
              })
            )}
          </div>
          <canvas id="particle-canvas" ref={canvasRef} />
          {isBoardFlashing && <div className="board-flash" />}
          {floatingScore && <div className="float-score">{floatingScore}</div>}
          {comboBanner && <div className="combo-text">{comboBanner}</div>}
        </div>
      </div>

      <div id="powerup-bar">
        {[
          ['shuffle', ICONS.shuffle, 'Shuffle'],
          ['bomb', ICONS.bomb, 'Bomb'],
          ['hint', ICONS.hint, 'Hint'],
        ].map(([kind, icon]) => {
          const isActive = kind === 'bomb' && bombMode;
          const count = profile.powerups?.[kind] || 0;
          const isJiggling = jigglingPowerup === kind;

          return (
            <button
              key={kind}
              className={`pw-btn${isActive ? ' active-mode' : ''}`}
              style={
                isJiggling
                  ? { transform: 'translateX(4px)', transition: 'transform 0.08s ease' }
                  : {}
              }
              onClick={() => handleUsePowerup(kind)}
            >
              <span dangerouslySetInnerHTML={{ __html: icon }} />
              <span className="pw-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div id="tray">
        {tray.map((piece, idx) => {
          if (!piece) {
            return <div key={idx} className="tray-slot empty" />;
          }

          const { rows, cols } = shapeDims(piece.cells);
          const cellPx = Math.min(20, Math.floor(84 / Math.max(rows, cols)));
          const filledSet = new Set(piece.cells.map(([r, c]) => `${r},${c}`));

          return (
            <div
              key={idx}
              className="tray-slot"
              onPointerDown={(e) => handleTrayPointerDown(e, idx)}
            >
              <div
                className="piece-grid"
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
                  gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
                }}
              >
                {Array.from({ length: rows }).map((_, r) =>
                  Array.from({ length: cols }).map((_, c) => {
                    const isFilled = filledSet.has(`${r},${c}`);
                    return (
                      <div
                        key={`${r},${c}`}
                        className={`piece-cell${isFilled ? '' : ' blank'}`}
                        style={isFilled ? { background: piece.color } : {}}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeGhost && (
        <div
          className="dragging-piece"
          style={{
            left: `${activeGhost.x}px`,
            top: `${activeGhost.y}px`,
            gridTemplateColumns: `repeat(${activeGhost.cols}, ${activeGhost.cellSize}px)`,
            gridTemplateRows: `repeat(${activeGhost.rows}, ${activeGhost.cellSize}px)`,
          }}
        >
          {(() => {
            const filledSet = new Set(activeGhost.piece.cells.map(([r, c]) => `${r},${c}`));
            return Array.from({ length: activeGhost.rows }).map((_, r) =>
              Array.from({ length: activeGhost.cols }).map((_, c) => {
                const isFilled = filledSet.has(`${r},${c}`);
                return (
                  <div
                    key={`${r},${c}`}
                    className={`piece-cell${isFilled ? '' : ' blank'}`}
                    style={{
                      width: `${activeGhost.cellSize}px`,
                      height: `${activeGhost.cellSize}px`,
                      ...(isFilled ? { background: activeGhost.piece.color } : {}),
                    }}
                  />
                );
              })
            );
          })()}
        </div>
      )}
    </div>
  );
}
