import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // 1. Enquanto o AuthContext está validando o token no F5...
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        {/* Um spinner simples ou skeleton */}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 2. Se terminou de carregar e o user continua null, o token era inválido ou não existia
  if (!user) {
    // Salvamos a rota atual (location) para redirecionar o usuário de volta após o login
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 3. Se temos usuário, libera o acesso
  return <>{children}</>;
}