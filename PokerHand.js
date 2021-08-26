// Note: normally I'd split this into a bunch of different files, but I this on jsfiddle, so that's why it's one file
// jsfiddle link: https://jsfiddle.net/Smurflo/ov49cs6w/8/

function evaluateHand() {
  let handString = document.getElementById("poker-hand-input").value;
  
  let resultDiv = document.getElementById("result-div");
  let resultTextElement = document.getElementById("result-text");
  let errorDiv = document.getElementById("error-div");
  let errorTextElement = document.getElementById("error-text");

  // Parse hand string into a PokerHand with Cards
  let hand = new Hand(handString);
  
  
  if(hand.isValidHand()) {
    // Hand is valid. Determine the best hand and tell the user what they've got
    let bestPokerHand = hand.calculateBestPokerHand();
    
    // Show the result (and hide prior errors)
    resultTextElement.innerHTML = bestPokerHand;
    resultDiv.classList.remove("hidden");
    errorDiv.classList.add("hidden");
  }
  else {
  	// Hand isn't valid. Tell the user why
  	errorTextElement.innerHTML = hand.invalidReason;
    errorDiv.classList.remove("hidden");
    
    resultDiv.classList.add("hidden");  // Hide the result element, in case it was being displayed
  }
}


class Hand {
  constructor(handString) {
    this.parseHandString(handString);
  }

  parseHandString(handString) {
    this.cards = [];
  
    // Normalize, replace multiple whitespace characters with a single space
    handString = handString.replace(/\s\s+/g, ' ');
  
    handString.split(' ').forEach(cardString => {
      this.cards.push(new Card(cardString));
    });
  }
  
  isValidHand() {
    // Make sure we've got five cards in our hand
    if (this.cards.length !== 5) {
      this.invalidReason = `Hands must consist of five cards (The given hand has ${this.cards.length} cards)`;
      return false;
    }
    
    // Make sure the cards are all valid and none of them are duplicates
    let validCards = [];
    this.cards.forEach(card => {
      if (!card.isValidCard()) {
        this.invalidReason = `"${card.cardString}" is not a valid card: ${card.invalidReason}`;
      }
      
      if (validCards.length > 0) {
        // Compare this card to all of our valid cards to make sure it's not a dupe
        validCards.forEach(validCard => {
          if (card.equals(validCard)) {
            this.invalidReason = `Duplicate card: ${card.cardString}`;
          }
        });
      }
      
      validCards.push(card);
    });
    
    if (this.invalidReason !== undefined) {
      return false;
    }
    
    return true;
  }
  
  calculateBestPokerHand() {
  	// Poker hands:
    //   1. Royal flush
    //   2. Straight flush
    //   3. Four of a kind
    //   4. Full house
    //   5. Flush
    //   6. Straight
    //   7. Three of a kind
    //   8. Two pair
    //   9. Pair
    //   10. High Card

		// First up, sort the cards by rank (low to high). This will make future processing easier
    this.cards.sort((a, b) => a.rank - b.rank);

		// Next, check if we've got a straight and/or flush, so we can start ruling out possibilities
    let isFlush = this.isFlush();
    let isStraight = this.isStraight();
    
    // Now we can check for a Royal Flush and a Straight Flush
    if (isStraight && isFlush) {
    	if (this.highestCardInStraightRank === 14) {
      	// If we've got a straight flush that ends with an Ace, then we've got a royal flush!
        return "Royal Flush";
      }
      else {
      	// Otherwise, we JUST have a straight flush
      	return `Straight Flush (${this.flushSuit}, ${Card.getRankForDisplay(this.highestCardInStraightRank)} high)`;
      }
    }
    
    // Four of a Kind is up next, so we've gotta figure out our matching cards
    this.calculateMatchingCards();
    
    if (this.isFourOfAKind())
    	return `Four of a Kind (${Card.getRankForDisplay(this.fourOfAKindRank)}s)`
    
    if (this.isFullHouse())
      return `Full House (${Card.getRankForDisplay(this.fullHouseTripleRank)}s over ${Card.getRankForDisplay(this.fullHousePairRank)}s)`
      
    if (isFlush)
     	return `Flush (${this.flushSuit}, ${Card.getRankForDisplay(this.flushHighCardRank)} high)`

		if (isStraight)
    	return `Straight (${Card.getRankForDisplay(this.highestCardInStraightRank)} high)`
		
    if (this.isThreeOfAKind())
    	return `Three of a Kind (${Card.getRankForDisplay(this.threeOfAKindRank)}s, ${Card.getRankForDisplay(this.threeOfAKindKickerRank)} kicker)`
      
    if (this.isTwoPair())
    	return `Two Pair (${Card.getRankForDisplay(this.twoPairHighRank)}s over ${Card.getRankForDisplay(this.twoPairLowRank)}s, ${Card.getRankForDisplay(this.twoPairKickerRank)} kicker)`
      
    if (this.isPair())
    	return `Pair (${Card.getRankForDisplay(this.pairRank)}s, ${Card.getRankForDisplay(this.pairKickerRank)} kicker)`
      
    return `High Card (${Card.getRankForDisplay(this.getHighCardRank())})`
  }
  
