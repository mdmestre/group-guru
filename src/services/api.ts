const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    email: string;
    clientId: string;
    name?: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  status: string;
  tags: string[];
  lastContact: string;
}

export interface Metrics {
  total: number;
  engaged: number;
  retentionRate: string;
  avgResponseMs: number;
  messagesPerDay: Record<string, number>;
}

export interface Message {
  _id?: string;
  side: 'in' | 'out';
  text: string;
  timestamp: string;
}

export interface Automation {
  _id?: string;
  trigger: string;
  response: string;
  isActive: boolean;
  type: string;
}

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Auth
  async register(email: string, password: string, name?: string, companyName?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, companyName })
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let error;
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const text = await response.text();
        error = { error: text || 'Erro ao registrar' };
      }
      throw new Error(error.error || 'Erro ao registrar');
    }

    const data = await response.json();
    
    // Save to localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('userEmail', data.user.email);
    localStorage.setItem('clientId', data.user.clientId);
    if (data.user.name) localStorage.setItem('userName', data.user.name);

    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let error;
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const text = await response.text();
        error = { error: text || 'Erro ao fazer login' };
      }
      throw new Error(error.error || 'Erro ao fazer login');
    }

    const data = await response.json();
    
    // Save to localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('userEmail', data.user.email);
    localStorage.setItem('clientId', data.user.clientId);
    if (data.user.name) localStorage.setItem('userName', data.user.name);

    return data;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('clientId');
    localStorage.removeItem('userName');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  // WhatsApp Connection
  async connectWhatsApp(): Promise<{ success: boolean; qr?: string }> {
    const clientId = localStorage.getItem('clientId');
    if (!clientId) throw new Error('ClientId not found');

    const response = await fetch(`${API_URL}/clients/${clientId}/connect`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao conectar WhatsApp');
    }

    return response.json();
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    const response = await fetch(`${API_URL}/crm/contacts`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar contatos');
    }

    return response.json();
  }

  async createContact(contact: { jid: string; name?: string; status?: string }): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/crm/contacts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(contact)
    });

    if (!response.ok) {
      throw new Error('Erro ao criar contato');
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  // Messages
  async getMessages(phone: string): Promise<Message[]> {
    const response = await fetch(`${API_URL}/crm/messages/${phone}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar mensagens');
    }

    return response.json();
  }

  async sendMessage(phone: string, message: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/crm/send-message`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ phone, message })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao enviar mensagem');
    }

    return response.json();
  }

  // Metrics
  async getMetrics(): Promise<Metrics> {
    const response = await fetch(`${API_URL}/metrics`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar métricas');
    }

    return response.json();
  }

  // Analytics
  async getMessageAnalytics(range: '7d' | '30d' | '90d' = '7d'): Promise<{
    totalIn: number;
    totalOut: number;
    byDate: Array<{
      date: string;
      messagesIn: number;
      messagesOut: number;
    }>;
    range: string;
  }> {
    const response = await fetch(`${API_URL}/analytics/messages?range=${range}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar analytics');
    }

    return response.json();
  }

  // Automations
  async getAutomations(): Promise<Automation[]> {
    const response = await fetch(`${API_URL}/crm/automations`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar automações');
    }

    return response.json();
  }

  async createAutomation(automation: Omit<Automation, '_id'>): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/crm/automations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(automation)
    });

    if (!response.ok) {
      throw new Error('Erro ao criar automação');
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  async updateAutomation(id: string, automation: Partial<Automation>): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/crm/automations/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(automation)
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar automação');
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  async deleteAutomation(id: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/crm/automations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao deletar automação');
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  // Groups
  async getGroups(): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/groups`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar grupos');
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  // Upload Numbers
  async uploadNumbers(numbers: string[]): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/upload-numbers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newNumbers: numbers })
    });

    if (!response.ok) {
      throw new Error('Erro ao fazer upload dos números');
    }

    return response.json();
  }

  // Cycle Management
  async startCycle(config: unknown): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/start-cycle`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ config })
    });

    if (!response.ok) {
      throw new Error('Erro ao iniciar ciclo');
    }

    return response.json() as Promise<Record<string, unknown>>;
  }

  async pauseCycle(): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/pause-cycle`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao pausar ciclo');
    }

    return response.json();
  }

  // Generic HTTP methods for React Query hooks
  async get<T>(endpoint: string, options?: { params?: Record<string, any> }): Promise<{ data: T }> {
    // Build URL with query params
    let url = `${API_URL}${endpoint}`;
    if (options?.params) {
      const params = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let error;
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const text = await response.text();
        error = { error: text || 'Erro na requisição' };
      }
      throw new Error(error.error || error.message || 'Erro na requisição');
    }

    const data = await response.json();
    // Handle both { status, data } and direct data responses
    return { data: data.data || data };
  }

  async post<T>(endpoint: string, body?: any): Promise<{ data: T }> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let error;
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const text = await response.text();
        error = { error: text || 'Erro na requisição' };
      }
      // Log error for debugging
      console.error(`[API] POST ${endpoint} failed:`, {
        status: response.status,
        error,
        body: body
      });
      throw new Error(error.error || error.message || `Erro na requisição (${response.status})`);
    }

    const data = await response.json();
    // Handle both { status, data } and direct data responses
    return { data: data.data || data };
  }

  async put<T>(endpoint: string, body?: any): Promise<{ data: T }> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let error;
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const text = await response.text();
        error = { error: text || 'Erro na requisição' };
      }
      console.error(`[API] PUT ${endpoint} failed:`, {
        status: response.status,
        error,
        body: body
      });
      throw new Error(error.error || error.message || `Erro na requisição (${response.status})`);
    }

    const data = await response.json();
    // Handle both { status, data } and direct data responses
    return { data: data.data || data };
  }

  async delete<T>(endpoint: string): Promise<void> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let error;
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const text = await response.text();
        error = { error: text || 'Erro na requisição' };
      }
      throw new Error(error.error || error.message || 'Erro na requisição');
    }
  }
}

export const api = new ApiService();
export default api;
