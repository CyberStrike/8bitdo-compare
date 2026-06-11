import { Navigate, Route, Routes } from 'react-router-dom'

import { CatalogProvider } from './context/CatalogProvider'
import { CompareProvider } from './context/CompareProvider'
import { BrowsePage } from './pages/BrowsePage'
import { ComparePage } from './pages/ComparePage'

function App() {
  return (
    <CatalogProvider>
      <CompareProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/browse" replace />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="*" element={<Navigate to="/browse" replace />} />
        </Routes>
      </CompareProvider>
    </CatalogProvider>
  )
}

export default App
