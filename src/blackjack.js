import React, { useState, useEffect } from 'react';
import chipImage from ".//assets/casino11.png"


import { getRandomCard } from './utils/cardLogic'; 
// NOTE: Ensure './utils/cardLogic' exports a function called getRandomCard()
// that returns the numerical value of a drawn card (e.g., 2-11).

// Define the chip values available for betting
const CHIP_VALUES = [1, 10, 100, 500];

function Blackjack() {
    // --- STATE MANAGEMENT ---
    // Player State
    const [playerCards, setPlayerCards] = useState([]);
    const [playerSum, setPlayerSum] = useState(0);
    const [playerChips, setPlayerChips] = useState(2000); // Increased starting chips
    
    // Dealer State
    const [dealerCards, setDealerCards] = useState([]);
    const [dealerSum, setDealerSum] = useState(0);

    // Game State
    const [isGameActive, setIsGameActive] = useState(false);
    const [betAmount, setBetAmount] = useState(0);
    const [message, setMessage] = useState("Place Your Bets");
    
    // UI/Flow State
    const [isBettingPhase, setIsBettingPhase] = useState(true); 
    const [chipsOnTable, setChipsOnTable] = useState([]); // Array to store chip values placed
    const [lastDrawnCardIndex, setLastDrawnCardIndex] = useState(-1);
    const [isWinBurstActive, setIsWinBurstActive] = useState(false);
    const [isLossShakeActive, setIsLossShakeActive] = useState(false);


    // --- HELPER FUNCTIONS ---

    // Checks for Ace conversion (11 -> 1) to prevent bust
    const calculateSum = (cards) => {
        let sum = cards.reduce((acc, card) => acc + card, 0);
        let numAces = cards.filter(card => card === 11).length;

        // Convert Aces from 11 to 1 if the sum is over 21
        while (sum > 21 && numAces > 0) {
            sum -= 10; // Change 11 to 1
            numAces--;
        }
        return sum;
    };
    
    // --- BETTING LOGIC ---

    // Handles clicking a chip from the tray
    const handleChipClick = (value) => {
        if (!isBettingPhase) return;

        // Check against the player's total chips
        if (playerChips >= betAmount + value) {
            setBetAmount(prev => prev + value);
            // Add chip value to the display array
            setChipsOnTable(prev => [...prev, value]); 
            setMessage(`Current Bet: $${betAmount + value}`);
        } else {
            setMessage(`Insufficient chips. Max bet is $${playerChips}.`);
        }
    };

    // Clears the current bet (by clicking the chips on the table)
    const clearBet = () => {
        if (isBettingPhase) {
            setBetAmount(0);
            setChipsOnTable([]);
            setMessage("Bet cleared. Place Your Bets");
        }
    };

    // --- GAME LOGIC ---

    // Starts the game using the current betAmount
    const handleDeal = () => {
        if (betAmount === 0 || !isBettingPhase) {
            setMessage("You must place a bet to deal!");
            return;
        }

        setIsBettingPhase(false);
        setIsGameActive(true);
        setMessage("Drawing cards...");

        // Player's initial draw
        const newPlayerCards = [getRandomCard(), getRandomCard()];
        const newPlayerSum = calculateSum(newPlayerCards);
        setPlayerCards(newPlayerCards);
        setPlayerSum(newPlayerSum);
        setLastDrawnCardIndex(newPlayerCards.length - 1);

        // Dealer's initial draw (one card hidden)
        const newDealerCards = [getRandomCard(), getRandomCard()];
        const newDealerSum = calculateSum(newDealerCards);
        setDealerCards(newDealerCards);
        setDealerSum(newDealerSum);

        // Check for immediate Blackjack
        if (newPlayerSum === 21) {
            // Player Blackjack - check dealer's second card immediately
            stand(newPlayerCards, newPlayerSum, newDealerCards, newDealerSum);
        } else {
            setMessage("Hit, Stand, or Double Down?");
        }
    };

    const newCard = () => {
        if (!isGameActive || playerSum >= 21) return;

        const card = getRandomCard();
        const updatedCards = [...playerCards, card];
        const newSum = calculateSum(updatedCards);

        setPlayerCards(updatedCards);
        setPlayerSum(newSum);
        setLastDrawnCardIndex(updatedCards.length - 1);

        if (newSum > 21) {
            setMessage("Bust! You are out of the game.");
            setIsGameActive(false);
            setPlayerChips(prev => prev - betAmount);
            checkFinalWinner(newSum, dealerSum); // Handles chips/reset
        } else if (newSum === 21) {
             // If player hits 21, automatically stand
             stand(updatedCards, newSum);
        }
    };

    const stand = (finalPlayerCards = playerCards, finalPlayerSum = playerSum, initialDealerCards = dealerCards, initialDealerSum = dealerSum) => {
        if (!isGameActive && finalPlayerSum < 21) return;
        
        // Disable game actions
        setIsGameActive(false);
        setMessage("Dealer is playing...");

        // 1. Dealer's Turn Logic
        let currentDealerCards = [...initialDealerCards];
        let currentDealerSum = initialDealerSum;

        // Dealer must hit until sum is 17 or more
        while (currentDealerSum < 17) {
            const card = getRandomCard();
            currentDealerCards.push(card);
            currentDealerSum = calculateSum(currentDealerCards);
        }

        setDealerCards(currentDealerCards);
        setDealerSum(currentDealerSum);

        // 2. Final Winner Check
        checkFinalWinner(finalPlayerSum, currentDealerSum);
    };

   const checkFinalWinner = (pSum, dSum) => {
    let finalMessage = "";
    let newChips = playerChips;
    let playerWon = false;
    let isPush = false;

    // Logic to calculate win/loss
    if (pSum > 21) {
        finalMessage = "Bust! Dealer Wins.";
        newChips -= betAmount;
    } else if (dSum > 21) {
        finalMessage = "Dealer Busted! You Win!";
        newChips += betAmount;
        playerWon = true;
    } else if (pSum > dSum) {
        finalMessage = "You Win!";
        newChips += betAmount;
        playerWon = true;
    } else if (pSum < dSum) {
        finalMessage = "Dealer Wins!";
        newChips -= betAmount;
    } else {
        finalMessage = "It's a Push (Tie)! Bet returned.";
        isPush = true;
    }

    setMessage(finalMessage);
    setPlayerChips(newChips);

    // --- ANIMATION LOGIC ---
    if (playerWon) {
        setIsWinBurstActive(true);
        setTimeout(() => { setIsWinBurstActive(false); }, 1500);
    } else if (!isPush) {
        setIsLossShakeActive(true);
        setTimeout(() => { setIsLossShakeActive(false); }, 1500);
    }

    // --- Reset for Next Round ---
    // Delay the transition back to betting phase to let the user see results
    setTimeout(() => {
        setBetAmount(0);
        setChipsOnTable([]);
        setPlayerCards([]);
        setDealerCards([]);
        setIsBettingPhase(true);
        setMessage("Place Your Bets");
    }, 3000); 
};


    // --- RENDER/JSX ---
    return (
        <div className="blackjack-container">
            <div className="table-top">
                <h1 className="logo"> BLACKJACK</h1>
            </div>

            {/* DEALER HAND AND SUM */}
            <div className="dealer-area">
                <div className="sum-display">{isGameActive ? '?' : dealerSum}</div>
                <div className="hand-display dealer-hand">
                    {dealerCards.map((card, index) => (
                        <div key={index} className="card-tile">
                            {/* Hide second card during active game */}
                            {isGameActive && index === 1 ? '?' : card} 
                        </div>
                    ))}
                </div>
            </div>

            {/* PLAYER HAND AND SUM */}
            <div className="player-area">
                <div className="sum-display">{playerSum}</div>
                <div className="hand-display player-hand">
                    {playerCards.map((card, index) => (
                        <div 
                            key={index} 
                            className={`card-tile ${index === lastDrawnCardIndex ? 'card-drawn-animation' : ''}`}
                        >
                            {card}
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTER BETTING/MESSAGING AREA */}
            <div className="center-table-actions">
                {/* Win/Loss Animation Overlays */}
                {isWinBurstActive && <div className="win-burst">🎉 WINNER! 🎉</div>}
                {isLossShakeActive && <div className="loss-shake">❌ PUSH/LOSS ❌</div>}
                
                {isBettingPhase ? (
                    <>
                        <h2 className="table-message big-message">{message}</h2>
                        {/* Chip Stack Area (Click to clear bet) */}
                       <div className="chip-stack-area" onClick={clearBet}>
                            {chipsOnTable.map((chip, index) => (
                            <div
                             key={index}
                              className="placed-chip"
                              style={{
                              backgroundImage: `url(${chipImage})`,
                              zIndex: 10 + index,
                              transform: `translate(${index * 3}px, ${-index * 6}px) rotate(${index * 3}deg)`
                             }}
                             >
                            <span className="chip-value-text">${chip}</span>
                            </div>
                             ))}
                             {betAmount > 0 && <div className="bet-label">${betAmount}</div>}
                        </div>

                        
                        {/* DEAL Button */}
                        <button onClick={handleDeal} className="action-button deal-button" disabled={betAmount === 0}>
                            Deal
                        </button>
                    </>
                ) : (
                    <>
                        {/* Game Status Message */}
                        <h2 className="table-message">{message}</h2>

                        {/* HIT/STAND/DOUBLE BUTTONS */}
                        <div className="in-game-actions">
                            <button onClick={newCard} disabled={!isGameActive} className="action-button hit-button">Hit</button>
                            <button onClick={stand} disabled={!isGameActive} className="action-button stand-button">Stand</button>
                            {/* Add Double/Insurance buttons here */}
                        </div>
                    </>
                )}
            </div>

            {/* CHIP TRAY AND CHIP COUNT */}
            <div className="chip-tray-area">
                <div className="chip-buttons">
    {CHIP_VALUES.map(value => (
        <button 
            key={value}
            onClick={() => handleChipClick(value)}
            disabled={!isBettingPhase || playerChips < value}
            className="chip-button"
            style={{
                backgroundImage: `url(${chipImage})`
            }}
        >
            <span className="chip-value-text">${value}</span>
        </button>
    ))}
</div>
                {/* Player total chips at the bottom right */}
                <div className="player-total-chips">Balance$:{playerChips}</div>
            </div>
        </div>
    );
}

export default Blackjack;