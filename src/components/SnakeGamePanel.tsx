import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, Pause, Play, RotateCcw, Square, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SNAKE_DEVICE_TYPE } from "../constants";
import type { ActiveTimer, AppMode, Child } from "../types";
import { formatClock, formatCompactDuration } from "../utils/time";

type Position = {
  readonly row: number;
  readonly col: number;
};

type Direction = "up" | "down" | "left" | "right";
type GamePhase = "ready" | "playing" | "paused" | "level-clear" | "completed" | "lost";

type LevelConfig = {
  readonly name: string;
  readonly target: number;
  readonly speedMs: number;
  readonly obstacleCount: number;
};

type SnakeGameState = {
  readonly phase: GamePhase;
  readonly levelIndex: number;
  readonly snake: readonly Position[];
  readonly direction: Direction;
  readonly nextDirection: Direction;
  readonly food: Position;
  readonly obstacles: readonly Position[];
  readonly applesInLevel: number;
  readonly totalApples: number;
};

type SnakeGamePanelProps = {
  readonly activeElapsedSeconds: number;
  readonly activeTimer: ActiveTimer | null;
  readonly child: Child;
  readonly mode: AppMode;
  readonly usedSeconds: number;
  readonly weeklyLimitSeconds: number;
  readonly onStartGame: () => boolean;
  readonly onPauseGame: () => void;
  readonly onResumeGame: () => void;
  readonly onEndGame: () => void;
};

const BOARD_SIZE = 15;
const START_HEAD: Position = { row: 7, col: 5 };
const START_SNAKE: readonly Position[] = [
  START_HEAD,
  { row: 7, col: 4 },
  { row: 7, col: 3 },
];

const FIRST_LEVEL: LevelConfig = { name: "清凉小岛", target: 4, speedMs: 220, obstacleCount: 5 };
const LEVELS: readonly LevelConfig[] = [
  FIRST_LEVEL,
  { name: "森林弯道", target: 5, speedMs: 175, obstacleCount: 9 },
  { name: "星光冲刺", target: 6, speedMs: 135, obstacleCount: 13 },
];

const directions: Record<Direction, Position> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

function positionKey(position: Position): string {
  return `${position.row}:${position.col}`;
}

function getLevel(index: number): LevelConfig {
  return LEVELS[index] ?? FIRST_LEVEL;
}

function isSamePosition(first: Position, second: Position): boolean {
  return first.row === second.row && first.col === second.col;
}

function isOppositeDirection(first: Direction, second: Direction): boolean {
  return (
    (first === "up" && second === "down") ||
    (first === "down" && second === "up") ||
    (first === "left" && second === "right") ||
    (first === "right" && second === "left")
  );
}

function createSeededIndex(seed: number, step: number, max: number): number {
  const value = Math.sin(seed * 37.13 + step * 19.97) * 10000;
  return Math.abs(Math.floor(value)) % max;
}

function isBlocked(position: Position, blocked: ReadonlySet<string>): boolean {
  return blocked.has(positionKey(position));
}

function createFood(blocked: ReadonlySet<string>, seed: number): Position {
  const freeCells: Position[] = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const position = { row, col };
      if (!isBlocked(position, blocked)) {
        freeCells.push(position);
      }
    }
  }

  return freeCells[createSeededIndex(seed, freeCells.length, freeCells.length)] ?? { row: 1, col: 1 };
}

function createObstacles(levelIndex: number): Position[] {
  const level = getLevel(levelIndex);
  const blocked = new Set(START_SNAKE.map(positionKey));
  const obstacles: Position[] = [];
  const center = Math.floor(BOARD_SIZE / 2);

  for (let step = 0; obstacles.length < level.obstacleCount && step < 120; step += 1) {
    const position = {
      row: createSeededIndex(levelIndex + 2, step, BOARD_SIZE),
      col: createSeededIndex(levelIndex + 7, step + 3, BOARD_SIZE),
    };

    const nearStart = Math.abs(position.row - center) + Math.abs(position.col - 5) < 4;
    const onEdge = position.row === 0 || position.col === 0 || position.row === BOARD_SIZE - 1 || position.col === BOARD_SIZE - 1;
    if (!nearStart && !onEdge && !isBlocked(position, blocked)) {
      blocked.add(positionKey(position));
      obstacles.push(position);
    }
  }

  return obstacles;
}

