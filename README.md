# Portal EHS — Protótipo

Protótipo Next.js com landing interativa E/H/S, login por prontuário/biometria, área do funcionário com abas, gamificação 1UP e painel admin com Prisma + MySQL.

## Como rodar

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### Leitor biométrico Futronic

O portal usa um serviço local Windows para comunicar com o leitor. Veja [`services/futronic-bridge/README.md`](services/futronic-bridge/README.md).

**Modo demo (sem leitor):**

```powershell
cd services/futronic-bridge
dotnet run -- --demo
```

Configure as variáveis em `.env.example` (copie para `.env`).

### Contas de teste

| Perfil       | Prontuário | Senha    |
|--------------|------------|----------|
| Funcionário  | 12345      | —        |
| Administrador| admin      | admin123 |

## Funcionalidades

- **Landing pública** — seletor animado E/H/S com transição de cores e carrossel de informativos
- **Login** — biometria Futronic (digital) ou prontuário; admins com biometria não precisam de senha
- **Cadastro biométrico** — primeiro acesso com prontuário vincula a digital ao perfil
- **Área do funcionário** — abas: Início, Pendências, Alertas, Certificados, Solicitações, 1UP
- **Admin** — CRUD de informativos, pendências, alertas, desafios 1UP, usuários e biometria

## Stack

Next.js 14 · TypeScript · Tailwind CSS · Framer Motion · Prisma · MySQL · Jose (JWT) · Futronic Bridge (.NET 8)
