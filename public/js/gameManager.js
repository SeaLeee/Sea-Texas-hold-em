/**
 * 游戏管理器 - 控制德州扑克游戏流程
 */
class GameManager {
    constructor() {
        // 游戏设置
        this.settings = { ...DEFAULT_SETTINGS };
        
        // 游戏状态
        this.deck = new Deck();
        this.players = [];
        this.communityCards = [];
        this.pot = 0;
        this.sidePots = [];
        this.phase = GAME_PHASES.WAITING;
        
        // 位置和下注
        this.dealerPosition = 0;
        this.currentPlayerIndex = 0;
        this.currentBet = 0;
        this.minRaise = 0;
        this.lastRaiser = null;
        
        // AI系统
        this.ai = new AI(this.settings.difficulty, this.settings.aiPersonality || AI_PERSONALITY.BALANCED);
        
        // 粒子系统
        this.particleSystem = null;
        
        // 回调函数
        this.onStateChange = null;
        this.onPlayerAction = null;
        this.onGameEnd = null;
        this.onRoundEnd = null;
        this.onAllIn = null;  // ALL IN 事件回调
        
        // 游戏统计
        this.roundNumber = 0;
    }

    /**
     * 初始化游戏
     * @param {Object} settings - 游戏设置
     */
    initialize(settings = {}) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        
        // 获取选择的小伙伴
        this.selectedBuddies = settings.selectedBuddies || [];
        
        // 初始化AI系统（支持难度和性格）
        const personality = this.settings.aiPersonality || AI_PERSONALITY.BALANCED;
        this.ai = new AI(this.settings.difficulty, personality);
        
        // 初始化粒子系统
        this.initParticleSystem();
        
        // 创建玩家
        this.players = [];
        
        // 人类玩家（位置0）
        this.players.push(new Player(
            0,
            '你',
            this.settings.startingChips,
            true,
            0
        ));

        // 添加选择的小伙伴
        let position = 1;
        for (const buddyId of this.selectedBuddies) {
            if (position >= this.settings.playerCount) break;
            
            const buddyConfig = PRESET_BUDDIES[buddyId];
            if (buddyConfig) {
                this.players.push(new Player(
                    position,
                    buddyConfig.name,
                    this.settings.startingChips,
                    false,
                    position,
                    buddyConfig
                ));
                position++;
            }
        }

        // 如果小伙伴不够，用随机AI填充
        const shuffledNames = [...AI_NAMES].sort(() => Math.random() - 0.5);
        let nameIndex = 0;
        while (position < this.settings.playerCount) {
            this.players.push(new Player(
                position,
                shuffledNames[nameIndex++],
                this.settings.startingChips,
                false,
                position
            ));
            position++;
        }

        this.dealerPosition = Math.floor(Math.random() * this.players.length);
        this.roundNumber = 0;
        this.phase = GAME_PHASES.WAITING;
        
