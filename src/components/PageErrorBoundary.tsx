import { Component, type ErrorInfo, type ReactNode } from "react";
type Props = { children: ReactNode };
type State = { failed: boolean };
export default class PageErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("NEXUS BUILD page failed:", error, info.componentStack); }
  render() {
    if (this.state.failed) return <section className="page-error" role="alert">
      <div className="page-error-mark">!</div><h2>This page hit a rendering problem</h2>
      <p>Your workspace is still here. The rest of NEXUS BUILD should remain available.</p>
      <button type="button" onClick={() => this.setState({ failed: false })}>Retry this page</button>
    </section>;
    return this.props.children;
  }
}