  // Side Effects: sets this.flushHighCardRank and this.flushSuit
  // Returns: true if this hand contains a Flush
  isFlush() {
  	let isFlush = true;
    let flushSuit;
    
    this.cards.forEach(card => {
    	if (flushSuit) {  // flushSuit is defined, make sure every card matches it
      	isFlush = isFlush && card.suit === flushSuit;
        
        this.flushHighCardRank = card.rank;  // this works since the highest rank will be processed last
      }
      else {  // flushSuit isn't assigned yet (because this is the first card we've checked).
      	flushSuit = card.suit;
      }
    });
    
    if (isFlush)
    	this.flushSuit = flushSuit;
    
    return isFlush;
  }
  
  // Assumes: this.cards has been sorted (low to high)
  // Side Effects: sets this.highestCardInStraightRank
  // Returns: true if this hand contains a Straight
  isStraight() {
    // Lowest possible card in a valid straight is a 10, so we can short circuit if the lowest card
    //   is higher than that
    if (this.cards[0].rank > 10)
    	return false;
    
    
    let isValidStraight = true;
    let nextRankInSequence;
    
    this.cards.forEach(card => {
    	if (nextRankInSequence) {  // this isn't the first card, we need to match the next rank
      
      	// We need some special handling for Aces since they can be counted as 1's in straights
        if (isValidStraight && nextRankInSequence === 6 &&  // if we've got a 2-5 so far
            card.rank === 14 ) // and this card is an Ace
        {
					// Then we've got a A-5 straight
          isValidStraight = true;
          
          // We won't assign a high card here so that the five counts as our highest ranked card for this hand
        }
        else {
          isValidStraight = isValidStraight && card.rank === nextRankInSequence;
          nextRankInSequence++;
          this.highestCardInStraightRank = card.rank;
        }
      }
      else {
      	nextRankInSequence = card.rank + 1;
      }
    });
    
    return isValidStraight;
  }
  
  // Calculates dictionary of rank => {number of occurances of rank}
  //   The dictionary is saved to this.matchingCards
  calculateMatchingCards() {
  	this.matchingCards = {};
    
    this.cards.forEach((card) => {
    	if (card.rank in this.matchingCards)
      	this.matchingCards[card.rank]++;
      else
      	this.matchingCards[card.rank] = 1;
    });
  }
  
  // Assumes: this.calculateMatchingCards() has been called
  // Side Effects: sets this.fourOfAKindRank
  // Returns: true if this hand contains a Four of A Kind 
	isFourOfAKind() {
  	let isFourOfAKind = false;
    
    for (const [cardRank, numMatches] of Object.entries(this.matchingCards))
    {
    	if (numMatches === 4) {
      	isFourOfAKind = true;
        this.fourOfAKindRank = parseInt(cardRank);
      }
    }
    
    return isFourOfAKind;
  }
  
  // Assumes: this.calculateMatchingCards() has been called
  // Side Effects: sets this.fullHouseTripleRank and this.fullHousePairRank
  // Returns: true if this hand contains a Full House
  isFullHouse() {
  	let hasTriple = false;
    let hasPair = false;
    
    for (const [cardRank, numMatches] of Object.entries(this.matchingCards))
    {
    	if (numMatches === 3) {
      	hasTriple = true;
        this.fullHouseTripleRank = parseInt(cardRank);
      }
      if (numMatches === 2) {
      	hasPair = true;
        this.fullHousePairRank = parseInt(cardRank);
      }
    }
    
  	return hasTriple && hasPair;
  }
  
  // Assumes: this.calculateMatchingCards() has been called
  // Side Effects: sets this.threeOfAKindRank and this.threeOfAKindKickerRank
  // Returns: true if this hand contains a Three of a Kind
  isThreeOfAKind() {
  	let isThreeOfAKind = false;
    let kickerRank;
  
  	for (const [cardRank, numMatches] of Object.entries(this.matchingCards))
    {
    	let rankInt = parseInt(cardRank);
    
    	if (numMatches === 3) {
      	isThreeOfAKind = true;
        this.threeOfAKindRank = rankInt;
      }
      else {
      	if (!kickerRank)
        	kickerRank = rankInt;
        else if (rankInt > kickerRank)
        	kickerRank = rankInt;
      }
    }
    
    if (isThreeOfAKind)
    	this.threeOfAKindKickerRank = kickerRank;
    
    return isThreeOfAKind;
  }
  
