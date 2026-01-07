import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback, 
  useMemo, 
  ReactNode 
} from 'react';
import { apiFetch } from '@/lib/api';
import { CompanySelector } from '@/components/CompanySelector';

// --- Interfaces ---

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  status?: 'trial' | 'active' | 'canceled' | 'suspended';
  role?: string;
}

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  limits: {
    instances: number | null;
    users: number | null;
    dispatchesPerDay: number | null;
    contacts: number | null;
    automations: number | null;
  };
  features: Record<string, unknown>; // 'unknown' é mais seguro que 'any'
}

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export interface UsageData {
  instances: number;
  users: number;
  dispatchesToday: number;
}

interface AuthContextType {
  // State
  user: User | null;
  token: string | null;
  company: Company | null;
  companies: Company[];
  role: Role | null;
  plan: Plan | null;
  usage: UsageData | null;
  limits: Plan['limits'] | null;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  logout: () => void;
  switchCompany: (companyId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<Plan['limits'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [pendingCompanies, setPendingCompanies] = useState<Company[]>([]);

  // --- Helpers Internos ---

  // Helper para buscar dados da empresa (Plano e Uso) em paralelo
  const fetchCompanyData = useCallback(async (companyId: string, authToken: string) => {
    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };
      
      // Executa requests em paralelo para performance
      const [planRes, usageRes] = await Promise.allSettled([
        apiFetch(`/companies/${companyId}/plan`, { headers }),
        apiFetch(`/companies/${companyId}/usage`, { headers })
      ]);

      // Processar Plano
      if (planRes.status === 'fulfilled' && planRes.value.subscription?.plan) {
        const planData = planRes.value.subscription.plan;
        setPlan({
          id: planData.id,
          name: planData.name,
          displayName: planData.displayName,
          limits: planData.limits,
          features: planData.features || {}
        });
        setLimits(planData.limits);
      }

      // Processar Uso
      if (usageRes.status === 'fulfilled' && usageRes.value.usage) {
        setUsage(usageRes.value.usage);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setCompany(null);
    setCompanies([]);
    setRole(null);
    setPlan(null);
    setUsage(null);
    setLimits(null);
    localStorage.removeItem('token');
  }, []);

  // --- Actions ---

  const logout = useCallback(() => {
    clearSession();
    // Opcional: window.location.href = '/login'; 
  }, [clearSession]);

  // Função principal de refresh (corrigida para receber token opcional)
  const refreshUser = useCallback(async (overrideToken?: string) => {
    const effectiveToken = overrideToken || token;

    if (!effectiveToken) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/auth/me', {
        headers: { 'Authorization': `Bearer ${effectiveToken}` }
      });

      setUser(data.user);
      setCompany(data.company);
      setRole(data.role);
      setCompanies(data.companies || []);

      // Se houver empresa ativa, carrega os dados auxiliares
      if (data.company?.id) {
        await fetchCompanyData(data.company.id, effectiveToken);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchCompanyData, logout]);

  const login = useCallback(async (email: string, password: string, companyId?: string) => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      const newToken = data.token;

      // Se o usuário tem múltiplas empresas e não especificou companyId, mostrar seletor
      if (!companyId && data.companies && data.companies.length > 1) {
        // Salvar token e user, mas não selecionar empresa ainda
        setToken(newToken);
        localStorage.setItem('token', newToken);
        setUser(data.user);
        setPendingCompanies(data.companies);
        setShowCompanySelector(true);
        setIsLoading(false);
        return; // Não completa o login ainda, aguarda seleção
      }

      // Caso normal: uma empresa ou companyId especificado
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setUser(data.user);
      setCompany(data.company);
      setRole(data.role);
      setCompanies(data.companies || []);

      // Carrega dados da empresa se existir
      if (data.company?.id) {
        await fetchCompanyData(data.company.id, newToken);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchCompanyData]);

  const switchCompany = useCallback(async (companyId: string) => {
    if (!token) throw new Error('Not authenticated');
    setIsLoading(true); // Opcional: mostrar loading durante a troca

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/switch-company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companyId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to switch company');
      }

      const data = await response.json();
      const newToken = data.token; // O backend geralmente retorna um token novo atualizado com as permissões da nova empresa

      setToken(newToken);
      localStorage.setItem('token', newToken);
      setCompany(data.company);
      setRole(data.role);
      
      // Se estava mostrando seletor, esconder agora
      if (showCompanySelector) {
        setShowCompanySelector(false);
        setPendingCompanies([]);
      }

      // Limpa dados antigos antes de carregar novos para evitar inconsistência visual
      setPlan(null);
      setUsage(null);

      if (data.company?.id) {
        await fetchCompanyData(data.company.id, newToken);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, fetchCompanyData, showCompanySelector]);

  // Apenas para atualizar uso manualmente (ex: após disparar uma ação)
  const refreshUsageOnly = useCallback(async () => {
    if (!company?.id || !token) return;
    try {
      const data = await apiFetch(`/companies/${company.id}/usage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsage(data.usage);
    } catch (error) {
      console.error('Failed to refresh usage:', error);
    }
  }, [company?.id, token]);

  // --- Effects ---

  // Inicialização (F5 fix)
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // Passamos o storedToken explicitamente para evitar problemas de async state
      refreshUser(storedToken);
    } else {
      setIsLoading(false);
    }
    // Executa apenas uma vez no mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // --- Context Value Memoization ---
  
  const value = useMemo(() => ({
    user,
    token,
    company,
    companies,
    role,
    plan,
    usage,
    limits,
    isLoading,
    login,
    logout,
    switchCompany,
    refreshUser: () => refreshUser(), // Wrapper simples para manter a interface original sem argumentos
    refreshUsage: refreshUsageOnly
  }), [
    user, token, company, companies, role, plan, usage, limits, isLoading,
    login, logout, switchCompany, refreshUser, refreshUsageOnly
  ]);

  const handleCompanySelect = useCallback(async (companyId: string) => {
    await switchCompany(companyId);
  }, [switchCompany]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showCompanySelector && pendingCompanies.length > 0 && (
        <CompanySelector
          companies={pendingCompanies}
          isOpen={showCompanySelector}
          onSelect={handleCompanySelect}
          isLoading={isLoading}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}