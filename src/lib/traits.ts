// All 91 Mutatedfoots trait layers,
// reduced to their native 44x44 pixel grid and embedded, so nothing has to be hosted.
// Loaded lazily (dynamic import) by the lab displays.
export type TraitCat = "face" | "eyes" | "ears" | "nose" | "mouth" | "chest" | "costume" | "weapon";
export type Trait = { id: string; cat: TraitCat; name: string; img: string; bb: [number, number, number, number]; color?: string; devil?: boolean };
export const TRAIT_CATS: TraitCat[] = ["face", "eyes", "ears", "nose", "mouth", "chest", "costume", "weapon"];
// paint order, bottom to top
export const LAYER_ORDER: TraitCat[] = ["chest", "face", "ears", "costume", "eyes", "nose", "mouth", "weapon"];
export const TRAIT_NOTE: Record<TraitCat, string> = {
  face: "Base head. Exposed Jaw or Melting, in seven colours. The nose always matches the face colour.",
  eyes: "Eye mutation. Sits on top of the face and any costume.",
  ears: "Ear shape, drawn on the side of the head.",
  nose: "Colour noses always match the face colour. Specials replace it.",
  mouth: "Mouth mutation, painted over the face and any costume.",
  chest: "Body layer: bare chest in the face colour, or an outfit.",
  costume: "Full head costume. Any specimen wearing one is Ultra Rare.",
  weapon: "Carried weapon. Weapon without a costume = Rare. Chainsaw never appears with the dragon costumes.",
};

