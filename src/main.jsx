import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { runArtifactRegistryMigration } from './utils/artifactMigration'
import './styles.css'

// Promote artifact storage from name strings to artifact-id references before the
// app renders. Self-healing reads mean a failed/late migration is non-fatal, so
// never block startup on it.
try {
  const result = runArtifactRegistryMigration()
  if (result?.error) {
    console.error('Artifact registry migration failed:', result.error)
  }
} catch (err) {
  console.error('Artifact registry migration threw:', err)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
