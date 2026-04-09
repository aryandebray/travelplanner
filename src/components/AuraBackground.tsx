import { memo } from 'react';

/**
 * AuraBackground — Lightweight atmospheric backdrop.
 * Uses only static CSS radial gradients and a dot-matrix pattern.
 * Zero blur() filters, zero animations, zero JS — pure GPU compositing.
 */
function AuraBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
      {/* Primary Aura (Amber) — Static radial, no filter */}
      <div
        className="absolute -top-[20%] -left-[15%] w-[80%] h-[80%] rounded-full opacity-[0.06]"
        style={{
          background: 'radial-gradient(circle, rgba(240,160,80,0.6) 0%, transparent 65%)',
        }}
      />

      {/* Secondary Aura (Cyan) — Static radial, no filter */}
      <div
        className="absolute -bottom-[20%] -right-[15%] w-[70%] h-[70%] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, rgba(116,209,255,0.5) 0%, transparent 65%)',
        }}
      />

      {/* Dot Matrix Grid — CSS only */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(rgba(160,141,126,0.8) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

export default memo(AuraBackground);
