/**
 * AI决策系统
 */
class AI {
    /**
     * 创建AI决策器
     * @param {string} difficulty - 难度级别
     */
    constructor(difficulty = AI_DIFFICULTY.MEDIUM) {
        this.difficulty = difficulty;
    }

    /**
     * 做出决策
     * @param {Player} player - AI玩家
     * @param {Object} gameState - 游戏状态
     * @returns {Object} - 决策结果 {action, amount}
     */
    makeDecision(player, gameState) {
        const { 
            communityCards, 
            currentBet, 
            pot, 
            phase,
            minRaise,
            bigBlind
        } = gameState;

        // 获取可用操作
        const availableActions = player.getAvailableActions(currentBet, minRaise);
        
        // 计算手牌强度
        const handStrength = this.evaluateHandStrength(player.holeCards, communityCards, phase);
        
        // 计算底池赔率
        const potOdds = this.calculatePotOdds(currentBet - player.currentBet, pot);
        
        // 根据难度做决策
        switch (this.difficulty) {
            case AI_DIFFICULTY.EASY:
                return this.easyDecision(player, availableActions, handStrength, potOdds, gameState);
            case AI_DIFFICULTY.HARD:
                return this.hardDecision(player, availableActions, handStrength, potOdds, gameState);
            default:
                return this.mediumDecision(player, availableActions, handStrength, potOdds, gameState);
        }
    }

    /**
     * 评估手牌强度 (0-1)
     * @param {Card[]} holeCards - 底牌
     * @param {Card[]} communityCards - 公共牌
     * @param {string} phase - 游戏阶段
     * @returns {number}
     */
    evaluateHandStrength(holeCards, communityCards, phase) {
        if (communityCards.length === 0) {
            // 翻牌前，根据起手牌评估
            return this.evaluatePreflop(holeCards);
        }

        // 有公共牌后，使用实际牌型评估
        const evaluation = HandEvaluator.evaluate(holeCards, communityCards);
        if (!evaluation) return 0.2;

        // 根据牌型等级计算强度
        const rankStrength = evaluation.handRank.rank / 10;
        
        // 考虑潜力（听牌）
        const potential = this.evaluatePotential(holeCards, communityCards, phase);
        
        return Math.min(1, rankStrength * 0.7 + potential * 0.3);
    }

    /**
     * 评估翻牌前手牌强度
     * @param {Card[]} holeCards - 底牌
     * @returns {number}
     */
    evaluatePreflop(holeCards) {
        const [card1, card2] = holeCards;
        const rank1 = card1.rank;
        const rank2 = card2.rank;
        const suited = card1.suit.name === card2.suit.name;
        const gap = Math.abs(rank1 - rank2);
        
        let strength = 0;

        // 对子加分
        if (rank1 === rank2) {
            strength = 0.5 + (rank1 / 14) * 0.5;  // AA = 1.0, 22 = 0.57
            return strength;
        }

        // 高牌加分
        const highCard = Math.max(rank1, rank2);
        const lowCard = Math.min(rank1, rank2);
        strength += (highCard / 14) * 0.3;
        strength += (lowCard / 14) * 0.15;

        // 同花加分
        if (suited) {
            strength += 0.1;
        }

        // 连接牌加分（顺子潜力）
        if (gap <= 4) {
            strength += (5 - gap) * 0.03;
        }

        // 特定强牌组合加分
        if (highCard === 14) {  // A高
            if (lowCard >= 10) strength += 0.15;  // AT+
            else if (suited) strength += 0.05;    // Axs
        }

        if (highCard === 13 && lowCard >= 10) {  // KT+
            strength += 0.1;
        }

        return Math.min(1, Math.max(0, strength));
    }

    /**
     * 评估听牌潜力
     * @param {Card[]} holeCards - 底牌
     * @param {Card[]} communityCards - 公共牌
     * @param {string} phase - 游戏阶段
     * @returns {number}
     */
    evaluatePotential(holeCards, communityCards, phase) {
        if (phase === GAME_PHASES.RIVER) {
            return 0;  // 河牌后没有潜力
        }

        const allCards = [...holeCards, ...communityCards];
        let potential = 0;

        // 检查同花听牌
        const suitCounts = {};
        for (const card of allCards) {
            suitCounts[card.suit.name] = (suitCounts[card.suit.name] || 0) + 1;
        }
        const maxSuitCount = Math.max(...Object.values(suitCounts));
        if (maxSuitCount === 4) potential += 0.35;  // 四张同花
        else if (maxSuitCount === 3) potential += 0.15;

        // 检查顺子听牌
        const ranks = [...new Set(allCards.map(c => c.rank))].sort((a, b) => a - b);
        let maxConsecutive = 1;
        let current = 1;
        for (let i = 1; i < ranks.length; i++) {
            if (ranks[i] - ranks[i-1] === 1) {
                current++;
                maxConsecutive = Math.max(maxConsecutive, current);
            } else if (ranks[i] - ranks[i-1] > 1) {
                current = 1;
            }
        }
        if (maxConsecutive === 4) potential += 0.3;  // 四张连续
        else if (maxConsecutive === 3) potential += 0.1;

        return potential;
    }

