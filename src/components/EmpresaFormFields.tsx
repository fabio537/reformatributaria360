import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCnpj } from "@/lib/format";

const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

type RegimeTributario = "simples_nacional" | "lucro_presumido" | "lucro_real";

export type EmpresaFormValues = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  regime_tributario: RegimeTributario;
  cnae_principal: string;
  email: string;
  telefone: string;
  endereco: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  uf: string;
  municipio: string;
  faturamento_anual: string;
  optante_simples_mei: boolean;
};

type EmpresaFormFieldsProps = {
  form: EmpresaFormValues;
  setForm: (updater: EmpresaFormValues) => void;
};

export function getEmptyEmpresaForm(): EmpresaFormValues {
  return {
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    regime_tributario: "simples_nacional",
    cnae_principal: "",
    email: "",
    telefone: "",
    endereco: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    uf: "",
    municipio: "",
    faturamento_anual: "",
    optante_simples_mei: false,
  };
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1 border-b pb-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function EmpresaFormFields({ form, setForm }: EmpresaFormFieldsProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <SectionTitle
          title="Dados cadastrais"
          description="Informações básicas da empresa para identificação e contato."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input
              value={formatCnpj(form.cnpj)}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value.replace(/\D/g, "").slice(0, 14) })}
              placeholder="00.000.000/0000-00"
              className="input-cnpj"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Razão Social</Label>
            <Input
              value={form.razao_social}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Nome Fantasia</Label>
          <Input
            value={form.nome_fantasia}
            onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle
          title="Dados para simulação"
          description="Esses campos alimentam o simulador tributário e devem ser preenchidos para uma análise consistente."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Regime Tributário</Label>
            <Select
              value={form.regime_tributario}
              onValueChange={(value) => setForm({ ...form, regime_tributario: value as RegimeTributario })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                <SelectItem value="lucro_real">Lucro Real</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CNAE Principal</Label>
            <Input
              value={form.cnae_principal}
              onChange={(e) => setForm({ ...form, cnae_principal: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Faturamento Anual (R$)</Label>
            <CurrencyInput
              value={form.faturamento_anual}
              onValueChange={(v) => setForm({ ...form, faturamento_anual: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Inscrição Estadual</Label>
            <Input
              value={form.inscricao_estadual}
              onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Inscrição Municipal</Label>
            <Input
              value={form.inscricao_municipal}
              onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>UF</Label>
            <Select value={form.uf || "_none_"} onValueChange={(value) => setForm({ ...form, uf: value === "_none_" ? "" : value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">—</SelectItem>
                {UF_LIST.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Município</Label>
            <Input
              value={form.municipio}
              onChange={(e) => setForm({ ...form, municipio: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Switch
            checked={form.optante_simples_mei}
            onCheckedChange={(checked) => setForm({ ...form, optante_simples_mei: checked })}
          />
          <div>
            <Label>Optante Simples/MEI</Label>
            <p className="text-sm text-muted-foreground">Usado como premissa complementar no simulador.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
