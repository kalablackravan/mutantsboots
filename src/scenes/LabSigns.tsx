// Lab room wall signs, placed exactly as in the "numbers" PSD. Art = the original webp files from signs.zip
// (signs set), shown in their own colours.
// x / y / w / h = the whole image's box in canvas pixels on the 3840x1800 art (% = x/38.4, y/18).
const SIGNS = [
  { f: "999_01_thin", x: 2902.9, y: 1280.1, w: 109.0, h: 177.8 },
  { f: "lab_01_tube-thin", x: 1720.1, y: 1423.2, w: 56.6, h: 70.5 },
  { f: "lab_04_flask-thin", x: 1831.6, y: 1418.6, w: 64.8, h: 77.7 },
  { f: "math_01_delta-outline", x: 1275.5, y: 1360.4, w: 85.6, h: 87.0 },
  { f: "04_equals-thin", x: 1346.2, y: 1392.1, w: 54.4, h: 30.7 },
  { f: "qmark_01_thin", x: 1399.2, y: 1358.3, w: 38.4, h: 79.3 },
  { f: "07_star-scratch", x: 721.5, y: 1082.6, w: 227.5, h: 242.9 },
  { f: "Gemini_Generated_Image_x1zabnx1zabnx1za-clean-Photoroom", x: 1011.9, y: 837.7, w: 166.4, h: 123.7 },
  { f: "111_01_thin", x: 2745.6, y: 651.7, w: 58.8, h: 143.4 },
  { f: "01_thin-cross", x: 2797.0, y: 676.1, w: 80.5, h: 79.8 },
  { f: "222_01_thin", x: 2846.1, y: 660.3, w: 70.6, h: 104.4 },
  { f: "04_equals-thin", x: 2894.8, y: 685.6, w: 86.1, h: 48.5 },
  { f: "555_01_thin", x: 2971.6, y: 658.6, w: 69.6, h: 94.6 },
  { f: "math_01_delta-outline", x: 3015.1, y: 686.0, w: 69.5, h: 70.8 },
];

export function LabSigns() {
  return (
    <>
      {SIGNS.map((s, i) => (
        <img key={i} className="lab-sign" src={`/scene/signs/${s.f}.webp`} alt="" aria-hidden="true" draggable={false} decoding="async"
          style={{ left: `${s.x / 38.4}%`, top: `${s.y / 18}%`, width: `${s.w / 38.4}%`, height: `${s.h / 18}%` }} />
      ))}
    </>
  );
}
