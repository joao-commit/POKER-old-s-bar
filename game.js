const SUITS = ['♠', '♥', '♦', '♣'];
const RANK_NAMES = {2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A'};
const HAND_NAMES = {
  9:'Straight Flush', 8:'Four of a Kind', 7:'Full House', 6:'Flush',
  5:'Straight', 4:'Three of a Kind', 3:'Two Pair', 2:'One Pair', 1:'High Card'
};

function createDeck() {
  const d = [];
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) d.push({ rank, suit, id: RANK_NAMES[rank] + suit });
  return d;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function combinations(arr, k) {
  const res = [];
  const recurse = (start, acc) => {
    if (acc.length === k) { res.push(acc.slice()); return; }
    for (let i = start; i <= arr.length - (k - acc.length); i++) {
      acc.push(arr[i]);
      recurse(i + 1, acc);
      acc.pop();
    }
  };
  recurse(0, []);
  return res;
}

function evaluate5(cards) {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5;
  }
  const count = {};
  for (const r of ranks) count[r] = (count[r] || 0) + 1;
  const groups = Object.entries(count).map(([r, n]) => ({ r: +r, n })).sort((a, b) => b.n - a.n || b.r - a.r);

  let cat, kick;
  if (isFlush && straightHigh) { cat = 9; kick = [straightHigh]; }
  else if (groups[0].n === 4) { cat = 8; kick = [groups[0].r, groups[1].r]; }
  else if (groups[0].n === 3 && groups[1].n === 2) { cat = 7; kick = [groups[0].r, groups[1].r]; }
  else if (isFlush) { cat = 6; kick = ranks; }
  else if (straightHigh) { cat = 5; kick = [straightHigh]; }
  else if (groups[0].n === 3) { cat = 4; kick = [groups[0].r, groups[1].r, groups[2].r]; }
  else if (groups[0].n === 2 && groups[1].n === 2) { cat = 3; kick = [groups[0].r, groups[1].r, groups[2].r]; }
  else if (groups[0].n === 2) { cat = 2; kick = [groups[0].r, groups[1].r, groups[2].r, groups[3].r]; }
  else { cat = 1; kick = ranks; }

  const BASE = 16;
  let score = cat * Math.pow(BASE, 5);
  for (let i = 0; i < 5; i++) score += (kick[i] || 0) * Math.pow(BASE, 4 - i);
  return { score, cat, name: HAND_NAMES[cat], kick };
}

function evaluateBest(cards) {
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const ev = evaluate5(combo);
    if (!best || ev.score > best.score) best = ev;
  }
  return best;
}

function preflopStrength(h) {
  const a = Math.max(h[0].rank, h[1].rank);
  const b = Math.min(h[0].rank, h[1].rank);
  let s = 0;
  if (a === b) s = 0.55 + a * 0.025;
  else {
    s = (a + b) / 28 * 0.55;
    if (a - b <= 2) s += 0.15;
    if (h[0].suit === h[1].suit) s += 0.08;
    if (a >= 13 && b >= 10) s += 0.15;
  }
  return Math.min(0.97, Math.max(0.05, s));
}

function postflopStrength(cards) {
  const ev = evaluateBest(cards);
  const map = {9:1, 8:0.97, 7:0.92, 6:0.85, 5:0.78, 4:0.72, 3:0.58, 2:0.42, 1:0.10};
  return map[ev.cat] + (ev.kick[0] || 0) / 140;
}

class Game {
  constructor({ numBots, buyIn, bigBlind }) {
    this.buyIn = buyIn;
    this.sb = Math.floor(bigBlind / 2) || 1;
    this.bb = bigBlind;
    this.players = [{ name: 'Você', chips: buyIn, isHuman: true, seat: 0 }];
    const names = ['Bot Ana', 'Bot Bruno', 'Bot Carla', 'Bot Dudu', 'Bot Eva', 'Bot Fábio', 'Bot Giga'];
    for (let i = 0; i < numBots; i++) {
      this.players.push({ name: names[i], chips: buyIn, isHuman: false, seat: i + 1 });
    }
    this.gameOver = false;
    this.log = [];
  }

  startHand() {
    this.pot = 0;
    this.deck = shuffle(createDeck());
    this.community = [];
    this.over = false;
    this.raiseDisabled = false;
    for (const p of this.players) {
      if (p.chips <= 0) { p.eliminated = true; p.cards = []; continue; }
      p.eliminated = false;
      p.cards = [];
      p.folded = false;
      p.allIn = false;
      p.contribution = 0;
      p.actedThisRound = false;
      p.handResult = null;
    }
    this.log = [];
    ui.addLog(`--- Nova mão (blinds ${this.sb}/${this.bb}) ---`);
    for (let i = 0; i < 2; i++) for (const p of this.players) if (!p.eliminated) p.cards.push(this.deck.pop());
    this.postBlinds();
    this.runStreet('preflop');
  }

