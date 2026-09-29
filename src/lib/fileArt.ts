import { SITE_ASSETS, sceneImage } from "@/config/cdn";
import { loadAndDecode } from "@/lib/scenePreload";

// Four recovered specimens for the evidence page. Composed from the real Mutantfoots trait
// layers (0xDarkSeidBull/nft files/mutantfoots) on their 44x44 pixel grid, one 176x44 strip.
// Tiny (about 1 KB), so it ships inside the code: nothing to host, nothing to load late.
export const SPECIMEN_STRIP = "data:image/webp;base64,UklGRtIDAABXRUJQVlA4TMYDAAAvr8AKAAfjRgAAIsq2a2vmv/mF9ia3drbt+4bb2LZV5Xx3B7IvDSBdkNIHJZIRuru7u7vr2rbN6sS2ikgDaTsdOF/PX7Zt48x//P/4+3t7Pr5+K9JVOPli5w0KgKPn0fA4oAdOcP1g0Qc3NOlzUfsGCGHB/mB3OHAfS+kY/aachz623/+AxMnlzEKCb9OjDdw3YLO/y1p2xdjxT0O3Hx9x7vZB/y8Nwd2P+II0lQAWoPNggvTVwAFHQOzveg44yhvnsHYeAPQGM0owSQbn55EPmqFq7N+OcNWtHMfC/hBOY0VIBaCgXM7W0735cIJKOAQA3nywWI+papRWB4obHwjGFrkCk0AbfYn08hOKnv3SF2RouRkaUARoglLrZJBaOhQS10GNEClkvxIpWRJWl7ph28o9Up2XffzJIN22rTWtSN1C3d3d3d0FS6Devv9bQM4X8u0ycu/PsyP678Bt20iiAM/skY/8QBuEloaWhBZnPmKXCq+xxPI2VlFVP2J3GJtejaEyVj9QNUanIN4K8Uqe/qcqJPPJgryztBOetd7wrJ2FZ+2aZIF5Fqi0taVI/UQ6J9IVJV/w41NeyCMchGavLTR7Xmj23rUkXxB3/35LssrjZ/yCuEPYDpJ3GHUJVcVYCJJ3IHl5Z+NXyiQ2njPyLoqOnmHhLkTifubF1q+UepjQlLyzcSflMxuXeXEH8Sw8RzQ2xfJecCgQZTLhy7u/NnXxp8gAieAXXfriDiJI3KFGVeswckHyDuFyw1d5hz2zGYa4DQKdpUI+Af6i+XdZHmX2YDYQbcri5yqVbTA33k3JA4L/rrvKkiRsMrDhJ8kvkHFHNM40wqUxvr1dHqgjQkyXvtERkfZOtUiGcMO3er6JvcQYF0WectbGnfHSpzWtOItGa0igaZYcgqx/rxM3zXJBUiRRM1qrqk4tibG8TnIZZNQMofNAU6rUqFiO06xUVSpCdrxWBOI0GwsZ4SGiRu3QvnD1rCWVdCFDkiQJ+mDkIpB8EHfR5nFlf5AkSRro1hNEVbPizpKqybXTqtogEshUZImSE9WcSCJdG/PkkEhQS5vktsgcF4klndGmLNdoECoL4RoloX6QBrHSSEmAKrKpZqSKhHhSpQYNInSTrB8gaatcSZQRg/3XKTKXmluZS1mrNwyAHAWJO7TOiBPBytyKrUOS9aGTrUBke0vRT3TTqnNmOXEHED7pStJCQ3UVGGQ4UNpjKisLaVgJWH7dbn4IgswAyeOgokr7S4uhM+oY9shQgDOhXsgCmKPIIflTsdJ/SgE=";

export const SPECIMENS = [
  { id: "SPC-017", traits: "melting green · serum m1 eyes", rot: -4 },
  { id: "SPC-233", traits: "cyclops · hazmat · serum katana", rot: 3 },
  { id: "SPC-418", traits: "melting lavender · scream", rot: -2 },
  { id: "SPC-590", traits: "toxic hellfire · serum chest", rot: 4 },
];

export const DEVIL_1 = SITE_ASSETS + "devil-1.png"; // Hellspawn, CAM 01
export const DEVIL_2 = SITE_ASSETS + "devil-2.png"; // Dark Sovereign, CAM 02 (silhouette only)

// Fetch + decode the file art (and its stencil font) before it is shown, so it never opens blank.
let ready: Promise<void> | null = null;
export function preloadFile(timeoutMs = 6000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const font = document.fonts?.load
    ? document.fonts.load("1em 'Black Ops One'").then(() => undefined, () => undefined)
    : Promise.resolve();
  ready ??= Promise.race([
    Promise.all([
      loadAndDecode(sceneImage("bestspread.webp")), loadAndDecode(DEVIL_1), loadAndDecode(DEVIL_2),
      loadAndDecode(SPECIMEN_STRIP), font,
    ]).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  return ready;
}
