import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  volume: number; // 0 to ~1
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const smoothedVolRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      timeRef.current += 0.05;
      
      // Smooth the volume
      smoothedVolRef.current += (volume - smoothedVolRef.current) * 0.1;
      const vol = isActive ? Math.max(0.1, smoothedVolRef.current) : 0.1;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw Orb
      // We'll draw multiple concentric blobs that breathe
      
      // Core
      const baseRadius = 60;
      const pulse = Math.sin(timeRef.current) * 5;
      const expansion = vol * 100; // Expands with volume
      
      // Outer Glow
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, baseRadius + 100 + expansion);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)'); // Indigo
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)'); // Purple
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + 100 + expansion, 0, Math.PI * 2);
      ctx.fill();

      // Inner Solid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + pulse + (expansion * 0.2), 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [isActive, volume]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="w-[300px] h-[300px] md:w-[400px] md:h-[400px]"
    />
  );
};