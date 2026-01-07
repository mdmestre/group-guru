import { Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { PrivateLayout } from "@/layouts/PrivateLayout";
import WhatsAppConnections from "@/pages/WhatsAppConnections";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ProtectedRoute } from "@/guards/ProtectedRoute";
import { AdminRoute } from "@/guards/AdminRoute";

// Auth pages
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";

// App pages
import { HomePage } from "@/features/app/pages/HomePage";
import DashboardPage from "@/pages/Dashboard";
import CRMPage from "@/pages/CRM";
import AdminPage from "@/pages/Admin";
import NotFoundPage from "@/pages/NotFound";
import ConversationsPage from "@/pages/Conversations";

/**
 * Centralized route configuration
 * 
 * Structure:
 * - /auth/* - Public routes (login, register)
 * - /app/* - Private routes (dashboard, CRM, etc.)
 * - /admin/* - Admin routes (user management, settings)
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Route>

      {/* Private Routes */}
      <Route
        element={
          <ProtectedRoute>
            <PrivateLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/app" element={<WhatsAppConnections />} />
        <Route path="/app/dashboard" element={<DashboardPage />} />
        <Route path="/app/crm" element={<CRMPage />} />
        <Route path="/app/conversations" element={<ConversationsPage />} />
        <Route path="/app/settings" element={<div>Configurações (em desenvolvimento)</div>} />
      </Route>

      {/* Admin Routes */}
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard (em desenvolvimento)</div>} />
        <Route path="/admin/users" element={<div>Gerenciar Usuários (em desenvolvimento)</div>} />
        <Route path="/admin/permissions" element={<div>Permissões (em desenvolvimento)</div>} />
        <Route path="/admin/settings" element={<div>Configurações Admin (em desenvolvimento)</div>} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="/register" element={<Navigate to="/auth/register" replace />} />
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/crm" element={<Navigate to="/app/crm" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