        this.notifyStateChange();
    }

    /**
     * 初始化粒子系统
     */
    initParticleSystem() {
        if (typeof ParticleSystem !== 'undefined') {
            // ParticleSystem 构造函数期望的是 canvas ID 字符串
            this.particleSystem = new ParticleSystem('particle-canvas');
        }
    }

    /**
     * 触发ALL IN粒子效果
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    triggerAllInEffect(x, y) {
        if (this.particleSystem) {
            this.particleSystem.allInExplosion(x, y);
        }
    }

    /**
     * 触发赢牌庆祝效果
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} amount - 赢得金额
     */
    triggerWinEffect(x, y, amount) {
        if (this.particleSystem) {
            this.particleSystem.celebrateWin(x, y);
            // 大额赢取时添加额外烟花
            if (amount >= this.settings.startingChips * 0.5) {
                setTimeout(() => {
                    this.particleSystem.fireworks(x - 100, y - 50);
                    this.particleSystem.fireworks(x + 100, y - 50);
                }, 300);
            }
        }
    }

    /**
     * 开始新的一手牌
     */
    startNewHand() {
        this.roundNumber++;
        
        // 重置牌组
        this.deck.resetAndShuffle();
        
        // 重置公共牌和底池
        this.communityCards = [];
        this.pot = 0;
        this.sidePots = [];
        this.currentBet = 0;
        this.lastRaiser = null;

        // 重置玩家状态
        for (const player of this.players) {
            player.resetForNewHand();
        }

        // 移除已出局的玩家
        this.players = this.players.filter(p => !p.isOut());

        // 检查游戏是否结束
        if (this.players.length <= 1) {
            this.endGame();
            return;
        }

        // 移动庄家位置
        this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
        this.assignPositions();

        // 收取盲注
        this.postBlinds();

        // 发底牌
        this.dealHoleCards();

        // 开始翻牌前阶段
        this.phase = GAME_PHASES.PREFLOP;
        this.minRaise = this.settings.bigBlind;
        
        // 设置起始玩家（大盲位后一位）
        this.currentPlayerIndex = this.getNextActivePlayer(
            (this.getBigBlindPosition() + 1) % this.players.length
        );

        this.notifyStateChange();
        
        // 如果当前玩家是AI，开始AI回合
        this.processCurrentPlayer();
    }

    /**
     * 分配位置（庄家、小盲、大盲）
     */
    assignPositions() {
        const count = this.players.length;
        
        for (let i = 0; i < count; i++) {
            this.players[i].isDealer = (i === this.dealerPosition);
            this.players[i].isSmallBlind = (i === (this.dealerPosition + 1) % count);
            this.players[i].isBigBlind = (i === (this.dealerPosition + 2) % count);
        }

        // 2人游戏特殊规则：庄家是小盲
        if (count === 2) {
            this.players[this.dealerPosition].isSmallBlind = true;
            this.players[this.dealerPosition].isBigBlind = false;
            this.players[(this.dealerPosition + 1) % 2].isSmallBlind = false;
            this.players[(this.dealerPosition + 1) % 2].isBigBlind = true;
        }
    }

    /**
     * 获取小盲位置
     */
    getSmallBlindPosition() {
        return this.players.findIndex(p => p.isSmallBlind);
    }

    /**
     * 获取大盲位置
     */
    getBigBlindPosition() {
        return this.players.findIndex(p => p.isBigBlind);
    }

    /**
     * 收取盲注
     */
    postBlinds() {
        const sbPos = this.getSmallBlindPosition();
        const bbPos = this.getBigBlindPosition();

        // 小盲注
        const sbPlayer = this.players[sbPos];
        const sbAmount = sbPlayer.bet(Math.min(this.settings.smallBlind, sbPlayer.chips));
        this.pot += sbAmount;

        // 大盲注
        const bbPlayer = this.players[bbPos];
        const bbAmount = bbPlayer.bet(Math.min(this.settings.bigBlind, bbPlayer.chips));
        this.pot += bbAmount;

        this.currentBet = this.settings.bigBlind;
    }

    /**
     * 发底牌
     */
    dealHoleCards() {
        for (const player of this.players) {
            if (!player.isOut()) {
                const cards = this.deck.dealMultiple(2);
                player.receiveCards(cards);
            }
        }
    }

    /**
     * 处理当前玩家
     */
    processCurrentPlayer() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        if (!currentPlayer || !currentPlayer.canAct()) {
            this.moveToNextPlayer();
            return;
        }

        if (currentPlayer.isHuman) {
            // 等待人类玩家操作
            this.notifyStateChange();
        } else {
            // AI玩家自动操作 - 添加随机延迟让思考更自然
            // 基础延迟 + 随机延迟（1.5秒到3.5秒之间）
            const baseDelay = ANIMATION_DURATION.AI_THINK;
            const randomDelay = Math.random() * 2000; // 0-2秒随机
            const totalDelay = baseDelay + randomDelay;
            
            // 显示思考指示器
            if (this.onAIThinking) {
                this.onAIThinking(currentPlayer, true);
            }
            
            setTimeout(() => {
                // 隐藏思考指示器
                if (this.onAIThinking) {
                    this.onAIThinking(currentPlayer, false);
                }
                this.processAITurn(currentPlayer);
            }, totalDelay);
        }
    }

    /**
     * 处理AI回合
     * @param {Player} player - AI玩家
     */
    processAITurn(player) {
        // 安全检查：确保游戏仍在进行中且玩家可以行动
        if (this.phase === GAME_PHASES.WAITING || 
            this.phase === GAME_PHASES.SHOWDOWN ||
            !player.canAct()) {
            return;
        }
        
        // 确保当前是这个玩家的回合
        if (this.players[this.currentPlayerIndex] !== player) {
            return;
        }
        
        const gameState = {
            communityCards: this.communityCards,
            currentBet: this.currentBet,
            pot: this.pot,
            phase: this.phase,
            minRaise: this.minRaise,
            bigBlind: this.settings.bigBlind,
            activePlayers: this.getActivePlayers().length
        };

        const decision = this.ai.makeDecision(player, gameState);
        this.executePlayerAction(player, decision.action, decision.amount);
    }

    /**
     * 处理玩家操作
     * @param {string} action - 操作类型
     * @param {number} amount - 金额（加注时使用）
     */
    handlePlayerAction(action, amount = 0) {
        const player = this.players[this.currentPlayerIndex];
        
        if (!player || !player.isHuman || !player.canAct()) {
            return false;
        }

        return this.executePlayerAction(player, action, amount);
    }

    /**
     * 执行玩家操作
     * @param {Player} player - 玩家
     * @param {string} action - 操作类型
     * @param {number} amount - 金额
     */
    executePlayerAction(player, action, amount = 0) {
        let betAmount = 0;

        switch (action) {
            case ACTIONS.FOLD:
                player.fold();
                break;

            case ACTIONS.CHECK:
                player.check();
                break;

            case ACTIONS.CALL:
                betAmount = player.call(this.currentBet);
                this.pot += betAmount;
                break;

            case ACTIONS.RAISE:
                betAmount = player.raise(amount);
                this.pot += betAmount;
                this.currentBet = player.currentBet;
                this.minRaise = amount - (this.currentBet - betAmount);
                this.lastRaiser = player;
                break;

            case ACTIONS.ALLIN:
                betAmount = player.allIn();
                this.pot += betAmount;
                if (player.currentBet > this.currentBet) {
                    this.currentBet = player.currentBet;
                    this.lastRaiser = player;
                }
                break;

            default:
                return false;
        }

        // 通知操作
        if (this.onPlayerAction) {
            this.onPlayerAction(player, action, betAmount);
        }

        // 检查本轮是否结束
        if (this.isBettingRoundComplete()) {
            this.endBettingRound();
        } else {
            this.moveToNextPlayer();
        }

        return true;
    }

    /**
     * 移动到下一个玩家
     */
    moveToNextPlayer() {
        // 检查是否只剩一个玩家
        const activePlayers = this.getPlayersInHand();
        if (activePlayers.length <= 1) {
            this.endHand();
            return;
        }

        // 寻找下一个可行动的玩家
        let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let loopCount = 0;

        while (loopCount < this.players.length) {
            const player = this.players[nextIndex];
            if (player.canAct()) {
                this.currentPlayerIndex = nextIndex;
                this.processCurrentPlayer();
                return;
            }
            nextIndex = (nextIndex + 1) % this.players.length;
            loopCount++;
        }

        // 没有可行动的玩家，结束下注轮
        this.endBettingRound();
    }

    /**
     * 获取下一个活跃玩家的索引
     * @param {number} startIndex - 起始索引
     * @returns {number}
     */
    getNextActivePlayer(startIndex) {
        let index = startIndex;
        let loopCount = 0;

        while (loopCount < this.players.length) {
            if (this.players[index].canAct()) {
                return index;
            }
            index = (index + 1) % this.players.length;
            loopCount++;
        }

        return startIndex;
    }

    /**
     * 检查下注轮是否完成
     * @returns {boolean}
     */
    isBettingRoundComplete() {
        const playersInHand = this.getPlayersInHand();
        const activePlayers = this.getActivePlayers();
        
        // 只剩一个玩家
        if (playersInHand.length <= 1) {
            return true;
        }
        
        // 所有人都 ALL IN 了
        if (activePlayers.length === 0) {
            return true;
        }

        // 检查所有活跃玩家是否都已行动且下注相等
        for (const player of activePlayers) {
            // 如果有人加注后，其他玩家还没跟上
            if (player.currentBet < this.currentBet) {
                return false;
            }
            
            // 如果玩家还没有行动
            if (player.lastAction === null) {
                // 大盲位在翻牌前：如果没人加注，大盲有option
                if (this.phase === GAME_PHASES.PREFLOP && player.isBigBlind) {
                    // 大盲位还未行动，且当前下注等于大盲注
                    if (this.currentBet === this.settings.bigBlind) {
                        return false; // 大盲有option
                    }
                }
                // 其他情况下，玩家必须行动
                return false;
            }
        }

        return true;
    }

    /**
     * 结束下注轮
     */
    endBettingRound() {
        // 重置玩家本轮下注
        for (const player of this.players) {
            player.resetForNewBettingRound();
        }

        this.currentBet = 0;
        this.lastRaiser = null;

        // 检查是否只剩一个玩家
        const playersInHand = this.getPlayersInHand();
        if (playersInHand.length <= 1) {
            this.endHand();
            return;
        }

        // 进入下一阶段
        switch (this.phase) {
            case GAME_PHASES.PREFLOP:
                this.dealFlop();
                break;
            case GAME_PHASES.FLOP:
                this.dealTurn();
                break;
            case GAME_PHASES.TURN:
                this.dealRiver();
                break;
            case GAME_PHASES.RIVER:
                this.showdown();
                return;
        }

        // 设置起始玩家（小盲位或其后第一个活跃玩家）
        this.currentPlayerIndex = this.getNextActivePlayer(
            (this.dealerPosition + 1) % this.players.length
        );
        this.minRaise = this.settings.bigBlind;

        this.notifyStateChange();
        this.processCurrentPlayer();
    }

    /**
     * 发翻牌
     */
    dealFlop() {
        this.deck.burn();
        const cards = this.deck.dealMultiple(3, true);
        this.communityCards.push(...cards);
        this.phase = GAME_PHASES.FLOP;
    }

    /**
     * 发转牌
     */
    dealTurn() {
        this.deck.burn();
        const card = this.deck.deal(true);
        this.communityCards.push(card);
        this.phase = GAME_PHASES.TURN;
    }

    /**
     * 发河牌
     */
    dealRiver() {
        this.deck.burn();
        const card = this.deck.deal(true);
        this.communityCards.push(card);
        this.phase = GAME_PHASES.RIVER;
    }

    /**
     * 摊牌
     */
    showdown() {
        this.phase = GAME_PHASES.SHOWDOWN;

        // 显示所有玩家的牌（包括弃牌的，用于结果展示）
        for (const player of this.players) {
            player.holeCards.forEach(card => card.reveal());
        }

        // 确定赢家
        const result = HandEvaluator.determineWinners(
            this.getPlayersInHand(),
            this.communityCards
        );

        // 添加所有玩家信息（用于结果展示所有人底牌）
        result.allPlayers = this.players;

        // 分配奖池
        this.distributePot(result);

        this.notifyStateChange();

        // 通知回合结束
        if (this.onRoundEnd) {
            this.onRoundEnd(result);
        }
    }

    /**
     * 结束本手牌（有人弃牌到只剩一人）
     */
    endHand() {
        const winners = this.getPlayersInHand();
        
        if (winners.length === 1) {
            const winner = winners[0];
            winner.win(this.pot);
            
            // 显示所有玩家的牌（用于结果展示）
            for (const player of this.players) {
                player.holeCards.forEach(card => card.reveal());
            }
            
            const result = {
                winners: [{
                    player: winner,
                    evaluation: null
                }],
                isTie: false,
                winAmount: this.pot,
                reason: 'fold',
                allPlayers: this.players  // 添加所有玩家信息
            };

            this.phase = GAME_PHASES.SHOWDOWN;
            this.notifyStateChange();

            if (this.onRoundEnd) {
                this.onRoundEnd(result);
            }
        }
    }

    /**
     * 分配奖池
     * @param {Object} result - 获胜结果
     */
    distributePot(result) {
        const { winners } = result;
        
        if (winners.length === 0) return;

        const winAmount = Math.floor(this.pot / winners.length);
        const remainder = this.pot % winners.length;

        for (let i = 0; i < winners.length; i++) {
            let amount = winAmount;
            if (i === 0) amount += remainder;  // 余数给第一个赢家
            winners[i].player.win(amount);
            winners[i].winAmount = amount;
        }

        result.winAmount = winAmount;
    }

    /**
     * 结束游戏
     */
    endGame() {
        // 找出最终赢家
        const sortedPlayers = [...this.players].sort((a, b) => b.chips - a.chips);
        
        if (this.onGameEnd) {
            this.onGameEnd({
                winner: sortedPlayers[0],
                rankings: sortedPlayers,
                totalRounds: this.roundNumber
            });
        }
    }

    /**
     * 获取活跃玩家（可以行动）
     * @returns {Player[]}
     */
    getActivePlayers() {
        return this.players.filter(p => p.canAct());
    }

    /**
     * 获取仍在本手牌中的玩家
     * @returns {Player[]}
     */
    getPlayersInHand() {
        return this.players.filter(p => p.isInHand());
    }

    /**
     * 获取当前游戏状态
     * @returns {Object}
     */
    getGameState() {
        return {
            phase: this.phase,
            phaseName: PHASE_NAMES[this.phase],
            pot: this.pot,
            currentBet: this.currentBet,
            minRaise: this.minRaise,
            communityCards: this.communityCards,
            players: this.players,
            currentPlayerIndex: this.currentPlayerIndex,
            dealerPosition: this.dealerPosition,
            roundNumber: this.roundNumber,
            settings: this.settings
        };
    }

    /**
     * 获取人类玩家
     * @returns {Player}
     */
    getHumanPlayer() {
        return this.players.find(p => p.isHuman);
    }

    /**
     * 检查是否轮到人类玩家
     * @returns {boolean}
     */
    isHumanTurn() {
        const current = this.players[this.currentPlayerIndex];
        return current && current.isHuman && current.canAct();
    }

    /**
     * 通知状态变化
     */
    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getGameState());
        }
    }

    /**
     * 设置难度
     * @param {string} difficulty - 难度级别
     */
    setDifficulty(difficulty) {
        this.settings.difficulty = difficulty;
        const personality = this.settings.aiPersonality || AI_PERSONALITY.BALANCED;
        this.ai = new AI(difficulty, personality);
    }

    /**
     * 设置AI性格
     * @param {string} personality - 性格类型
     */
    setPersonality(personality) {
        this.settings.aiPersonality = personality;
        this.ai = new AI(this.settings.difficulty, personality);
    }

    /**
     * 获取粒子系统实例
     * @returns {ParticleSystem|null}
     */
    getParticleSystem() {
        return this.particleSystem;
    }
}
