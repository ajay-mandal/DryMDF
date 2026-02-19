"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface BackgroundBeamsProps {
  className?: string;
  colorMode?: "dark" | "light";
}

interface BeamData {
  x: number;
  y: number;
  width: number;
  angle: number;
  speed: number;
  opacity: number;
  color: string;
  length: number;
}

function createBeam(
  width: number,
  height: number,
  colorMode: "dark" | "light" = "dark",
): BeamData {
  const hue = Math.random() > 0.5 ? 220 : 270;
  // light mode: deep indigo/violet (35% lightness), dark mode: bright blue/purple (65%)
  const lightness = colorMode === "light" ? 32 : 65;
  const saturation = colorMode === "light" ? 90 : 80;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    width: Math.random() * 2.5 + 0.8,
    angle: Math.random() * Math.PI * 2,
    speed: (Math.random() * 0.3 + 0.1) * 0.5,
    opacity:
      colorMode === "light"
        ? Math.random() * 0.55 + 0.2
        : Math.random() * 0.4 + 0.1,
    length: Math.random() * 300 + 100,
    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
  };
}

function updateBeam(beam: BeamData, width: number, height: number): BeamData {
  let { x, y } = beam;
  x += Math.cos(beam.angle) * beam.speed;
  y += Math.sin(beam.angle) * beam.speed;
  if (x < -beam.length || x > width + beam.length) {
    x = Math.random() * width;
    y = Math.random() * height;
  }
  if (y < -beam.length || y > height + beam.length) {
    x = Math.random() * width;
    y = Math.random() * height;
  }
  return { ...beam, x, y };
}

function drawBeam(ctx: CanvasRenderingContext2D, beam: BeamData): void {
  ctx.save();
  ctx.globalAlpha = beam.opacity;
  ctx.lineWidth = beam.width;
  ctx.shadowColor = beam.color;
  ctx.shadowBlur = 15;
  const grad = ctx.createLinearGradient(
    beam.x,
    beam.y,
    beam.x + Math.cos(beam.angle) * beam.length,
    beam.y + Math.sin(beam.angle) * beam.length,
  );
  grad.addColorStop(0, "transparent");
  grad.addColorStop(0.5, beam.color);
  grad.addColorStop(1, "transparent");
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.moveTo(
    beam.x - (Math.cos(beam.angle) * beam.length) / 2,
    beam.y - (Math.sin(beam.angle) * beam.length) / 2,
  );
  ctx.lineTo(
    beam.x + (Math.cos(beam.angle) * beam.length) / 2,
    beam.y + (Math.sin(beam.angle) * beam.length) / 2,
  );
  ctx.stroke();
  ctx.restore();
}

export function BackgroundBeams({
  className,
  colorMode = "dark",
}: BackgroundBeamsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    let beams: BeamData[] = Array.from({ length: 12 }, () =>
      createBeam(width, height, colorMode),
    );

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      beams = beams.map((b) => updateBeam(b, width, height));
      beams.forEach((b) => drawBeam(ctx, b));
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [colorMode]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 w-full h-full", className)}
    />
  );
}
