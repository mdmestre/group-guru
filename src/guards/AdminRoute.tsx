import { Navigate } from "react-router-dom";
import api from "@/services/api";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Guard para rotas administrativas
 * Verifica autenticação E permissões de admin
 * TODO: Implementar verificação real de role quando backend suportar
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const isAuthenticated = api.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // TODO: Verificar role do usuário quando backend suportar
  // Por enquanto, apenas verifica autenticação
  // const userRole = getUserRole(); // Implementar quando disponível
  // if (userRole !== 'admin') {
  //   return <Navigate to="/app/dashboard" replace />;
  // }

  return <>{children}</>;
}

