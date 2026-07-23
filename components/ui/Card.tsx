'use client';
import { motion, type HTMLMotionProps } from 'framer-motion';

type CardProps = HTMLMotionProps<'div'> & {
  hover?: boolean;
};

export default function Card({ hover = true, className = '', style, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.02, zIndex: 10 } : undefined}
      transition={hover ? { duration: 0.2, ease: 'easeOut' } : undefined}
      className={`card rounded-3xl ${className}`}
      style={{ position: 'relative', ...style }}
      {...props}
    />
  );
}

