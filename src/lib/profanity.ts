// Bangla + English bad-word list. Censors offensive words by replacing each
// character with '*'. Matching is case-insensitive and handles word boundaries
// for English; Bangla uses simple substring (no word boundaries in Unicode \b).

const EN_BAD = [
  "fuck","fck","fuk","f*ck","shit","sh*t","bitch","b*tch","bastard","asshole",
  "ass","dick","pussy","cunt","slut","whore","motherfucker","mf","bullshit",
  "crap","damn","piss","cock","prick","wanker","twat","faggot","fag","retard",
  "nigger","nigga","kill you","kill u","i will kill","rape","rapist","molest",
  "suicide","murder","terrorist","bomb you",
];

const BN_BAD = [
  "মাদারচোদ","মাদারচুদ","বালছাল","বালছাড়","বাল","হারামি","হারামজাদা","হারামজাদি",
  "শালা","শালি","শালী","কুত্তা","কুত্তি","কুত্তার","শুয়ার","শুয়োর","শুওর",
  "চুদ","চুদা","চুদি","চুদানি","চুদির","চুদনা","খানকি","খানকির","মাগি","মাগী",
  "বেশ্যা","বেশ্যার","রেন্ডি","গাণ্ডু","গান্ডু","ভাদা","ভোদা","ভোদাই","পোঁদ","পোদ",
  "ছাগু","ছাগল","ছাগলের বাচ্চা","জারজ","জানোয়ার","নাস্তিক কুত্তা",
  "মেরে ফেলব","কেটে ফেলব","খুন করব","জবাই করব","রেপ করব","ধর্ষণ করব","মারব তোকে",
];

const WORDS = [...EN_BAD, ...BN_BAD].sort((a, b) => b.length - a.length);

const stars = (s: string) => s.replace(/\S/g, "*");

export function censorText(input: string): string {
  if (!input) return input;
  let out = input;
  for (const w of WORDS) {
    if (!w) continue;
    // Escape regex specials
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // For English ASCII words use word boundary; for Bangla just match.
    const isAscii = [...w].every((ch) => ch.charCodeAt(0) <= 127);
    const re = isAscii
      ? new RegExp(`\\b${esc}\\b`, "gi")
      : new RegExp(esc, "gi");
    out = out.replace(re, (m) => stars(m));
  }
  return out;
}

export function containsProfanity(input: string): boolean {
  return censorText(input) !== input;
}