function createLevelState(levelIndex: number, totalApples: number, phase: GamePhase): SnakeGameState {
  const obstacles = createObstacles(levelIndex);
  const blocked = new Set([...START_SNAKE.map(positionKey), ...obstacles.map(positionKey)]);

  return {
    phase,
    levelIndex,
    snake: START_SNAKE,
    direction: "right",
    nextDirection: "right",
    food: createFood(blocked, Date.now() + levelIndex),
    obstacles,
    applesInLevel: 0,
    totalApples,
  };
}

function createInitialState(): SnakeGameState {
  return createLevelState(0, 0, "ready");
}

function moveSnake(current: SnakeGameState): SnakeGameState {
  const direction = current.nextDirection;
  const head = current.snake[0] ?? START_HEAD;
  const delta = directions[direction];
  const nextHead = { row: head.row + delta.row, col: head.col + delta.col };
  const hitWall = nextHead.row < 0 || nextHead.col < 0 || nextHead.row >= BOARD_SIZE || nextHead.col >= BOARD_SIZE;
  const bodyWithoutTail = current.snake.slice(0, -1);
  const hitSelf = bodyWithoutTail.some((part) => isSamePosition(part, nextHead));
  const hitObstacle = current.obstacles.some((obstacle) => isSamePosition(obstacle, nextHead));

  if (hitWall || hitSelf || hitObstacle) {
    return { ...current, phase: "lost", direction };
  }

  const ateFood = isSamePosition(nextHead, current.food);
  const nextSnake = ateFood ? [nextHead, ...current.snake] : [nextHead, ...current.snake.slice(0, -1)];
  const applesInLevel = current.applesInLevel + (ateFood ? 1 : 0);
  const totalApples = current.totalApples + (ateFood ? 1 : 0);
  const level = getLevel(current.levelIndex);

  if (ateFood && applesInLevel >= level.target) {
    return {
      ...current,
      phase: current.levelIndex === LEVELS.length - 1 ? "completed" : "level-clear",
      snake: nextSnake,
      direction,
      applesInLevel,
      totalApples,
    };
  }

  const blocked = new Set([...nextSnake.map(positionKey), ...current.obstacles.map(positionKey)]);
  return {
    ...current,
    snake: nextSnake,
    direction,
    nextDirection: direction,
    food: ateFood ? createFood(blocked, Date.now() + totalApples + current.levelIndex) : current.food,
    applesInLevel,
    totalApples,
  };
}

function getPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case "playing":
      return "闯关中";
    case "paused":
      return "已暂停";
    case "level-clear":
      return "本关完成";
    case "completed":
      return "全部通关";
    case "lost":
      return "挑战结束";
    case "ready":
      return "准备开始";
  }
}

