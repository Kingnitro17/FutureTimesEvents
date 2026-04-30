'use client';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'gradient';
type Size    = 'sm' | 'md' | 'lg';

const GRADIENTS: Record<string, string> = {
  pink:    'linear-gradient(135deg,#FF55C2,#7222E3)',
  ocean:   'linear-gradient(135deg,#2CC4EA,#533885)',
  emerald: 'linear-gradient(135deg,#46FFAB,#A02EFF)',
  fire:    'linear-gradient(135deg,#FFBC73,#FF00B9)',
};

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  gradient?: keyof typeof GRADIENTS;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'min-h-12 px-6 py-2 text-xs gap-2 rounded-xl',
  md: 'min-h-12 px-6 py-4 text-sm gap-2 rounded-2xl',
  lg: 'min-h-12 px-6 py-4 text-base gap-2 rounded-2xl',
};

const VARIANT_STYLES: Record<Variant, string> = {
  primary:  'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--border-hover)]',
  ghost:    'bg-transparent border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-hover)]',
  outline:  'bg-transparent border-2 border-[var(--accent)] text-[var(--accent)]',
  danger:   'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-500',
  gradient: '',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  gradient = 'pink',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const isGrad = variant === 'gradient';

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading   ? { scale: 0.97 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-semibold select-none
        transition-shadow duration-200
        ${SIZE_CLASSES[size]}
        ${isGrad ? 'text-white' : VARIANT_STYLES[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        ...(isGrad ? {
          background: GRADIENTS[gradient],
          boxShadow: '0 4px 20px rgba(114,34,227,0.25)',
        } : {}),
        ...style,
      }}
      {...props}
    >
      {loading
        ? <Loader2 size={16} className="animate-spin" />
        : icon && <span className="shrink-0">{icon}</span>
      }
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </motion.button>
  );
}
