// Gate room (two doors) wall signs, placed exactly as in the "numbers" PSD. Art = the original webp files from signs.zip
// (signs set), shown in their own colours.
// x / y / w / h = the whole image's box in canvas pixels on the 3840x1800 art (% = x/38.4, y/18).
const SIGNS = [
  { f: "01_plus", x: 2399.5, y: 827.8, w: 138.7, h: 136.0 },
  { f: "01_thin-cross", x: 300.1, y: 1161.5, w: 161.1, h: 157.0 },
  { f: "02_cross", x: 1411.1, y: 1322.7, w: 140.5, h: 140.7 },
  { f: "02_hash-scratch", x: 3398.9, y: 719.8, w: 135.6, h: 132.7 },
  { f: "13_dna-thin", x: 1006.0, y: 1051.9, w: 80.1, h: 151.1 },
  { f: "math_05_contour-integral", x: 1452.7, y: 385.2, w: 118.5, h: 198.1 },
  { f: "Gemini_Generated_Image_x1zabnx1zabnx1za-clean-Photoroom", x: 1165.0, y: 607.3, w: 344.5, h: 261.8 },
  { f: "111_01_thin", x: 3651.2, y: 612.3, w: 76.4, h: 154.2 },
  { f: "222_01_thin", x: 2522.9, y: 1236.1, w: 116.9, h: 174.8 },
  { f: "math_01_delta-outline", x: 2950.2, y: 256.2, w: 129.0, h: 129.2 },
  { f: "08_asterisk-8", x: 2039.5, y: 947.5, w: 141.3, h: 145.7 },
];

export function GateSigns() {
  return (
    <>
      {SIGNS.map((s, i) => (
        <img key={i} className="lab-sign" src={`/scene/signs/${s.f}.webp`} alt="" aria-hidden="true" draggable={false} decoding="async"
          style={{ left: `${s.x / 38.4}%`, top: `${s.y / 18}%`, width: `${s.w / 38.4}%`, height: `${s.h / 18}%` }} />
      ))}
    </>
  );
}