  postBlinds() {
    const active = this.players.filter(p => !p.eliminated);
    const sb = active.find(p => p.seat >= 1) || active[0];
    const bb = active.find(p => p.seat > sb.seat) || (active.length > 1 ? active[0] : null);
    if (sb) this.post(sb, this.sb);
    if (bb && bb !== sb) this.post(bb, this.bb);
  }

  post(p, amt) {
    const c = Math.min(amt, p.chips);
    p.chips -= c;
    p.contribution += c;
    if (p.chips === 0) p.allIn = true;
  }

  contribute(p, amt) {
    const c = Math.min(amt, p.chips);
    p.chips -= c;
    p.contribution += c;
    if (p.chips === 0) {
      p.allIn = true;
      if (p.contribution < this.currentBet) this.raiseDisabled = true;
    }
  }

  activePlayers() {
    return this.players.filter(p => !p.eliminated && !p.folded);
  }

  runStreet(phase) {
    this.moveToPot();
    this.handPhase = phase;
    if (phase === 'flop') { this.community.push(...this.deck.splice(-3)); ui.addLog(`Flop: ${this.fmtCards(this.community)}`); }
    if (phase === 'turn') { this.community.push(this.deck.pop()); ui.addLog(`Turn: ${this.fmtCards([this.community[3]])}`); }
    if (phase === 'river') { this.community.push(this.deck.pop()); ui.addLog(`River: ${this.fmtCards([this.community[4]])}`); }

    const active = this.activePlayers();
    if (active.length <= 1) {
      if (active.length === 1) this.endHand(active[0], 'Todos os outros desistiram');
      else this.endHand(null, 'Ninguém seguiu');
      return;
    }
    this.currentBet = phase === 'preflop' ? this.bb : 0;
    this.minRaise = this.bb;
    this.lastActorIndex = null;
    ui.render();
    this.beginTurn();
  }

  moveToPot() {
    for (const p of this.players) {
      if (p.eliminated) continue;
      this.pot += p.contribution;
      p.contribution = 0;
      p.actedThisRound = false;
    }
  }

  fmtCards(cards) {
    return cards.map(c => c ? RANK_NAMES[c.rank] + c.suit : '?').join(' ');
  }

  needAction() {
    return this.players.filter(p => !p.eliminated && !p.folded && !p.allIn && (!p.actedThisRound || p.contribution < this.currentBet));
  }

  beginTurn() {
    const active = this.activePlayers();
    if (active.length === 1) { this.endHand(active[0], 'Todos os outros desistiram'); return; }
    if (active.length === 0) { this.endHand(null, 'Mão anulada'); return; }

    let need = this.needAction();
    if (need.length === 0) { this.endStreet(); return; }

    let i;
    if (this.lastActorIndex === null) {
      const n = this.players.length;
      i = this.handPhase === 'preflop' ? (2 + 1) % n : 1 % n;
    } else {
      i = (this.lastActorIndex + 1) % this.players.length;
    }

    let guard = this.players.length;
    while (guard-- > 0) {
      const p = this.players[i];
      if (!p.eliminated && !p.folded && !p.allIn && (!p.actedThisRound || p.contribution < this.currentBet)) break;
      i = (i + 1) % this.players.length;
    }
    if (guard < 0) { this.endStreet(); return; }

    this.lastActorIndex = i;
    const p = this.players[i];
    this.toCall = this.currentBet - p.contribution;
    this.currentPlayer = p;
    ui.render();

    if (p.isHuman) {
      ui.onHumanTurn(p, this.toCall);
    } else {
      ui.addLog(`${p.name} pensa...`);
      const g = this;
      setTimeout(() => {
        if (g.over || g.gameOver) return;
        const act = aiDecide(g, p);
        g.applyAction(p, act);
      }, 700 + Math.random() * 600);
    }
  }

  endStreet() {
    const next = { preflop: 'flop', flop: 'turn', turn: 'river', river: null }[this.handPhase];
    if (!next) { this.showdown(); return; }
    this.runStreet(next);
  }

