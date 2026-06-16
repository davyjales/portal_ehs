# Portal EHS — Protótipo

Protótipo Next.js com landing interativa E/H/S, login por prontuário, área do funcionário com abas, gamificação 1UP e painel admin com Prisma + SQLite.

## Como rodar

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### Contas de teste

| Perfil       | Prontuário | Senha    |
|--------------|------------|----------|
| Funcionário  | 12345      | 123456   |
| Administrador| admin      | admin123 |

## Funcionalidades

- **Landing pública** — seletor animado E/H/S com transição de cores e carrossel de informativos
- **Login** — autenticação por prontuário e senha (JWT em cookie)
- **Área do funcionário** — abas: Início, Pendências, Alertas, Certificados, Solicitações, 1UP
- **Admin** — CRUD de informativos, pendências, alertas, desafios 1UP e usuários

## Stack

Next.js 14 · TypeScript · Tailwind CSS · Framer Motion · Prisma · SQLite · Jose (JWT)
