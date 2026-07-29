'use client';
import { useEffect, useRef } from 'react';

export default function StripeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Soft, vibrant TicketBay/Stripe inspired colors
    const colors = [
      [255, 85, 194],   // Pink
      [114, 34, 227],   // Purple
      [44, 196, 234],   // Cyan
      [70, 255, 171]    // Mint
    ];

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Create a slowly moving, rotating gradient background
      t += 0.002;
      
      const cx1 = width * 0.5 + Math.sin(t * 0.5) * width * 0.4;
      const cy1 = height * 0.5 + Math.cos(t * 0.3) * height * 0.4;
      
      const cx2 = width * 0.5 + Math.sin(t * 0.4 + Math.PI) * width * 0.4;
      const cy2 = height * 0.5 + Math.cos(t * 0.6 + Math.PI) * height * 0.4;

      const cx3 = width * 0.5 + Math.sin(t * 0.7 + Math.PI/2) * width * 0.4;
      const cy3 = height * 0.5 + Math.cos(t * 0.5 + Math.PI/2) * height * 0.4;

      // Draw large blurry circles that blend together (Stripe mesh effect)
      ctx.globalCompositeOperation = 'screen';
      
      const drawOrb = (x: number, y: number, r: number, rgb: number[]) => {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`);
        grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      };

      const maxR = Math.max(width, height) * 0.8;
      
      drawOrb(cx1, cy1, maxR, colors[0]);
      drawOrb(cx2, cy2, maxR, colors[1]);
      drawOrb(cx3, cy3, maxR, colors[2]);
      drawOrb(width * 0.5, height * 0.5, maxR * 1.2, colors[3]);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-1] pointer-events-none opacity-50"
      style={{
        filter: 'blur(60px) saturate(150%)',
        transform: 'translate3d(0,0,0)'
      }}
    />
  );
}
