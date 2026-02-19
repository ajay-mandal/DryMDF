"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ShootingStarsProps {
  className?: string;
  starColor?: string;
  trailColor?: string;
  minSpeed?: number;
  maxSpeed?: number;
  minDelay?: number;
  maxDelay?: number;
}

interface Star {
  x: number;
  y: number;
  len: number;
  speed: number;
  size: number;
  waitTime: number;
  active: boolean;
  opacity: number;
}

export function ShootingStars({
  className,
  starColor = "#9E00FF",
  trailColor = "#2EB9DF",
  minSpeed = 10,
  maxSpeed = 30,
  minDelay = 1200,
  maxDelay = 4200,
}: ShootingStarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    function createStar(): Star {
      return {
        x: Math.random() * width,
        y: 0,
        len: Math.random() * 80 + 40,
        speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
        size: Math.random() * 1 + 0.5,
        waitTime: Math.random() * (maxDelay - minDelay) + minDelay,
        active: false,
        opacity: 1,
      };
    }

    function initStars() {
      starsRef.current = Array.from({ length: 8 }, createStar);
    }

    initStars();

    let lastTime = 0;
    function animate(timestamp: number) {
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      ctx!.clearRect(0, 0, width, height);

      starsRef.current.forEach((star) => {
        if (!star.active) {
          star.waitTime -= delta;
          if (star.waitTime <= 0) {
            star.active = true;
            star.x = Math.random() * width;
            star.y = 0;
            star.opacity = 1;
          }
        } else {
          star.x += star.speed * 0.5;
          star.y += star.speed;

          const gradient = ctx!.createLinearGradient(
            star.x,
            star.y,
            star.x - star.len * 0.5,
            star.y - star.len,
          );
          gradient.addColorStop(0, `${starColor}`);
          gradient.addColorStop(1, `${trailColor}00`);

          ctx!.save();
          ctx!.globalAlpha = star.opacity;
          ctx!.strokeStyle = gradient;
          ctx!.lineWidth = star.size;
          ctx!.beginPath();
          ctx!.moveTo(star.x, star.y);
          ctx!.lineTo(star.x - star.len * 0.5, star.y - star.len);
          ctx!.stroke();
          ctx!.restore();

          if (star.y > height || star.x > width) {
            Object.assign(star, {
              active: false,
              x: Math.random() * width,
              y: 0,
              waitTime: Math.random() * (maxDelay - minDelay) + minDelay,
            });
          }
        }
      });

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [starColor, trailColor, minSpeed, maxSpeed, minDelay, maxDelay]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 w-full h-full pointer-events-none",
        className,
      )}
    />
  );
}
