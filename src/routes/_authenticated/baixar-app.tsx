import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Monitor, Apple, Globe, Smartphone, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/baixar-app")({
  head: () => ({
    meta: [
      { title: "Baixar App — Reforma Tributária" },
      { name: "description", content: "Instale a plataforma como aplicativo desktop ou mobile" },
    ],
  }),
  component: BaixarAppPage,
});

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectOS(): "windows" | "macos" | "linux" | "chromeos" | "ios" | "android" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/cros/.test(ua)) return "chromeos";
  if (/win/.test(ua)) return "windows";
  if (/mac/.test(ua)) return "macos";
  if (/linux/.test(ua)) return "linux";
  return "unknown";
}

function BaixarAppPage() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [os, setOs] = useState<ReturnType<typeof detectOS>>("unknown");

  useEffect(() => {
    setOs(detectOS());

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("Aplicativo instalado com sucesso!");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) {
      toast.info(
        "Use o menu do navegador (⋮) e selecione 'Instalar app' ou 'Adicionar à tela inicial'.",
        { duration: 6000 }
      );
      return;
    }
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setDeferred(null);
    } catch {
      // ignore
    }
  };

  const defaultTab =
    os === "macos" ? "macos" :
    os === "linux" ? "linux" :
    os === "chromeos" ? "chromeos" :
    os === "ios" || os === "android" ? "mobile" :
    "windows";

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Baixar Aplicativo</h1>
        <p className="text-muted-foreground">
          Instale a plataforma no seu computador ou celular para acessar como um aplicativo nativo,
          com janela própria, ícone na área de trabalho e abertura mais rápida.
        </p>
      </header>

      {installed ? (
        <Alert className="border-primary/40 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle>Aplicativo já instalado</AlertTitle>
          <AlertDescription>
            Você já está acessando esta plataforma como aplicativo instalado. Tudo certo!
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Instalação rápida
            </CardTitle>
            <CardDescription>
              Clique no botão abaixo para iniciar a instalação. Se o navegador não exibir o
              prompt automaticamente, siga as instruções específicas para o seu sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={handleInstall} className="gap-2">
              <Download className="h-4 w-4" />
              {deferred ? "Instalar agora" : "Tentar instalar"}
            </Button>
            {!deferred && (
              <p className="mt-3 text-sm text-muted-foreground">
                Seu navegador pode não suportar instalação automática. Use as instruções abaixo.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Instruções por sistema</CardTitle>
          <CardDescription>Selecione o seu sistema operacional</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="windows" className="gap-1">
                <Monitor className="h-4 w-4" /> Windows
              </TabsTrigger>
              <TabsTrigger value="macos" className="gap-1">
                <Apple className="h-4 w-4" /> macOS
              </TabsTrigger>
              <TabsTrigger value="linux" className="gap-1">
                <Monitor className="h-4 w-4" /> Linux
              </TabsTrigger>
              <TabsTrigger value="chromeos" className="gap-1">
                <Chrome className="h-4 w-4" /> ChromeOS
              </TabsTrigger>
              <TabsTrigger value="mobile" className="gap-1">
                <Smartphone className="h-4 w-4" /> Mobile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="windows" className="space-y-3 pt-4">
              <h3 className="font-semibold">Windows (Chrome, Edge ou Brave)</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Acesse a plataforma pelo navegador.</li>
                <li>
                  Clique no ícone de <strong>instalar</strong> (⊕) na barra de endereços, à direita,
                  ou abra o menu do navegador (⋮) e escolha <strong>"Instalar Reforma Tributária"</strong>.
                </li>
                <li>Confirme clicando em <strong>"Instalar"</strong>.</li>
                <li>O atalho será criado na área de trabalho e no menu Iniciar.</li>
              </ol>
            </TabsContent>

            <TabsContent value="macos" className="space-y-3 pt-4">
              <h3 className="font-semibold">macOS (Chrome, Edge, Brave ou Safari 17+)</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Acesse a plataforma pelo navegador.</li>
                <li>
                  <strong>Chrome/Edge/Brave:</strong> clique no ícone de instalar (⊕) na barra de
                  endereços ou em <strong>Arquivo → Instalar Reforma Tributária</strong>.
                </li>
                <li>
                  <strong>Safari 17+:</strong> use <strong>Arquivo → Adicionar ao Dock</strong>.
                </li>
                <li>O app aparecerá no Launchpad e na pasta Aplicativos.</li>
              </ol>
            </TabsContent>

            <TabsContent value="linux" className="space-y-3 pt-4">
              <h3 className="font-semibold">Linux (Chrome, Chromium, Edge ou Brave)</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Acesse a plataforma pelo navegador.</li>
                <li>
                  Clique no ícone de instalar (⊕) na barra de endereços ou abra o menu (⋮) →{" "}
                  <strong>"Instalar Reforma Tributária"</strong>.
                </li>
                <li>O atalho será adicionado ao menu de aplicativos da sua distribuição.</li>
              </ol>
            </TabsContent>

            <TabsContent value="chromeos" className="space-y-3 pt-4">
              <h3 className="font-semibold">ChromeOS</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>Abra a plataforma no Chrome.</li>
                <li>Clique no ícone de instalar (⊕) na barra de endereços.</li>
                <li>Confirme em <strong>"Instalar"</strong>.</li>
                <li>O app ficará disponível na sua gaveta de aplicativos.</li>
              </ol>
            </TabsContent>

            <TabsContent value="mobile" className="space-y-3 pt-4">
              <h3 className="font-semibold">Android / iPhone / iPad</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Android (Chrome ou Edge):</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Abra o site no navegador.</li>
                    <li>Toque no menu (⋮) → <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  </ol>
                </div>
                <div>
                  <p className="font-medium">iPhone / iPad (Safari):</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Abra o site no Safari.</li>
                    <li>Toque no botão de compartilhar (□↑).</li>
                    <li>Escolha <strong>"Adicionar à Tela de Início"</strong>.</li>
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sobre o aplicativo</AlertTitle>
        <AlertDescription>
          O aplicativo abre em janela própria, sem barras do navegador, e funciona com sua mesma
          conta. Para receber atualizações, basta abrir o app — elas são aplicadas automaticamente.
          Recomendamos os navegadores Chrome, Edge ou Brave para a melhor experiência de instalação.
        </AlertDescription>
      </Alert>
    </div>
  );
}
