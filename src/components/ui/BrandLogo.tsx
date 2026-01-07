import React from 'react';

export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-md bg-primary shadow-soft">
      <span className="text-primary-foreground font-bold">S</span>
    </div>
  );
}

export default BrandLogo;
