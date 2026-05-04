'use client';

import type { ReactNode } from 'react';

type Size = 'sm' | 'md';

function formatPrice(price: number, priceLabel?: string) {
  if (price === 0) return 'Free';
  if (priceLabel) return priceLabel;
  return `$${price}`;
}

export default function EventDateBadge({
  date,
  price,
  priceLabel,
  size = 'sm',
  label = 'DATE',
}: {
  date: ReactNode;
  price?: number;
  priceLabel?: string;
  size?: Size;
  label?: string;
}) {
  const isMd = size === 'md';
  const padX = isMd ? 'px-6' : 'px-4';
  const padY = isMd ? 'py-4' : 'py-3';
  const dateText = isMd ? 'text-base sm:text-lg' : 'text-sm sm:text-base';
  const priceText = isMd ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl';

  const showPrice = typeof price === 'number';

  return (
    <div
      className={`bg-black/60 backdrop-blur-xl border border-white/15 rounded-2xl shadow-xl ${padX} ${padY}`}
      style={{ minWidth: isMd ? 120 : 104 }}
    >
      <p
        className={`text-[10px] tracking-widest mb-1 text-center font-bold uppercase`}
        style={{ color: 'rgba(255,255,255,0.65)', letterSpacing: '0.12em' }}
      >
        {label}
      </p>
      <p
        className={`font-black leading-tight text-center whitespace-nowrap ${dateText}`}
        style={{ color: '#ffffff' }}
      >
        {date}
      </p>

      {showPrice && (
        <>
          <div className="my-2 w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
          <p
            className="text-[10px] tracking-widest mb-1 text-center font-bold uppercase"
            style={{ color: 'rgba(255,255,255,0.65)', letterSpacing: '0.12em' }}
          >
            FROM
          </p>
          <p
            className={`font-black leading-tight text-center ${priceText}`}
            style={{ color: '#ffffff' }}
          >
            {formatPrice(price!, priceLabel)}
          </p>
        </>
      )}
    </div>
  );
}

