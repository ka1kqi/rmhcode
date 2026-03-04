// Gemini CLI-style ASCII art banner for rmhcode
// Block character rendering with blue → purple → pink gradient

// ── Character bitmaps (6 rows each) ────────────────────────────────────
const FONT = {
  R: [
    "██████╗ ",
    "██╔══██╗",
    "██████╔╝",
    "██╔══██╗",
    "██║  ██║",
    "╚═╝  ╚═╝",
  ],
  M: [
    "███╗   ███╗",
    "████╗ ████║",
    "██╔████╔██║",
    "██║╚██╔╝██║",
    "██║ ╚═╝ ██║",
    "╚═╝     ╚═╝",
  ],
  H: [
    "██╗  ██╗",
    "██║  ██║",
    "███████║",
    "██╔══██║",
    "██║  ██║",
    "╚═╝  ╚═╝",
  ],
  C: [
    " ██████╗",
    "██╔════╝",
    "██║     ",
    "██║     ",
    "╚██████╗",
    " ╚═════╝",
  ],
  O: [
    " ██████╗ ",
    "██╔═══██╗",
    "██║   ██║",
    "██║   ██║",
    "╚██████╔╝",
    " ╚═════╝ ",
  ],
  D: [
    "██████╗ ",
    "██╔══██╗",
    "██║  ██║",
    "██║  ██║",
    "██████╔╝",
    "╚═════╝ ",
  ],
  E: [
    "███████╗",
    "██╔════╝",
    "█████╗  ",
    "██╔══╝  ",
    "███████╗",
    "╚══════╝",
  ],
};

// Gemini-style chevron ">" prefix (6 rows to match font height)
const CHEVRON = [
  " ██╗    ",
  " ░██╗   ",
  "  ░██╗  ",
  "  ██╔╝  ",
  " ██╔╝   ",
  " ╚═╝    ",
];

// ── Build art from characters ───────────────────────────────────────────

function buildArt(chars, prefix = null) {
  const height = FONT[chars[0]].length;
  const lines = [];
  for (let row = 0; row < height; row++) {
    let line = prefix ? prefix[row] : '';
    for (const ch of chars) {
      line += FONT[ch][row];
    }
    lines.push(line);
  }
  return lines;
}

// Large: chevron + full RMHCODE
export const largeBanner = buildArt(['R', 'M', 'H', 'C', 'O', 'D', 'E'], CHEVRON);

// Medium: full RMHCODE without chevron
export const mediumBanner = buildArt(['R', 'M', 'H', 'C', 'O', 'D', 'E']);

// Small: chevron + RMH
export const smallBanner = buildArt(['R', 'M', 'H'], CHEVRON);

// ── Gradient coloring ───────────────────────────────────────────────────

// Gemini CLI gradient: blue → purple → pink
const GRADIENT_STOPS = [
  [71, 150, 228],   // #4796E4 blue
  [100, 130, 210],
  [132, 122, 206],  // #847ACE purple
  [165, 112, 180],
  [195, 103, 127],  // #C3677F dusty pink
];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function getGradientColor(t) {
  const n = GRADIENT_STOPS.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  const lt = (t * n) - i;
  const c1 = GRADIENT_STOPS[i];
  const c2 = GRADIENT_STOPS[Math.min(i + 1, n)];
  return [lerp(c1[0], c2[0], lt), lerp(c1[1], c2[1], lt), lerp(c1[2], c2[2], lt)];
}

function fg(r, g, b) {
  return `\x1b[38;2;${r};${g};${b}m`;
}

const RST = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

// Characters that should be rendered dimmer (shadow/outline)
const DIM_CHARS = new Set(['░', '╔', '╗', '╚', '╝', '═']);

function applyGradient(lines) {
  const maxLen = Math.max(...lines.map(l => l.length));
  return lines.map(line => {
    let out = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ' ') {
        out += ch;
        continue;
      }
      const t = maxLen > 1 ? i / (maxLen - 1) : 0;
      const [r, g, b] = getGradientColor(t);
      if (DIM_CHARS.has(ch)) {
        out += `${DIM}${fg(r, g, b)}${ch}${RST}`;
      } else {
        out += `${fg(r, g, b)}${ch}${RST}`;
      }
    }
    return out;
  });
}

// ── Public API ──────────────────────────────────────────────────────────

// Strip ANSI escape codes to get visible character count
function visLen(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

// Center a string (which may contain ANSI codes) within a visible width
function center(str, width) {
  const diff = width - visLen(str);
  if (diff <= 0) return str;
  const left = Math.floor(diff / 2);
  return ' '.repeat(left) + str + ' '.repeat(diff - left);
}

export function renderBanner(version = '1.0.0', providerDisplayName = 'Claude') {
  const cols = process.stdout.columns || 80;

  let art;
  let subtitle = '';

  if (cols >= 76) {
    art = largeBanner;
  } else if (cols >= 64) {
    art = mediumBanner;
  } else if (cols >= 40) {
    art = smallBanner;
    subtitle = 'code';
  } else {
    // Ultra-narrow: just styled text
    const [r, g, b] = getGradientColor(0.3);
    const [pr, pg, pb] = getGradientColor(0.8);
    return `\n${BOLD}${fg(r, g, b)}> rmhcode${RST} ${DIM}v${version}${RST}\n${DIM}${fg(pr, pg, pb)}  Powered by ${providerDisplayName}${RST}\n`;
  }

  const coloredLines = applyGradient(art);

  // Build the content lines (art + version + tagline)
  const contentLines = [...coloredLines];

  // Version line
  const [vr, vg, vb] = getGradientColor(0.5);
  if (subtitle) {
    contentLines.push(`${DIM}${fg(vr, vg, vb)}         ${subtitle}${RST} ${DIM}v${version}${RST}`);
  } else {
    contentLines.push(`${DIM}${fg(vr, vg, vb)}  v${version}${RST}`);
  }

  // Tagline (random on each launch)
  const taglines = [
    'Powering The Everything Platform',
    'Build everything. Ship anything.',
    'Where everything gets built',
    'Everything starts here',
    'Build everything',
    'Create without limits',
  ];
  const tagline = taglines[Math.floor(Math.random() * taglines.length)];
  const [tr, tg, tb] = getGradientColor(0.65);
  contentLines.push(`${DIM}${fg(tr, tg, tb)}  ${tagline}${RST}`);

  // Powered-by line
  const [pr, pg, pb] = getGradientColor(0.8);
  contentLines.push(`${DIM}${fg(pr, pg, pb)}  Powered by ${providerDisplayName}${RST}`);

  // Box spans full terminal width, content centered inside
  const boxWidth = cols - 2; // subtract 2 for the │ borders

  // Border colors (use the gradient midpoint)
  const [br, bg, bb] = getGradientColor(0.4);
  const bc = `${DIM}${fg(br, bg, bb)}`;

  // Build bordered output
  const top = `${bc}┌${'─'.repeat(boxWidth)}┐${RST}`;
  const bottom = `${bc}└${'─'.repeat(boxWidth)}┘${RST}`;
  const empty = `${bc}│${RST}${' '.repeat(boxWidth)}${bc}│${RST}`;

  const parts = ['', top, empty];

  for (const line of contentLines) {
    const padded = center(line, boxWidth);
    parts.push(`${bc}│${RST}${padded}${bc}│${RST}`);
  }

  parts.push(empty, bottom, '');

  return parts.join('\n');
}

export function printBanner(version, providerDisplayName) {
  process.stdout.write(renderBanner(version, providerDisplayName));
}
