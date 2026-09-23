import { Component } from "react";
import { JOURNAL_KEY } from "../lib/storage";
import { download } from "../lib/transfer";

// A render error used to blank the page. The journal is still in storage, so
// the way out is: reload, or take a copy first.
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
    // The raw stored value, untouched: if the crash came from bad data, a
    // copy that went back through the app's own code could lose it.
    let raw = null;
    try {
      raw = localStorage.getItem(JOURNAL_KEY);
    } catch {
      raw = null;
    }
    download(`marginalia-backup-${new Date().toISOString().slice(0, 10)}.json`, raw ?? "{}", "application/json");
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="stack gap-4"
        style={{ minHeight: "100svh", alignItems: "center", justifyContent: "center", padding: "var(--s5)", textAlign: "center" }}
      >
        <span className="sticker sticker-static" data-type="goal" aria-hidden="true">!</span>
        <h1 className="title-lg">The page stopped drawing</h1>
        <p className="muted" style={{ maxWidth: "40ch", margin: 0 }}>
          Your entries are still saved on this device. Reload to carry on, or download a copy first.
        </p>
        <div className="row gap-2 wrap" style={{ justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
          <button className="btn btn-ghost" onClick={this.handleExport}>Download a copy</button>
        </div>
        <pre className="meta" style={{ maxWidth: "90vw", overflowX: "auto" }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
      </div>
    );
  }
}
