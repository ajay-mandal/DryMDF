"use client";

import React, { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
  color: string;
}

interface SparklesCoreProps {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
}

export function SparklesCore({
  id,
  className,
  background = "transparent",
  minSize = 0.4,
  maxSize = 1.4,
  speed = 1,
  particleColor = "#FFFFFF",
  particleDensity = 120,
}: SparklesCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const generatedId = useId();
  const canvasId = id || generatedId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    function createParticle(index: number): Particle {
      return {
        id: index,
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (maxSize - minSize) + minSize,
        opacity: Math.random(),
        speed: (Math.random() * 0.5 + 0.1) * speed,
        angle: Math.random() * Math.PI * 2,
        color: particleColor,
      };
    }

    for (let i = 0; i < particleDensity; i++) {
      particles.push(createParticle(i));
    }

    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.opacity = Math.abs(Math.sin(Date.now() * 0.001 + p.id));

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.opacity * 0.8;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [background, minSize, maxSize, speed, particleColor, particleDensity]);

  return (
    <canvas
      id={canvasId}
      ref={canvasRef}
      className={cn("h-full w-full", className)}
    />
  );
}

interface SparklesProps {
  className?: string;
  children?: React.ReactNode;
  particleColor?: string;
  particleDensity?: number;
  background?: string;
}

export function Sparkles({
  className,
  children,
  particleColor = "#FFFFFF",
  particleDensity = 80,
  background = "transparent",
}: SparklesProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 overflow-hidden">
        <SparklesCore
          particleColor={particleColor}
          particleDensity={particleDensity}
          background={background}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
