'use client';

import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Aspect ratio wrapper — set a height class on the wrapper instead */
  wrapperClassName?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  /** Fallback shown when src is empty or errors */
  fallback?: React.ReactNode;
  /** Tailwind / CSS blur amount while loading */
  blurUp?: boolean;
}

/**
 * LazyImage — Intersection-Observer powered image loader.
 *
 * - Shows a shimmer placeholder until the image enters the viewport
 * - Fades the real image in once loaded (no layout shift)
 * - Renders a fallback emoji slot when src is missing or broken
 * - Works as a drop-in replacement for <img> wrapped in a sized container
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  style,
  wrapperClassName = '',
  objectFit = 'cover',
  fallback,
  blurUp = true,
}: LazyImageProps) {
  const [loaded,  setLoaded]  = useState(false);
  const [errored, setErrored] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Trigger load only when image enters the viewport
  useEffect(() => {
    if (!src) { setErrored(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }   // start loading 200px before it's visible
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  const showFallback = !src || errored;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={style}
    >
      {/* Shimmer placeholder — always present, fades out */}
      <div
        aria-hidden="true"
        className="skeleton absolute inset-0 transition-opacity duration-500"
        style={{ opacity: loaded || showFallback ? 0 : 1, pointerEvents: 'none' }}
      />

      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-tertiary)] text-3xl">
          {fallback ?? '🎉'}
        </div>
      ) : (
        visible && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`absolute inset-0 w-full h-full transition-all duration-500 ${className}`}
            style={{
              objectFit,
              opacity:    loaded ? 1 : 0,
              filter:     blurUp && !loaded ? 'blur(8px) scale(1.04)' : 'none',
              transform:  blurUp && !loaded ? 'scale(1.04)' : 'scale(1)',
            }}
          />
        )
      )}
    </div>
  );
}