export const TRAITS: Trait[] = [
  { id: "face/devil-face-hd-2640", cat: "face", name: "Devil Face", devil: true, bb: [7, 6, 37, 38], img: "data:image/webp;base64,UklGRgQBAABXRUJQVlA4TPgAAAAvK8AKEPVAiiRbtoIIVghABVpQgYpRz9eDlXP+5dzHuGwNh/lZeKZ40R66twKBJOmR91DQtg3T/S38gQ7C/E8A3i1PZSg9131hL+BoIi9NFYKiGeRschAgJXmRnOThEtndZQo5JDGWAaHZ3YltzyIZoqTAGkHR3RxsYqrY4ySnHRB40I+iQJAkO7nHdVK6JNWRBQi2H7VtqKLJ7Gy97svc9i+ZZR7Zk32OnUlBqotSZtvcbJcIkjTCuDEWxDFsg2WMfYX/67oeENghAGSVbY/kPCH1Eru7lyAHMtnSfYIAyJktaZ8AwANbOgcDx6eRi3EY9qRHT3mrAw==" },
  { id: "face/exposed-jaw-brown", cat: "face", name: "Exposed Jaw Brown", color: "brown", bb: [14, 12, 30, 36], img: "data:image/webp;base64,UklGRoYAAABXRUJQVlA4THkAAAAvK8AKEDWwiW0rjpTvgJoaIUj8WpAQIbRr9qS6z2zbJupGuzLxAuonfYb/xaCobRuIQHfyR5dXSVTq/wTwewyz/YuspTPLW93fVXLLcp27iPftXRS6IgghdmFf7V1UpNBCCO1iKzddrIGWi11JLnYAyS3LuWiyJ153AA==" },
  { id: "face/exposed-jaw-cyan", cat: "face", name: "Exposed Jaw Cyan", color: "cyan", bb: [14, 12, 30, 36], img: "data:image/webp;base64,UklGRpAAAABXRUJQVlA4TIMAAAAvK8AKEHWwaiTJipS1cdbQgQ2yWk4BQQi/9+INXzNkcjESScrg+Kv2ZbB4FAkIi1DUtpGEYE4Aw2fex/JXXyWxUv8nAJ/HcSa/0XDvP7J5K/u9mrppjsxNhMr0JqK4xqcoipuwl/QmFEVRFLWJJZl00AZIOdhU7w42AJDmcJDElvC4AwA=" },
  { id: "face/exposed-jaw-green", cat: "face", name: "Exposed Jaw Green", color: "green", bb: [14, 12, 30, 36], img: "data:image/webp;base64,UklGRowAAABXRUJQVlA4TIAAAAAvK8AKEDUwimQ7ipRvI1LiAhnxgYCvJRIQkuvKDqd5RhsgGU14jWf8y0w2+5NBSSQrVAK+/Stgn8UT46lXgpn+TwC/x2W3fVK848zWmebvKgUyV+MuQnd9F5kqeIQQu7C3+i4KPlNCCO1iK1VdnAM1F3clubgDSIHM5WKVPfG6Aw==" },
  { id: "face/exposed-jaw-grey", cat: "face", name: "Exposed Jaw Grey", color: "grey", bb: [14, 12, 30, 36], img: "data:image/webp;base64,UklGRogAAABXRUJQVlA4THwAAAAvK8AKEDWwiW07ipRvIwrS4yOakPC1RAJC0q7sUN2nqG0bSP2tpTYyY39PUtQ2koNg+17lj2xeQ2Kl/k8Av8elbvukmF9ntr41f1epj8yjcRchsr6LTBYMQohd2El9FwWTSSGEdrEZqy7MgZoLu5Jc2AGkPjIPF6rsidcd" },
  { id: "face/exposed-jaw-lavender", cat: "face", name: "Exposed Jaw Lavender", color: "lavender", bb: [14, 12, 30, 36], img: "data:image/webp;base64,UklGRooAAABXRUJQVlA4TH0AAAAvK8AKEFUwiiRJipS1gQxsYAIlaBgtKwEhfPfihldNr9lIMsj8Zer6ZhQvMgJFbSM5CLZSXAjt+M5rSJzU/wng9zjdy280bvuZLV3Z39Uc48GRuYthMr2LKG75EULsIrykd6EoCiG0i7WYNNAGUgZ21buBHYB7cBhIsidedwA=" },
  { id: "face/exposed-jaw-pink", cat: "face", name: "Exposed Jaw Pink", color: "pink", bb: [14, 12, 30, 36], img: "data:image/webp;base64,UklGRooAAABXRUJQVlA4TH4AAAAvK8AKEA42sW1HkRIb8REtUYMHXNAjASFpV3ao3vvMPBRCtgKBZBhZCKl8gw6DW00AEEwhK4dcflLIoMCq5Ov/BOD1GNPLOwXYt2fTd/FzNVTSsRSuwovmVzGj0r4oilqFI8ivIu2LoiiuYrHLjhp9gJytSrIVAORvWawJtzs=" },
  { id: "face/exposed-jaw-slate", cat: "face", name: "Exposed Jaw Slate", color: "slate", bb: [14, 12, 30, 36], img: "data:image/webp;base64,UklGRowAAABXRUJQVlA4TH8AAAAvK8AKEFUwiiRJigN+vDdwgQ2MjpaVgBC+e3HDq6ZXbSMpjsjgWqMZCieybwPFbdtGC+ROevy6/1p+eYkC/Z8Afo9j7PxGwxI/s2Xf7O9q8udBM3MXs1V6F1G40UcIsYvwNb0LRaEQQrtYmUkD2kDKgF31bsAOwD1oGpBkT7zuAA==" },
  { id: "face/melting-brown", cat: "face", name: "Melting Brown", color: "brown", bb: [14, 12, 30, 43], img: "data:image/webp;base64,UklGRnoAAABXRUJQVlA4TG0AAAAvK8AKEHWwaiRZihQcIAIhTxKm3+Mabr6aZCZR1LYNnAPR1zkA1dS0bcDCu7v9nwA+jz0/f6MO9pGVZfbVGg9S3Lzh61ak6jOLVFmkbMe1SnsjlkSKrStibAT4YzCOBo2Asx2kAoyoVqSakVoRAA==" },
  { id: "face/melting-cyan", cat: "face", name: "Melting Cyan", color: "cyan", bb: [14, 12, 30, 43], img: "data:image/webp;base64,UklGRnwAAABXRUJQVlA4TG8AAAAvK8AKEHUwiiRJim50YANNvPGxy9XcvKqJaIJI20b3+NAU3MQ9qmnbgI2hyFs+vVf/J4DXY2umr9Ts3571afLZGo7Uf/E67FqkyiOL1C9lOy5V6isxJ1KsXRBjI8AXg3E0qASc9SAFYES1IlWN1IIA" },
  { id: "face/melting-green", cat: "face", name: "Melting Green", color: "green", bb: [14, 12, 30, 43], img: "data:image/webp;base64,UklGRoAAAABXRUJQVlA4THMAAAAvK8AKEHUwiiRJik1cIAMfKwRzu1zNzat4dIeatpEY/lhuvvm+F1ZK2kaA/Is5evTYq6r/E8DnsZfmb9T9/yMrwOyrNZalfPMG0q1I1WcWqQJI2Y5rlfZGLIkUW1fE2Ajwx2AcDRoBZztIBRhRrUg1I7UiAA==" },
  { id: "face/melting-grey", cat: "face", name: "Melting Grey", color: "grey", bb: [14, 12, 30, 43], img: "data:image/webp;base64,UklGRnoAAABXRUJQVlA4TG4AAAAvK8AKEHUwiiTbiTvu+EATRpD3iUvmND8tCtI2YPwr3h+K2raBYwB6Pdut/xPA57Hl5m/U4H1k/TL7ag2H1H/zOtVjUSo8syj1S9mODlXGN2JJlGLrgGhsBCjRYBw1GInguB3EADCiWlFqNEqtCA==" },
  { id: "face/melting-lavender", cat: "face", name: "Melting Lavender", color: "lavender", bb: [14, 12, 30, 43], img: "data:image/webp;base64,UklGRn4AAABXRUJQVlA4THEAAAAvK8AKEBJGkWQ7sYgNTKAEJdj7xCVzGnLaA0G2jdxM5jGja5xLIED8dxnRYED/J4DFY6zlG4rg7bJ0lx5a2Ze6Rl5Szlulwj5bpS4p26tDlfyGqLJK0XTAamwEeFeD8apBzgpem4M1AIyo1iqVu0rVCAA=" },
  { id: "face/melting-pink", cat: "face", name: "Melting Pink", color: "pink", bb: [14, 12, 30, 43], img: "data:image/webp;base64,UklGRngAAABXRUJQVlA4TGwAAAAvK8AKEHW4jm1bhoIUi2jEIwUJzY7Z13boPgTZNjxTmMwsjnBuIQGZ0j3wQv8ngNtjuYbPVPxnzWoZvLcakPoOXpXuilR7yyL1SdmO2yrdMzEmUszdIsZGgCcG42jQEXDmg7QAI6oVqc5ITQg=" },
  { id: "face/melting-slate", cat: "face", name: "Melting Slate", color: "slate", bb: [14, 12, 30, 43], img: "data:image/webp;base64,UklGRn4AAABXRUJQVlA4THEAAAAvK8AKEA7GtW276MBMAUpSlMp/wJWNzg93LTJpm6v0qrC5mnSCbBuPKUxiOhc6b/8ngN/jqPk7DdDPbN6y79byS7WHN1WJWSq8Mks1qVKKS6gS34k1lmLvABdKQYDqAoViDSKG4v3AAVAQ1bJU1FIbAgA=" },
  { id: "eyes/acid-drip", cat: "eyes", name: "Acid Drip", bb: [20, 18, 31, 26], img: "data:image/webp;base64,UklGRmQAAABXRUJQVlA4TFcAAAAvK8AKEFUwahtJEoYBsMQX1oBZAj2v+u6V6Shq2wYO9ntsYxKNMNtov9FN4yCPrv8TwK3yOCu7Bky6/CGchD2EkxJcmKJFE85fZdcABEEwpBed0NTmNgkA" },
  { id: "eyes/cyclops", cat: "eyes", name: "Cyclops", bb: [22, 17, 29, 24], img: "data:image/webp;base64,UklGRlQAAABXRUJQVlA4TEcAAAAvK8AKEA41bSNJ7en401oOy+EA/NXour8LQbYNwI3uDzOLkgWYfBFENPYgZlP/J+AvgPEdq3hmB2RIFhaDkGFagKfMWGRlBQA=" },
  { id: "eyes/hypno-spiral", cat: "eyes", name: "Hypno Spiral", bb: [20, 18, 31, 23], img: "data:image/webp;base64,UklGRlAAAABXRUJQVlA4TEMAAAAvK8AKEAo1AZBIuyWMYs+rKxPr/SAQSHxGXTqBAPGlV5Aj/VebtgFjbymPvKliscUfgwgNGX4crMaikC8Zf+R4mvoAAA==" },
  { id: "eyes/laser-serum", cat: "eyes", name: "Laser Serum", bb: [20, 18, 44, 23], img: "data:image/webp;base64,UklGRlQAAABXRUJQVlA4TEgAAAAvK8AKEAZFkaQ4TtCCPiSg8/45f+PSf7IAE5OxxDeEOPvrv8K2bZDCeI9gq5DIrP6gbXEQohk45V+bo/AX4Vb+tbk2LB7vTAI=" },
  { id: "eyes/molten-toxic", cat: "eyes", name: "Molten Toxic", bb: [20, 18, 31, 25], img: "data:image/webp;base64,UklGRnIAAABXRUJQVlA4TGYAAAAvK8AKEAbGkSS1eeJiIyAyIktv94uRlkzAIoFCui2aME4B/GbatmFQ9S2CboMStIPYf7Rt20aZkpaP/Ftlwj7Abxv31g5QACHnskPlfSZi5RDZJgDp3sohYgCSjUOstUPBxu2o+QE=" },
  { id: "eyes/reptile-slit", cat: "eyes", name: "Reptile Slit", bb: [20, 18, 31, 23], img: "data:image/webp;base64,UklGRlwAAABXRUJQVlA4TE8AAAAvK8AKEBJFkaRGGjCGMOQgJZrufG8Fg0AgYdjfZrGItG342BTMzyVdff/Vpm3A2FvKI3+pqIMk5L8JmJIH5L8ZkME03Mh/M2JToFP8lqkfAA==" },
  { id: "eyes/serum-m1", cat: "eyes", name: "Serum M1", bb: [20, 18, 31, 23], img: "data:image/webp;base64,UklGRlYAAABXRUJQVlA4TEoAAAAvK8AKEAZFkaQ4bpCG/C0cwOX4y0WQbWM18sHcYwBXyDYCJHIEh/L621z/hQQJZo/8pRLDUPx1IE5/GpDExV8PSBGkCYWSb5n2AQ==" },
  { id: "eyes/swollen-mismatch", cat: "eyes", name: "Swollen Mismatch", bb: [20, 17, 32, 24], img: "data:image/webp;base64,UklGRmgAAABXRUJQVlA4TFsAAAAvK8AKEBJGkWw10oAADCABxOENY2wO77rx/CNBIAjDHNtvMVVEAhAbfJBc8MQ6mxzS/wn4r4F5WT4vlvOqzXSOoiHo7o5ghUXSpe4YRCK6wABz5Zmet6jLIJdVAA==" },
  { id: "eyes/toxic-hellfire", cat: "eyes", name: "Toxic Hellfire", bb: [20, 1, 31, 27], img: "data:image/webp;base64,UklGRrQAAABXRUJQVlA4TKgAAAAvK8AKEBK3jSS5kUmTPgOQoTCUi54ZyBNA86y3Fu8SN2sQYBqCREI4ypHOc4AwsplBgGkUAogpkCOd6AjDyOD9Z+C2bRx296blH1bB2n0vpP0M22IE/kZgruQg9gK6Gnajq8aJ08o0Ww9rcVedLY2I4RHHeMSro/2jFnUUjzuAf2MdwKOO0UkHv6VxB9D3D6CoQwQYaynpiNt0AEKZKYQAxSkGTfndLwM=" },
  { id: "ears/ear-01", cat: "ears", name: "Ear 01", bb: [13, 19, 17, 23], img: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4TCQAAAAvK8AKEAZFbdtA3AZk/LHkuzN3QzzUWv8n4OtproICSbIElWM=" },
  { id: "ears/ear-02", cat: "ears", name: "Ear 02", bb: [13, 19, 17, 23], img: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4TCQAAAAvK8AKEAZFbdtAxEpi/Bnluyv6StKx0vo/AfbTWgUFSbIEtWM=" },
  { id: "ears/ear-03", cat: "ears", name: "Ear 03", bb: [13, 19, 17, 23], img: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4TCMAAAAvK8AKEAZFbdtAxIp1gPPdFX1l81it/Z8A+2mtgoIkWYLaMQA=" },
  { id: "ears/ear-04", cat: "ears", name: "Ear 04", bb: [13, 19, 17, 23], img: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4TCQAAAAvK8AKEDUoatsG4o9heEYu3525ztcs9H8Cvp4mKih+kixB5Rg=" },
  { id: "ears/ear-05", cat: "ears", name: "Ear 05", bb: [13, 19, 17, 23], img: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4TCQAAAAvK8AKEAZFbdtA/HGNxwDluzPXQbs+f/8n4OtproICSbIElWM=" },
  { id: "ears/ear-06", cat: "ears", name: "Ear 06", bb: [13, 19, 17, 23], img: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4TCMAAAAvK8AKEAZFbdtA8MdjcPPdmfM0veep/xPw9TRXQcGTZAkqxwA=" },
  { id: "ears/ear-07", cat: "ears", name: "Ear 07", bb: [13, 19, 17, 23], img: "data:image/webp;base64,UklGRjwAAABXRUJQVlA4TDAAAAAvK8AKEAZFbdtAxEZiwEcs312RQCABimR/oAUCacgtihXu/wTYT7NVUEiSLGucdgw=" },
  { id: "ears/ear-08", cat: "ears", name: "Ear 08", bb: [13, 19, 17, 23], img: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4TCQAAAAvK8AKEAZFbdtAFAdwiPPdlZ2o9cP//Z8A62mugoInyRJUjgE=" },
  { id: "nose/bloody-nose", cat: "nose", name: "Bloody Nose", bb: [24, 24, 27, 28], img: "data:image/webp;base64,UklGRjoAAABXRUJQVlA4TC0AAAAvK8AKENUoaSMJ4ovPv+CB95+XEyIQSBRCHmrAIyj0fwI2bZR7IPs+iqyg/DQA" },
  { id: "nose/cyber-nose", cat: "nose", name: "Cyber Nose", bb: [24, 23, 27, 25], img: "data:image/webp;base64,UklGRjYAAABXRUJQVlA4TCoAAAAvK8AKEDUoikAIikL/Nmr5sseQSdv4V1kb7fbMQf8n4Kug/G+EJ/BGWQk=" },
  { id: "nose/nose-brown", cat: "nose", name: "Nose Brown", color: "brown", bb: [24, 24, 27, 25], img: "data:image/webp;base64,UklGRiYAAABXRUJQVlA4TBkAAAAvK8AKEAYFbdsw3Mqf3VtWt0L1P4kN8VgKAA==" },
  { id: "nose/nose-cyan", cat: "nose", name: "Nose Cyan", color: "cyan", bb: [24, 24, 27, 25], img: "data:image/webp;base64,UklGRiYAAABXRUJQVlA4TBkAAAAvK8AKECCTtol/LXW7HVMy9fOfcBsdOmwKAA==" },
  { id: "nose/nose-green", cat: "nose", name: "Nose Green", color: "green", bb: [24, 24, 27, 25], img: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4TBgAAAAvK8AKECCTton7+mc7hmd65j/hNjp02BQ=" },
  { id: "nose/nose-grey", cat: "nose", name: "Nose Grey", color: "grey", bb: [24, 24, 27, 25], img: "data:image/webp;base64,UklGRiYAAABXRUJQVlA4TBkAAAAvK8AKEAYFbdswhMufyFvWsg72P4kN8VgKAA==" },
  { id: "nose/nose-lavender", cat: "nose", name: "Nose Lavender", color: "lavender", bb: [24, 24, 27, 25], img: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4TBgAAAAvK8AKECDStqny+ec/GL+Rn/+E2+jQYVM=" },
  { id: "nose/nose-pink", cat: "nose", name: "Nose Pink", color: "pink", bb: [24, 24, 27, 25], img: "data:image/webp;base64,UklGRiYAAABXRUJQVlA4TBkAAAAvK8AKECCTtol/C5W9HaM/pvOfcBsdOmwKAA==" },
  { id: "nose/nose-ring", cat: "nose", name: "Nose Ring", bb: [24, 24, 27, 27], img: "data:image/webp;base64,UklGRjwAAABXRUJQVlA4TDAAAAAvK8AKEBKljaRAnu4pjMaQ/+IRAoHEI3+2NRYIpCGJCEa5/xNA2Sjwjuw5R2gR/AE=" },
  { id: "nose/nose-serum-m1", cat: "nose", name: "Nose Serum M1", bb: [24, 24, 27, 25], img: "data:image/webp;base64,UklGRiYAAABXRUJQVlA4TBkAAAAvK8AKECCTtol/CbW9HcM1LPOfcBsdOmwKAA==" },
  { id: "nose/nose-slate", cat: "nose", name: "Nose Slate", color: "slate", bb: [24, 24, 27, 25], img: "data:image/webp;base64,UklGRiYAAABXRUJQVlA4TBkAAAAvK8AKECCTtomV+pe7HdMwQPOfcBsdOmwKAA==" },
  { id: "nose/pig-snout", cat: "nose", name: "Pig Snout", bb: [23, 23, 28, 26], img: "data:image/webp;base64,UklGRkAAAABXRUJQVlA4TDQAAAAvK8AKEAZFkaRGflCHHtTgjd9+OTIRCCT+U26SQICYU6dGiqT+TwCTYLrKhCz46AC+Mg0Q" },
  { id: "nose/skull-hole", cat: "nose", name: "Skull Hole", bb: [24, 23, 27, 25], img: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4TCMAAAAvK8AKEDWoaRuJQXHz8ad6a/ly+f0fWPR/Ai4Kwn8h9ifklQA=" },
  { id: "nose/slime-nose", cat: "nose", name: "Slime Nose", bb: [24, 24, 27, 28], img: "data:image/webp;base64,UklGRj4AAABXRUJQVlA4TDEAAAAvK8AKEAaljaRAnv4LpQM8Qf2LQCDxyB9hqS0EAolEXLOO2P8JoG0UeEegFZa9qywNAA==" },
  { id: "mouth/acid-drool", cat: "mouth", name: "Acid Drool", bb: [22, 26, 28, 34], img: "data:image/webp;base64,UklGRk4AAABXRUJQVlA4TEEAAAAvK8AKEBo1kSRFKvDvCTFEhET/D7N6MCEmTU77B5YJCYgpBjjvntb/CWAz6j8Yi8lgliwkRYNAxOQUzyduRTU8AQA=" },
  { id: "mouth/blood-drip", cat: "mouth", name: "Blood Drip", bb: [22, 26, 28, 35], img: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4TDsAAAAvK8AKEBa1kaQ2OTH9V0sk73X0QSAQSDxDmmwsgWwaUvgCqP8TwGFUMFORMlNBH5wiRVKkFkkl7UkNeQA=" },
  { id: "mouth/fanged-grin", cat: "mouth", name: "Fanged Grin", bb: [22, 26, 28, 32], img: "data:image/webp;base64,UklGRkwAAABXRUJQVlA4TEAAAAAvK8AKEA62kSQ1ioL8oyMLTCytXqxwxKTJuf4tLSGIBROg+aME09f/CcDDaPpsKQFKVIti2aZLAQGiWAMuZ+MD" },
  { id: "mouth/forked-tongue", cat: "mouth", name: "Forked Tongue", bb: [22, 26, 28, 33], img: "data:image/webp;base64,UklGRlIAAABXRUJQVlA4TEUAAAAvK8AKEAY1AYAmKZAEhKJ/DE6uuQuZtM1Z/y4qqWbGCLONgGYwhhGd+f36PwFvMWq7GwqAG4yUfgE9qf8CTtZnfT+c3gwA" },
  { id: "mouth/lavafall", cat: "mouth", name: "Lavafall", bb: [20, 26, 30, 44], img: "data:image/webp;base64,UklGRnwAAABXRUJQVlA4TG8AAAAvK8AKEBLGtW276EGmFCUpQY+qMTXL7vpD6T7xjhBqYDx1ElFCMRSwMxIACZFIA73gC7d7ytb/CTgWRpt/J0qo6YSpWJI4WcBiMpijdeDUnLMIZPRMynCE9TiLMEZRlOH8QA8Fk9ddgijpn2qRYwAA" },
  { id: "mouth/scream", cat: "mouth", name: "Scream", bb: [21, 25, 29, 31], img: "data:image/webp;base64,UklGRlQAAABXRUJQVlA4TEgAAAAvK8AKEAalkWw1Hv9b+EXRP10gc1D5IJO2Oet9yiplJsbIAkwc0pjJkPIMpq//E8D+UsDvQYFGoiNStS80YxJV4LfiumAj0yQ=" },
  { id: "mouth/stitched-mouth", cat: "mouth", name: "Stitched Mouth", bb: [21, 26, 29, 29], img: "data:image/webp;base64,UklGRjgAAABXRUJQVlA4TCwAAAAvK8AKEAZFbSM5PJY/sAXT99nvroN+EuT+E0zSVNsxrxeJ/0c+BoAZfAnqAw==" },
  { id: "mouth/void-spew", cat: "mouth", name: "Void Spew", bb: [20, 26, 30, 44], img: "data:image/webp;base64,UklGRnIAAABXRUJQVlA4TGUAAAAvK8AKEBo2kW07kUCFE1ShBJFIocvceSXh1/c4+cEDoQbG87qIJp1oChgiAZJBPHG90Ssm+j8B6WF02TdVetiUmSKg0ykMbpZJq6Qz17AQyhjnoFpYyGSMcY6obYyfVFIEvLLPAAA=" },
  { id: "mouth/waterfall", cat: "mouth", name: "Waterfall", bb: [20, 26, 30, 44], img: "data:image/webp;base64,UklGRmwAAABXRUJQVlA4TGAAAAAvK8AKEHUwbiTJSRQES3zkQSTew2if2NVuiyCApKl3iGDOCcikbapiZ23MyfwbGfR/Ar6L0SZfVCmeRZlaAZ1yq7VqXeabfTo9mIWQE4QblWYh4wRBuEUpxBISmcQscw8=" },
  { id: "chest/bare-chest-brown", cat: "chest", name: "Bare Chest Brown", color: "brown", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4TDsAAAAvK8AKEDUoiiTFkYIDRODfFZfTK45YMA1BdOUwgmzbkMC2v/8T8PfsEqA/uAaJDZj8B1il5BZMwAe6AwA=" },
  { id: "chest/bare-chest-cyan", cat: "chest", name: "Bare Chest Cyan", color: "cyan", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4TDwAAAAvK8AKEAZFjSQpulfH2hiXx/iijlgwDTF0RTCxYOJPl0UG+/s/AZzZrcA/ugeZHYjQXwC7lN2DAPwFDAc=" },
  { id: "chest/bare-chest-green", cat: "chest", name: "Bare Chest Green", color: "green", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4TDsAAAAvK8AKEAZFjSQpNtfFyhjhx/iijkAgDbEsMEECgTTkMsAG9X8COLNbgX90DzI7EKG/AHYpuwcB+AsYDgA=" },
  { id: "chest/bare-chest-grey", cat: "chest", name: "Bare Chest Grey", color: "grey", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRkYAAABXRUJQVlA4TDoAAAAvK8AKEAY1kSQp7i5/H+/fAHNEOwKBNEQWwCCLBRPVvXEk3v8J0JndkFxF9yCzA/+hAHYpuwcAAcMB" },
  { id: "chest/bare-chest-lavender", cat: "chest", name: "Bare Chest Lavender", color: "lavender", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4TDsAAAAvK8AKEFUoaiRJsbg21sSa32N6YSdCgoT/e00mAkmb0Nv++v2fgL9nlwD9wTVIbMDoP8AqJbdgBD7QHQA=" },
  { id: "chest/bare-chest-pink", cat: "chest", name: "Bare Chest Pink", color: "pink", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRkYAAABXRUJQVlA4TDoAAAAvK8AKEAZFkaQ4ItGCGuRejq80iAUTf8QYMtglFkzk+7MYZ/8ngDO7FOhH9yCzAyN0gF3K7sEAHBgO" },
  { id: "chest/bare-chest-serum-m1", cat: "chest", name: "Bare Chest Serum M1", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRkYAAABXRUJQVlA4TDkAAAAvK8AKEAZFkaQ40nCDKOxejq80CATSEMoW0ySQTUMkCbT3fwI4s0uBfnQPMjswQgfYpeweDMCB4QAA" },
  { id: "chest/bare-chest-slate", cat: "chest", name: "Bare Chest Slate", color: "slate", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRkgAAABXRUJQVlA4TDsAAAAvK8AKEAo1kSQpDj57Aedf5jNGNHclpE1DiqEuEEhDHissUf8ngDO7KzP/0T3I7EAIFWCXsnsQAAWGAwA=" },
  { id: "chest/black-gi", cat: "chest", name: "Black Gi", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRloAAABXRUJQVlA4TE4AAAAvK8AKEDUoDQCkSc6MzcwR/P8Z7tG2QCAJfagBFbRtw4b2F6X/AoIi1rw1O6H/9wianfNBxI8IawIBS2zpwdpoiG8nuJnwOr+gGjYKyns=" },
  { id: "chest/bone-armor", cat: "chest", name: "Bone Armor", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRmAAAABXRUJQVlA4TFQAAAAvK8AKEDUwiCTJiZlX8ApwhjL8vBVyhl6lbRuwIZYOFDVtIzH8Gd63LSC+Df0XkCQGjfHMrvC0Y1C1yzR6q/DJdEysdkH3JmCstANIkt6aau3s8QA=" },
  { id: "chest/burnt-hoodie", cat: "chest", name: "Burnt Hoodie", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRm4AAABXRUJQVlA4TGIAAAAvK8AKEDUwimQrzhUFSIiAKEIHyr4/9nfO8kZB2zbS/u2OWJCVt4K2bRiyARaY3VX/J8DP7CnezvVdlQCpXK9WJb6vx+fsiQCJa5byAwZ0IEAFKD9wpsq59ogHQ6rUCOixAQ==" },
  { id: "chest/devil-armor", cat: "chest", name: "Devil Armor", bb: [8, 30, 27, 44], img: "data:image/webp;base64,UklGRnYAAABXRUJQVlA4TGoAAAAvK8AKEDW4iWRbqlIEvAgBqHhaniRU7xfCv5wWCCT586y0h8K2bVuc2cH+K0zbhlE6X8kHZlZKr0GdzTUorCRpBiW6B680qQRYHAIKDJJkUoMkFboH89E93Ney0RL3lQ9oWRybr0T3EDwO" },
  { id: "chest/hazmat-suit", cat: "chest", name: "Hazmat Suit", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRngAAABXRUJQVlA4TGsAAAAvK8AKEDWwiSRZVf4knMQn6eJPep6FL4SZIppV1LYNFCC7CFRlOBADu7dhCIr2G1uTRiAHkcJp9n8CeGaPM3B39B7U8RIa7iIpEjJo1krKfpq1AZsEAINpdzU8izgDd8leQFIkNNyquoPzAAA=" },
  { id: "chest/lab-coat", cat: "chest", name: "Lab Coat", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRmQAAABXRUJQVlA4TFcAAAAvK8AKEFWwiWyrlR8kUyMCC0jAAT1DnX6OVT5Pbds2jC7Pxb3OCtq2YXPp/liMz/o/Ad81uwbw0HsOEoCDAKoOWI3sFphfCysQGYgarAAGsvxaZFV0mAUA" },
  { id: "chest/stitched-jacket", cat: "chest", name: "Stitched Jacket", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRnAAAABXRUJQVlA4TGMAAAAvK8AKEHWwimyrjQ9UoAMpSEElWlp68tXLuRBp29DB46P5VzUpZAEm784h5E8RQhhh9J9s0sZAtz5y77Mz43nsLdoGvtz3HblTYDRVmECoKZUzkalHCHmnpkkGoOUmuQFagBsA" },
  { id: "chest/villain-suit", cat: "chest", name: "Villain Suit", bb: [9, 33, 27, 44], img: "data:image/webp;base64,UklGRl4AAABXRUJQVlA4TFIAAAAvK8AKEDUoiW0rkt9/yZDgRyEC/WM8iVrV9h5BAEmZjTLFRnuqiSSFqchBMoMaShz+TP8ngGd2g0jHm3uQaQkiZSFIdhP9OdWPIMquHwki+hsD" },
  { id: "costume/blood-beast", cat: "costume", name: "Blood Beast", bb: [7, 7, 38, 44], img: "data:image/webp;base64,UklGRtIAAABXRUJQVlA4TMYAAAAvK8AKEA63kSRJinaBdBJGrA2YeD7hD0Yg7Tszuzxizb2mIVkByCSkhxTRSSTTf3Nm2rb5qgIogOEIxP5jNUL7+u/AbSRFcpZ5Dz7BX9ic7Pt9ptJA9jQGSOXnjWJqX5n3v99Kp+fncQQgbZdpT+Red8/d5GgVQW+Qc0kKeGMKOPIV6jkPYTVDAqIVgN4Wi2hFDDv5suJCzWxJV0bwJ2x2wEV7rznZ2/8xPRck+DhKoozJVqoFyJ5szf81PcE4Bty82N1upRk=" },
  { id: "costume/dragon-black-costume", cat: "costume", name: "Dragon Black", bb: [5, 7, 38, 44], img: "data:image/webp;base64,UklGRv4AAABXRUJQVlA4TPEAAAAvK8AKEHU4jiTJUV5nAMKGs+KcxLCzhq9mVO9wiOdErBhFbaTAuXL9UIMXFESyQflT+AURTR7zZvrPwG3bOM6atOp97BPxF9pRZM5Ksc3ovLceTr+UFkPG+xV91VMTa0dB6uthNz8q7xeZiyEOynbJOdCjkWZl2mKwmWqRwAKlSxAxCHMXl6DpowWG8yW+Jt5PCsfhZI3avV8QdnS1TPBAvnLD7L24Ye9CbhenK56Vf4G9aDlSc2miZoBGrN7+x7BsVYT9u2nXSkHmLAw/W5LRSGOolwZjCUbXLxgqaDFrLRNzCjIceq8COWGJfAoM4S4AAA==" },
  { id: "costume/dragon-purple-costume", cat: "costume", name: "Dragon Purple", bb: [5, 7, 38, 44], img: "data:image/webp;base64,UklGRvwAAABXRUJQVlA4TO8AAAAvK8AKEJW4jSRJUnQ0VEzAJLzCMKxBRZtne+eOR5x7mr1PUAxJEhu9+IsIh7B1LkemAZFHG2VU8Ismj9n6z8BtI0XpYvYYPpE/YS7LYbjCTnrDM/o43T9Sb7BE71dVWiSnwTYI+3H2HU3vl+RfPEi5ofbAHpvAYv7YmVoV4ETqi48E1mSuxTbXxDSFXDNT72fBdQZlk+26B9KBTasDPlAPAL9DMkxHT9hfPYRqdjFZ0/nE15BN3AG00TYM5X8MGzaXFQjLqxYowWCagwqH4Tjcl1ahB5Vj918wNPH6obVqvJ6FBn2vRgVpq2ImSuFNAgA=" },
  { id: "costume/ice-beast", cat: "costume", name: "Ice Beast", bb: [7, 7, 38, 44], img: "data:image/webp;base64,UklGRtoAAABXRUJQVlA4TM4AAAAvK8AKEBJXDejGDb9BGo3xGImRGIwBuK/Edbrj81menuRasgxEkhHjnygfSTJRlLqhJgAIprdcArkk2Lv/DNy2jUPt8voT/IStg2bboUYzYmYW+xWSDJLkXKwa/Mnlv3apZSOOqmX5I0gEKdV9hFQd7t3NohtJjgb4kyMpaQIcyc4TgPfu5kC7RCJ1QZQDgESpKel3pQiUFYS5m0VAI2WVM/WNfx9JAC46dbMnR7L1nO5ICor+6StR4zRGM0YAyEQ3bS/jtUGq9IYsbcIhAA==" },
  { id: "costume/lava-beast", cat: "costume", name: "Lava Beast", bb: [7, 7, 38, 44], img: "data:image/webp;base64,UklGRtIAAABXRUJQVlA4TMUAAAAvK8AKENXAjSTJkaO+BW/Cm/AgpsFHeATt2DIQseDASquO2A6MMBGjKWgjhfnB0oNHbKBVIdsIEPX5nNiJvOn/BPAnfI+bPaonB2Jmls/xNtd2FDd97nwu/OMY7690j/gn1yLXqrC2ubblPDZ5ee32BXtfXMkKCCGEEAIQ1z0OzosgmmFD0QnQm5fwKFa0mJeBOc3yWvGWPEYFo/IYFXQnQJc85pxmO0IIIVRPBfMKnCjak8fB8coEIijZFozKYwDuRaDQVQA=" },
  { id: "costume/serum-beast", cat: "costume", name: "Serum Beast", bb: [7, 7, 38, 44], img: "data:image/webp;base64,UklGRuAAAABXRUJQVlA4TNQAAAAvK8AKELW4qW07VkzgBx8IQBRe6BBDiYCZPPIyMZQn6Zle2vy1zDRAMl4u+v80IAEzgBG8TWGmjZT9Rb6O1/FO3gMimJgQgAGS/jtwG0mRnGXeg0/wErbcqnVVeypIdeOmcsnzSjG/eQsL338WmMnzGL277WH0ydVu6Lbrtty12hlqXdwpL5D2+JAiYMoUMMJX8Gc0WjI4ELQCkNvpQ9BKMNKRyxEXUksrdKUEL8JmAyxo77tW/T8WzwIa+t5bQSUWtuKtiydr8l+TE5SjwM3TlG5FDQ==" },
  { id: "costume/shark-blood-red-costume", cat: "costume", name: "Shark Blood Red", bb: [8, 1, 38, 44], img: "data:image/webp;base64,UklGRsIAAABXRUJQVlA4TLYAAAAvK8AKELW4rW23bTqVWTNo/1k0iCZIthnxJacuJ5QOQGsmABm6iCOPQCI6t0dt2zaM0+uY/z8N0H8HbiMpkrPMe/CJ04wl4qYHVWcVKbXfFUpEcUyKA13YuHtaEDGjmu7WGsQdgdkxAfmnISeiwIoqBRv3UPbldBl6fkwEp09guulzIvCGRTrttGm3YpH7MeMT91dgayn8H6P7RHQn6M5jImi3McXxFHyLaGxNrbdA2U2TOU47AQ==" },
  { id: "costume/shark-costume", cat: "costume", name: "Shark", bb: [8, 1, 38, 44], img: "data:image/webp;base64,UklGRsQAAABXRUJQVlA4TLgAAAAvK8AKEHW4im3baSygBC1YeXKwhRAUtCSv3XvS/w7tXqVtIzF3+0/4BT6u8J8obSQFQv1oJIrtv0KS/jtwG0mRnGXeg0/wibU5vRxUcAypiw2OQbkbTsxwoAsPwSn0QjyOFjuSNYgDoc05MiukeY8uKpVXYpoxCk6t9HL2Gia+JAWelemjkwrFsFSn8dHnIj/kn3GSPEVbDvf6f0zvFHQojKeSFIZtSTKFqm8hdiTT5C1QPtPkGacR" },
  { id: "costume/shark-ghost-purple-costume", cat: "costume", name: "Shark Ghost Purple", bb: [8, 1, 38, 44], img: "data:image/webp;base64,UklGRsAAAABXRUJQVlA4TLMAAAAvK8AKEJW4jW1bqXIiYkqgJMqmECpwnt4DfMmw+zQhEoDggQkm+D9LpChq2wbqq91FZGyGqqwn9d+B20iK5CzzHnzi3LBC28RQdeyQKh87qOtyOCKHA11YsaYducToRCytQTBCSooJKB9CPokMK85RJIFNyZdz+9DzbSI4o2G6Fk8CbVik0861zypdF/8zot1fIUlL5v8YXbSICbrRJoK2Y5MdTca3sJakqfQWKJ9pssVpJwA=" },
  { id: "costume/shark-great-white-costume", cat: "costume", name: "Shark Great White", bb: [8, 1, 38, 44], img: "data:image/webp;base64,UklGRrwAAABXRUJQVlA4TK8AAAAvK8AKEHW4iiTbVSygBC2IQRCaEIKCzI1n3yP97QmcUtu2DWP9/62nkgwK27Ztslf7/7cC+u/AbSRFcpZ5Dz7BBdt+HnJQ+5wj7TbmUJmOU3Ic6MKTdVqRLKOXrFqDMISIxk2yuSn+FBqsuEtEYaPqy/k6nGEmAZ5hMH0WFOiGJTqNz96ryLRfxhlIxtSWyBz/x+TOMJEJnFYzCRz9Z5rTafgW06KaVm+B8p4mS5xGAA==" },
  { id: "costume/shark-hammer-gold-costume", cat: "costume", name: "Shark Hammer Gold", bb: [8, 1, 38, 44], img: "data:image/webp;base64,UklGRsQAAABXRUJQVlA4TLcAAAAvK8AKEBJHtW07jQX0IAVJeOtCoqAnv70LabN316e9mUIIaCCADEOKqj0wk9ilJAAQpJOIuob/G1jhif47cBtJkZxl3oNP6ISVhCYOVduIVAkXQm0bcV4RB7rwtASake018tXirEEsCGaeW74A0TlPKLJCStjLEsu9HOfh/JeSgObI9FlWgWBYotP02Wdl27b8M3LaX8Gcpfh/TC4ntAicLlMSGDdSShMo+hbJzJk6b4HymSZTnKYA" },
  { id: "costume/shark-toxic-green-costume", cat: "costume", name: "Shark Toxic Green", bb: [8, 1, 38, 44], img: "data:image/webp;base64,UklGRsYAAABXRUJQVlA4TLoAAAAvK8AKEBpHte1IkQV0IAlJyEICQlBAzzXlQ0+7REG5+FnEhIJINqgA7yOCHkopKYwShpIAQJAPJAaQ9P8aVnii/w7cRlIkZ5n34BN6YGPA0gw1lxNpSnJCRRDnFXGgC09e6ETiNfKVJ2sQjmCWuf0PQCbnCVVWSAl78Vrp5XgO+11LAtor02ddBYphiU7TZ5+VRfg/o7f9FSxZqv/H5HpDLrBttiSwTrTUplD1LZpZMk3eAuUzTY44TQE=" },
  { id: "costume/void-beast", cat: "costume", name: "Void Beast", bb: [7, 7, 38, 44], img: "data:image/webp;base64,UklGRtgAAABXRUJQVlA4TMsAAAAvK8AKEBK3te3ISe4SXIJLoiJSCqMDuiB1NKukGZbwse/IUAQyPUQRRSRppNp7BRyzANC4pJBBONEFMZBpdNV/BW7bKBkd832Co1BG+nKZlIJ0xCXawh8l7dcLA3hP2O7W02l1uKX9+LrHchl1J2fzW2aRb1Xc3VsDKXMrEQXMbcUDF+QZihI4czaDCIgyAK35IMqIwY40rRioKu35nHvgSCiO3+Aiqr2P9KX+x3RI/67gOHJEYowsUxRPVnZOf01LoB86LP587DJVAQA=" },
  { id: "costume/zombie-beast", cat: "costume", name: "Zombie Beast", bb: [7, 7, 38, 44], img: "data:image/webp;base64,UklGRuYAAABXRUJQVlA4TNkAAAAvK8AKEFW4qW1bTtoIiIYv5iuJmG8JD0hISYkAqj++gam8eVdJJEnO54Re7Qk6gVMLF6pt20ZaIGX2nyvV/10ZXH+H/jNw20iRl/nwE/gLQ1aSBz4Jb4Qko8At9OveRfK9Ok/v9arv7o0D3/onmZWIAkfrl1lncilxD2gOfBUeL2sosJnbJ5LC43rnOZKggPOcRQ6AkDQG01DtAYbQAKIGAPgTNYRSoh3tdxjOpA0H/0l3/xtQNHplJdf/mI7034316EgUjMka0wBMX4QnwJZrI8JSgXUfmQUAAA==" },
  { id: "weapon/01-bone-sword", cat: "weapon", name: "Bone Sword", bb: [4, 19, 9, 44], img: "data:image/webp;base64,UklGRmoAAABXRUJQVlA4TF0AAAAvK8AKEAZFkaQ4UlYKIhCEMvzggv/lHAgCSBBC2GyTGSZbZgKyABOFCeTSHUNaWQXVf0VumzCdwJlXvHlE+3WTNiBIAryAAHgC6IgAhAz7v25f2rA/myrYDhw9cH4A" },
  { id: "weapon/02-rusty-katana", cat: "weapon", name: "Rusty Katana", bb: [4, 19, 9, 44], img: "data:image/webp;base64,UklGRooAAABXRUJQVlA4TH0AAAAvK8AKELWwCQAgTQcykIGbCGQgAaeXIAFN6LQY7r69rqeSSFaoAk8TghSvCUj6iz9CTSS5jXLiD0AQNILhylhcuew/2aRNWjK1j/TVUWwX7UIbIQLlAfwlRBYeuxQILWHKsS/GWbHe8Bo8+wqT2ccVaRMmxE/YSv7kz6hbDwA=" },
  { id: "weapon/03-serum-katana", cat: "weapon", name: "Serum Katana", bb: [4, 19, 9, 44], img: "data:image/webp;base64,UklGRnYAAABXRUJQVlA4TGkAAAAvK8AKEDUwqW2rkkOThiBIJJFIQw0S/eRxfGeumkZSoOOpMEyHG8yhYEOlJgCQhm9DBvrQadnIhv1X2LYNksLglH8fKSERcU8gttJkCERhWxNRIquAf0LkIc71fp3K/cCjCgZg4czA+wcA" },
  { id: "weapon/05-toxic-trident", cat: "weapon", name: "Toxic Trident", bb: [2, 6, 11, 44], img: "data:image/webp;base64,UklGRnIAAABXRUJQVlA4TGUAAAAvK8AKEHWwim1bSasX6P3ShjS0c3fnnHMRMhEMrW3fRzUJnIlQA8PTrppWGkmgWv/JJm3M1n6ChVEsdfrFXWfXX947EZPyPjiRG+QAgZ+dCEe5Trhb8sNMEjrqiUm+dIadsuMYAAA=" },
  { id: "weapon/06-cleaver-staff", cat: "weapon", name: "Cleaver Staff", bb: [5, 6, 12, 44], img: "data:image/webp;base64,UklGRn4AAABXRUJQVlA4THIAAAAvK8AKEDUwqW1biv/6K4J8Sx1K0IM2dPoVcId5Pk8xI0mQwpiMwq7ZQg3b3g9VkW1Q3i79E4mggBa++68wbRtG3T3FwxH1VYWUhdbXsWCfRSoLlBSVxb4XavDpbFseK6sjgmNWmwKcaQO5SA1eWexx+xI=" },
  { id: "weapon/07-chainsaw", cat: "weapon", name: "Chainsaw", bb: [3, 13, 10, 44], img: "data:image/webp;base64,UklGRogAAABXRUJQVlA4THsAAAAvK8AKEJUoqm2bmosggBAivQ66aKKTCLyRP6O7TH9LLSRJ0JquwTFctEAH91+gppEU6PjBvwGqk4Ik6v4rbNu2kTI7HsHq0XK5qSAxqu1SIYFzUkLiSV4SHqflnHIp8fgxUwEV799ctclBOgMf9RfhXe5x18ou99tYFQAA" },
];

// ---------------------------------------------------------------- composing specimens from layers
export type Build = Partial<Record<TraitCat, Trait | undefined>>;
const byId = new Map(TRAITS.map((t) => [t.id, t]));
const get = (id: string) => byId.get(id);
export const traitsOf = (cat: TraitCat) => TRAITS.filter((t) => t.cat === cat);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;

const BASE: Build = {
  chest: get("chest/bare-chest-grey"), face: get("face/exposed-jaw-grey"), ears: get("ears/ear-01"),
  eyes: get("eyes/serum-m1"), nose: get("nose/nose-grey"), mouth: get("mouth/fanged-grin"),
};

/** A plain grey specimen wearing `t`, kept consistent with the colour rule (nose = face colour). */
export function wearing(t: Trait): Build {
  const b: Build = { ...BASE, [t.cat]: t };
  const col = t.color;
  if (col && t.cat === "face") { b.nose = get(`nose/nose-${col}`) ?? b.nose; b.chest = get(`chest/bare-chest-${col}`) ?? b.chest; }
  if (col && t.cat === "nose") { b.face = get(`face/exposed-jaw-${col}`) ?? b.face; b.chest = get(`chest/bare-chest-${col}`) ?? b.chest; }
  if (col && t.cat === "chest") { b.face = get(`face/exposed-jaw-${col}`) ?? b.face; b.nose = get(`nose/nose-${col}`) ?? b.nose; }
  if (t.devil) { b.chest = get("chest/devil-armor") ?? b.chest; delete b.nose; }
  return b;
}

/** A random, rule-respecting specimen for the desk monitors. */
export function randomBuild(): Build {
  const face = pick(traitsOf("face").filter((t) => !t.devil));
  const col = face.color ?? "grey";
  const b: Build = {
    face, ears: pick(traitsOf("ears")), eyes: pick(traitsOf("eyes")), mouth: pick(traitsOf("mouth")),
    nose: Math.random() < 0.7 ? get(`nose/nose-${col}`) : pick(traitsOf("nose").filter((t) => !t.color)),
    chest: Math.random() < 0.5 ? get(`chest/bare-chest-${col}`) : pick(traitsOf("chest").filter((t) => !t.color && t.id !== "chest/devil-armor")),
  };
  if (Math.random() < 0.25) b.costume = pick(traitsOf("costume"));
  if (Math.random() < 0.4) {
    const w = pick(traitsOf("weapon"));
    if (!(w.id.endsWith("chainsaw") && b.costume?.id.includes("dragon"))) b.weapon = w;
  }
  return b;
}

export const layersOf = (b: Build) => LAYER_ORDER.map((c) => b[c]).filter((t): t is Trait => !!t);
