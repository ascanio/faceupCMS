import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import './App.css'
import CategoriesPage from './pages/Categories'
import FiltersPage from './pages/Filters'
import FiltersListPage from './pages/FiltersList'
import OnboardingSliderPage from './pages/OnboardingSlider'
import UsersPage from './pages/Users'
import PromptCategoriesPage from './pages/PromptCategories'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F2EFEB' }}>
        <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #FF9827 0%, #ff8c00 100%)' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#141619' }}>FaceUp CMS</h1>
                <p className="text-xs text-gray-500">Content Management System</p>
              </div>
            </div>
            <nav className="flex gap-2">
              <NavLink
                to="/filters"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive 
                      ? 'text-white shadow-lg' 
                      : 'hover:bg-gray-100'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: '#FF9827', boxShadow: '0 10px 25px -5px rgba(255, 152, 39, 0.3)' } : { color: '#141619' }}
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
                      ? 'text-white shadow-lg' 
                      : 'hover:bg-gray-100'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: '#FF9827', boxShadow: '0 10px 25px -5px rgba(255, 152, 39, 0.3)' } : { color: '#141619' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categories
              </NavLink>
              <NavLink
                to="/filters-list"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive 
                      ? 'text-white shadow-lg' 
                      : 'hover:bg-gray-100'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: '#FF9827', boxShadow: '0 10px 25px -5px rgba(255, 152, 39, 0.3)' } : { color: '#141619' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Filters List
              </NavLink>
              <NavLink
                to="/onboarding"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive 
                      ? 'text-white shadow-lg' 
                      : 'hover:bg-gray-100'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: '#FF9827', boxShadow: '0 10px 25px -5px rgba(255, 152, 39, 0.3)' } : { color: '#141619' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                Onboarding Slider
              </NavLink>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive 
                      ? 'text-white shadow-lg' 
                      : 'hover:bg-gray-100'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: '#FF9827', boxShadow: '0 10px 25px -5px rgba(255, 152, 39, 0.3)' } : { color: '#141619' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Users
              </NavLink>
              <NavLink
                to="/prompt-categories"
                className={({ isActive }) =>
                  `px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive 
                      ? 'text-white shadow-lg' 
                      : 'hover:bg-gray-100'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: '#FF9827', boxShadow: '0 10px 25px -5px rgba(255, 152, 39, 0.3)' } : { color: '#141619' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Prompt Categories
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/filters" replace />} />
            <Route path="/filters" element={<FiltersPage />} />
            <Route path="/filters-list" element={<FiltersListPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/onboarding" element={<OnboardingSliderPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/prompt-categories" element={<PromptCategoriesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
