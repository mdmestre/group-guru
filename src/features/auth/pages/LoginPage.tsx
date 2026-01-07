import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-white via-neutral-50/50 to-primary/5 relative overflow-hidden">
      {/* Premium Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/3 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/2 blur-3xl" />
      </div>
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo and Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary/20 mb-6 animate-scale-in">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-700 bg-clip-text text-transparent">
            Stracta
          </h1>
          <p className="text-neutral-600 text-lg font-medium">Entre na sua conta</p>
        </div>

        {/* Premium Login Card */}
        <Card className="border border-neutral-200/80 bg-white/80 backdrop-blur-sm shadow-xl shadow-neutral-900/5">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-neutral-900">Entrar</CardTitle>
            <CardDescription className="text-center text-sm text-neutral-600">
              Digite seu e-mail e senha para acessar seu painel
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50/50">
                  <AlertDescription className="font-medium text-red-900">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-neutral-700">E-mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nome@empresa.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "h-11 bg-white border-neutral-200",
                    "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                    "transition-all duration-200",
                    "placeholder:text-neutral-400"
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-neutral-700">Senha</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "h-11 bg-white border-neutral-200",
                    "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                    "transition-all duration-200",
                    "placeholder:text-neutral-400"
                  )}
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button 
                className={cn(
                  "w-full h-11 text-base font-semibold",
                  "bg-gradient-to-r from-primary-500 to-primary-600",
                  "hover:from-primary-600 hover:to-primary-700",
                  "text-white shadow-lg shadow-primary/20",
                  "hover:shadow-xl hover:shadow-primary/30",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  "Acessar Painel"
                )}
              </Button>
              
              <div className="text-center text-sm">
                <span className="text-neutral-600">Não tem uma conta? </span>
                <button
                  type="button"
                  onClick={() => navigate("/auth/register")}
                  className="text-primary-600 font-semibold hover:text-primary-700 hover:underline transition-all"
                  disabled={isLoading}
                >
                  Registre-se
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
