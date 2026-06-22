import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui", background: "#fffaf0", color: "#17130c" }}>
        <section style={{ maxWidth: 620, background: "#fff", border: "1px solid #eadfca", borderRadius: 18, padding: 28, boxShadow: "0 20px 50px rgba(88,61,9,.1)" }}>
          <p style={{ color: "#b97900", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", fontSize: 11 }}>Elite Client Onboarding</p>
          <h1 style={{ margin: "0 0 10px" }}>The portal could not start.</h1>
          <p style={{ lineHeight: 1.6, color: "#6d6253" }}>Open the browser console and copy the error message. This screen prevents a silent blank page.</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fff6d8", padding: 14, borderRadius: 10, fontSize: 12 }}>{this.state.error?.message}</pre>
        </section>
      </main>;
    }
    return this.props.children;
  }
}
