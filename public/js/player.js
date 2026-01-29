/**
 * 玩家类
 */
class Player {
    /**
     * 创建玩家
     * @param {number} id - 玩家ID
     * @param {string} name - 玩家名称
     * @param {number} chips - 初始筹码
     * @param {boolean} isHuman - 是否为人类玩家
     * @param {number} position - 座位位置
     */
    constructor(id, name, chips, isHuman = false, position = 0) {
        this.id = id;
        this.name = name;
        this.chips = chips;
        this.isHuman = isHuman;
        this.position = position;
        
        // 游戏状态
        this.holeCards = [];           // 底牌
        this.status = PLAYER_STATUS.ACTIVE;
        this.currentBet = 0;           // 当前轮次下注金额
        this.totalBetThisRound = 0;    // 本手牌总下注金额
        this.lastAction = null;        // 上一次操作
        
        // 位置标记
        this.isDealer = false;
        this.isSmallBlind = false;
        this.isBigBlind = false;
        
        // 头像
        this.avatar = PLAYER_AVATARS[position % PLAYER_AVATARS.length];
    }

    /**
     * 接收底牌
     * @param {Card[]} cards - 2张底牌
     */
    receiveCards(cards) {
        this.holeCards = cards;
        if (this.isHuman) {
            // 人类玩家的牌正面朝上
            this.holeCards.forEach(card => card.reveal());
        }
    }

    /**
     * 下注
     * @param {number} amount - 下注金额
     * @returns {number} - 实际下注金额
     */
    bet(amount) {
        const actualBet = Math.min(amount, this.chips);
        this.chips -= actualBet;
        this.currentBet += actualBet;
        this.totalBetThisRound += actualBet;
        
        if (this.chips === 0) {
            this.status = PLAYER_STATUS.ALLIN;
        }
        
        return actualBet;
    }

    /**
     * 跟注
     * @param {number} targetBet - 需要跟到的金额
     * @returns {number} - 实际下注金额
     */
    call(targetBet) {
        const toCall = targetBet - this.currentBet;
        const actualBet = this.bet(toCall);
        this.lastAction = toCall >= this.chips + actualBet ? ACTIONS.ALLIN : ACTIONS.CALL;
        return actualBet;
    }

    /**
     * 加注
     * @param {number} totalAmount - 加注后的总金额
     * @returns {number} - 实际下注金额
     */
    raise(totalAmount) {
        const toRaise = totalAmount - this.currentBet;
        const actualBet = this.bet(toRaise);
        this.lastAction = this.chips === 0 ? ACTIONS.ALLIN : ACTIONS.RAISE;
        return actualBet;
    }

    /**
     * 全押
     * @returns {number} - 全押金额
     */
    allIn() {
        const amount = this.chips;
        this.bet(amount);
        this.lastAction = ACTIONS.ALLIN;
        return amount;
    }

    /**
     * 弃牌
     */
    fold() {
        this.status = PLAYER_STATUS.FOLDED;
        this.lastAction = ACTIONS.FOLD;
    }

    /**
     * 过牌
     */
    check() {
        this.lastAction = ACTIONS.CHECK;
    }

    /**
     * 赢得筹码
     * @param {number} amount - 赢得的金额
     */
    win(amount) {
        this.chips += amount;
    }

    /**
     * 重置本轮状态（新的下注轮）
     */
    resetForNewBettingRound() {
        this.currentBet = 0;
        this.lastAction = null;
    }

    /**
     * 重置本手牌状态（新的一手牌）
     */
    resetForNewHand() {
        this.holeCards = [];
        this.currentBet = 0;
        this.totalBetThisRound = 0;
        this.lastAction = null;
        this.isDealer = false;
        this.isSmallBlind = false;
        this.isBigBlind = false;
        
        // 如果还有筹码，重置为活跃状态
        if (this.chips > 0) {
            this.status = PLAYER_STATUS.ACTIVE;
        } else {
            this.status = PLAYER_STATUS.OUT;
        }
    }

    /**
     * 检查是否可以行动
     * @returns {boolean}
     */
    canAct() {
        return this.status === PLAYER_STATUS.ACTIVE;
    }

    /**
     * 检查是否仍在本手牌中（未弃牌）
     * @returns {boolean}
     */
    isInHand() {
        return this.status !== PLAYER_STATUS.FOLDED && this.status !== PLAYER_STATUS.OUT;
    }

    /**
     * 检查是否已出局
     * @returns {boolean}
     */
    isOut() {
        return this.status === PLAYER_STATUS.OUT;
    }

    /**
     * 获取可用操作
     * @param {number} currentBet - 当前最高下注
     * @param {number} minRaise - 最小加注额
     * @returns {Object} - 可用操作及其参数
     */
    getAvailableActions(currentBet, minRaise) {
        const actions = {};
        
        if (this.status !== PLAYER_STATUS.ACTIVE) {
            return actions;
        }

        // 始终可以弃牌
        actions[ACTIONS.FOLD] = true;

        const toCall = currentBet - this.currentBet;

        if (toCall === 0) {
            // 可以过牌
            actions[ACTIONS.CHECK] = true;
        } else if (toCall > 0) {
            // 需要跟注
            if (toCall >= this.chips) {
                // 筹码不够，只能全押或弃牌
                actions[ACTIONS.ALLIN] = this.chips;
            } else {
                actions[ACTIONS.CALL] = toCall;
            }
        }

        // 检查是否可以加注
        if (this.chips > toCall) {
            const minRaiseAmount = currentBet + minRaise;
            if (this.chips >= minRaiseAmount - this.currentBet) {
                actions[ACTIONS.RAISE] = {
                    min: minRaiseAmount,
                    max: this.currentBet + this.chips
                };
            }
        }

        // 全押选项
        if (this.chips > 0 && !actions[ACTIONS.ALLIN]) {
            actions[ACTIONS.ALLIN] = this.chips;
        }

        return actions;
    }

    /**
     * 获取玩家状态描述
     * @returns {string}
     */
    getStatusText() {
        switch (this.status) {
            case PLAYER_STATUS.FOLDED:
                return '已弃牌';
            case PLAYER_STATUS.ALLIN:
                return '全押';
            case PLAYER_STATUS.OUT:
                return '已出局';
            default:
                return '';
        }
    }

    /**
     * 获取位置描述
     * @returns {string}
     */
    getPositionText() {
        if (this.isDealer) return 'D';
        if (this.isSmallBlind) return 'SB';
        if (this.isBigBlind) return 'BB';
        return '';
    }
}
