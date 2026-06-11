"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// App color palette
const COLORS = {
  green: "#3F592E",
  plumb: "#4A2E59",
  taupe: "#C4B7A6",
  cream: "#F8F6F3",
  charcoal: "#59572E",
  red: "#791D1E",
  teal: "#104B55",
  white: "#FFFFFF",
};

// Brick color rows (top to bottom)
const BRICK_COLORS = [
  COLORS.red,
  COLORS.plumb,
  COLORS.teal,
  COLORS.green,
  COLORS.charcoal,
  COLORS.taupe,
];

// Points per row (top rows worth more)
const BRICK_POINTS = [6, 5, 4, 3, 2, 1];

const LS_KEY = "cadence-brickbreaker-hs";

type GameState = "start" | "playing" | "paused" | "gameover" | "win";

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  points: number;
  alive: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface BrickBreakerProps {
  onClose: () => void;
}

export function BrickBreaker({ onClose }: BrickBreakerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>("start");
  const [displayState, setDisplayState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Game objects stored in refs for the game loop
  const ballRef = useRef({
    x: 0, y: 0, vx: 0, vy: 0, radius: 6, speed: 5,
    // Curving state: when the heart hits the paddle, it rolls along the arc
    curving: false,
    curveAngle: 0,       // Current angle on the arc
    curveTarget: 0,      // Target exit angle
    curveProgress: 0,    // 0 → 1 progress through the curve
    curveDir: 1,         // 1 = clockwise, -1 = counterclockwise
    curveDuration: 12,   // Frames to complete the curve
  });
  const paddleRef = useRef({ x: 0, y: 0, radius: 50, arcAngle: Math.PI * 0.8 });
  const bricksRef = useRef<Brick[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const ballAttachedRef = useRef(true);
  const mouseXRef = useRef(0);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setHighScore(parseInt(saved, 10));
    } catch { /* ignore */ }
  }, []);

  // Initialize bricks
  const initBricks = useCallback((canvasW: number, canvasH: number) => {
    const rows = 6;
    const cols = Math.floor((canvasW - 40) / 55);
    const brickW = (canvasW - 40 - (cols - 1) * 4) / cols;
    const brickH = 18;
    const offsetX = 20;
    const offsetY = 60;
    const bricks: Brick[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: offsetX + c * (brickW + 4),
          y: offsetY + r * (brickH + 4),
          w: brickW,
          h: brickH,
          color: BRICK_COLORS[r],
          points: BRICK_POINTS[r],
          alive: true,
        });
      }
    }
    return bricks;
  }, []);

  // Reset ball to paddle
  const resetBall = useCallback(() => {
    ballAttachedRef.current = true;
    const ball = ballRef.current;
    ball.vx = 0;
    ball.vy = 0;
    ball.curving = false;
    ball.curveProgress = 0;
  }, []);

  // Initialize / reset game
  const initGame = useCallback((canvasW: number, canvasH: number) => {
    lastTimeRef.current = 0; // Reset delta-time tracking
    const paddle = paddleRef.current;
    paddle.x = canvasW / 2;
    paddle.y = canvasH - 40;

    bricksRef.current = initBricks(canvasW, canvasH);
    particlesRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    resetBall();
    mouseXRef.current = canvasW / 2;
  }, [initBricks, resetBall]);

  // Spawn particles on brick break
  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const particles = particlesRef.current;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  // Draw the C-shaped paddle (outer C rotated so opening faces up)
  const drawPaddle = useCallback((ctx: CanvasRenderingContext2D) => {
    const paddle = paddleRef.current;
    const { x, y, radius, arcAngle } = paddle;

    // Draw a bowl/cup shape: arc from left to right with opening facing UP
    // Start angle and end angle create an upward-facing C
    const startAngle = Math.PI * 0.5 - arcAngle / 2; // slightly past top-right
    const endAngle = Math.PI * 0.5 + arcAngle / 2; // slightly past top-left

    // Outer arc (thickest, main paddle)
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.3, radius, startAngle, endAngle, false);
    ctx.strokeStyle = COLORS.green;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();

    // Middle arc (decorative, matches logo)
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.3, radius * 0.7, startAngle + 0.1, endAngle - 0.1, false);
    ctx.strokeStyle = COLORS.teal;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.stroke();

    // Inner arc (decorative, matches logo)
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.3, radius * 0.42, startAngle + 0.2, endAngle - 0.2, false);
    ctx.strokeStyle = COLORS.taupe;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }, []);

  // Draw heart shape (matches the Cadence logo center heart)
  const drawHeart = useCallback((ctx: CanvasRenderingContext2D) => {
    const ball = ballRef.current;
    const size = ball.radius * 1.8;

    // Rotate heart to face travel direction (point-first)
    // When going up, heart points up; when curving, it follows the arc
    let rotation: number;
    if (ball.curving) {
      // While curving, heart follows the tangent of the arc smoothly
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * ball.curveProgress);
      const currentAngle = ball.curveAngle + (ball.curveTarget - ball.curveAngle) * eased;
      // Tangent is perpendicular to radius; heart tip points along travel direction
      const tangentAngle = ball.curveDir > 0
        ? currentAngle + Math.PI / 2
        : currentAngle - Math.PI / 2;
      rotation = tangentAngle + Math.PI / 2;
    } else if (ballAttachedRef.current) {
      rotation = Math.PI; // Point upward when attached
    } else {
      rotation = Math.atan2(ball.vy, ball.vx) + Math.PI / 2;
    }

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(rotation);

    // Glow
    ctx.beginPath();
    ctx.arc(0, 0, size + 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(121, 29, 30, 0.15)";
    ctx.fill();

    // Heart path (drawn centered at origin, tip pointing down)
    ctx.beginPath();
    const s = size / 8;
    ctx.moveTo(0, s * 4);           // Bottom tip
    ctx.bezierCurveTo(-s * 1, s * 2, -s * 5, s * 1, -s * 5, -s * 2);
    ctx.bezierCurveTo(-s * 5, -s * 5, -s * 2, -s * 6, 0, -s * 3);
    ctx.bezierCurveTo(s * 2, -s * 6, s * 5, -s * 5, s * 5, -s * 2);
    ctx.bezierCurveTo(s * 5, s * 1, s * 1, s * 2, 0, s * 4);
    ctx.closePath();
    ctx.fillStyle = COLORS.red;
    ctx.fill();

    ctx.restore();
  }, []);

  // Main game loop — uses delta-time so speed is consistent regardless of frame rate
  const gameLoop = useCallback((ctx: CanvasRenderingContext2D, timestamp: number) => {
    // Delta-time: scale all movement by how much time actually passed vs target 60fps
    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / 16.667, 3) : 1;
    lastTimeRef.current = timestamp;

    const { w: canvasW, h: canvasH } = canvasSizeRef.current;
    const ball = ballRef.current;
    const paddle = paddleRef.current;
    const bricks = bricksRef.current;
    const particles = particlesRef.current;

    // Clear
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Move paddle toward mouse/touch
    const targetX = Math.max(paddle.radius, Math.min(canvasW - paddle.radius, mouseXRef.current));
    paddle.x += (targetX - paddle.x) * (1 - Math.pow(0.85, dt));

    // Ball attached to paddle
    if (ballAttachedRef.current) {
      ball.x = paddle.x;
      ball.y = paddle.y - paddle.radius * 0.3 - paddle.radius - ball.radius - 2;
    }

    if (gameStateRef.current === "playing" && !ballAttachedRef.current) {
      const paddleCenterY = paddle.y - paddle.radius * 0.3;
      // Heart rides just above the outer green arc stroke (which has lineWidth 5)
      const curveRadius = paddle.radius + ball.radius + 4;
      const startAngle = Math.PI * 0.5 - paddle.arcAngle / 2;
      const endAngle = Math.PI * 0.5 + paddle.arcAngle / 2;
      const midAngle = Math.PI * 0.5; // Bottom of bowl

      // Handle curving state (heart rolling smoothly along the C-paddle arc)
      if (ball.curving) {
        ball.curveProgress += dt / ball.curveDuration;

        if (ball.curveProgress >= 1) {
          // Finished curving — launch off the rim!
          ball.curving = false;
          ball.curveProgress = 0;

          // Launch direction: tangent to the arc at the exit point
          // Tangent is perpendicular to the radius, pointing upward/outward
          const exitAngle = ball.curveTarget;
          // Tangent points "forward" along the curve direction
          const tangentAngle = ball.curveDir > 0
            ? exitAngle + Math.PI / 2   // CW: tangent points 90° ahead
            : exitAngle - Math.PI / 2;  // CCW: tangent points 90° behind

          const speed = ball.speed;
          ball.vx = Math.cos(tangentAngle) * speed;
          ball.vy = Math.sin(tangentAngle) * speed;

          // Ensure ball moves upward after launch
          if (ball.vy > 0) ball.vy = -Math.abs(ball.vy);

          // Clamp minimum vertical speed so it doesn't go too horizontal
          if (Math.abs(ball.vy) < speed * 0.25) {
            ball.vy = -speed * 0.25;
            const remainingSpeed = Math.sqrt(speed * speed - ball.vy * ball.vy);
            ball.vx = ball.vx > 0 ? remainingSpeed : -remainingSpeed;
          }

          // Position ball just outside the arc at exit
          ball.x = paddle.x + Math.cos(exitAngle) * (curveRadius + 2);
          ball.y = paddleCenterY + Math.sin(exitAngle) * (curveRadius + 2);
        } else {
          // Smooth ease-in-out interpolation along the arc
          const eased = 0.5 - 0.5 * Math.cos(Math.PI * ball.curveProgress);
          const currentAngle = ball.curveAngle + (ball.curveTarget - ball.curveAngle) * eased;

          ball.x = paddle.x + Math.cos(currentAngle) * curveRadius;
          ball.y = paddleCenterY + Math.sin(currentAngle) * curveRadius;
        }
      } else {
        // Normal ball movement (scaled by delta-time)
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Wall collisions (left, right, top)
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
          // Tiny upward nudge at brick-level edges (~0.8% chance per wall bounce)
          if (ball.y >= 50 && ball.y <= 200 && Math.random() < 0.008) {
            ball.vy -= ball.speed * 0.12;
          }
        }
        if (ball.x + ball.radius >= canvasW) {
          ball.x = canvasW - ball.radius;
          ball.vx = -Math.abs(ball.vx);
          if (ball.y >= 50 && ball.y <= 200 && Math.random() < 0.008) {
            ball.vy -= ball.speed * 0.12;
          }
        }
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
        }

        // Paddle collision — heart enters the bowl and curves through to the other side
        const dx = ball.x - paddle.x;
        const dy = ball.y - paddleCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const outerEdge = paddle.radius + ball.radius + 6;
        const innerEdge = paddle.radius - ball.radius - 8;

        if (dist <= outerEdge && dist >= innerEdge && ball.vy > 0) {
          const entryAngle = Math.atan2(dy, dx);

          if (entryAngle >= startAngle && entryAngle <= endAngle) {
            // Dead-center zone: if hit near the bottom of the bowl, bounce straight up
            const centerTolerance = 0.18; // ~10° either side of dead center
            if (Math.abs(entryAngle - midAngle) < centerTolerance) {
              // Straight-up bounce, no curve
              ball.vx = 0;
              ball.vy = -ball.speed;
              ball.x = paddle.x;
              ball.y = paddleCenterY - curveRadius - 2;
            } else {
              // Start the curving animation
              ball.curving = true;
              ball.curveProgress = 0;
              ball.curveAngle = entryAngle;

              // Bowl physics: ball enters one side, rolls through bottom, exits opposite side
              if (entryAngle < midAngle) {
                // Hit RIGHT rim → roll CW through bottom → exit LEFT rim
                ball.curveDir = 1;
                ball.curveTarget = endAngle + 0.1;
              } else {
                // Hit LEFT rim → roll CCW through bottom → exit RIGHT rim
                ball.curveDir = -1;
                ball.curveTarget = startAngle - 0.1;
              }

              // Duration scales with arc distance — longer roll = more frames
              const arcSpan = Math.abs(ball.curveTarget - ball.curveAngle);
              ball.curveDuration = Math.max(10, Math.min(22, Math.round(arcSpan * 8)));

              // Snap heart onto the arc surface
              ball.x = paddle.x + Math.cos(entryAngle) * curveRadius;
              ball.y = paddleCenterY + Math.sin(entryAngle) * curveRadius;
              ball.vx = 0;
              ball.vy = 0;
            }
          }
        }
      }

      // Brick collisions (skip while curving along paddle)
      for (const brick of bricks) {
        if (ball.curving) break;
        if (!brick.alive) continue;

        // AABB collision
        const bx = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
        const by = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
        const bdx = ball.x - bx;
        const bdy = ball.y - by;
        const bDist = Math.sqrt(bdx * bdx + bdy * bdy);

        if (bDist <= ball.radius) {
          brick.alive = false;
          scoreRef.current += brick.points;
          setScore(scoreRef.current);
          spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);

          // Reflect ball
          if (Math.abs(bdx) > Math.abs(bdy)) {
            ball.vx = -ball.vx;
          } else {
            ball.vy = -ball.vy;
          }

          // Check win
          if (bricks.every((b) => !b.alive)) {
            gameStateRef.current = "win";
            setDisplayState("win");
            // Save high score
            if (scoreRef.current > (parseInt(localStorage.getItem(LS_KEY) || "0", 10))) {
              localStorage.setItem(LS_KEY, scoreRef.current.toString());
              setHighScore(scoreRef.current);
            }
          }
          break; // Only break one brick per frame
        }
      }

      // Ball falls below screen (not while curving on paddle)
      if (!ball.curving && ball.y - ball.radius > canvasH) {
        livesRef.current -= 1;
        setLives(livesRef.current);

        if (livesRef.current <= 0) {
          gameStateRef.current = "gameover";
          setDisplayState("gameover");
          // Save high score
          if (scoreRef.current > (parseInt(localStorage.getItem(LS_KEY) || "0", 10))) {
            localStorage.setItem(LS_KEY, scoreRef.current.toString());
            setHighScore(scoreRef.current);
          }
        } else {
          resetBall();
        }
      }
    }

    // Draw bricks
    for (const brick of bricks) {
      if (!brick.alive) continue;
      ctx.beginPath();
      // Rounded rect
      const r = 4;
      ctx.moveTo(brick.x + r, brick.y);
      ctx.lineTo(brick.x + brick.w - r, brick.y);
      ctx.quadraticCurveTo(brick.x + brick.w, brick.y, brick.x + brick.w, brick.y + r);
      ctx.lineTo(brick.x + brick.w, brick.y + brick.h - r);
      ctx.quadraticCurveTo(brick.x + brick.w, brick.y + brick.h, brick.x + brick.w - r, brick.y + brick.h);
      ctx.lineTo(brick.x + r, brick.y + brick.h);
      ctx.quadraticCurveTo(brick.x, brick.y + brick.h, brick.x, brick.y + brick.h - r);
      ctx.lineTo(brick.x, brick.y + r);
      ctx.quadraticCurveTo(brick.x, brick.y, brick.x + r, brick.y);
      ctx.closePath();
      ctx.fillStyle = brick.color;
      ctx.fill();
    }

    // Draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.05 * dt; // gravity
      p.life -= 0.02 * dt;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw paddle and heart
    drawPaddle(ctx);
    drawHeart(ctx);

    // Draw score
    ctx.fillStyle = COLORS.cream;
    ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${scoreRef.current}`, 12, 28);
    ctx.textAlign = "right";
    ctx.fillText(`Best: ${Math.max(scoreRef.current, parseInt(localStorage.getItem(LS_KEY) || "0", 10))}`, canvasW - 12, 28);

    // Draw lives
    ctx.textAlign = "center";
    const livesText = "♥".repeat(livesRef.current);
    ctx.fillStyle = COLORS.red;
    ctx.font = "16px system-ui";
    ctx.fillText(livesText, canvasW / 2, 28);

    // Overlay messages
    if (gameStateRef.current === "start") {
      drawOverlayText(ctx, canvasW, canvasH, "Cadence Breaker", "Tap or click to launch");
    } else if (gameStateRef.current === "gameover") {
      drawOverlayText(ctx, canvasW, canvasH, "Game Over", `Score: ${scoreRef.current} — Tap to restart`);
    } else if (gameStateRef.current === "win") {
      drawOverlayText(ctx, canvasW, canvasH, "You Win!", `Score: ${scoreRef.current} — Tap to play again`);
    } else if (gameStateRef.current === "playing" && ballAttachedRef.current) {
      ctx.fillStyle = "rgba(248, 246, 243, 0.6)";
      ctx.font = "13px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tap to launch", canvasW / 2, canvasH - 80);
    }

    animFrameRef.current = requestAnimationFrame((t) => gameLoop(ctx, t));
  }, [drawPaddle, drawHeart, spawnParticles, resetBall]);

  // Draw overlay text helper
  const drawOverlayText = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    title: string,
    subtitle: string
  ) => {
    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";

    // Title
    ctx.fillStyle = COLORS.cream;
    ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
    ctx.fillText(title, w / 2, h / 2 - 15);

    // Subtitle
    ctx.fillStyle = COLORS.taupe;
    ctx.font = "15px system-ui, -apple-system, sans-serif";
    ctx.fillText(subtitle, w / 2, h / 2 + 15);
  };

  // Handle click/tap — launch ball or restart
  const handleInteraction = useCallback(() => {
    const state = gameStateRef.current;
    const { w, h } = canvasSizeRef.current;

    if (state === "start") {
      gameStateRef.current = "playing";
      setDisplayState("playing");
    } else if (state === "gameover" || state === "win") {
      initGame(w, h);
      gameStateRef.current = "playing";
      setDisplayState("playing");
    } else if (state === "playing" && ballAttachedRef.current) {
      // Launch ball straight up
      ballAttachedRef.current = false;
      const ball = ballRef.current;
      ball.vx = 0;
      ball.vy = -ball.speed;
    }
  }, [initGame]);

  // Set up canvas and game
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      canvasSizeRef.current = { w, h };

      // Adjust paddle size for screen
      const paddle = paddleRef.current;
      paddle.radius = Math.min(50, w * 0.1);
      paddle.y = h - 40;

      // Adjust ball speed for screen size (higher floor on mobile)
      ballRef.current.speed = Math.max(4, Math.min(5.5, h * 0.008));
      ballRef.current.radius = Math.max(4, Math.min(6, w * 0.012));
    };

    resize();
    initGame(canvasSizeRef.current.w, canvasSizeRef.current.h);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    animFrameRef.current = requestAnimationFrame((t) => gameLoop(ctx, t));

    window.addEventListener("resize", resize);

    // Mouse/touch handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseXRef.current = e.clientX - rect.left;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseXRef.current = e.touches[0].clientX - rect.left;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
    };
  }, [initGame, gameLoop]);

  return (
    <div className="fixed inset-0 z-[60] animate-fadeIn" role="dialog" aria-label="Cadence Breaker game">
      {/* Close button */}
      <button
        onClick={() => {
          // Sneaky: dispatch event so entry page can update its end time
          window.dispatchEvent(new CustomEvent("cadence-game-closed"));
          onClose();
        }}
        className="absolute top-3 right-3 z-[70] p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close game"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Game canvas container */}
      <div ref={containerRef} className="w-full h-full">
        <canvas
          ref={canvasRef}
          className="block cursor-none"
          onClick={handleInteraction}
          onTouchStart={(e) => {
            // Allow touch interaction for launch/restart but don't block touch move
            handleInteraction();
            // Prevent double-tap zoom on mobile
            e.preventDefault();
          }}
        />
      </div>
    </div>
  );
}

export default BrickBreaker;
