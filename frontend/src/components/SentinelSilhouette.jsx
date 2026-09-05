import { useEffect, useState, useRef } from 'react';
import galactusImg from '../assets/galactus_custom.png';

export default function SentinelSilhouette({ prefersReducedMotion }) {
  // Parallax offset state
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const targetParallax = useRef({ x: 0, y: 0 });
  const currentParallax = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);

  // Eye blink state: 'open' | 'closing' | 'closed' | 'flaring'
  const [blinkState, setBlinkState] = useState('open');
  const blinkTimeoutRef = useRef(null);

  // 1. Mouse parallax effect
  useEffect(() => {
    if (prefersReducedMotion) {
      setParallax({ x: 0, y: 0 });
      return;
    }

    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      targetParallax.current = {
        x: (0.5 - x) * 20,
        y: (0.5 - y) * 16,
      };
    };

    const animateParallax = () => {
      const factor = 0.08;
      currentParallax.current.x +=
        (targetParallax.current.x - currentParallax.current.x) * factor;
      currentParallax.current.y +=
        (targetParallax.current.y - currentParallax.current.y) * factor;

      setParallax({
        x: Number(currentParallax.current.x.toFixed(2)),
        y: Number(currentParallax.current.y.toFixed(2)),
      });

      rafId.current = requestAnimationFrame(animateParallax);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafId.current = requestAnimationFrame(animateParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [prefersReducedMotion]);

  // 2. Frequent randomized eye blink (3.0s to 5.5s)
  useEffect(() => {
    if (prefersReducedMotion) {
      setBlinkState('open');
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      return;
    }

    let isMounted = true;

    const scheduleNextBlink = () => {
      const delay = Math.floor(Math.random() * 2500) + 3000;

      blinkTimeoutRef.current = setTimeout(() => {
        if (!isMounted) return;

        // Phase 1: Fast Closing
        setBlinkState('closing');

        setTimeout(() => {
          if (!isMounted) return;
          setBlinkState('closed');

          // Phase 2: Closed snap
          setTimeout(() => {
            if (!isMounted) return;
            // Phase 3: Crisp focused flare
            setBlinkState('flaring');

            // Phase 4: Settle back to tight glowing state
            setTimeout(() => {
              if (!isMounted) return;
              setBlinkState('open');
              scheduleNextBlink();
            }, 240);
          }, 70);
        }, 80);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      isMounted = false;
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, [prefersReducedMotion]);

  // Tightly concentrated eye styling without blooming or washing out the face
  const getEyeStyles = () => {
    if (prefersReducedMotion) {
      return {
        opacity: 0.95,
        transform: 'scale(1)',
        filter: 'drop-shadow(0 0 4px #c084fc)',
        transition: 'none',
      };
    }

    switch (blinkState) {
      case 'closing':
        return {
          opacity: 0.05,
          transform: 'scaleY(0.1) scaleX(0.7)',
          filter: 'drop-shadow(0 0 1px rgba(192, 132, 252, 0.3))',
          transition: 'all 80ms ease-in',
        };
      case 'closed':
        return {
          opacity: 0,
          transform: 'scaleY(0.01) scaleX(0.4)',
          filter: 'none',
          transition: 'all 60ms linear',
        };
      case 'flaring':
        return {
          opacity: 1,
          transform: 'scale(1.25)',
          filter: 'drop-shadow(0 0 8px #ffffff) drop-shadow(0 0 14px #e879f9)',
          transition: 'all 180ms cubic-bezier(0.2, 1.4, 0.4, 1)',
        };
      case 'open':
      default:
        return {
          opacity: 0.95,
          transform: 'scale(1)',
          filter: 'drop-shadow(0 0 4px #ffffff) drop-shadow(0 0 8px #c084fc)',
          transition: 'all 240ms ease-out',
        };
    }
  };

  const eyeStyle = getEyeStyles();

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center"
      style={{
        transform: prefersReducedMotion
          ? 'none'
          : `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
        transition: 'transform 0.05s linear',
      }}
    >
      {/* Silhouette container with subtle breathing animation */}
      <div
        className={`relative w-full h-full flex items-center justify-center ${
          prefersReducedMotion ? '' : 'animate-sentinel-breathe'
        }`}
      >
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <div
            className="relative flex items-center justify-center"
            style={{
              width: '100%',
              height: '100%',
              minWidth: '100vw',
              minHeight: '100vh',
            }}
          >
            {/* Galactus Artwork with high contrast — crown, horns, and armor contours remain dark & crisp */}
            <img
              src={galactusImg}
              alt="Galactus"
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
              style={{
                filter: 'contrast(1.35) brightness(1.05) saturate(1.1)',
              }}
            />

            {/* Tightly concentrated luminous eye points (no surrounding wash or bloom) */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Left Eye (Viewer's Left) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{
                  left: '38.22%',
                  top: '40.77%',
                  ...eyeStyle,
                }}
              >
                {/* Small tight ambient halo (max 10px, tightly contained) */}
                <div className="absolute w-5 h-5 rounded-full bg-purple-400/30 blur-[3px]" />
                {/* Thin sharp horizontal eye slit streak */}
                <div className="absolute w-7 h-[1.5px] bg-gradient-to-r from-transparent via-purple-100 to-transparent blur-[0.3px]" />
                {/* Piercing white core point */}
                <div className="w-2.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_#ffffff,0_0_8px_#c084fc]" />
              </div>

              {/* Right Eye (Viewer's Right) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{
                  left: '42.60%',
                  top: '38.84%',
                  ...eyeStyle,
                }}
              >
                {/* Small tight ambient halo (max 10px, tightly contained) */}
                <div className="absolute w-5 h-5 rounded-full bg-purple-400/30 blur-[3px]" />
                {/* Thin sharp horizontal eye slit streak */}
                <div className="absolute w-7 h-[1.5px] bg-gradient-to-r from-transparent via-purple-100 to-transparent blur-[0.3px]" />
                {/* Piercing white core point */}
                <div className="w-2.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_#ffffff,0_0_8px_#c084fc]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
