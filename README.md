# Portaria do Evento

App React simples para gerir entradas e saídas de um evento, ligada ao Supabase.

## Funcionalidades

- Registar entrada (nome, nº telemóvel, valor pago)
- Marcar/desmarcar saída (grava a hora de saída)
- Cálculo do tempo que cada pessoa esteve dentro (ao vivo enquanto está cá)
- Apagar registos
- Resumo: total de registos, quantos estão dentro, total recebido

## Como correr

```bash
npm install
npm run dev
```

Abre o endereço que aparece no terminal (normalmente http://localhost:5173).

## Configuração

As credenciais do Supabase estão no ficheiro `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Base de dados

Tabela `entradas` no Supabase:

| coluna        | tipo        | descrição                     |
|---------------|-------------|-------------------------------|
| id            | bigint      | chave primária (auto)         |
| nome          | text        | nome da pessoa                |
| numero_tlm    | text        | número de telemóvel           |
| hora_entrada  | timestamptz | preenchido automaticamente    |
| hora_saida    | timestamptz | preenchido ao marcar saída    |
| saida         | boolean     | já saiu? (sim/não)            |
| valor_pago    | numeric     | valor pago em €               |
