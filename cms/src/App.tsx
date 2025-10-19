import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import './App.css'
import CategoriesPage from './pages/Categories'
import FiltersPage from './pages/Filters'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <header className="border-b bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-xl font-semibold">FaceUp CMS</h1>
            <nav className="flex gap-1">
              <NavLink
                to="/filters"
                className={({ isActive }) =>
                  `px-4 py-2 rounded hover:bg-gray-100 transition-colors ${isActive ? 'bg-gray-100 font-medium' : ''}`
                }
              >
                Filters
              </NavLink>
              <NavLink
                to="/categories"
                className={({ isActive }) =>
                  `px-4 py-2 rounded hover:bg-gray-100 transition-colors ${isActive ? 'bg-gray-100 font-medium' : ''}`
                }
              >
                Categories
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="flex-1 p-6 bg-gray-50">
          <Routes>
            <Route path="/" element={<Navigate to="/filters" replace />} />
            <Route path="/filters" element={<FiltersPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
