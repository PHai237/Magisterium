import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  vx: number;
  vy: number;
  opacity: number;
  phase: number;
  color: "violet" | "blue" | "green";
}

const PARTICLE_COUNT = 78;
const POINTER_RADIUS = 120;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickParticleColor(): Particle["color"] {
  const roll = Math.random();

  if (roll < 0.52) {
    return "violet";
  }

  if (roll < 0.84) {
    return "blue";
  }

  return "green";
}

function getParticleColor(color: Particle["color"], opacity: number): string {
  if (color === "blue") {
    return `rgba(96, 165, 250, ${opacity})`;
  }

  if (color === "green") {
    return `rgba(163, 230, 53, ${opacity})`;
  }

  return `rgba(192, 132, 252, ${opacity})`;
}

function createParticle(
  width: number,
  height: number,
  fromBottom = false
): Particle {
  const baseRadius = randomBetween(0.75, 2.25);

  return {
    x: randomBetween(0, width),
    y: fromBottom ? height + randomBetween(8, 80) : randomBetween(0, height),
    radius: baseRadius,
    baseRadius,
    vx: randomBetween(-0.08, 0.08),
    vy: -randomBetween(0.09, 0.32),
    opacity: randomBetween(0.18, 0.56),
    phase: randomBetween(0, Math.PI * 2),
    color: pickParticleColor()
  };
}

function startAmbientParticles(
  canvasElement: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): () => void {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const particles: Particle[] = [];
  const pointer = {
    x: -9999,
    y: -9999,
    active: false
  };

  let width = 1;
  let height = 1;
  let devicePixelRatio = 1;
  let animationFrameId = 0;

  function resizeCanvas() {
    const rect = canvasElement.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvasElement.width = Math.floor(width * devicePixelRatio);
    canvasElement.height = Math.floor(height * devicePixelRatio);

    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    if (particles.length === 0) {
      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        particles.push(createParticle(width, height));
      }
    }
  }

  function drawParticle(particle: Particle, time: number) {
    const pulse = Math.sin(time * 0.0015 + particle.phase) * 0.32;
    const radius = Math.max(0.4, particle.radius + pulse);

    const gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      radius * 5.2
    );

    gradient.addColorStop(
      0,
      getParticleColor(
        particle.color,
        Math.min(0.82, particle.opacity + 0.18)
      )
    );
    gradient.addColorStop(
      0.38,
      getParticleColor(particle.color, particle.opacity * 0.46)
    );
    gradient.addColorStop(1, getParticleColor(particle.color, 0));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius * 5.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateParticle(particle: Particle, time: number) {
    const drift = Math.sin(time * 0.00065 + particle.phase) * 0.12;

    particle.x += particle.vx + drift;
    particle.y += particle.vy;

    if (pointer.active) {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0 && distance < POINTER_RADIUS) {
        const force = (1 - distance / POINTER_RADIUS) * 2.4;

        particle.x += (dx / distance) * force;
        particle.y += (dy / distance) * force;
      }
    }

    if (particle.y < -32 || particle.x < -48 || particle.x > width + 48) {
      Object.assign(particle, createParticle(width, height, true));
    }
  }

  function renderStatic() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    particles.forEach((particle) => {
      drawParticle(particle, 0);
    });

    ctx.globalCompositeOperation = "source-over";
  }

  function animate(time: number) {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    particles.forEach((particle) => {
      updateParticle(particle, time);
      drawParticle(particle, time);
    });

    ctx.globalCompositeOperation = "source-over";
    animationFrameId = window.requestAnimationFrame(animate);
  }

  function handlePointerMove(event: PointerEvent) {
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    pointer.x = x;
    pointer.y = y;
    pointer.active =
      x >= -32 && x <= rect.width + 32 && y >= -32 && y <= rect.height + 32;
  }

  function handlePointerLeave() {
    pointer.active = false;
  }

  resizeCanvas();

  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();

    if (prefersReducedMotion) {
      renderStatic();
    }
  });

  resizeObserver.observe(canvasElement);

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerleave", handlePointerLeave);

  if (prefersReducedMotion) {
    renderStatic();
  } else {
    animationFrameId = window.requestAnimationFrame(animate);
  }

  return () => {
    window.cancelAnimationFrame(animationFrameId);
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerleave", handlePointerLeave);
  };
}

export function AmbientParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;

    if (canvasElement === null) {
      return undefined;
    }

    const ctx = canvasElement.getContext("2d", { alpha: true });

    if (ctx === null) {
      return undefined;
    }

    return startAmbientParticles(canvasElement, ctx);
  }, []);

  return (
    <canvas
      className="auth-ambient-canvas"
      ref={canvasRef}
      aria-hidden="true"
    />
  );
}