// Gate scene additions drawn over the art (all coordinates in the 3840x1800 canvas):
// the devil-silhouette logo on the LABORATORY / NO ACCESS sign, the pipe run carried over
// to the restricted door, and a wall first-aid kit.

// sign patch: biohazard painted out (inpainted from the sign itself) and the devil silhouette
// printed in its place; the green drip stays on top. Canvas box 1788,698 · 126x132.
const SIGN_LOGO = "data:image/webp;base64,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";
const box = (x: number, y: number, w: number, h: number) => ({ left: `${x / 38.4}%`, top: `${y / 18}%`, width: `${w / 38.4}%`, height: `${h / 18}%` });

export function SignLogo() {
  return <img className="gate-layer gate-sign-logo" src={SIGN_LOGO} alt="" style={box(1788, 698, 126, 132)} draggable={false} />;
}

// one continuous pipe: out of the existing elbow's flange, right, up, across, down to the restricted door
const PIPE = "M2466 428 L2466 432 Q2466 470 2504 470 L2662 470 Q2700 470 2700 432 L2700 283 Q2700 245 2738 245 L3427 245 Q3465 245 3465 283 L3465 492";
const CLAMPS: [number, number, "h" | "v"][] = [[2590, 470, "h"], [2700, 360, "v"], [2900, 245, "h"], [3160, 245, "h"], [3400, 245, "h"], [3465, 380, "v"]];

export function GatePipes() {
  return (
    <svg className="gate-props" viewBox="0 0 3840 1800" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="gpShadow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7" /></filter>
        <linearGradient id="kitFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4bfb1" /><stop offset="1" stopColor="#9e9a8e" />
        </linearGradient>
      </defs>
      {/* soft shadow on the wall */}
      <g filter="url(#gpShadow)" opacity=".45">
        <path d={PIPE} transform="translate(10 14)" fill="none" stroke="#000" strokeWidth="58" strokeLinecap="butt" />
        <rect x="2536" y="292" width="116" height="104" rx="8" fill="#000" />
      </g>
      {/* pipe body: outline, base, lower shade, highlight, specular */}
      <path d={PIPE} fill="none" stroke="#090c0f" strokeWidth="54" />
      <path d={PIPE} fill="none" stroke="#3a4448" strokeWidth="45" />
      <path d={PIPE} transform="translate(7 7)" fill="none" stroke="#283034" strokeWidth="20" />
      <path d={PIPE} transform="translate(-9 -9)" fill="none" stroke="#6d797d" strokeWidth="9" opacity=".9" />
      <path d={PIPE} transform="translate(-12 -12)" fill="none" stroke="#9aa6a9" strokeWidth="3" opacity=".55" />
      {/* collar where it joins the old pipe, end flange at the door */}
      <rect x="2430" y="420" width="72" height="22" rx="4" fill="#3a4448" stroke="#090c0f" strokeWidth="4" />
      <rect x="3429" y="488" width="72" height="22" rx="4" fill="#3a4448" stroke="#090c0f" strokeWidth="4" />
      <circle cx="3443" cy="499" r="3.5" fill="#1a2024" /><circle cx="3487" cy="499" r="3.5" fill="#1a2024" />
      {CLAMPS.map(([x, y, d], i) => d === "h"
        ? <g key={i}><rect x={x - 7} y={y - 33} width="14" height="66" rx="3" fill="#2b3337" stroke="#090c0f" strokeWidth="3.5" /><circle cx={x} cy={y - 24} r="2.6" fill="#7d888b" /><circle cx={x} cy={y + 24} r="2.6" fill="#7d888b" /></g>
        : <g key={i}><rect x={x - 33} y={y - 7} width="66" height="14" rx="3" fill="#2b3337" stroke="#090c0f" strokeWidth="3.5" /><circle cx={x - 24} cy={y} r="2.6" fill="#7d888b" /><circle cx={x + 24} cy={y} r="2.6" fill="#7d888b" /></g>)}
      {/* wall first-aid kit */}
      <g className="gate-kit">
        <rect x="2540" y="276" width="20" height="10" rx="2" fill="#2b3337" stroke="#090c0f" strokeWidth="3" />
        <rect x="2618" y="276" width="20" height="10" rx="2" fill="#2b3337" stroke="#090c0f" strokeWidth="3" />
        <path d="M2569 288 Q2569 270 2589 270 Q2609 270 2609 288" fill="none" stroke="#090c0f" strokeWidth="9" />
        <path d="M2569 288 Q2569 270 2589 270 Q2609 270 2609 288" fill="none" stroke="#56615f" strokeWidth="4" />
        <path d="M2646 292 L2656 300 L2656 384 L2646 392 Z" fill="#6f6b61" stroke="#090c0f" strokeWidth="4" strokeLinejoin="round" />
        <rect x="2526" y="286" width="122" height="106" rx="7" fill="url(#kitFace)" stroke="#090c0f" strokeWidth="5" />
        <line x1="2530" y1="309" x2="2644" y2="309" stroke="#090c0f" strokeWidth="3" />
        <rect x="2581" y="303" width="16" height="9" rx="2" fill="#4c4a44" stroke="#090c0f" strokeWidth="2.5" />
        <rect x="2577" y="320" width="24" height="62" rx="2" fill="#9b241f" stroke="#3a0d0b" strokeWidth="3" />
        <rect x="2558" y="339" width="62" height="24" rx="2" fill="#9b241f" stroke="#3a0d0b" strokeWidth="3" />
        <rect x="2580" y="323" width="6" height="56" fill="#c4413a" opacity=".55" />
        <path d="M2534 296 Q2552 300 2548 330 Q2547 345 2540 352" fill="none" stroke="#5e4a33" strokeWidth="6" opacity=".35" />
        <path d="M2630 360 q6 10 2 26" fill="none" stroke="#5e4a33" strokeWidth="5" opacity=".3" />
        <rect x="2526" y="286" width="122" height="106" rx="7" fill="rgba(14,30,38,.32)" />
      </g>
    </svg>
  );
}
