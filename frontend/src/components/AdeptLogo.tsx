import React from "react";

interface AdeptLogoProps {
  variant: 1 | 2 | 3;
}

export const AdeptLogo: React.FC<AdeptLogoProps> = ({ variant }) => {
  if (variant === 1) {
    // Inverted text variant (Transparent background, dark text, graphic logo)
    return (
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="AdeptAi Logo" className="h-10 w-10 object-contain rounded-xl shadow-sm rotate-180" />
        <span className="text-xl font-extrabold tracking-tight text-[#111111] font-sans">
          AdeptAi
        </span>
      </div>
    );
  }

  if (variant === 3) {
    // White text variant for dark backgrounds (Login/Register panels)
    return (
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="AdeptAi Logo" className="h-10 w-10 object-contain rounded-xl shadow-sm rotate-180" />
        <span className="text-xl font-extrabold tracking-tight text-white font-sans">
          AdeptAi
        </span>
      </div>
    );
  }

  // Variant 2 (Default: graphic logo, dark text)
  return (
    <div className="flex items-center gap-3">
      <img src="/logo.png" alt="AdeptAi Logo" className="h-10 w-10 object-contain rounded-xl shadow-sm rotate-180" />
      <span className="text-xl font-extrabold tracking-tight text-[#111111] font-sans">
        AdeptAi
      </span>
    </div>
  );
};
