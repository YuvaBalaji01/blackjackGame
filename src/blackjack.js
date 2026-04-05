import { useState, useEffect, useRef, useCallback } from 'react';

// ========================
// SOUND ENGINE (Web Audio API — no files needed)
// ========================
function useSounds() {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  // Utility: play a simple envelope tone
  const tone = (freq, type, startVol, endVol, startTime, duration, ctx, dest) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(startVol, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(endVol, 0.0001), startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  // Coin clink — layered metallic tones
  const playCoin = useCallback(() => {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.38;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    // Primary metallic ping
    tone(1400, 'sine',   0.9, 0.001, now,        0.18, ctx, master);
    tone(2200, 'sine',   0.4, 0.001, now,        0.14, ctx, master);
    tone(900,  'sine',   0.3, 0.001, now + 0.01, 0.12, ctx, master);
    // Slight rattle overtone
    tone(3100, 'triangle', 0.15, 0.001, now, 0.08, ctx, master);
  }, []);

  // Card deal — quick papery thwack
  const playCard = useCallback(() => {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    // Noise burst for the "thwack"
    const bufSize = ctx.sampleRate * 0.06;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noise.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);
    // Low thud body
    tone(180, 'sine', 0.5, 0.001, now, 0.07, ctx, master);
    tone(320, 'sine', 0.2, 0.001, now, 0.05, ctx, master);
  }, []);

  // Shuffle — rapid card riffling
  const playShuffle = useCallback(() => {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    const count = 18;
    for (let i = 0; i < count; i++) {
      const t = now + i * 0.055 + Math.random() * 0.02;
      // Each riffle tick = noise burst + soft thud
      const bufSize = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / bufSize);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      noise.connect(g);
      g.connect(master);
      noise.start(t);
      tone(200 + Math.random() * 80, 'sine', 0.15, 0.001, t, 0.04, ctx, master);
    }
  }, []);

  // Stand — confident firm tap
  const playStand = useCallback(() => {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    tone(260, 'sine',     0.7, 0.001, now,        0.12, ctx, master);
    tone(195, 'sine',     0.5, 0.001, now,        0.15, ctx, master);
    tone(520, 'triangle', 0.2, 0.001, now,        0.08, ctx, master);
    // Second softer tap
    tone(240, 'sine',     0.3, 0.001, now + 0.07, 0.09, ctx, master);
  }, []);

  // Win — bright ascending chime
  const playWin = useCallback(() => {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      tone(freq, 'sine', 0.6, 0.001, now + i * 0.1, 0.25, ctx, master);
      tone(freq * 2, 'sine', 0.1, 0.001, now + i * 0.1, 0.2, ctx, master);
    });
  }, []);

  // Loss — descending dull thud
  const playLoss = useCallback(() => {
    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    tone(220, 'sawtooth', 0.5, 0.001, now,        0.3, ctx, master);
    tone(165, 'sine',     0.4, 0.001, now + 0.1,  0.3, ctx, master);
    tone(130, 'sine',     0.3, 0.001, now + 0.22, 0.3, ctx, master);
  }, []);

  return { playCoin, playCard, playShuffle, playStand, playWin, playLoss };
}

// --- CARD DECK LOGIC ---
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

const shuffleDeck = (deck) => {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};

const cardValue = (card) => {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
};

const calculateSum = (cards) => {
  let sum = cards.reduce((acc, card) => acc + cardValue(card), 0);
  let aces = cards.filter(c => c.rank === 'A').length;
  while (sum > 21 && aces > 0) { sum -= 10; aces--; }
  return sum;
};

const isRed = (suit) => suit === '♥' || suit === '♦';

const CHIP_VALUES = [5, 25, 100, 500];
const CHIP_COLORS = {
  5: { bg: '#e74c3c', border: '#c0392b', text: '#fff' },
  25: { bg: '#27ae60', border: '#1e8449', text: '#fff' },
  100: { bg: '#2980b9', border: '#1a5276', text: '#fff' },
  500: { bg: '#8e44ad', border: '#6c3483', text: '#fff' },
};

