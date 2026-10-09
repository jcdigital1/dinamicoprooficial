# DINÂMICO PRO — Manual de Instalação e Implantação Comercial (Vercel & Firebase)

O **DINÂMICO PRO** é uma solução completa de ponta a ponta desenvolvida para fabricantes e revendedores de plaquinhas acrílicas/PVC com QR Code Dinâmico e NFC.

---

## 1. Arquitetura Multi-Instalação (Revenda)

Cada comprador/gráfica deve possuir sua própria infraestrutura isolada:
- **Projeto Firebase próprio** (autenticação, Firestore para persistência atômica).
- **Domínio próprio** (ex: `placas.graficasilva.com.br`, `nfc.suaempresa.com.br`).
- **Deploy independente na Vercel**.

---

## 2. Passo a Passo de Implantação

### Passo 1: Configurar Projeto no Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com).
2. Crie um projeto novo (ex: `dinamico-pro-cliente-01`).
3. Em **Authentication**:
   - Ative o provedor **E-mail/Senha**.
   - (Opcional) Ative o provedor **Google**.
4. Em **Cloud Firestore**:
   - Crie o banco de dados.
   - Aplique as regras contidas no arquivo `firestore.rules` deste repositório.
5. Em **Project Settings > General > Your Apps**:
   - Adicione um aplicativo Web.
   - Copie as credenciais geradas.

### Passo 2: Deploy na Vercel
1. Conecte o repositório no painel da [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. Adicione as variáveis de ambiente (conforme `.env.example`):
   - `VITE_PUBLIC_DOMAIN`: O domínio que os visitantes acessarão ao ler o QR Code (ex: `https://placas.suagrafica.com.br`).
   - `VITE_FIREBASE_API_KEY`: Chave da API do Firebase.
   - `VITE_FIREBASE_AUTH_DOMAIN`: Domínio de autenticação.
   - `VITE_FIREBASE_PROJECT_ID`: ID do projeto Firebase.
   - `VITE_FIREBASE_STORAGE_BUCKET`: Bucket do Storage.
   - `VITE_FIREBASE_DATABASE_ID`: ID do banco Firestore.
4. Clique em **Deploy**.

---

## 3. Fluxo de Operação e Fabricação

1. **Login no Painel**:
   Acesse a instalação e entre com seu e-mail e senha.

2. **Verificar Domínio**:
   Em **CONFIGURAÇÕES**, confirme que o domínio público bate com seu domínio de produção.

3. **Gerar Lote**:
   - Acesse **GERAR LOTE**.
   - Escolha entre as 8 artes oficiais calibradas (Google Avaliação, Instagram, WhatsApp, Wi-Fi, Pix).
   - Defina a quantidade (ex: 10, 20 ou 50 unidades).
   - O sistema aloca numeração atômica sequencial (`PLACA-000001`, `PLACA-000002`...) e gera URLs exclusivas (`/q/p_xxxxxx`).
   - O QR Code fictício é removido e substituído pelo QR Code dinâmico em resolução ultra-nítida.

4. **Impressão e Corte (PDF A4 10x10cm)**:
   - Baixe o arquivo PDF A4 gerado.
   - O gabarito organiza 4 plaquinhas por página (2x2), com margem lateral de 0,5cm e margem vertical de 4,85cm, preservando a escala física exata de 10x10cm para corte a laser ou serigrafia.

5. **Gerenciamento de Destino**:
   - Cada plaquinha possui link dinâmico.
   - Acesse **MEUS LOTES > Visualizar > EDITAR**.
   - Preencha o nome do cliente e o link (ex: Instagram, WhatsApp, Google).
   - O QR code físico impresso **nunca precisa ser trocado**!
