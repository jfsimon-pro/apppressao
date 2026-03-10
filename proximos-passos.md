# myBPBuddy — Documentação e Próximos Passos

## O que foi construído

### Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Banco de dados**: Neon (PostgreSQL serverless)
- **Autenticação**: JWT via `jose` + cookies HttpOnly
- **PWA**: Manifest + Service Worker manual (sem dependência externa)
- **Push**: Web Push API com VAPID (`web-push`)

---

### Funcionalidades implementadas

#### Autenticação
- Registro e login com e-mail + senha (bcrypt)
- JWT em cookie HttpOnly (7 dias)
- Middleware de proteção de rotas (`/dashboard`, `/history`, `/reminders`, `/settings`)

#### Dashboard (`/dashboard`)
- Saudação personalizada com nome e iniciais do usuário logado
- 3 cards de registro: **Manhã**, **Noite**, **Extra**
- Cada card tem: hora (opcional), sistólica, diastólica, observação
- Salva no banco e atualiza a lista imediatamente
- Últimos 10 registros com data, hora, período, status e observação

#### Histórico (`/history`)
- Dados reais do banco, agrupados por data
- Classificação de pressão com cores (Baixa / Normal / Elevada / Alta / Crise)
- Observação exibida por registro

#### Classificação de Pressão Arterial (AHA 2017)
| Status | Sistólica | | Diastólica | Cor |
|---|---|---|---|---|
| Baixa | < 90 | ou | < 60 | Azul |
| Normal | < 120 | e | < 80 | Verde |
| Elevada | 120–129 | e | < 80 | Amarelo |
| Alta | ≥ 130 | ou | ≥ 80 | Vermelho |
| Crise | > 180 | ou | > 120 | Vermelho escuro |

#### Lembretes (`/reminders`)
- 4 lembretes padrão criados automaticamente na primeira visita (Manhã, Noite, Água, Medicamento)
- Toggle liga/desliga salva no banco
- Edição de horário inline (clique no horário)
- Adicionar lembrete com picker de tipo: **Pressão**, **Medicamento**, **Água**
- Deletar lembretes criados pelo usuário

#### Configurações (`/settings`)
- Carrega nome, e-mail e telefone do banco
- Salva alterações com feedback de sucesso/erro
- Botão "Sair da Conta" chama o logout e redireciona para `/login`

#### Notificações Push
- Permissão solicitada na página de Lembretes com banner visual
- Estados: Ativar / Ativa (com botão Desativar) / Bloqueada
- Subscriptions salvas no banco por usuário (upsert)
- Cron job (`/api/notifications/cron`) verifica lembretes a cada minuto e envia push
- Service Worker recebe push e exibe notificação nativa do sistema operacional
- Clique na notificação abre o app no `/dashboard`

#### PWA
- `public/manifest.json` completo com atalhos rápidos
- `public/sw.js` com cache de páginas e assets, network-only para APIs
- Ícones gerados em 12 tamanhos (48px → 512px) + apple-touch-icon + favicon
- Meta tags para iOS (apple-mobile-web-app) e Android (theme-color)
- Script `npm run generate-icons` para regenerar ícones quando necessário

---

### Estrutura de Banco de Dados

```sql
users (
  id, name, email, password_hash, phone, created_at
)

blood_pressure_readings (
  id, user_id, systolic, diastolic, period,
  observation, measured_at, created_at
)

reminders (
  id, user_id, type, label, active,
  time, interval_hours, created_at
)

push_subscriptions (
  id, user_id, endpoint, p256dh, auth, created_at
)
```

---

### Variáveis de Ambiente (`.env.local`)

```env
DATABASE_URL=           # URL do Neon PostgreSQL
JWT_SECRET=             # Segredo para assinar tokens
VAPID_PUBLIC_KEY=       # Chave pública VAPID (gerada)
VAPID_PRIVATE_KEY=      # Chave privada VAPID (gerada)
VAPID_EMAIL=            # E-mail de contato VAPID
CRON_SECRET=            # (opcional) segredo para proteger o endpoint do cron
```

---

## Próximos Passos

### 1. Deploy (pré-requisito para tudo abaixo)
- Fazer deploy na **Vercel** (recomendado — já tem cron jobs nativo)
- Adicionar todas as variáveis de ambiente no painel da Vercel
- O `vercel.json` já está configurado com o cron a cada minuto
- Notificações push só funcionam em HTTPS (produção)

### 2. Segurança do Cron
Adicionar ao `.env` (Vercel):
```env
CRON_SECRET=um-segredo-longo-aqui
```
O endpoint `/api/notifications/cron` já verifica esse segredo via query param ou header `x-cron-secret`.

### 3. Aviso de Middleware Deprecated
O Next.js 16 renomeou `middleware.ts` para `proxy.ts`. Renomear:
```
src/middleware.ts → src/proxy.ts
```

### 4. Integração com Capacitor (app nativo)

#### Setup inicial
```bash
npm install @capacitor/core @capacitor/cli
npx cap init myBPBuddy com.luminon.mybpbuddy
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

#### Build e sync
```bash
npm run build
npx cap sync
```

#### Notificações nativas
Substituir Web Push por:
```bash
npm install @capacitor/push-notifications @capacitor/local-notifications
```
- **Local notifications**: Agendar diretamente no dispositivo (sem servidor) — ideal para lembretes com horário fixo
- **Push notifications FCM/APNs**: Para notificações remotas (requer Firebase + conta Apple Developer)

#### Google Play Store
1. `npx cap open android` → Android Studio → gerar APK/AAB assinado
2. Ou usar **PWABuilder** (pwabuilder.com) com a URL de produção para gerar TWA sem Android Studio

#### Apple App Store
1. Requer macOS + Xcode + conta Apple Developer ($99/ano)
2. `npx cap open ios` → Xcode → Archive → Submit
3. Ou usar **PWABuilder** para gerar pacote iOS

### 5. Funcionalidades futuras sugeridas

#### Médicas
- [ ] Gráfico de evolução da pressão (linha do tempo)
- [ ] Exportar histórico em PDF
- [ ] Meta de pressão personalizada pelo usuário
- [ ] Frequência cardíaca nos registros

#### App
- [ ] Tela de onboarding para novos usuários
- [ ] Modo escuro manual (além do automático por sistema)
- [ ] Senha de acesso rápido / biometria (Capacitor: `@capacitor/biometrics`)
- [ ] Compartilhar relatório com médico via link

#### Técnico
- [ ] Rate limiting nas APIs de autenticação
- [ ] Paginação no histórico (atualmente limita a 500 registros)
- [ ] Refresh automático do JWT antes de expirar
- [ ] Testes automatizados (Playwright para E2E)