// --- CARD COMPONENT ---
function PlayingCard({ card, hidden = false, isNew = false, delay = 0 }) {
  const red = card && isRed(card.suit);

  return (
    <div
      className={`playing-card ${isNew ? 'card-deal-anim' : ''} ${hidden ? 'card-hidden' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {hidden ? (
        <div className="card-back">
          <div className="card-back-pattern"></div>
        </div>
      ) : (
        <div className={`card-face ${red ? 'red-card' : 'black-card'}`}>
          <div className="card-corner top-left">
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit-small">{card.suit}</span>
          </div>
          <div className="card-center-suit">{card.suit}</div>
          <div className="card-corner bottom-right">
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit-small">{card.suit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- CHIP COMPONENT ---
function Chip({ value, onClick, disabled, stacked = false, index = 0 }) {
  const colors = CHIP_COLORS[value];
  return (
    <button
      className={`chip ${stacked ? 'chip-stacked' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        '--chip-bg': colors.bg,
        '--chip-border': colors.border,
        '--chip-text': colors.text,
        zIndex: stacked ? 10 + index : 1,
        transform: stacked
          ? `translate(${index * 2}px, ${-index * 5}px) rotate(${index % 2 === 0 ? index * 2 : -index * 2}deg)`
          : 'none',
      }}
    >
      <span className="chip-label">${value}</span>
      <div className="chip-ring"></div>
      <div className="chip-dots"></div>
    </button>
  );
}

// --- SCORE BADGE ---
function ScoreBadge({ score, bust }) {
  return (
    <div className={`score-badge ${bust ? 'score-bust' : score === 21 ? 'score-blackjack' : ''}`}>
      {bust ? 'BUST' : score === 21 ? 'BJ!' : score}
    </div>
  );
}

