import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import Home from './pages/Home.jsx'
import ControlLibrary from './pages/ControlLibrary.jsx'
import EvidenceLookup from './pages/EvidenceLookup.jsx'
import ControlDetail from './pages/ControlDetail.jsx'
import RelationshipExplorer from './pages/RelationshipExplorer.jsx'
import About from './pages/About.jsx'
import Changelog from './pages/Changelog.jsx'

function App() {
  return (
    <div className="app">
      <Navigation />
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/controls" element={<ControlLibrary />} />
          <Route path="/controls/:id" element={<ControlDetail />} />
          <Route path="/evidence" element={<EvidenceLookup />} />
          <Route path="/relationships" element={<RelationshipExplorer />} />
          <Route path="/about" element={<About />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
