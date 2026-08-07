# ♠ Poker Texas Hold'em

Jogo de poker **Texas Hold'em** jogável no navegador, você contra bots. Sistema completo de fichas, blinds, apostas (fold/check/call/raise com all-in) e showdown — tudo local, sem nenhuma dependência externa.

## Funcionalidades

- 🃏 Texas Hold'em completo: 2 cartas privadas + 5 comunitárias (flop → turn → river)
- 💰 Sistema de fichas com buy-in configurável e blinds (small/big blind)
- 🎮 Ações: desistir, pagar (check), pagar aposta, aumentar (com controle de valor) e all-in
- 🤖 De 2 a 3 oponentes controlados por IA (heurística de força de mão + pot odds)
- 🏆 Showdown com nome da mão vencedora (straight flush, full house, etc.)
- 📜 Log de todas as ações da partida
- ⚰️ Jogadores eliminados ficam fora das próximas mãos; game over quando você fica sem fichas

## Como rodar

### Opção 1 — Abrir direto (mais simples)

Abra o arquivo `index.html` no navegador. Funciona offline, sem instalar nada.

### Opção 2 — Servidor local

```bash
python3 serve.py
```

O navegador abre automaticamente em `http://127.0.0.1:8000/`.

## Como jogar

1. Na tela inicial, escolha o número de oponentes, as fichas iniciais e o tamanho do big blind.
2. Na sua vez, use os botões: **Desistir**, **Pagar**, **Check** ou **Aumentar** (arraste o controle para escolher o valor).
3. Em cada rodada de apostas (pré-flop, flop, turn e river), as fichas são movidas para o pote.
4. No showdown, a melhor mão de 5 cartas (das 7 disponíveis) leva o pote.
5. Quando suas fichas acabarem, é fim de jogo — clique em **Nova partida** para recomeçar.

> **Nota de simplificação:** quando um jogador fica all-in com menos fichas que a aposta, as apostas posteriores são limitadas (sem side pots).

## Estrutura do projeto

```
├── index.html      # Estrutura da mesa, painel de ações e tela inicial
├── style.css       # Estilo: mesa verde, cartas, fichas e tema escuro
├── game.js         # Lógica: baralho, avaliação de mãos, IA e motor das rodadas
├── ui.js           # Renderização da interface e eventos dos botões
└── serve.py        # Servidor local opcional (biblioteca padrão do Python)
```

## Tecnologias

- **HTML / CSS / JavaScript** puro — sem frameworks e sem dependências
- **Python** apenas no servidor local opcional (biblioteca padrão)

## Licença

Distribuído sob a licença [MIT](LICENSE).
