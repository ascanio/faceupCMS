import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import './App.css'
import CategoriesPage from './pages/Categories'
import FiltersPage from './pages/Filters'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen grid grid-cols-[220px_1fr]">
        <aside className="border-r bg-white p-4">
          <h1 className="text-lg font-semibold mb-4">FaceUp CMS</h1>
          <nav className="flex flex-col gap-2">
            <NavLink
              to="/filters"
              className={({ isActive }) =>
                `px-3 py-2 rounded hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-medium' : ''}`
              }
            >
              Filters
            </NavLink>
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                `px-3 py-2 rounded hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-medium' : ''}`
              }
            >
              Categories
            </NavLink>
          </nav>
        </aside>
        <main className="p-6">
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
