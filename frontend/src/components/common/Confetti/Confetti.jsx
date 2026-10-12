import { useEffect, useRef } from 'react';
import styles from './Confetti.module.css';

const Confetti = ({ isActive = false, duration = 3000 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    // Create confetti particles
    const particles = [];
    const particleCount = 100;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: -10,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 5 + 5,
        size: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
        decay: Math.random() * 0.01 + 0.005,
      });
    }

    particlesRef.current = particles;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;

      // Clear canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((p, index) => {
        p.y += p.vy;
        p.x += p.vx;
        p.vy += 0.1; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.rotationSpeed;
        p.life -= p.decay;

        if (p.life > 0) {
          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (elapsed < duration) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        canvas.width = 0;
        canvas.height = 0;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, duration]);

  return isActive ? <canvas ref={canvasRef} className={styles.confetti} /> : null;
};

export default Confetti;