    /**
     * 计算底池赔率
     * @param {number} toCall - 需要跟注的金额
     * @param {number} pot - 当前底池
     * @returns {number}
     */
    calculatePotOdds(toCall, pot) {
        if (toCall <= 0) return 1;
        return pot / (pot + toCall);
    }

    /**
     * 简单AI决策
     */
    easyDecision(player, actions, handStrength, potOdds, gameState) {
        const randomFactor = Math.random() * 0.3;  // 增加随机性
        const adjustedStrength = handStrength + randomFactor - 0.15;

        // 弱牌容易弃牌
        if (adjustedStrength < 0.25 && actions[ACTIONS.CHECK]) {
            return { action: ACTIONS.CHECK };
        }
        
        if (adjustedStrength < 0.2) {
            return { action: ACTIONS.FOLD };
        }

        // 中等牌跟注
        if (adjustedStrength < 0.5) {
            if (actions[ACTIONS.CHECK]) {
                return { action: ACTIONS.CHECK };
            }
            if (actions[ACTIONS.CALL]) {
                // 跟注金额太大就弃牌
                if (actions[ACTIONS.CALL] > player.chips * 0.3) {
                    return Math.random() > 0.5 ? 
                        { action: ACTIONS.FOLD } : 
                        { action: ACTIONS.CALL };
                }
                return { action: ACTIONS.CALL };
            }
        }

        // 强牌偶尔加注
        if (adjustedStrength >= 0.6 && actions[ACTIONS.RAISE] && Math.random() > 0.5) {
            const raiseAmount = actions[ACTIONS.RAISE].min + 
                Math.floor(Math.random() * (actions[ACTIONS.RAISE].max - actions[ACTIONS.RAISE].min) * 0.3);
            return { action: ACTIONS.RAISE, amount: raiseAmount };
        }

        // 默认跟注或过牌
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 中等AI决策
     */
    mediumDecision(player, actions, handStrength, potOdds, gameState) {
        const { currentBet, pot, bigBlind } = gameState;
        const toCall = currentBet - player.currentBet;

        // 考虑位置和对手数量的调整
        const positionBonus = player.position >= 3 ? 0.05 : 0;
        const adjustedStrength = handStrength + positionBonus;

        // 极弱牌弃牌
        if (adjustedStrength < 0.2 && toCall > 0) {
            return { action: ACTIONS.FOLD };
        }

        // 弱牌但没人下注就过牌
        if (adjustedStrength < 0.3) {
            if (actions[ACTIONS.CHECK]) {
                return { action: ACTIONS.CHECK };
            }
            // 跟注太贵就弃牌
            if (toCall > pot * 0.5) {
                return { action: ACTIONS.FOLD };
            }
            if (actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
        }

        // 中等牌
        if (adjustedStrength < 0.55) {
            if (actions[ACTIONS.CHECK]) {
                // 偶尔诈唬
                if (Math.random() < 0.15 && actions[ACTIONS.RAISE]) {
                    const bluffAmount = Math.min(
                        actions[ACTIONS.RAISE].min + bigBlind * 2,
                        actions[ACTIONS.RAISE].max
                    );
                    return { action: ACTIONS.RAISE, amount: bluffAmount };
                }
                return { action: ACTIONS.CHECK };
            }
            if (actions[ACTIONS.CALL] && potOdds > adjustedStrength * 0.8) {
                return { action: ACTIONS.CALL };
            }
            return { action: ACTIONS.FOLD };
        }

        // 强牌
        if (adjustedStrength >= 0.55) {
            if (actions[ACTIONS.RAISE]) {
                // 根据牌力决定加注大小
                const raiseMultiplier = adjustedStrength > 0.75 ? 0.7 : 0.4;
                const raiseAmount = Math.min(
                    actions[ACTIONS.RAISE].min + 
                        Math.floor((actions[ACTIONS.RAISE].max - actions[ACTIONS.RAISE].min) * raiseMultiplier),
                    actions[ACTIONS.RAISE].max
                );
                
                // 超强牌偶尔慢打
                if (adjustedStrength > 0.8 && Math.random() < 0.2) {
                    if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
                    if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
                }
                
                return { action: ACTIONS.RAISE, amount: raiseAmount };
            }
            if (actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            if (actions[ACTIONS.CHECK]) {
                return { action: ACTIONS.CHECK };
            }
        }

        // 默认
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 困难AI决策
     */
    hardDecision(player, actions, handStrength, potOdds, gameState) {
        const { currentBet, pot, bigBlind, phase, activePlayers } = gameState;
        const toCall = currentBet - player.currentBet;
        
        // 更精确的位置和阶段调整
        const positionFactor = this.getPositionFactor(player.position, activePlayers || 4);
        const phaseFactor = this.getPhaseFactor(phase);
        const stackFactor = this.getStackFactor(player.chips, bigBlind);
        
        const adjustedStrength = handStrength * phaseFactor + positionFactor;

        // EV计算
        const expectedValue = this.calculateEV(adjustedStrength, pot, toCall);

        // 极弱牌
        if (adjustedStrength < 0.15 && toCall > 0) {
            // 考虑诈唬
            if (this.shouldBluff(player, gameState, positionFactor)) {
                if (actions[ACTIONS.RAISE]) {
                    const bluffSize = Math.min(
                        pot * 0.6 + actions[ACTIONS.RAISE].min,
                        actions[ACTIONS.RAISE].max
                    );
                    return { action: ACTIONS.RAISE, amount: Math.floor(bluffSize) };
                }
            }
            return { action: ACTIONS.FOLD };
        }

        // 弱牌
        if (adjustedStrength < 0.35) {
            if (actions[ACTIONS.CHECK]) {
                return { action: ACTIONS.CHECK };
            }
            if (expectedValue > 0 && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            return { action: ACTIONS.FOLD };
        }

        // 中等牌
        if (adjustedStrength < 0.6) {
            if (expectedValue > 0) {
                if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
                if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            }
            
            // 偶尔半诈唬
            if (handStrength < 0.5 && Math.random() < 0.2 && actions[ACTIONS.RAISE]) {
                const semiBluff = Math.min(
                    actions[ACTIONS.RAISE].min + pot * 0.5,
                    actions[ACTIONS.RAISE].max
                );
                return { action: ACTIONS.RAISE, amount: Math.floor(semiBluff) };
            }

            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            if (toCall <= bigBlind * 3 && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            return { action: ACTIONS.FOLD };
        }

        // 强牌
        if (adjustedStrength >= 0.6) {
            if (actions[ACTIONS.RAISE]) {
                // 平衡下注大小
                let raiseSize;
                if (adjustedStrength > 0.85) {
                    // 坚果牌 - 大注或偶尔慢打
                    if (Math.random() < 0.25 && phase !== GAME_PHASES.RIVER) {
                        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
                        if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
                    }
                    raiseSize = pot * 0.8 + actions[ACTIONS.RAISE].min;
                } else if (adjustedStrength > 0.7) {
                    raiseSize = pot * 0.6 + actions[ACTIONS.RAISE].min;
                } else {
                    raiseSize = pot * 0.4 + actions[ACTIONS.RAISE].min;
                }
                
                raiseSize = Math.min(Math.floor(raiseSize), actions[ACTIONS.RAISE].max);
                raiseSize = Math.max(raiseSize, actions[ACTIONS.RAISE].min);
                
                return { action: ACTIONS.RAISE, amount: raiseSize };
            }
            
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        }

        // 默认
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 获取位置因子
     */
    getPositionFactor(position, totalPlayers) {
        // 后位优势
        const relativePosition = position / totalPlayers;
        return relativePosition * 0.1;
    }

    /**
     * 获取阶段因子
     */
    getPhaseFactor(phase) {
        switch (phase) {
            case GAME_PHASES.PREFLOP: return 0.9;  // 翻牌前稍微保守
            case GAME_PHASES.FLOP: return 1.0;
            case GAME_PHASES.TURN: return 1.05;
            case GAME_PHASES.RIVER: return 1.1;  // 河牌信息完整
            default: return 1.0;
        }
    }

    /**
     * 获取筹码量因子
     */
    getStackFactor(chips, bigBlind) {
        const m = chips / (bigBlind * 1.5);  // M值
        if (m < 5) return 0.8;   // 短筹码，需要更激进
        if (m < 10) return 0.9;
        if (m > 30) return 1.1;  // 深筹码，可以更灵活
        return 1.0;
    }

    /**
     * 计算期望值
     */
    calculateEV(winProbability, pot, toCall) {
        if (toCall <= 0) return 1;
        const ev = (winProbability * pot) - ((1 - winProbability) * toCall);
        return ev;
    }

    /**
     * 判断是否应该诈唬
     */
    shouldBluff(player, gameState, positionFactor) {
        const { phase, activePlayers } = gameState;
        
        // 后位更容易诈唬成功
        if (positionFactor < 0.05) return false;
        
        // 河牌诈唬更有意义
        if (phase === GAME_PHASES.RIVER && Math.random() < 0.2) return true;
        
        // 对手少更容易诈唬
        if ((activePlayers || 4) <= 2 && Math.random() < 0.15) return true;
        
        return false;
    }
}
