import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const Plus = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const ChatBubble = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3c-4.97 0-9 3.58-9 8 0 2.1.9 4 2.4 5.4L4.5 21l4.4-1.7c.98.3 2.03.45 3.1.45 4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
  </Svg>
);
export const CheckCircle = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></Svg>
);
export const InfoCircle = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></Svg>
);
export const Clock = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const Warning = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l9.5 17H2.5z" /><path d="M12 10v4M12 17v.5" /></Svg>
);
export const Upload = (p: IconProps) => (
  <Svg {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></Svg>
);
export const ListCheck = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16M4 12h10M4 17h7" /><path d="M17 15l2 2 3-4" /></Svg>
);
export const Calculator = (p: IconProps) => (
  <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h8" /></Svg>
);
export const Bell = (p: IconProps) => (
  <Svg {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></Svg>
);
