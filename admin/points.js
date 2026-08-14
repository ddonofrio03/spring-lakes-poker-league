// =====================================================
// SLPL Points Calculation Engine
// Rules: N players, last = 1pt, up by 1 each place.
// Top 25% in the money get bonus points:
//   1st bonus = N (total = 2N)
//   2nd bonus = floor(1st_bonus / 2)
//   3rd bonus = floor(2nd_bonus / 2)  ... etc.
// TOC Bonus Chips: league_pts * 100 + (wins * 2000)
// =====================================================

// Every player contributes this much to the prize pool
const BUY_IN = 60;

function calcPoints(finishPosition, totalPlayers) {
  // Base points: last place = 1, add 1 per place up
  const basePoints = totalPlayers - finishPosition + 1;

  // Determine money positions (top 25%, minimum 2)
  const moneySpots = Math.max(2, Math.floor(totalPlayers * 0.25));

  if (finishPosition > moneySpots) {
    // Not in the money — just base points
    return { points: basePoints, bonusPoints: 0, inMoney: false };
  }

  // Calculate bonus points for money finishers
  // 1st place bonus = totalPlayers (so 1st total = 2 * totalPlayers)
  const firstBonus = totalPlayers;
  let bonus = firstBonus;
  for (let pos = 2; pos <= finishPosition; pos++) {
    bonus = Math.floor(bonus / 2);
  }

  return {
    points: basePoints + bonus,
    bonusPoints: bonus,
    inMoney: true
  };
}

// Calculate TOC bonus chips for a player
// tocBonusChips = totalLeaguePoints * 100 + (wins * 2000)
function calcTOCChips(totalLeaguePoints, wins) {
  return (totalLeaguePoints * 100) + (wins * 2000);
}

// Calculate money payout percentage based on player count
function calcPayoutPct(finishPosition, totalPlayers) {
  const moneySpots = Math.max(2, Math.floor(totalPlayers * 0.25));
  if (finishPosition > moneySpots) return 0;

  if (totalPlayers <= 10) {
    if (finishPosition === 1) return 0.65;
    if (finishPosition === 2) return 0.35;
  } else if (totalPlayers <= 14) {
    if (finishPosition === 1) return 0.50;
    if (finishPosition === 2) return 0.32;
    if (finishPosition === 3) return 0.18;
  } else {
    if (finishPosition === 1) return 0.50;
    if (finishPosition === 2) return 0.25;
    if (finishPosition === 3) return 0.16;
    if (finishPosition === 4) return 0.09;
  }
  return 0;
}

// Round every payout to the nearest $10.
// Rounding each place independently can leave the payouts a few dollars off
// the pot, so any difference is added to (or taken from) 1st place — keeping
// the money paid out equal to the money collected.
// Returns { [position]: amount } for the paying positions only.
function calcRoundedPayouts(totalPlayers, eventPot) {
  const payouts = {};
  let exactTotal = 0;   // what the percentages pay before rounding
  let roundedTotal = 0; // what the rounded amounts pay

  for (let pos = 1; pos <= totalPlayers; pos++) {
    const pct = calcPayoutPct(pos, totalPlayers);
    if (pct <= 0) continue;
    const exact = eventPot * pct;
    const rounded = Math.round(exact / 10) * 10;
    payouts[pos] = rounded;
    exactTotal += exact;
    roundedTotal += rounded;
  }

  // Absorb any rounding drift into 1st place, in $10 steps so every
  // payout stays a round number.
  const drift = Math.round((exactTotal - roundedTotal) / 10) * 10;
  if (drift !== 0 && payouts[1] !== undefined) {
    payouts[1] += drift;
  }

  return payouts;
}

// Preview all points for a given player count
function previewAllPoints(totalPlayers) {
  const eventPot = totalPlayers * BUY_IN;
  const payouts = calcRoundedPayouts(totalPlayers, eventPot);
  const results = [];
  for (let pos = 1; pos <= totalPlayers; pos++) {
    const calc = calcPoints(pos, totalPlayers);
    const payoutPct = calcPayoutPct(pos, totalPlayers);
    results.push({
      position: pos,
      points: calc.points,
      bonusPoints: calc.bonusPoints,
      inMoney: calc.inMoney,
      payoutPct,
      payout: payouts[pos] || 0
    });
  }
  return results;
}
