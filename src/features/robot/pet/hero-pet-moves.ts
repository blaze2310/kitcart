export const moves = {
  "idle": {
    "label": "Idle",
    "face": "normal",
    "mode": "loop",
    "travel": "still"
  },
  "look": {
    "label": "Look around",
    "face": "curious",
    "mode": "once",
    "travel": "still"
  },
  "wave": {
    "label": "Long hello",
    "face": "happy",
    "mode": "once",
    "travel": "still"
  },
  "wave2": {
    "label": "Quick hello",
    "face": "happy",
    "mode": "once",
    "travel": "still"
  },
  "goodbye": {
    "label": "Wave goodbye",
    "face": "happy",
    "mode": "once",
    "travel": "still"
  },
  "bow": {
    "label": "Bow",
    "face": "happy",
    "mode": "once",
    "travel": "still"
  },
  "clap": {
    "label": "Applaud",
    "face": "happy",
    "mode": "once",
    "travel": "still"
  },
  "thumbs": {
    "label": "Thumbs up",
    "face": "happy",
    "mode": "once",
    "travel": "still"
  },
  "shy": {
    "label": "Shy",
    "face": "loved",
    "mode": "once",
    "travel": "still"
  },
  "stretch": {
    "label": "Stretch",
    "face": "eyes-closed",
    "mode": "once",
    "travel": "still"
  },
  "sit": {
    "label": "Sit and rest",
    "face": "sleepy",
    "mode": "once",
    "travel": "still"
  },
  "fold": {
    "label": "Fold arms",
    "face": "thinking",
    "mode": "once",
    "travel": "still"
  },
  "afraid": {
    "label": "Startle",
    "face": "surprised",
    "mode": "once",
    "travel": "still"
  },
  "sad": {
    "label": "A little sad",
    "face": "sad",
    "mode": "once",
    "travel": "still"
  },
  "depressed": {
    "label": "Comic disappointment",
    "face": "sad",
    "mode": "once",
    "travel": "still"
  },
  "lean": {
    "label": "Lean closer",
    "face": "confused",
    "mode": "once",
    "travel": "still"
  },
  "peek": {
    "label": "Stealth peek",
    "face": "focused",
    "mode": "once",
    "travel": "still"
  },
  "head": {
    "label": "Curious peek",
    "face": "curious",
    "mode": "once",
    "travel": "still"
  },
  "turn": {
    "label": "Turn around",
    "face": "surprised",
    "mode": "hold",
    "travel": "still"
  },
  "walk3": {
    "label": "Stroll",
    "face": "normal",
    "mode": "once",
    "travel": "lane"
  },
  "walk2": {
    "label": "Alternate stroll",
    "face": "normal",
    "mode": "once",
    "travel": "lane"
  },
  "walk": {
    "label": "Quick walk",
    "face": "normal",
    "mode": "once",
    "travel": "lane"
  },
  "patrol": {
    "label": "Looking patrol",
    "face": "curious",
    "mode": "once",
    "travel": "lane"
  },
  "sidewalk": {
    "label": "Side-on walk",
    "face": "curious",
    "mode": "once",
    "travel": "lane"
  },
  "run": {
    "label": "Sprint",
    "face": "focused",
    "mode": "once",
    "travel": "lane"
  },
  "flee": {
    "label": "Comic escape",
    "face": "surprised",
    "mode": "once",
    "travel": "lane"
  },
  "flee2": {
    "label": "Leap away",
    "face": "surprised",
    "mode": "hold",
    "travel": "wide"
  },
  "stairs": {
    "label": "Climb stairs",
    "face": "focused",
    "mode": "hold",
    "travel": "wide"
  },
  "jump": {
    "label": "Bounce",
    "face": "happy",
    "mode": "once",
    "travel": "wide"
  },
  "dance": {
    "label": "Dance",
    "face": "happy",
    "mode": "once",
    "travel": "still"
  },
  "box": {
    "label": "Shadowbox",
    "face": "focused",
    "mode": "once",
    "travel": "wide"
  },
  "flip": {
    "label": "Cartwheel",
    "face": "happy",
    "mode": "once",
    "travel": "wide"
  },
  "warm": {
    "label": "Warm-up",
    "face": "focused",
    "mode": "once",
    "travel": "wide"
  },
  "pitch": {
    "label": "Baseball throw",
    "face": "focused",
    "mode": "once",
    "travel": "wide"
  },
  "swim": {
    "label": "Swim",
    "face": "happy",
    "mode": "once",
    "travel": "wide"
  },
  "drop": {
    "label": "Jump down",
    "face": "surprised",
    "mode": "hold",
    "travel": "wide"
  },
  "fall": {
    "label": "Tumble",
    "face": "surprised",
    "mode": "hold",
    "travel": "wide"
  },
  "defeat": {
    "label": "Dramatic defeat",
    "face": "sad",
    "mode": "hold",
    "travel": "wide"
  },
  "lap": {
    "label": "Run a lap",
    "face": "happy",
    "mode": "once",
    "travel": "baked"
  },
  "lap2": {
    "label": "Wide lap",
    "face": "focused",
    "mode": "once",
    "travel": "baked"
  },
  "zoomies": {
    "label": "Zoomies",
    "face": "happy",
    "mode": "once",
    "travel": "baked"
  }
} as const;
export type MoveId = keyof typeof moves;