export function SnakeGamePanel({
  activeElapsedSeconds,
  activeTimer,
  child,
  mode,
  usedSeconds,
  weeklyLimitSeconds,
  onStartGame,
  onPauseGame,
  onResumeGame,
  onEndGame,
}: SnakeGamePanelProps) {
  const [game, setGame] = useState<SnakeGameState>(() => createInitialState());
  const handledPhaseRef = useRef<GamePhase | null>(null);
  const isSnakeTimer = activeTimer?.childId === child.id && activeTimer.deviceType === SNAKE_DEVICE_TYPE;
  const isRunningSnakeTimer = isSnakeTimer && activeTimer?.status === "running";
  const isPausedSnakeTimer = isSnakeTimer && activeTimer?.status === "paused";
  const remainingSeconds = Math.max(0, weeklyLimitSeconds - usedSeconds);
  const quotaDone = remainingSeconds <= 0;
  const hasOtherTimer = Boolean(activeTimer && !isSnakeTimer);
  const level = getLevel(game.levelIndex);
  const progressPercent = Math.min(100, Math.round((game.applesInLevel / level.target) * 100));
  const snakeCells = useMemo(() => new Set(game.snake.map(positionKey)), [game.snake]);
  const obstacleCells = useMemo(() => new Set(game.obstacles.map(positionKey)), [game.obstacles]);

  const setDirection = useCallback((direction: Direction) => {
    setGame((current) => {
      if (current.phase !== "playing" || isOppositeDirection(current.direction, direction)) {
        return current;
      }

      return { ...current, nextDirection: direction };
    });
  }, []);

  const startGame = () => {
    if (mode === "parent" || quotaDone || hasOtherTimer) {
      return;
    }

    if (!isSnakeTimer && !onStartGame()) {
      return;
    }

    handledPhaseRef.current = null;
    setGame(createLevelState(0, 0, "playing"));
  };

  const pauseGame = () => {
    if (!isRunningSnakeTimer || game.phase !== "playing") {
      return;
    }

    onPauseGame();
    setGame((current) => ({ ...current, phase: "paused" }));
  };

  const resumeGame = () => {
    if (!isPausedSnakeTimer || game.phase !== "paused") {
      return;
    }

    onResumeGame();
    setGame((current) => ({ ...current, phase: "playing" }));
  };

  const endGame = () => {
    if (isSnakeTimer) {
      onEndGame();
    }

    setGame((current) => ({ ...current, phase: "lost" }));
  };

  const continueNextLevel = () => {
    if (!isPausedSnakeTimer || game.phase !== "level-clear") {
      return;
    }

    onResumeGame();
    handledPhaseRef.current = null;
    setGame(createLevelState(game.levelIndex + 1, game.totalApples, "playing"));
  };

  useEffect(() => {
    if (!isRunningSnakeTimer || game.phase !== "playing") {
      return () => undefined;
    }

    const intervalId = window.setInterval(() => {
      setGame((current) => (current.phase === "playing" ? moveSnake(current) : current));
    }, level.speedMs);

    return () => window.clearInterval(intervalId);
  }, [game.phase, isRunningSnakeTimer, level.speedMs]);

  useEffect(() => {
    if (game.phase === "playing") {
      handledPhaseRef.current = null;
      return;
    }

    if (handledPhaseRef.current === game.phase) {
      return;
    }

    if (game.phase === "level-clear" && isRunningSnakeTimer) {
      handledPhaseRef.current = game.phase;
      onPauseGame();
      return;
    }

    if ((game.phase === "completed" || game.phase === "lost") && isSnakeTimer) {
      handledPhaseRef.current = game.phase;
      onEndGame();
    }
  }, [game.phase, isRunningSnakeTimer, isSnakeTimer, onEndGame, onPauseGame]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keyMap: Partial<Record<string, Direction>> = {
        ArrowUp: "up",
        w: "up",
        W: "up",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
      };
      const direction = keyMap[event.key];
      if (direction) {
        event.preventDefault();
        setDirection(direction);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setDirection]);

  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const position = { row, col };
      const key = positionKey(position);
      const isHead = isSamePosition(game.snake[0] ?? START_HEAD, position);
      const className = [
        "snake-cell",
        snakeCells.has(key) ? "snake-cell--body" : "",
        isHead ? "snake-cell--head" : "",
        obstacleCells.has(key) ? "snake-cell--obstacle" : "",
        isSamePosition(game.food, position) ? "snake-cell--food" : "",
      ].filter(Boolean).join(" ");

      cells.push(<span className={className} key={key} />);
    }
  }

  return (
    <section className="snake-panel" aria-label={`${child.name}贪吃蛇闯关`}>
      <div className="panel-heading panel-heading--stacked">
        <div>
          <h2>贪吃蛇闯关小游戏</h2>
          <p>吃到目标食物后进入下一关，游戏时间会计入本周电子产品时间。</p>
        </div>
        <span className={`snake-status snake-status--${game.phase}`}>{getPhaseLabel(game.phase)}</span>
      </div>

      <div className="snake-layout">
        <div className="snake-board-wrap">
          <div className="snake-board" aria-label="贪吃蛇游戏棋盘">
            {cells}
          </div>
          <div className="snake-dpad" aria-label="方向控制">
            <button type="button" className="snake-dpad__button snake-dpad__button--up" aria-label="向上" title="向上" onClick={() => setDirection("up")}>
              <ArrowUp aria-hidden="true" size={20} />
            </button>
            <button type="button" className="snake-dpad__button snake-dpad__button--left" aria-label="向左" title="向左" onClick={() => setDirection("left")}>
              <ArrowLeft aria-hidden="true" size={20} />
            </button>
            <button type="button" className="snake-dpad__button snake-dpad__button--right" aria-label="向右" title="向右" onClick={() => setDirection("right")}>
              <ArrowRight aria-hidden="true" size={20} />
            </button>
            <button type="button" className="snake-dpad__button snake-dpad__button--down" aria-label="向下" title="向下" onClick={() => setDirection("down")}>
              <ArrowDown aria-hidden="true" size={20} />
            </button>
          </div>
        </div>

        <div className="snake-side">
          <div className="snake-score">
            <div>
              <span>当前关卡</span>
              <strong>{game.levelIndex + 1} / {LEVELS.length}</strong>
            </div>
            <div>
              <span>本局食物</span>
              <strong>{game.totalApples}</strong>
            </div>
            <div>
              <span>计时时长</span>
              <strong>{isSnakeTimer ? formatClock(activeElapsedSeconds) : "00:00:00"}</strong>
            </div>
          </div>

          <div className="snake-level-card">
            <div className="snake-level-card__top">
              <Gamepad2 aria-hidden="true" size={20} />
              <strong>{level.name}</strong>
              <span>{game.applesInLevel} / {level.target}</span>
            </div>
            <div className="snake-level-card__bar" aria-hidden="true">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="snake-actions">
            {game.phase === "ready" || game.phase === "lost" || game.phase === "completed" ? (
              <button className="button button--primary" type="button" disabled={mode === "parent" || quotaDone || hasOtherTimer} onClick={startGame}>
                {game.phase === "ready" ? <Play aria-hidden="true" size={19} /> : <RotateCcw aria-hidden="true" size={19} />}
                {game.phase === "ready" ? "开始闯关" : "再玩一次"}
              </button>
            ) : null}

            {game.phase === "playing" ? (
              <>
                <button className="button button--warning" type="button" onClick={pauseGame}>
                  <Pause aria-hidden="true" size={19} />
                  暂停
                </button>
                <button className="button button--secondary" type="button" onClick={endGame}>
                  <Square aria-hidden="true" size={18} />
                  结束游戏
                </button>
              </>
            ) : null}

            {game.phase === "paused" ? (
              <>
                <button className="button button--primary" type="button" onClick={resumeGame}>
                  <Play aria-hidden="true" size={19} />
                  继续
                </button>
                <button className="button button--secondary" type="button" onClick={endGame}>
                  <Square aria-hidden="true" size={18} />
                  结束游戏
                </button>
              </>
            ) : null}

            {game.phase === "level-clear" ? (
              <button className="button button--primary" type="button" onClick={continueNextLevel}>
                <Trophy aria-hidden="true" size={19} />
                进入下一关
              </button>
            ) : null}
          </div>

          <div className="snake-note">
            {quotaDone ? "本周时间已用完，先休息一下。" : hasOtherTimer ? "当前已有计时在进行，结束后再开始游戏。" : `本周剩余 ${formatCompactDuration(remainingSeconds)}`}
          </div>
        </div>
      </div>
    </section>
  );
}
