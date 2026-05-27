import React from "react";

interface VedaLogoProps {
  variant: 1 | 2 | 3;
}

export const VedaLogo: React.FC<VedaLogoProps> = ({ variant }) => {
  if (variant === 1) {
    // Inverted text variant (Transparent background, dark text, graphic logo)
    return (
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="VedaAI Logo" className="h-10 w-10 object-contain rounded-xl shadow-sm" />
        <span className="text-xl font-extrabold tracking-tight text-[#111111] font-sans">
          VedaAI
        </span>
      </div>
    );
  }

  if (variant === 3) {
    // White text variant for dark backgrounds (Login/Register panels)
    return (
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="VedaAI Logo" className="h-10 w-10 object-contain rounded-xl shadow-sm" />
        <span className="text-xl font-extrabold tracking-tight text-white font-sans">
          VedaAI
        </span>
      </div>
    );
  }

  // Variant 2 (Default: graphic logo, dark text)
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.png" alt="VedaAI Logo" className="h-10 w-10 object-contain rounded-xl shadow-sm" />
      <span className="text-xl font-extrabold tracking-tight text-[#111111] font-sans">
        VedaAI
      </span>
    </div>
  );
};
