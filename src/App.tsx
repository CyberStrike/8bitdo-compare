import { Navigate, Route, Routes } from 'react-router-dom'

import { CatalogProvider } from './context/CatalogProvider'
import { CompareProvider } from './context/CompareProvider'
import { BrowsePage } from './pages/BrowsePage'
import { ComparePage } from './pages/ComparePage'

function App() {
  return (
    <CatalogProvider>
      <CompareProvider>
        <a
          href="#main-content"
          className="sr-only rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none dark:bg-zinc-100 dark:text-zinc-900"
        >
          Skip to content
        </a>
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          <Routes>
            <Route path="/" element={<Navigate to="/browse" replace />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="*" element={<Navigate to="/browse" replace />} />
          </Routes>
        </main>
      </CompareProvider>
    </CatalogProvider>
  )
}

export default App
