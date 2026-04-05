import React, { useState, useEffect } from 'react';
import chipImage from ".//assets/casino11.png"


import { getRandomCard } from './utils/cardLogic'; 
// NOTE: Ensure './utils/cardLogic' exports a function called getRandomCard()
// that returns the numerical value of a drawn card (e.g., 2-11).

// Define the chip values available for betting
const CHIP_VALUES = [1, 10, 100, 500];

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
