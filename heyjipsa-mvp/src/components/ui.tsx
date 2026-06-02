// 디자인 시스템 기반 재사용 UI 프리미티브
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// ── Card ────────────────────────────────────────────────
export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white p-5 shadow-sm ${
        onClick ? 'cursor-pointer transition active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ── ProgressBar (블루→민트 그라데이션) ──────────────────
export function ProgressBar({
  value,
  total,
  className = '',
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const pct = total <= 0 ? 0 : Math.min(100, (value / total) * 100);
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-light ${className}`}>
      <div
        className="progress-fill h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Toggle (민트) ───────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-mint' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

// ── PrimaryButton (네이비) ──────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'mint';
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...rest
}: BtnProps) {
  const styles: Record<string, string> = {
    primary: 'bg-navy text-white hover:bg-navy/90',
    mint: 'bg-mint text-white hover:bg-mint/90',
    ghost: 'bg-white text-navy border border-light hover:bg-light/40',
  };
  return (
    <button
      className={`rounded-xl px-5 py-3 text-base font-semibold transition active:scale-[0.98] disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Tag / Pill ──────────────────────────────────────────
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-light px-2.5 py-0.5 text-xs font-medium text-blue">
      {children}
    </span>
  );
}
