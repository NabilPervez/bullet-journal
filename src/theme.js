export const C = {
  paper: "#FAFAF7",
  paperDim: "#F1F0EB",
  ink: "#1B1B18",
  inkSoft: "#4A4944",
  inkFaint: "#8C8A82",
  rule: "#DAD8CF",
  accent: "#26365C",
  critical: "#9C3B2E",
};

export const fontDisplay = "'Space Grotesk', sans-serif";
export const fontBody = "'Source Serif 4', Georgia, serif";
export const fontMono = "'IBM Plex Mono', monospace";

export const navBtnStyle = {
  fontFamily: fontMono,
  fontSize: 13,
  width: 26,
  height: 26,
  borderRadius: 6,
  border: `1px solid ${C.rule}`,
  background: C.paperDim,
  color: C.inkSoft,
  cursor: "pointer",
};

export const fieldLabelStyle = {
  display: "block",
  fontFamily: fontMono,
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: C.inkFaint,
  marginBottom: 3,
};

export const fieldInputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.6)",
  border: `1px solid ${C.rule}`,
  borderRadius: 6,
  padding: "6px 8px",
  fontFamily: fontBody,
  // 16px floor: iOS Safari zooms the page on any focused field below this.
  fontSize: 16,
  color: C.ink,
  outline: "none",
  boxSizing: "border-box",
};
