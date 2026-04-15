import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Reforma Tributária" },
      { name: "description", content: "Acesse a plataforma de suporte à reforma tributária." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [auth.isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await auth.login(email, password);
      } else {
        await auth.signup(email, password, nome);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-xl font-bold text-primary-foreground">RT</span>
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === "login" ? "Acessar Plataforma" : "Criar Conta"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Entre com suas credenciais para acessar"
              : "Preencha os dados para criar sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>Não tem conta?{" "}<button onClick={() => setMode("signup")} className="text-primary underline-offset-4 hover:underline">Criar conta</button></>
            ) : (
              <>Já tem conta?{" "}<button onClick={() => setMode("login")} className="text-primary underline-offset-4 hover:underline">Fazer login</button></>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
