import { Component } from 'react'

// A missing page chunk (offline or an older open deployment) must not blank
// the app or automatically reload a screen while the assessor is working.
export default class PageLoadBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return (
      <section role="alert" style={{ padding: '2rem' }}>
        <h1>This page could not be opened</h1>
        <p>Check your connection and reload to try again. Reloading does not clear locally saved assessment data.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        <a href="/" style={{ marginLeft: '1rem' }}>Return to dashboard</a>
      </section>
    )
    return this.props.children
  }
}
