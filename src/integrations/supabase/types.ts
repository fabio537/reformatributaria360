export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artigos_legais: {
        Row: {
          autor_id: string | null
          categoria: string
          conteudo: string
          created_at: string
          id: string
          publicado: boolean
          tags: string[] | null
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          categoria?: string
          conteudo: string
          created_at?: string
          id?: string
          publicado?: boolean
          tags?: string[] | null
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          publicado?: boolean
          tags?: string[] | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      creditos_aquisicao: {
        Row: {
          aliquota_cofins: number | null
          aliquota_icms: number | null
          aliquota_ipi: number | null
          aliquota_pis: number | null
          created_at: string
          descricao: string | null
          empresa_id: string
          fornecedor: string
          id: string
          ncm: string | null
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          aliquota_cofins?: number | null
          aliquota_icms?: number | null
          aliquota_ipi?: number | null
          aliquota_pis?: number | null
          created_at?: string
          descricao?: string | null
          empresa_id: string
          fornecedor: string
          id?: string
          ncm?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          aliquota_cofins?: number | null
          aliquota_icms?: number | null
          aliquota_ipi?: number | null
          aliquota_pis?: number | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          fornecedor?: string
          id?: string
          ncm?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creditos_aquisicao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_usuarios: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          cnae_principal: string | null
          cnaes_secundarios: string[] | null
          cnpj: string
          created_at: string
          email: string | null
          endereco: string | null
          faturamento_anual: number | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          municipio: string | null
          nome_fantasia: string | null
          optante_simples_mei: boolean | null
          razao_social: string
          regime_tributario: Database["public"]["Enums"]["regime_tributario"]
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnae_principal?: string | null
          cnaes_secundarios?: string[] | null
          cnpj: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          faturamento_anual?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          optante_simples_mei?: boolean | null
          razao_social: string
          regime_tributario?: Database["public"]["Enums"]["regime_tributario"]
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnae_principal?: string | null
          cnaes_secundarios?: string[] | null
          cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          faturamento_anual?: number | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          optante_simples_mei?: boolean | null
          razao_social?: string
          regime_tributario?: Database["public"]["Enums"]["regime_tributario"]
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fontes_atualizacao: {
        Row: {
          categoria: string | null
          created_at: string
          data_publicacao: string | null
          fonte: string
          id: string
          resumo: string | null
          titulo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          fonte?: string
          id?: string
          resumo?: string | null
          titulo: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_publicacao?: string | null
          fonte?: string
          id?: string
          resumo?: string | null
          titulo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          aliquota_cofins: number | null
          aliquota_icms: number | null
          aliquota_ipi: number | null
          aliquota_pis: number | null
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          ncm: string
          quantidade_mensal: number | null
          regime_diferenciado: string | null
          tipo_operacao: string | null
          unidade: string | null
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          aliquota_cofins?: number | null
          aliquota_icms?: number | null
          aliquota_ipi?: number | null
          aliquota_pis?: number | null
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          ncm: string
          quantidade_mensal?: number | null
          regime_diferenciado?: string | null
          tipo_operacao?: string | null
          unidade?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          aliquota_cofins?: number | null
          aliquota_icms?: number | null
          aliquota_ipi?: number | null
          aliquota_pis?: number | null
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          ncm?: string
          quantidade_mensal?: number | null
          regime_diferenciado?: string | null
          tipo_operacao?: string | null
          unidade?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          aliquota_cofins: number | null
          aliquota_iss: number | null
          aliquota_pis: number | null
          codigo_servico: string
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          regime_diferenciado: string | null
          tipo_servico: string | null
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          aliquota_cofins?: number | null
          aliquota_iss?: number | null
          aliquota_pis?: number | null
          codigo_servico: string
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          regime_diferenciado?: string | null
          tipo_servico?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          aliquota_cofins?: number | null
          aliquota_iss?: number | null
          aliquota_pis?: number | null
          codigo_servico?: string
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          regime_diferenciado?: string | null
          tipo_servico?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacoes: {
        Row: {
          ano_fim: number | null
          ano_inicio: number | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          parametros: Json
          resultados: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ano_fim?: number | null
          ano_inicio?: number | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          parametros?: Json
          resultados?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ano_fim?: number | null
          ano_inicio?: number | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          parametros?: Json
          resultados?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      user_belongs_to_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "funcionario" | "cliente"
      regime_tributario: "simples_nacional" | "lucro_presumido" | "lucro_real"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "funcionario", "cliente"],
      regime_tributario: ["simples_nacional", "lucro_presumido", "lucro_real"],
    },
  },
} as const
