import { Component } from "react";
import { C, fontBody, fontDisplay, fontMono } from "../theme";

// A render error used to blank the page with no way back. The journal itself
// is still in localStorage, so the recovery path is: reload, or export first.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Marginalia crashed", error, info);
  }

  handleExport = () => {
    const data = {
      entries: localStorage.getItem("marginalia:entries"),
      blocks: localStorage.getItem("marginalia:blocks"),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `marginalia-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          background: C.paper,
          color: C.ink,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, margin: 0 }}>The page stopped drawing</h1>
        <p style={{ fontFamily: fontBody, fontSize: 15, color: C.inkSoft, margin: 0, maxWidth: "40ch" }}>
          Your entries are still saved on this device. Reload to carry on, or download a copy first.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: fontMono, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "12px 20px", minHeight: 44, borderRadius: 8, border: "none",
              background: C.accent, color: C.paper, cursor: "pointer",
            }}
          >
            Reload
          </button>
          <button
            onClick={this.handleExport}
            style={{
              fontFamily: fontMono, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "12px 20px", minHeight: 44, borderRadius: 8, border: `1px solid ${C.rule}`,
              background: "transparent", color: C.inkSoft, cursor: "pointer",
            }}
          >
            Download a copy
          </button>
        </div>
        <pre style={{ fontFamily: fontMono, fontSize: 11, color: C.inkFaint, maxWidth: "90vw", overflowX: "auto", margin: 0 }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
      </div>
    );
  }
}
