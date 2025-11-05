import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import App from './App'
import './index.css'
import Booking from './pages/public/Booking'
import Dashboard from './pages/dashboard/Dashboard'
import AdminLayout from './pages/admin/AdminLayout'
import AdminLogin from './pages/admin/AdminLogin'
import RegisterBusiness from './pages/admin/RegisterBusiness'
import ProvidersPage from './pages/admin/Providers'
import ServicesPage from './pages/admin/Services'
import HoursPage from './pages/admin/Hours'
import AbsencesPage from './pages/admin/Absences'
import CustomersPage from './pages/admin/Customers'
import CustomerDetailPage from './pages/admin/CustomerDetail'
import ReportsPage from './pages/admin/Reports'
import ExportsPage from './pages/admin/Exports'
import SettingsPage from './pages/admin/Settings'
import StaffPage from './pages/admin/Staff'
import InviteAcceptPage from './pages/admin/InviteAccept'
import { ToastProvider } from './components/ui/toaster'

function bareRedirect(to: 'booking' | 'dashboard') {
  let slug = 'barber-demo'
  try {
    const last = localStorage.getItem('lastBusinessSlug')
    if (last) slug = last
  } catch {}
  return <Navigate to={`/${slug}/${to}`} replace />
}

const router = createBrowserRouter([
  // Slug-agnostic login as a top-level route (no header layout)
  { path: '/login', element: <AdminLogin /> },
  { path: '/register', element: <RegisterBusiness /> },
  // Back-compat: redirect old admin login URL to slug-agnostic login
  { path: '/admin/:businessSlug/login', element: <Navigate to="/login" replace /> },
  // Invite acceptance also top-level (no admin layout)
  { path: '/admin/invite/:token', element: <InviteAcceptPage /> },
  // Root goes to login by default
  { path: '/', element: <Navigate to="/login" replace /> },
  // App layout for business-scoped and admin routes
  {
    path: '/',
    element: <App />,
    children: [
      { path: ':businessSlug/booking', element: <Booking /> },
      // Redirect bare routes to a default business for convenience
      { path: 'booking', element: bareRedirect('booking') },
      { path: ':businessSlug/dashboard', element: <Dashboard /> },
      { path: 'dashboard', element: bareRedirect('dashboard') },
      {
        path: 'admin/:businessSlug',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="services" replace /> },
          { path: 'providers', element: <ProvidersPage /> },
          { path: 'services', element: <ServicesPage /> },
          { path: 'hours', element: <HoursPage /> },
          { path: 'absences', element: <AbsencesPage /> },
          { path: 'customers', element: <CustomersPage /> },
          { path: 'customers/:id', element: <CustomerDetailPage /> },
          { path: 'staff', element: <StaffPage /> },
          { path: 'exports', element: <ExportsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ]
      },
      { path: '*', element: <div className="p-6 text-sm text-gray-500">Page not found</div> },
    ]
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>
)
