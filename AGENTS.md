<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kairós Design System Rules

## Ícones e Logos
- **Ícones do PWA**: Arquivos como `icon-512x512.png`, `icon-192x192.png` e `apple-touch-icon.png` possuem um fundo sólido escuro obrigatório (navy) para atender aos requisitos do manifest e do sistema operacional. Eles **NUNCA** devem ser usados dentro da interface do próprio app.
- **Ícone In-App**: Para exibir o logo do Kairós (a chama dourada) dentro das telas do app (ex: Tela de Login, Splash screen, Empty States), use **SEMPRE** o arquivo `kairos-mark-transparent.svg`. Este arquivo não possui fundo, garantindo contraste perfeito em light/dark mode e mesclagem suave com o fundo da aplicação.
