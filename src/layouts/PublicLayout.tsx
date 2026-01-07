import { Outlet } from "react-router-dom";

/**
 * PublicLayout - Layout para páginas públicas (auth)
 * Sem sidebar, sem header complexo, apenas conteúdo centralizado
 */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Outlet />
    </div>
  );
}