  applyAction(p, act) {
    if (this.over) return;
    if (act.type === 'raise') {
      const minTarget = this.currentBet + this.minRaise;
      if (act.amount <= this.currentBet || act.amount < minTarget) act.type = 'call';
    }
    if (act.type === 'fold') {
      p.folded = true;
      ui.addLog(`${p.name}: desistiu`);
    } else if (act.type === 'check') {
      ui.addLog(`${p.name}: pagou (check)`);
    } else if (act.type === 'call') {
      const amt = Math.min(this.toCall, p.chips);
      this.contribute(p, amt);
      if (p.chips === 0) { p.allIn = true; ui.addLog(`${p.name}: pagou ${amt} e está all-in!`); }
      else ui.addLog(`${p.name}: pagou ${amt}`);
    } else if (act.type === 'raise') {
      const oldBet = this.currentBet;
      const amt = act.amount - p.contribution;
      this.contribute(p, amt);
      this.currentBet = act.amount;
      this.minRaise = Math.max(this.minRaise, act.amount - oldBet);
      ui.addLog(`${p.name}: aumentou para ${act.amount}`);
      if (p.chips === 0) { p.allIn = true; ui.addLog(`${p.name} está all-in!`); }
    }
    p.actedThisRound = true;
    this.currentPlayer = null;
    ui.render();
    this.beginTurn();
  }

  endHand(winner, reason) {
    if (this.over) return;
    this.over = true;
    this.moveToPot();
    if (winner) {
      winner.chips += this.pot;
      ui.addLog(`${reason}. ${winner.name} vence o pote de ${this.pot}`);
      if (winner.isHuman) ui.addLog('Você ganhou a mão!');
    } else {
      ui.addLog(`${reason}. Pote devolvido.`);
    }
    this.pot = 0;
    ui.render();
    this.checkEliminations();
    ui.showHandOver(winner, reason, null);
  }

  showdown() {
    if (this.over) return;
    this.over = true;
    this.moveToPot();
    const active = this.activePlayers();
    let best = null, winners = [];
    for (const p of active) {
      const ev = evaluateBest([...p.cards, ...this.community]);
      p.handResult = ev.name;
      p.bestKicker = ev.kick[0];
      ui.addLog(`${p.name}: ${p.cards.map(c => RANK_NAMES[c.rank] + c.suit).join(' ')} → ${ev.name}`);
      if (!best || ev.score > best.score) { best = ev; winners = [p]; }
      else if (ev.score === best.score) winners.push(p);
    }
    const share = Math.floor(this.pot / winners.length);
    const rest = this.pot - share * winners.length;
    winners.forEach((w, idx) => {
      w.chips += share + (idx < rest ? 1 : 0);
      if (w.isHuman) ui.addLog('Você ganhou o pote!');
    });
    ui.addLog(`${winners.map(w => w.name).join(', ')} vence${winners.length > 1 ? 'm' : ''} o pote de ${this.pot}`);
    this.pot = 0;
    ui.render();
    this.checkEliminations();
    ui.showHandOver(winners, 'Showdown', best ? best.name : null);
  }

  checkEliminations() {
    for (const p of this.players) {
      if (!p.eliminated && p.chips <= 0) {
        p.eliminated = true;
        if (p.isHuman) {
          this.gameOver = true;
          ui.showGameOver();
        } else {
          ui.addLog(`${p.name} ficou sem fichas e está fora do jogo!`);
        }
      }
    }
  }
}

function aiDecide(game, p) {
  const cards = p.cards.length >= 2 && game.community.length === 0 ? p.cards : [...p.cards, ...game.community];
  const strength = game.community.length === 0 ? preflopStrength(p.cards) : postflopStrength(cards);
  const toCall = game.currentBet - p.contribution;
  const pot = game.pot + game.players.reduce((s, q) => s + q.contribution, 0);
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const rnd = Math.random();

  if (game.raiseDisabled) {
    if (toCall === 0) return { type: 'check' };
    return strength - potOdds > -0.05 || rnd < 0.08 ? { type: 'call' } : { type: 'fold' };
  }

  if (toCall === 0) {
    if (strength > 0.62) return { type: 'raise', amount: Math.min(p.chips + p.contribution, game.currentBet + game.bb * 2 + game.bb * Math.round(strength * 4)) };
    if (strength > 0.35 && rnd < 0.3) return { type: 'raise', amount: Math.min(p.chips + p.contribution, game.currentBet + game.bb) };
    return { type: 'check' };
  }

  const eff = strength - potOdds;
  if (eff > 0.28) return { type: 'raise', amount: Math.min(p.chips + p.contribution, game.currentBet + game.bb * 2) };
  if (eff > -0.06) return { type: 'call' };
  if (rnd < 0.1) return { type: 'call' };
  return { type: 'fold' };
}
