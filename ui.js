const ui = {
  game: null,

  init() {
    const cfgBots = document.getElementById('cfg-bots');
    const cfgBuyin = document.getElementById('cfg-buyin');
    const cfgBb = document.getElementById('cfg-bb');
    const link = (input, labelId, suffix) => {
      input.addEventListener('input', () => { document.getElementById(labelId).textContent = input.value + (suffix || ''); });
    };
    link(cfgBots, 'cfg-bots-val');
    link(cfgBuyin, 'cfg-buyin-val');
    link(cfgBb, 'cfg-bb-val', ' (blinds ' + Math.floor(cfgBb.value / 2) + '/');
    document.getElementById('cfg-bb').addEventListener('input', (e) => {
      document.getElementById('cfg-bb-val').textContent = e.target.value + ' (blinds ' + Math.floor(e.target.value / 2) + '/' + e.target.value + ')';
    });

    document.getElementById('btn-start').addEventListener('click', () => {
      this.config = { numBots: +cfgBots.value, buyIn: +cfgBuyin.value, bigBlind: +cfgBb.value };
      this.start();
    });
    this.bindActions();
  },

  start() {
    this.game = new Game(this.config);
    document.getElementById('log').innerHTML = '';
    document.getElementById('win-banner').classList.add('hidden');
    document.getElementById('screen-start').classList.add('hidden');
    document.getElementById('game').classList.remove('hidden');
    this.game.startHand();
  },

  bindActions() {
    document.getElementById('btn-fold').addEventListener('click', () => {
      const g = this.game;
      if (g.currentPlayer && g.currentPlayer.isHuman) { g.applyAction(g.currentPlayer, { type: 'fold' }); this.setActionsDisabled(true); }
    });
    document.getElementById('btn-check').addEventListener('click', () => {
      const g = this.game;
      if (g.currentPlayer && g.currentPlayer.isHuman) { g.applyAction(g.currentPlayer, { type: 'check' }); this.setActionsDisabled(true); }
    });
    document.getElementById('btn-call').addEventListener('click', () => {
      const g = this.game;
      if (g.currentPlayer && g.currentPlayer.isHuman) { g.applyAction(g.currentPlayer, { type: 'call' }); this.setActionsDisabled(true); }
    });
    document.getElementById('btn-raise').addEventListener('click', () => {
      const g = this.game;
      if (g.currentPlayer && g.currentPlayer.isHuman) {
        const amount = +document.getElementById('raise-slider').value;
        g.applyAction(g.currentPlayer, { type: 'raise', amount });
        this.setActionsDisabled(true);
      }
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      document.getElementById('btn-next').classList.add('hidden');
      document.getElementById('win-banner').classList.add('hidden');
      if (this.game.gameOver) {
        this.start();
        return;
      }
      document.getElementById('actions').classList.remove('hidden');
      this.game.startHand();
    });
  },

  onHumanTurn(p, toCall) {
    const g = this.game;
    document.getElementById('actions').classList.remove('hidden');
    const canCheck = toCall <= 0;
    const btnCheck = document.getElementById('btn-check');
    const btnCall = document.getElementById('btn-call');
    const raiseBox = document.getElementById('raise-box');

    btnCheck.classList.toggle('hidden', !canCheck);
    btnCall.classList.toggle('hidden', canCheck);
    btnCheck.textContent = 'Pagar (0)';
    btnCall.textContent = `Pagar ${toCall}`;

    const slider = document.getElementById('raise-slider');
    const val = document.getElementById('raise-val');
    const max = p.chips + p.contribution;
    const minTarget = g.currentBet + g.minRaise;
    const canRaise = !g.raiseDisabled && max >= minTarget && max > 0;
    raiseBox.classList.toggle('hidden', !canRaise);
    if (canRaise) {
      slider.min = minTarget;
      slider.max = max;
      slider.value = minTarget;
      const update = () => { val.textContent = slider.value; };
      slider.oninput = update;
      update();
    }

    this.setActionsDisabled(false);
  },

  setActionsDisabled(disabled) {
    document.getElementById('btn-fold').disabled = disabled;
    document.getElementById('btn-check').disabled = disabled;
    document.getElementById('btn-call').disabled = disabled;
    document.getElementById('btn-raise').disabled = disabled;
  },

  addLog(msg) {
    const log = document.getElementById('log');
    const div = document.createElement('div');
    div.textContent = msg;
    log.appendChild(div);
    while (log.children.length > 30) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  },

  cardEl(card, hidden) {
    const div = document.createElement('div');
    div.className = 'card' + (hidden ? ' card-back' : '');
    if (hidden) { div.textContent = '♦'; return div; }
    const red = card.suit === '♥' || card.suit === '♦';
    div.classList.add(red ? 'red' : 'black');
    div.innerHTML = `<span class="rank">${RANK_NAMES[card.rank]}</span><span class="suit">${card.suit}</span>`;
    return div;
  },

  render() {
    const g = this.game;
    const playersEl = document.getElementById('players');
    playersEl.innerHTML = '';
    for (const p of g.players) playersEl.appendChild(this.playerEl(g, p));

    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const c = g.community[i];
      boardEl.appendChild(c ? this.cardEl(c, false) : this.emptySlot());
    }

    const potEl = document.getElementById('pot');
    const total = g.pot + g.players.reduce((s, p) => s + p.contribution, 0);
    potEl.textContent = `Pote: ${total} fichas`;

    const statusEl = document.getElementById('status');
    if (g.over) statusEl.textContent = 'Mão encerrada.';
    else if (g.currentPlayer) statusEl.textContent = `Vez de: ${g.currentPlayer.name} (${g.handPhase})`;
    else statusEl.textContent = `Blinds ${g.sb}/${g.bb}`;
  },

  emptySlot() {
    const div = document.createElement('div');
    div.className = 'card empty';
    return div;
  },

  playerEl(g, p) {
    const wrap = document.createElement('div');
    wrap.className = 'player';
    if (p.eliminated) wrap.classList.add('eliminated');
    else if (!p.folded && !p.allIn && p === g.currentPlayer) wrap.classList.add('active');

    const cards = document.createElement('div');
    cards.className = 'cards';
    if (p.eliminated) {
      cards.textContent = 'Fora';
    } else if (p.isHuman || g.over) {
      for (const c of p.cards) cards.appendChild(this.cardEl(c, false));
    } else if (p.folded) {
      for (const c of p.cards) cards.appendChild(this.cardEl(c, true));
      cards.classList.add('folded-cards');
    } else {
      for (const c of p.cards) cards.appendChild(this.cardEl(c, true));
    }
    wrap.appendChild(cards);

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<span class="name">${p.name}</span><span class="chips">${p.chips} fichas</span>`;
    wrap.appendChild(info);

    const badges = document.createElement('div');
    badges.className = 'badges';
    if (p.seat === 0) badges.innerHTML += '<span class="badge btn">D</span>';
    if (p.seat === 1) badges.innerHTML += '<span class="badge sb">SB</span>';
    if (p.seat === 2) badges.innerHTML += '<span class="badge bb">BB</span>';
    if (p.allIn) badges.innerHTML += '<span class="badge ai">All-in</span>';
    if (p.folded) badges.innerHTML += '<span class="badge fold">Desistiu</span>';
    if (p.contribution > 0) badges.innerHTML += `<span class="badge bet">+${p.contribution}</span>`;
    if (p.handResult && g.over) badges.innerHTML += `<span class="badge hand">${p.handResult}</span>`;
    wrap.appendChild(badges);

    wrap.style.setProperty('--seat', p.seat);
    wrap.dataset.seat = p.seat;
    return wrap;
  },

  showHandOver(winners, reason, handName, amount, tied) {
    const arr = Array.isArray(winners) ? winners : [winners].filter(Boolean);
    if (arr.length === 0) return;
    const names = arr.map(w => w.name).join(', ');
    const plural = arr.length > 1;
    this.addLog(`\u21D2 ${reason} — vencedor${plural ? 'es' : ''}: ${names}${handName ? ' (' + handName + ')' : ''}`);

    const banner = document.getElementById('win-banner');
    banner.classList.remove('hidden');
    banner.innerHTML =
      `<div class="win-banner-inner"><div class="win-trophy">🏆</div>` +
      `<div class="win-title">Vencedor${plural ? 'es' : ''}</div>` +
      `<div class="win-name">${names}</div>` +
      `<div class="win-amount">levou ${amount} fichas${tied ? ' (cada)' : ''}</div>` +
      `</div>`;

    const btn = document.getElementById('btn-next');
    btn.classList.remove('hidden');
    document.getElementById('actions').classList.add('hidden');
    if (this.game.gameOver) btn.textContent = 'Nova partida';
    else btn.textContent = 'Próxima mão';
  },

  showGameOver() {
    const log = document.getElementById('log');
    const div = document.createElement('div');
    div.className = 'gameover-msg';
    div.textContent = 'Você ficou sem fichas. Fim de jogo!';
    log.appendChild(div);
  }
};

window.addEventListener('DOMContentLoaded', () => ui.init());
