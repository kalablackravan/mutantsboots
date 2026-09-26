// Copy lifted verbatim from app.js.
export const CLASSES: Record<string, { name: string; desc: string }> = {
  lurker: { name: "the professional lurker", desc: "reads everything. posts when absolutely necessary." },
  meme: { name: "the meme department", desc: "communicates primarily through images." },
  vibe: { name: "the vibe inspector", desc: "notices immediately when something feels off." },
  lore: { name: "the lorekeeper", desc: "remembers announcements the team has forgotten." },
  goblin: { name: "the reply goblin", desc: "somehow already in the replies." },
  question: { name: "the question mark", desc: "difficult to classify. apparently staying anyway." },
};
export const ORDER = ["lurker", "meme", "vibe", "goblin", "lore", "question"];
type Opt = { k: string; t: string; r?: string; react?: string; s?: Record<string, number> };
type Q = { q: string; options: Opt[] };
export const IV: {
  opener: Q;
  routes: Record<string, { bonus: string; intro: string; q2: Q; q3: Q }>;
} = {
  opener: { q: "you join a new community. what happens first?", options: [
    { k: "A", t: "i stay quiet and figure out what's going on.", r: "observer" },
    { k: "B", t: "i find something to make a meme about.", r: "creator" },
    { k: "C", t: "i start asking questions immediately.", r: "investigator" }] },
  routes: {
    observer: { bonus: "lurker", intro: "a silent observer. we have several on staff. allegedly.",
      q2: { q: "what finally gets you to break your silence?", options: [
        { k: "A", t: "someone says something confidently wrong.", react: "so you're quiet until the facts are endangered. understood.", s: { vibe: 2 } },
        { k: "B", t: "a joke is too good not to join in.", react: "noted. the humor is load-bearing.", s: { goblin: 2 } },
        { k: "C", t: "someone asks a question i can actually help with.", react: "helpful and quiet. we'll check whether that's allowed.", s: { lore: 2 } }] },
      q3: { q: "the community is confused about something. what do you do?", options: [
        { k: "A", t: "dig up the old announcement that explains it.", react: "you read the announcements. we've been meaning to.", s: { lore: 2 } },
        { k: "B", t: "wait. someone louder will handle it.", react: "delegation. technically.", s: { lurker: 2 } },
        { k: "C", t: "post one correction and vanish for a week.", react: "one message, one week. efficient.", s: { vibe: 1, lurker: 1 } }] } },
    creator: { bonus: "meme", intro: "straight to the meme department. they've been asking for supervision.",
      q2: { q: "your first meme gets absolutely no reaction. what now?", options: [
        { k: "A", t: "make a better one.", react: "persistence. the department admires it from a distance.", s: { meme: 2 } },
        { k: "B", t: "explain it until everyone regrets ignoring it.", react: "we've tried this. it works, eventually, for nobody.", s: { goblin: 2 } },
        { k: "C", t: "declare it ahead of its time.", react: "we've been ahead of our time for years. no evidence yet.", s: { question: 2 } }] },
      q3: { q: "you've been given control of our announcement poster. your approach?", options: [
        { k: "A", t: "one image, no words. they'll get it.", react: "confident. the poster will be judged.", s: { meme: 2 } },
        { k: "B", t: "a wall of text with one joke buried in paragraph four.", react: "paragraph four. we'll look.", s: { lore: 2 } },
        { k: "C", t: "a poll about what the poster should be.", react: "delegating to the crowd. bold, for a poster.", s: { vibe: 1, question: 1 } }] } },
    investigator: { bonus: "vibe", intro: "questions already. i was hoping you'd just admire the stationery.",
      q2: { q: "which question are you asking first?", options: [
        { k: "A", t: "who's actually building this?", react: "a fair question. the answer is being decided.", s: { vibe: 2 } },
        { k: "B", t: "what makes this community different?", react: "we have a department. most communities don't.", s: { lore: 2 } },
        { k: "C", t: "why does that character look personally offended?", react: "that's our supervisor. please lower your voice.", s: { question: 2 } }] },
      q3: { q: "one thing is still unclear. what happens next?", options: [
        { k: "A", t: "i ask in public so everyone gets the answer.", react: "public questions. brave. we'll answer publicly, eventually.", s: { goblin: 2 } },
        { k: "B", t: "i check the docs first, then ask.", react: "documentation. we have some. somewhere.", s: { lore: 2 } },
        { k: "C", t: "i stay unclear about it and continue anyway.", react: "unclear and continuing. that's the department motto.", s: { question: 2 } }] } },
  },
};
export function classify(a1: string, a2: string, a3: string) {
  const o = IV.opener.options.find((x) => x.k === a1)!;
  const R = IV.routes[o.r!];
  const sc: Record<string, number> = Object.fromEntries(ORDER.map((k) => [k, 0]));
  sc[R.bonus]++;
  for (const [q, a] of [[R.q2, a2], [R.q3, a3]] as const)
    Object.entries(q.options.find((x) => x.k === a)!.s!).forEach(([k, v]) => (sc[k] += v));
  return ORDER.reduce((b, k) => (sc[k] > sc[b] ? k : b), ORDER[0]);
}
export const LINES = {
  greet: "good. someone's here.",
  lookAround: "suit yourself. the wall is free.",
  mobile: "one more thing. the department's full office is on desktop. the phone counter is functional. barely.",
  filed: "your case is filed. the noticeboard moves before i do.",
  draft: "the folder on the desk is yours. that's why it has your name in it.",
};