  // Assumes: this.calculateMatchingCards() has been called
  // Side Effects: sets this.twoPairHighRank, this.twoPairLowRank, and this.twoPairKickerRank
  // Returns: true if this hand contains a Two Pair
  isTwoPair() {
  	let isTwoPair = false;
    let numPairs = 0;
    let firstPairRank;
    let kickerRank;
  
  	for (const [cardRank, numMatches] of Object.entries(this.matchingCards))
    {
    	let rankInt = parseInt(cardRank);
    
    	if (numMatches === 2) {
      	numPairs++;
        
      	if (numPairs === 1) {
        	firstPairRank = rankInt;
        }
        else if (numPairs === 2) {
        	isTwoPair = true;
          
          if (firstPairRank > rankInt) {
          	this.twoPairHighRank = firstPairRank;
            this.twoPairLowRank = rankInt;
          }
          else {
          	this.twoPairHighRank = rankInt;
            this.twoPairLowRank = firstPairRank;
          }
        }
      }
      else {
      	this.twoPairKickerRank = rankInt;
      }
    }

		return isTwoPair;
  }
  
  // Assumes: this.calculateMatchingCards() has been called
  // Side Effects: sets this.pairRank and this.pairKickerRank
  // Returns: true if this hand contains a Pair
  isPair() {
  	let isPair = false;
    let kickerRank;
  
  	for (const [cardRank, numMatches] of Object.entries(this.matchingCards))
    {
    	let rankInt = parseInt(cardRank);
    
    	if (numMatches === 2) {
      	isPair = true;
        this.pairRank = rankInt;
      }
      else {
      	if (!kickerRank)
        	kickerRank = rankInt;
        else if (rankInt > kickerRank)
        	kickerRank = rankInt; 
      }
    }
    
    if (isPair)
    	this.pairKickerRank = kickerRank;
    
    return isPair;
  }
  
  // Assumes: this.calculateMatchingCards() has been called
  // Returns: The rank of the highest card in this hand
  getHighCardRank() {
  	return this.cards[this.cards.length-1].rank;
  }
}

class Card {
  constructor(cardString) {
    // cardString should be of the format [RankCharacter][SuitCharacter]
    //   e.g. Ah = Ace of hearts
    this.cardString = cardString;

		// cards will usually be 2 characters, but pesky 10's mean we have to handle 3 as well
    if (cardString.length < 2 || cardString.length > 3) {
      return;
    }
    
    this.rank = this.parseRank(cardString.slice(0, cardString.length - 1));
    this.suit = this.parseSuit(cardString[cardString.length - 1]);
  }
  
  // Get's the rank in a user friendly format (e.g. "King" instead of 13)
  static getRankForDisplay(rankInt) {
  	if (this.isFaceCard(rankInt)) {
    	switch(rankInt) {
      	case 11:
        	return "Jack";
        case 12:
        	return "Queen";
        case 13:
        	return "King";
        case 14:
        	return "Ace";
        default:
        	return undefined;  // invalid card
      }
    }
    else {
    	return rankInt;
    }
  }
  
  static isFaceCard(rankInt) {
  	return rankInt > 10;
  }
  
  // Returns the numeric rank of the given rank string
  parseRank(rankString) {
  	rankString = rankString.toUpperCase();
    
    let isNumeric = rankString.match(/^[0-9]+$/) != undefined;

    if (isNumeric)
    {
    	let rankNumber = parseInt(rankString);
      
      // valid numeric ranks are 2-10
      if(rankNumber < 2 || rankNumber > 10)
      	return undefined;
      else
      	return rankNumber
    }
    else {
    	const faceCardValueMap = {
      	"J": 11,
        "Q": 12,
        "K": 13,
        "A": 14
      };
      
      if (rankString in faceCardValueMap)
      	return faceCardValueMap[rankString];
      else
      	return undefined;
    }
  }
  
  parseSuit(suitChar) {
  	switch(suitChar) {
    	case 'h':
      	return "Hearts";
      case 'd':
      	return "Diamonds";
      case 's':
      	return "Spades";
      case 'c':
      	return "Clubs";
			default:
      	return undefined;
    }
  }
  
  isValidCard() {
  	if (this.rank === undefined) {
    	this.invalidReason = "Invalid rank";
      return false;
    }
    if (this.suit === undefined) {
    	this.invalidReason = "Invalid suit";
      return false;
    }
    
    return true;
  }
}

Card.prototype.equals = function (cardToCompare) {
  return this.rank === cardToCompare.rank && this.suit === cardToCompare.suit;
}