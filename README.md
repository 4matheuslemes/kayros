# Kairós

Web app PWA mobile-first para registro pessoal de atividade de pregação.

## Setup

### 1. Clone e instale

```bash
npm install
```

### 2. Configure o Supabase

Copie o arquivo de exemplo e preencha suas credenciais:

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Execute a migration no Supabase

1. Acesse o painel do Supabase → **SQL Editor** → **New query**
2. Cole o conteúdo de `supabase/migrations/001_initial.sql`
3. Clique em **Run**

### 4. Crie seu usuário

No painel do Supabase → **Authentication** → **Users** → **Add user** → insira seu e-mail e senha.

### 5. Rode localmente

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Deploy no Vercel

```bash
# Instale a CLI do Vercel (se ainda não tiver)
npm i -g vercel

# Configure as variáveis de ambiente
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy
vercel deploy --prod
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilo | Tailwind CSS v4 + componentes customizados |
| Backend / Auth | Supabase (Postgres + Row Level Security) |
| Offline | Dexie.js (IndexedDB) + fila de sync |
| PWA | Serwist (Workbox fork) |
| Formulários | react-hook-form + zod |
| Gráficos | recharts |
| Ícones | lucide-react |

## Trocar o nome do app

Edite `src/lib/constants.ts` — altere `APP_NAME` e propaga para tudo automaticamente.
# kayros
