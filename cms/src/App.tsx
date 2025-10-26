import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import './App.css'
import CategoriesPage from './pages/Categories'
import FiltersPage from './pages/Filters'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FaceUp CMS</h1>
                <p className="text-xs text-gray-500">Content Management System</p>
              </div>
            </div>
            <nav className="flex gap-2">
              <NavLink
                to="/filters"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </NavLink>
              <NavLink
                to="/categories"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categories
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="flex-1 p-8">
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
