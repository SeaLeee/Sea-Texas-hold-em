/**
 * 服务器端游戏管理器 - 管理在线德州扑克游戏逻辑
 */
const { PLAYER_STATUS, ROOM_STATUS } = require('./Room');

// 游戏阶段
const GAME_PHASES = {
    PREFLOP: 'preflop',
    FLOP: 'flop',
    TURN: 'turn',
    RIVER: 'river',
    SHOWDOWN: 'showdown'
};

// 操作类型
const ACTIONS = {
    FOLD: 'fold',
    CHECK: 'check',
    CALL: 'call',
    RAISE: 'raise',
    ALLIN: 'allin'
};

// 扑克牌花色和点数
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class OnlineGameManager {
    constructor(room) {
        this.room = room;
        this.deck = [];
        this.playerOrder = [];  // 玩家行动顺序
    }

    /**
     * 开始新一手牌
     */
    startNewHand() {
        this.room.roundNumber++;
        
        // 重置牌组
        this.resetDeck();
        this.shuffleDeck();
        
        // 重置房间状态
        this.room.communityCards = [];
        this.room.pot = 0;
        this.room.currentBet = 0;
        this.room.phase = GAME_PHASES.PREFLOP;
        
        // 重置所有玩家状态
        const players = Array.from(this.room.players.values())
            .filter(p => p.chips > 0)
            .sort((a, b) => a.seatIndex - b.seatIndex);
        
        this.playerOrder = players.map(p => p.id);
        
        for (const player of players) {
            player.holeCards = [];
            player.currentBet = 0;
            player.status = PLAYER_STATUS.PLAYING;
            player.hasActed = false;
        }
        
        // 检查游戏是否结束
        if (players.length <= 1) {
            return { ended: true, winner: players[0] };
        }
        
        // 移动庄家位置
        this.room.dealerPosition = (this.room.dealerPosition + 1) % players.length;
        this.assignPositions(players);
        
        // 收取盲注
        const blindsResult = this.postBlinds(players);
        
        // 发底牌
        this.dealHoleCards(players);
        
        // 设置起始玩家
        const bbIndex = players.findIndex(p => p.isBigBlind);
        this.room.currentPlayerIndex = (bbIndex + 1) % players.length;
        
        return {
            success: true,
            dealerPosition: this.room.dealerPosition,
            blinds: blindsResult,
            pot: this.room.pot,
            currentBet: this.room.currentBet,
            currentPlayerId: this.playerOrder[this.room.currentPlayerIndex]
        };
    }

    /**
     * 分配位置
     */
    assignPositions(players) {
        const count = players.length;
        
        for (let i = 0; i < count; i++) {
            players[i].isDealer = (i === this.room.dealerPosition);
            players[i].isSmallBlind = (i === (this.room.dealerPosition + 1) % count);
            players[i].isBigBlind = (i === (this.room.dealerPosition + 2) % count);
        }

        // 2人游戏特殊规则：庄家是小盲
        if (count === 2) {
            players[this.room.dealerPosition].isSmallBlind = true;
            players[this.room.dealerPosition].isBigBlind = false;
            players[(this.room.dealerPosition + 1) % 2].isSmallBlind = false;
            players[(this.room.dealerPosition + 1) % 2].isBigBlind = true;
        }
    }

    /**
     * 收取盲注
     */
    postBlinds(players) {
        const sbPlayer = players.find(p => p.isSmallBlind);
        const bbPlayer = players.find(p => p.isBigBlind);
        
        const sbAmount = Math.min(this.room.smallBlind, sbPlayer.chips);
        const bbAmount = Math.min(this.room.bigBlind, bbPlayer.chips);
        
        sbPlayer.chips -= sbAmount;
        sbPlayer.currentBet = sbAmount;
        
        bbPlayer.chips -= bbAmount;
        bbPlayer.currentBet = bbAmount;
        
        this.room.pot = sbAmount + bbAmount;
        this.room.currentBet = bbAmount;
        
        return {
            smallBlind: { playerId: sbPlayer.id, amount: sbAmount },
            bigBlind: { playerId: bbPlayer.id, amount: bbAmount }
        };
    }

    /**
     * 重置牌组
     */
    resetDeck() {
        this.deck = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.deck.push({ suit, rank });
            }
        }
    }

    /**
     * 洗牌
     */
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    /**
     * 发底牌
     */
    dealHoleCards(players) {
        for (const player of players) {
            player.holeCards = [this.deck.pop(), this.deck.pop()];
        }
    }

    /**
     * 发公共牌
     */
    dealCommunityCards(count) {
        // 销牌
        this.deck.pop();
        
        const cards = [];
        for (let i = 0; i < count; i++) {
            cards.push(this.deck.pop());
        }
        
        this.room.communityCards.push(...cards);
        return cards;
    }

    /**
     * 处理玩家操作
     */
    handleAction(socketId, action, amount = 0) {
        const player = this.room.players.get(socketId);
        if (!player) {
            return { success: false, error: '玩家不存在' };
        }

        const currentPlayerId = this.playerOrder[this.room.currentPlayerIndex];
        if (socketId !== currentPlayerId) {
            return { success: false, error: '不是你的回合' };
        }

        let result = { success: false };
        
        switch (action) {
            case ACTIONS.FOLD:
                result = this.handleFold(player);
                break;
            case ACTIONS.CHECK:
                result = this.handleCheck(player);
                break;
            case ACTIONS.CALL:
                result = this.handleCall(player);
                break;
            case ACTIONS.RAISE:
                result = this.handleRaise(player, amount);
                break;
            case ACTIONS.ALLIN:
                result = this.handleAllIn(player);
                break;
            default:
                return { success: false, error: '无效操作' };
        }

        if (!result.success) {
            return result;
        }

        // 标记玩家已行动
        player.hasActed = true;

        // 检查是否进入下一阶段或结束
        const nextPhaseResult = this.checkPhaseEnd();
        
        return {
            success: true,
            action,
            amount: result.amount || 0,
            playerId: socketId,
            playerName: player.name,
            pot: this.room.pot,
            currentBet: this.room.currentBet,
            playerChips: player.chips,
            playerCurrentBet: player.currentBet,
            ...nextPhaseResult
        };
    }

    /**
     * 处理弃牌
     */
    handleFold(player) {
        player.status = PLAYER_STATUS.FOLDED;
        return { success: true };
    }

    /**
     * 处理过牌
     */
    handleCheck(player) {
        if (player.currentBet < this.room.currentBet) {
            return { success: false, error: '无法过牌，需要跟注' };
        }
        return { success: true };
    }

    /**
     * 处理跟注
     */
    handleCall(player) {
        const callAmount = Math.min(
            this.room.currentBet - player.currentBet,
            player.chips
        );
        
        player.chips -= callAmount;
        player.currentBet += callAmount;
        this.room.pot += callAmount;
        
        if (player.chips === 0) {
            player.status = PLAYER_STATUS.ALLIN;
        }
        
        return { success: true, amount: callAmount };
    }

    /**
     * 处理加注
     */
    handleRaise(player, amount) {
        const minRaise = this.room.currentBet * 2;
        if (amount < minRaise && amount < player.chips + player.currentBet) {
            return { success: false, error: `加注金额必须至少为${minRaise}` };
        }

        const raiseAmount = Math.min(amount - player.currentBet, player.chips);
        player.chips -= raiseAmount;
        player.currentBet += raiseAmount;
        this.room.pot += raiseAmount;
        this.room.currentBet = player.currentBet;
        
        // 重置其他玩家的hasActed状态
        for (const p of this.room.players.values()) {
            if (p.id !== player.id && p.status === PLAYER_STATUS.PLAYING) {
                p.hasActed = false;
            }
        }
        
        if (player.chips === 0) {
            player.status = PLAYER_STATUS.ALLIN;
        }
        
        return { success: true, amount: player.currentBet };
    }

    /**
     * 处理全押
     */
    handleAllIn(player) {
        const allInAmount = player.chips;
        player.currentBet += allInAmount;
        this.room.pot += allInAmount;
        player.chips = 0;
        player.status = PLAYER_STATUS.ALLIN;
        
        if (player.currentBet > this.room.currentBet) {
            this.room.currentBet = player.currentBet;
            // 重置其他玩家的hasActed状态
            for (const p of this.room.players.values()) {
                if (p.id !== player.id && p.status === PLAYER_STATUS.PLAYING) {
                    p.hasActed = false;
                }
            }
        }
        
        return { success: true, amount: allInAmount };
    }

    /**
     * 检查阶段结束
     */
    checkPhaseEnd() {
        const activePlayers = this.getActivePlayers();
        
        // 只剩一个玩家
        if (activePlayers.length === 1) {
            return this.endHandByFold(activePlayers[0]);
        }
        
        // 检查是否所有活跃玩家都已行动且下注相等
        const allActed = activePlayers.every(p => p.hasActed || p.status === PLAYER_STATUS.ALLIN);
        const allEqualBets = activePlayers.every(p => 
            p.currentBet === this.room.currentBet || p.status === PLAYER_STATUS.ALLIN
        );
        
        if (allActed && allEqualBets) {
            return this.advancePhase();
        }
        
        // 移动到下一个玩家
        this.moveToNextPlayer();
        
        return {
            nextPlayerId: this.playerOrder[this.room.currentPlayerIndex],
            phaseEnded: false
        };
    }

    /**
     * 获取活跃玩家
     */
    getActivePlayers() {
        return Array.from(this.room.players.values())
            .filter(p => p.status === PLAYER_STATUS.PLAYING || p.status === PLAYER_STATUS.ALLIN);
    }

    /**
     * 移动到下一个玩家
     */
    moveToNextPlayer() {
        const players = this.getActivePlayers().filter(p => p.status === PLAYER_STATUS.PLAYING);
        if (players.length === 0) return;
        
        let attempts = 0;
        do {
            this.room.currentPlayerIndex = (this.room.currentPlayerIndex + 1) % this.playerOrder.length;
            const playerId = this.playerOrder[this.room.currentPlayerIndex];
            const player = this.room.players.get(playerId);
            if (player && player.status === PLAYER_STATUS.PLAYING) {
                break;
            }
            attempts++;
        } while (attempts < this.playerOrder.length);
    }

    /**
     * 进入下一阶段
     */
    advancePhase() {
        // 重置玩家下注
        for (const player of this.room.players.values()) {
            player.currentBet = 0;
            player.hasActed = false;
        }
        this.room.currentBet = 0;

        let newCards = [];
        
        switch (this.room.phase) {
            case GAME_PHASES.PREFLOP:
                this.room.phase = GAME_PHASES.FLOP;
                newCards = this.dealCommunityCards(3);
                break;
            case GAME_PHASES.FLOP:
                this.room.phase = GAME_PHASES.TURN;
                newCards = this.dealCommunityCards(1);
                break;
            case GAME_PHASES.TURN:
                this.room.phase = GAME_PHASES.RIVER;
                newCards = this.dealCommunityCards(1);
                break;
            case GAME_PHASES.RIVER:
                return this.showdown();
        }

        // 设置新阶段的起始玩家（庄家后第一个活跃玩家）
        this.setFirstActivePlayer();
        
        return {
            phaseEnded: true,
            newPhase: this.room.phase,
            newCards: newCards,
            communityCards: this.room.communityCards,
            nextPlayerId: this.playerOrder[this.room.currentPlayerIndex]
        };
    }

    /**
     * 设置第一个活跃玩家
     */
    setFirstActivePlayer() {
        const dealerIndex = this.room.dealerPosition;
        let index = (dealerIndex + 1) % this.playerOrder.length;
        let attempts = 0;
        
        while (attempts < this.playerOrder.length) {
            const playerId = this.playerOrder[index];
            const player = this.room.players.get(playerId);
            if (player && player.status === PLAYER_STATUS.PLAYING) {
                this.room.currentPlayerIndex = index;
                return;
            }
            index = (index + 1) % this.playerOrder.length;
            attempts++;
        }
    }

    /**
     * 因弃牌结束
     */
    endHandByFold(winner) {
        this.room.phase = GAME_PHASES.SHOWDOWN;
        winner.chips += this.room.pot;
        
        return {
            handEnded: true,
            reason: 'fold',
            winners: [{
                playerId: winner.id,
                name: winner.name,
                winAmount: this.room.pot
            }],
            pot: this.room.pot
        };
    }

    /**
     * 摊牌
     */
    showdown() {
        this.room.phase = GAME_PHASES.SHOWDOWN;
        
        const activePlayers = Array.from(this.room.players.values())
            .filter(p => p.status !== PLAYER_STATUS.FOLDED && p.status !== PLAYER_STATUS.OUT);
        
        // 评估所有玩家的手牌
        const evaluations = activePlayers.map(player => ({
            player,
            evaluation: this.evaluateHand(player.holeCards, this.room.communityCards)
        }));
        
        // 排序找出赢家
        evaluations.sort((a, b) => b.evaluation.score - a.evaluation.score);
        
        // 找出所有赢家（可能平分）
        const topScore = evaluations[0].evaluation.score;
        const winners = evaluations.filter(e => e.evaluation.score === topScore);
        
        // 分配底池
        const winAmount = Math.floor(this.room.pot / winners.length);
        for (const w of winners) {
            w.player.chips += winAmount;
            w.winAmount = winAmount;
        }
        
        return {
            handEnded: true,
            reason: 'showdown',
            winners: winners.map(w => ({
                playerId: w.player.id,
                name: w.player.name,
                holeCards: w.player.holeCards,
                evaluation: w.evaluation,
                winAmount: w.winAmount
            })),
            allHands: evaluations.map(e => ({
                playerId: e.player.id,
                name: e.player.name,
                holeCards: e.player.holeCards,
                evaluation: e.evaluation
            })),
            pot: this.room.pot
        };
    }

    /**
     * 简化的手牌评估
     */
    evaluateHand(holeCards, communityCards) {
        const allCards = [...holeCards, ...communityCards];
        
        // 简化评估 - 返回基本分数
        // 实际项目中应该使用完整的手牌评估算法
        const ranks = allCards.map(c => RANKS.indexOf(c.rank));
        const maxRank = Math.max(...ranks);
        
        // 检查对子、三条等
        const rankCounts = {};
        for (const card of allCards) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }
        
        const counts = Object.values(rankCounts).sort((a, b) => b - a);
        let handType = 'high_card';
        let score = maxRank;
        
        if (counts[0] === 4) {
            handType = 'four_of_a_kind';
            score = 700 + maxRank;
        } else if (counts[0] === 3 && counts[1] === 2) {
            handType = 'full_house';
            score = 600 + maxRank;
        } else if (counts[0] === 3) {
            handType = 'three_of_a_kind';
            score = 300 + maxRank;
        } else if (counts[0] === 2 && counts[1] === 2) {
            handType = 'two_pair';
            score = 200 + maxRank;
        } else if (counts[0] === 2) {
            handType = 'pair';
            score = 100 + maxRank;
        }
        
        // 检查同花
        const suitCounts = {};
        for (const card of allCards) {
            suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
        }
        const hasFlush = Object.values(suitCounts).some(c => c >= 5);
        if (hasFlush && score < 500) {
            handType = 'flush';
            score = 500 + maxRank;
        }
        
        const handNames = {
            'high_card': '高牌',
            'pair': '一对',
            'two_pair': '两对',
            'three_of_a_kind': '三条',
            'straight': '顺子',
            'flush': '同花',
            'full_house': '葫芦',
            'four_of_a_kind': '四条',
            'straight_flush': '同花顺',
            'royal_flush': '皇家同花顺'
        };
        
        return {
            type: handType,
            description: handNames[handType] || handType,
            score
        };
    }

    /**
     * 获取玩家可用操作
     */
    getAvailableActions(socketId) {
        const player = this.room.players.get(socketId);
        if (!player || player.status !== PLAYER_STATUS.PLAYING) {
            return [];
        }

        const actions = [ACTIONS.FOLD];
        
        if (player.currentBet === this.room.currentBet) {
            actions.push(ACTIONS.CHECK);
        } else {
            actions.push(ACTIONS.CALL);
        }
        
        if (player.chips > this.room.currentBet - player.currentBet) {
            actions.push(ACTIONS.RAISE);
        }
        
        actions.push(ACTIONS.ALLIN);
        
        return actions;
    }
}

module.exports = { OnlineGameManager, GAME_PHASES, ACTIONS };