// --- SHUFFLE ANIMATION OVERLAY ---
function ShuffleOverlay({ active }) {
  if (!active) return null;
  const cards = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div className="shuffle-overlay">
      <div className="shuffle-text">Shuffling...</div>
      <div className="shuffle-cards">
        {cards.map((i) => (
          <div
            key={i}
            className="shuffle-card"
            style={{
              animationDelay: `${i * 60}ms`,
              '--rotate': `${(i % 3 - 1) * 25}deg`,
              '--tx': `${(i % 4 - 1.5) * 30}px`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
function Blackjack() {
  const [deck, setDeck] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [playerSum, setPlayerSum] = useState(0);
  const [dealerSum, setDealerSum] = useState(0);
  const [playerChips, setPlayerChips] = useState(2000);
  const [betAmount, setBetAmount] = useState(0);
  const [chipsOnTable, setChipsOnTable] = useState([]);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isBettingPhase, setIsBettingPhase] = useState(true);
  const [message, setMessage] = useState('Place Your Bets');
  const [result, setResult] = useState(null); // 'win' | 'loss' | 'push'
  const [isShuffling, setIsShuffling] = useState(false);
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [newCardIndex, setNewCardIndex] = useState(-1);
  const deckRef = useRef([]);
  const { playCoin, playCard, playShuffle, playStand, playWin, playLoss } = useSounds();

  useEffect(() => {
    const fresh = shuffleDeck(createDeck());
    setDeck(fresh);
    deckRef.current = fresh;
  }, []);

  const drawCard = () => {
    if (deckRef.current.length < 10) {
      const fresh = shuffleDeck(createDeck());
      deckRef.current = fresh;
      setDeck(fresh);
    }
    const card = deckRef.current.shift();
    return card;
  };

  const handleChipClick = (value) => {
    if (!isBettingPhase) return;
    if (playerChips >= betAmount + value) {
      playCoin();
      const newBet = betAmount + value;
      setBetAmount(newBet);
      setChipsOnTable(prev => [...prev, value]);
      setMessage(`Bet: $${newBet}`);
    } else {
      setMessage(`Not enough chips!`);
    }
  };

  const clearBet = () => {
    if (!isBettingPhase) return;
    setBetAmount(0);
    setChipsOnTable([]);
    setMessage('Place Your Bets');
  };

  const handleDeal = () => {
    if (betAmount === 0) return;
    playShuffle();
    setIsShuffling(true);
    setTimeout(() => {
      setIsShuffling(false);
      setResult(null);
      setDealerRevealed(false);
      setIsBettingPhase(false);
      setIsGameActive(true);
      setMessage('Hit or Stand?');

      const p1 = drawCard(), p2 = drawCard();
      const d1 = drawCard(), d2 = drawCard();
      const pCards = [p1, p2];
      const dCards = [d1, d2];
      const pSum = calculateSum(pCards);
      const dSum = calculateSum(dCards);

      // Staggered card deal sounds
      playCard();
      setTimeout(() => playCard(), 130);
      setTimeout(() => playCard(), 260);
      setTimeout(() => playCard(), 390);

      setPlayerCards(pCards);
      setDealerCards(dCards);
      setPlayerSum(pSum);
      setDealerSum(dSum);
      setNewCardIndex(1);

      if (pSum === 21) {
        setTimeout(() => resolveGame(pCards, pSum, dCards, dSum), 500);
      }
    }, 1200);
  };

  const handleHit = () => {
    if (!isGameActive) return;
    playCard();
    const card = drawCard();
    const updated = [...playerCards, card];
    const newSum = calculateSum(updated);
    setPlayerCards(updated);
    setPlayerSum(newSum);
    setNewCardIndex(updated.length - 1);

    if (newSum > 21) {
      setIsGameActive(false);
      setDealerRevealed(true);
      resolveGame(updated, newSum, dealerCards, dealerSum);
    } else if (newSum === 21) {
      handleStand(updated, newSum);
    }
  };

  const handleStand = (finalCards = playerCards, finalSum = playerSum) => {
    if (!isGameActive && finalSum < 21) return;
    playStand();
    setIsGameActive(false);
    setDealerRevealed(true);
    setMessage("Dealer's turn...");

    let dCards = [...dealerCards];
    let dSum = calculateSum(dCards);
    while (dSum < 17) {
      dCards.push(drawCard());
      dSum = calculateSum(dCards);
    }
    setDealerCards(dCards);
    setDealerSum(dSum);
    resolveGame(finalCards, finalSum, dCards, dSum);
  };

  const handleDoubleDown = () => {
    if (!isGameActive || playerCards.length !== 2) return;
    if (playerChips < betAmount * 2) { setMessage("Not enough chips to double!"); return; }
    playCoin();
    playCard();
    const extraBet = betAmount;
    setBetAmount(prev => prev * 2);
    setChipsOnTable(prev => [...prev, ...prev]);
    const card = drawCard();
    const updated = [...playerCards, card];
    const newSum = calculateSum(updated);
    setPlayerCards(updated);
    setPlayerSum(newSum);
    setNewCardIndex(updated.length - 1);
    setTimeout(() => handleStand(updated, newSum), 400);
  };

  const resolveGame = (pCards, pSum, dCards, dSum) => {
    let msg = '';
    let outcome = '';
    let chipDelta = 0;

    if (pSum > 21) {
      msg = '💀 Bust! Dealer wins.';
      outcome = 'loss';
      chipDelta = -betAmount;
    } else if (dSum > 21) {
      msg = '🎉 Dealer busts! You win!';
      outcome = 'win';
      chipDelta = betAmount;
    } else if (pSum === 21 && pCards.length === 2 && dSum !== 21) {
      msg = '🃏 Blackjack! You win!';
      outcome = 'win';
      chipDelta = Math.floor(betAmount * 1.5);
    } else if (pSum > dSum) {
      msg = '🎉 You win!';
      outcome = 'win';
      chipDelta = betAmount;
    } else if (pSum < dSum) {
      msg = '😔 Dealer wins.';
      outcome = 'loss';
      chipDelta = -betAmount;
    } else {
      msg = '🤝 Push — bet returned.';
      outcome = 'push';
      chipDelta = 0;
    }

    setMessage(msg);
    setResult(outcome);
    setPlayerChips(prev => prev + chipDelta);
    setDealerRevealed(true);

    if (outcome === 'win') playWin();
    else if (outcome === 'loss') playLoss();

    setTimeout(() => {
      setBetAmount(0);
      setChipsOnTable([]);
      setPlayerCards([]);
      setDealerCards([]);
      setPlayerSum(0);
      setDealerSum(0);
      setIsBettingPhase(true);
      setResult(null);
      setMessage('Place Your Bets');
    }, 3500);
  };

  const playerBust = playerSum > 21;
  const dealerBust = dealerSum > 21;

  return (
    <div className="bj-root">
      <ShuffleOverlay active={isShuffling} />

      {/* Result flash */}
      {result === 'win' && <div className="result-flash win-flash">YOU WIN!</div>}
      {result === 'loss' && <div className="result-flash loss-flash">DEALER WINS</div>}
      {result === 'push' && <div className="result-flash push-flash">PUSH</div>}

      {/* Header */}
      <div className="bj-header">
        <div className="logo-text">BLACKJACK</div>
        <div className="balance-display">
          <span className="balance-label">Balance</span>
          <span className="balance-amount">${playerChips.toLocaleString()}</span>
        </div>
      </div>

      {/* Dealer Area */}
      <div className="bj-dealer-area">
        <div className="area-label">DEALER</div>
        {dealerCards.length > 0 && (
          <div className="score-row">
            {dealerRevealed
              ? <ScoreBadge score={dealerSum} bust={dealerBust} />
              : <ScoreBadge score={cardValue(dealerCards[0])} />
            }
          </div>
        )}
        <div className="hand-row">
          {dealerCards.map((card, i) => (
            <PlayingCard
              key={i}
              card={card}
              hidden={!dealerRevealed && i === 1}
              isNew={i === dealerCards.length - 1 && dealerCards.length > 2}
              delay={i * 120}
            />
          ))}
        </div>
      </div>

      {/* Center Actions */}
      <div className="bj-center">
        <div className={`message-box ${result ? `msg-${result}` : ''}`}>{message}</div>

        {isBettingPhase ? (
          <div className="bet-area">
            <div className="chip-stack-wrapper" onClick={clearBet} title="Click to clear bet">
              <div className="chip-stack">
                {chipsOnTable.map((val, i) => (
                  <Chip key={i} value={val} stacked index={i} />
                ))}
              </div>
              {betAmount > 0 && (
                <div className="bet-total-label">${betAmount} <span className="clear-hint">× clear</span></div>
              )}
            </div>
            <button
              className="btn-deal"
              onClick={handleDeal}
              disabled={betAmount === 0}
            >
              DEAL
            </button>
          </div>
        ) : (
          <div className="action-buttons">
            <button className="btn-action btn-hit" onClick={handleHit} disabled={!isGameActive}>
              HIT
            </button>
            <button className="btn-action btn-stand" onClick={() => handleStand()} disabled={!isGameActive}>
              STAND
            </button>
            {playerCards.length === 2 && isGameActive && (
              <button className="btn-action btn-double" onClick={handleDoubleDown} disabled={!isGameActive || playerChips < betAmount * 2}>
                DOUBLE
              </button>
            )}
          </div>
        )}
      </div>

      {/* Player Area */}
      <div className="bj-player-area">
        <div className="hand-row">
          {playerCards.map((card, i) => (
            <PlayingCard
              key={i}
              card={card}
              isNew={i === newCardIndex}
              delay={i * 120}
            />
          ))}
        </div>
        {playerCards.length > 0 && (
          <div className="score-row">
            <ScoreBadge score={playerSum} bust={playerBust} />
          </div>
        )}
        <div className="area-label">YOU</div>
      </div>

      {/* Chip Tray */}
      <div className="chip-tray">
        {CHIP_VALUES.map(val => (
          <Chip
            key={val}
            value={val}
            onClick={() => handleChipClick(val)}
            disabled={!isBettingPhase || playerChips < val + betAmount}
          />
        ))}
      </div>
    </div>
  );
}

export default Blackjack;