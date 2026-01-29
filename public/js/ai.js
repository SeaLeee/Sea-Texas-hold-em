/**
 * 增强版AI决策系统 - 支持难度级别和性格特征
 * 基于真实德州扑克策略：位置、手牌范围、底池赔率、SPR等
 */
class AI {
    /**
     * 创建AI决策器
     * @param {string} difficulty - 难度级别
     * @param {string} personality - 性格类型
     */
    constructor(difficulty = AI_DIFFICULTY.MEDIUM, personality = AI_PERSONALITY.BALANCED) {
        this.difficulty = difficulty;
        this.personality = personality;
        this.config = PERSONALITY_CONFIG[personality] || PERSONALITY_CONFIG[AI_PERSONALITY.BALANCED];
        
        // 记录历史行为用于对手建模
        this.actionHistory = [];
        this.opponentModels = {};
        
        // 起手牌范围表（基于Chen公式改进）
        this.preflopRanges = this.initPreflopRanges();
    }

    /**
     * 初始化起手牌范围
     * 返回基于Chen公式的手牌评分
     */
    initPreflopRanges() {
        // 手牌评分表 (1-20分制)
        // 格式: 'XYs' = 同花, 'XYo' = 不同花, 'XX' = 对子
        return {
            // 超强牌 (16-20分)
            'AA': 20, 'KK': 17, 'QQ': 14, 'AKs': 16, 'AKo': 14,
            // 强牌 (12-15分)  
            'JJ': 13, 'TT': 12, 'AQs': 14, 'AQo': 12, 'AJs': 13, 'KQs': 13,
            '99': 11, 'ATs': 12, 'KJs': 12, 'QJs': 11, 'AJo': 11, 'KQo': 11,
            // 中等牌 (8-11分)
            '88': 10, '77': 9, 'KTs': 11, 'QTs': 10, 'JTs': 10, 'ATo': 10,
            'A9s': 10, 'A8s': 9, 'A7s': 9, 'A6s': 8, 'A5s': 9, 'A4s': 8,
            'A3s': 8, 'A2s': 8, 'KJo': 10, 'QJo': 9, 'JTo': 9,
            '66': 8, '55': 7, 'K9s': 9, 'Q9s': 8, 'J9s': 8, 'T9s': 9,
            // 边缘牌 (5-7分)
            '44': 6, '33': 5, '22': 5, 'K8s': 7, 'K7s': 7, 'K6s': 6,
            'Q8s': 6, 'J8s': 6, 'T8s': 7, '98s': 7, '87s': 7, '76s': 6,
            '65s': 6, '54s': 5, 'K5s': 6, 'K4s': 5, 'K3s': 5, 'K2s': 5,
            // 弱牌 (<5分)
            'default': 3
        };
    }

    /**
     * 获取手牌强度评分
     * @param {Card[]} holeCards - 底牌
     * @returns {number} 评分 (1-20)
     */
    getPreflopScore(holeCards) {
        const [c1, c2] = holeCards;
        const r1 = this.rankToChar(c1.rank);
        const r2 = this.rankToChar(c2.rank);
        const suited = c1.suit.name === c2.suit.name;
        
        // 生成手牌字符串
        let hand;
        if (c1.rank === c2.rank) {
            hand = r1 + r2; // 对子
        } else {
            const high = c1.rank > c2.rank ? r1 : r2;
            const low = c1.rank > c2.rank ? r2 : r1;
            hand = high + low + (suited ? 's' : 'o');
        }
        
        return this.preflopRanges[hand] || this.preflopRanges['default'];
    }

    /**
     * 将数字点数转换为字符
     */
    rankToChar(rank) {
        if (rank === 14) return 'A';
        if (rank === 13) return 'K';
        if (rank === 12) return 'Q';
        if (rank === 11) return 'J';
        if (rank === 10) return 'T';
        return String(rank);
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
            bigBlind,
            activePlayers,
            players
        } = gameState;

        // 获取可用操作
        const availableActions = player.getAvailableActions(currentBet, minRaise);
        
        // 计算决策因素
        const decisionFactors = this.calculateDecisionFactors(player, gameState);
        
        // 添加一些随机性（模拟真人的不确定性）
        const randomNoise = this.getRandomNoise();
        
        // 根据难度选择决策策略
        let decision;
        switch (this.difficulty) {
            case AI_DIFFICULTY.EASY:
                decision = this.makeEasyDecision(player, availableActions, decisionFactors, gameState);
                break;
            case AI_DIFFICULTY.HARD:
                decision = this.makeHardDecision(player, availableActions, decisionFactors, gameState);
                break;
            default:
                decision = this.makeMediumDecision(player, availableActions, decisionFactors, gameState);
        }
        
        // 记录决策历史
        this.recordAction(player, decision, decisionFactors);
        
        return decision;
    }

    /**
     * 计算所有决策因素
     */
    calculateDecisionFactors(player, gameState) {
        const { communityCards, currentBet, pot, phase, bigBlind, activePlayers, players } = gameState;
        const toCall = Math.max(0, currentBet - player.currentBet);
        
        // 1. 手牌强度
        const handStrength = this.evaluateHandStrength(player.holeCards, communityCards, phase);
        
        // 2. 位置优势 (0-1，越高越好)
        const positionStrength = this.evaluatePosition(player, players);
        
        // 3. 底池赔率
        const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
        
        // 4. SPR (Stack to Pot Ratio)
        const spr = pot > 0 ? player.chips / pot : 20;
        
        // 5. 有效筹码深度 (以大盲为单位)
        const effectiveStack = player.chips / bigBlind;
        
        // 6. 对手数量因素
        const opponentFactor = 1 - (activePlayers - 1) * 0.1; // 对手越多，需要更强的牌
        
        // 7. 听牌潜力
        const drawPotential = this.evaluateDrawPotential(player.holeCards, communityCards, phase);
        
        // 8. 综合权益估算
        const equity = this.estimateEquity(handStrength, drawPotential, activePlayers);
        
        return {
            handStrength,
            positionStrength,
            potOdds,
            spr,
            effectiveStack,
            opponentFactor,
            drawPotential,
            equity,
            toCall,
            pot,
            phase
        };
    }

    /**
     * 评估手牌强度 (0-1)
     */
    evaluateHandStrength(holeCards, communityCards, phase) {
        if (communityCards.length === 0) {
            // 翻牌前使用Chen评分
            const score = this.getPreflopScore(holeCards);
            return score / 20;
        }

        // 有公共牌后，使用实际牌型评估
        const evaluation = HandEvaluator.evaluate(holeCards, communityCards);
        if (!evaluation) return 0.2;

        // 基于牌型等级计算强度
        const baseStrength = evaluation.handRank.rank / 10;
        
        // 考虑牌型内的相对强度
        const kickerStrength = this.evaluateKickerStrength(evaluation);
        
        return Math.min(1, baseStrength * 0.85 + kickerStrength * 0.15);
    }

    /**
     * 评估踢脚牌强度
     */
    evaluateKickerStrength(evaluation) {
        if (!evaluation.bestHand || evaluation.bestHand.length === 0) return 0.5;
        
        // 获取最高的非成牌部分的牌
        const highCards = evaluation.bestHand
            .map(c => c.rank)
            .sort((a, b) => b - a);
        
        // 最高牌的相对强度
        return (highCards[0] - 2) / 12;
    }

    /**
     * 评估位置优势
     */
    evaluatePosition(player, players) {
        if (!players) return 0.5;
        
        const activePlayers = players.filter(p => 
            p.status === PLAYER_STATUS.ACTIVE || p.status === PLAYER_STATUS.ALLIN
        );
        
        if (activePlayers.length <= 1) return 0.5;
        
        const playerIndex = activePlayers.findIndex(p => p.id === player.id);
        return playerIndex / (activePlayers.length - 1);
    }

    /**
     * 评估听牌潜力
     */
    evaluateDrawPotential(holeCards, communityCards, phase) {
        if (phase === GAME_PHASES.RIVER || phase === GAME_PHASES.PREFLOP) {
            return 0;
        }

        const allCards = [...holeCards, ...communityCards];
        let potential = 0;

        // 同花听牌检测
        const suitCounts = {};
        for (const card of allCards) {
            suitCounts[card.suit.name] = (suitCounts[card.suit.name] || 0) + 1;
        }
        const maxSuitCount = Math.max(...Object.values(suitCounts));
        
        if (maxSuitCount >= 4) {
            // 4张同花 = 9 outs
            potential += 0.35;
        } else if (maxSuitCount === 3 && holeCards.some(c => 
            suitCounts[c.suit.name] === maxSuitCount)) {
            // 3张同花且包含手牌
            potential += 0.1;
        }

        // 顺子听牌检测
        const ranks = [...new Set(allCards.map(c => c.rank))].sort((a, b) => a - b);
        
        // 检测两端顺子听牌 (OESD) 和卡顺
        const oesd = this.detectOESD(ranks);
        const gutshot = this.detectGutshot(ranks);
        
        if (oesd) {
            potential += 0.30; // 8 outs
        } else if (gutshot) {
            potential += 0.15; // 4 outs
        }

        return Math.min(potential, 0.6);
    }

    /**
     * 检测两端顺子听牌
     */
    detectOESD(ranks) {
        for (let i = 0; i <= ranks.length - 4; i++) {
            const slice = ranks.slice(i, i + 4);
            if (slice[3] - slice[0] === 3) {
                // 4张连续牌
                return true;
            }
        }
        return false;
    }

    /**
     * 检测卡顺
     */
    detectGutshot(ranks) {
        // 检查是否有4张牌在5张范围内（中间缺1张）
        for (let i = 0; i <= ranks.length - 4; i++) {
            const slice = ranks.slice(i, i + 4);
            if (slice[3] - slice[0] === 4) {
                return true;
            }
        }
        return false;
    }

    /**
     * 估算权益
     */
    estimateEquity(handStrength, drawPotential, activePlayers) {
        // 基础权益
        let equity = handStrength;
        
        // 加上听牌潜力（翻牌和转牌阶段）
        equity = Math.min(1, equity + drawPotential * 0.5);
        
        // 根据对手数量调整
        const opponentAdjust = Math.pow(0.9, activePlayers - 1);
        equity *= opponentAdjust;
        
        return equity;
    }

    /**
     * 获取随机噪声（模拟真人的不确定性）
     */
    getRandomNoise() {
        switch (this.difficulty) {
            case AI_DIFFICULTY.EASY:
                return (Math.random() - 0.5) * 0.3;
            case AI_DIFFICULTY.HARD:
                return (Math.random() - 0.5) * 0.1;
            default:
                return (Math.random() - 0.5) * 0.2;
        }
    }

    /**
     * 简单难度决策 - 更多随机性，容易被利用
     */
    makeEasyDecision(player, actions, factors, gameState) {
        const { handStrength, equity, potOdds, toCall } = factors;
        const { bigBlind } = gameState;
        
        // 添加大量随机性
        const noise = (Math.random() - 0.5) * 0.4;
        const adjustedStrength = Math.max(0, Math.min(1, handStrength + noise));
        
        // 简单决策：基于手牌强度
        if (adjustedStrength < 0.2) {
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            return { action: ACTIONS.FOLD };
        }
        
        if (adjustedStrength < 0.4) {
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            if (toCall <= bigBlind * 3 && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            return { action: ACTIONS.FOLD };
        }
        
        if (adjustedStrength < 0.6) {
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        }
        
        // 强牌：偶尔加注
        if (actions[ACTIONS.RAISE] && Math.random() > 0.4) {
            const raiseAmount = this.calculateRaiseAmount(actions, factors, gameState, 0.3);
            return { action: ACTIONS.RAISE, amount: raiseAmount };
        }
        
        if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 中等难度决策 - 平衡的策略
     */
    makeMediumDecision(player, actions, factors, gameState) {
        const { handStrength, equity, potOdds, toCall, positionStrength, spr, phase } = factors;
        const { bigBlind, pot } = gameState;
        
        // 应用性格调整
        const personalityAdjust = this.applyPersonalityAdjustment(factors);
        const adjustedEquity = Math.max(0, Math.min(1, equity + personalityAdjust));
        
        // 翻牌前策略
        if (phase === GAME_PHASES.PREFLOP) {
            return this.makePreflopDecision(player, actions, factors, gameState, adjustedEquity);
        }
        
        // 翻牌后策略
        return this.makePostflopDecision(player, actions, factors, gameState, adjustedEquity);
    }

    /**
     * 困难难度决策 - 最优策略，考虑更多因素
     */
    makeHardDecision(player, actions, factors, gameState) {
        const { handStrength, equity, potOdds, toCall, positionStrength, spr, phase, effectiveStack } = factors;
        const { bigBlind, pot, activePlayers } = gameState;
        
        // 应用性格调整（困难AI的性格更微妙）
        const personalityAdjust = this.applyPersonalityAdjustment(factors) * 0.7;
        const adjustedEquity = Math.max(0, Math.min(1, equity + personalityAdjust));
        
        // EV计算
        const callEV = this.calculateCallEV(adjustedEquity, pot, toCall);
        
        // 翻牌前策略
        if (phase === GAME_PHASES.PREFLOP) {
            return this.makeAdvancedPreflopDecision(player, actions, factors, gameState);
        }
        
        // SPR策略调整
        if (spr < 4) {
            // 低SPR：简化决策，准备全押
            return this.makeLowSPRDecision(player, actions, factors, gameState, adjustedEquity);
        }
        
        // 高级翻牌后策略
        return this.makeAdvancedPostflopDecision(player, actions, factors, gameState, adjustedEquity, callEV);
    }

    /**
     * 翻牌前决策
     */
    makePreflopDecision(player, actions, factors, gameState, adjustedEquity) {
        const { handStrength, positionStrength, toCall } = factors;
        const { bigBlind } = gameState;
        const preflopScore = this.getPreflopScore(player.holeCards);
        
        // 根据位置和手牌强度决定是否入池
        const vpipThreshold = this.getVPIPThreshold(positionStrength);
        
        if (preflopScore < vpipThreshold) {
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            return { action: ACTIONS.FOLD };
        }
        
        // 强牌加注
        const pfrThreshold = this.getPFRThreshold(positionStrength);
        if (preflopScore >= pfrThreshold && actions[ACTIONS.RAISE]) {
            const raiseSize = this.calculatePreflopRaise(actions, gameState, preflopScore);
            return { action: ACTIONS.RAISE, amount: raiseSize };
        }
        
        // 跟注
        if (toCall <= bigBlind * 4 && actions[ACTIONS.CALL]) {
            return { action: ACTIONS.CALL };
        }
        
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 翻牌后决策
     */
    makePostflopDecision(player, actions, factors, gameState, adjustedEquity) {
        const { handStrength, potOdds, toCall, drawPotential } = factors;
        const { bigBlind, pot } = gameState;
        
        // 诈唬判断
        if (handStrength < 0.25 && this.shouldBluff(factors, gameState)) {
            if (actions[ACTIONS.RAISE]) {
                const bluffSize = this.calculateBluffSize(actions, pot);
                return { action: ACTIONS.RAISE, amount: bluffSize };
            }
        }
        
        // 弱牌处理
        if (adjustedEquity < 0.25) {
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            return { action: ACTIONS.FOLD };
        }
        
        // 边缘牌：根据底池赔率决定
        if (adjustedEquity < 0.45) {
            if (toCall === 0 && actions[ACTIONS.CHECK]) {
                return { action: ACTIONS.CHECK };
            }
            if (adjustedEquity > potOdds && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            return { action: ACTIONS.FOLD };
        }
        
        // 中等牌
        if (adjustedEquity < 0.65) {
            if (actions[ACTIONS.RAISE] && Math.random() < this.config.aggression) {
                const raiseAmount = this.calculateRaiseAmount(actions, factors, gameState, 0.5);
                return { action: ACTIONS.RAISE, amount: raiseAmount };
            }
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        }
        
        // 强牌：价值下注
        if (actions[ACTIONS.RAISE]) {
            const raiseAmount = this.calculateValueBet(actions, factors, gameState, adjustedEquity);
            return { action: ACTIONS.RAISE, amount: raiseAmount };
        }
        
        if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 高级翻牌前决策（困难AI）
     */
    makeAdvancedPreflopDecision(player, actions, factors, gameState) {
        const { positionStrength, effectiveStack, toCall } = factors;
        const { bigBlind, pot } = gameState;
        const preflopScore = this.getPreflopScore(player.holeCards);
        
        // 3-Bet策略
        if (toCall > bigBlind && preflopScore >= 14) {
            if (actions[ACTIONS.RAISE]) {
                const threeBetSize = Math.min(
                    toCall * 3 + bigBlind,
                    actions[ACTIONS.RAISE].max
                );
                return { action: ACTIONS.RAISE, amount: Math.floor(threeBetSize) };
            }
        }
        
        // 短筹码策略
        if (effectiveStack < 15 && preflopScore >= 12) {
            if (actions[ACTIONS.ALLIN] || (actions[ACTIONS.RAISE] && player.chips <= actions[ACTIONS.RAISE].max)) {
                return { action: ACTIONS.ALLIN };
            }
        }
        
        // 位置感知的入池
        const adjustedVPIP = this.config.vpip * (1 + positionStrength * 0.5);
        const scoreThreshold = 20 * (1 - adjustedVPIP);
        
        if (preflopScore < scoreThreshold) {
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            return { action: ACTIONS.FOLD };
        }
        
        // 开放加注
        if (toCall === 0 || toCall <= bigBlind) {
            if (actions[ACTIONS.RAISE] && preflopScore >= 8) {
                const openSize = bigBlind * (2.5 + positionStrength);
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.floor(openSize), actions[ACTIONS.RAISE].max)
                };
            }
        }
        
        // 跟注
        if (actions[ACTIONS.CALL] && preflopScore >= 6) {
            return { action: ACTIONS.CALL };
        }
        
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 高级翻牌后决策（困难AI）
     */
    makeAdvancedPostflopDecision(player, actions, factors, gameState, adjustedEquity, callEV) {
        const { handStrength, potOdds, toCall, positionStrength, drawPotential, phase } = factors;
        const { pot } = gameState;
        
        // 坚果牌处理
        if (handStrength >= 0.85) {
            return this.handleNutsHand(player, actions, factors, gameState);
        }
        
        // 半诈唬（有听牌的情况）
        if (drawPotential > 0.2 && handStrength < 0.4) {
            if (actions[ACTIONS.RAISE] && Math.random() < this.config.aggression) {
                const semiBluff = pot * 0.6;
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.floor(semiBluff), actions[ACTIONS.RAISE].max)
                };
            }
        }
        
        // EV正的情况下跟注
        if (callEV > 0 && adjustedEquity > potOdds) {
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        }
        
        // 价值下注
        if (adjustedEquity > 0.55 && actions[ACTIONS.RAISE]) {
            const betSize = this.calculateOptimalBetSize(adjustedEquity, pot, actions);
            return { action: ACTIONS.RAISE, amount: betSize };
        }
        
        // 过牌/跟注
        if (toCall === 0 && actions[ACTIONS.CHECK]) {
            // 后位考虑下注
            if (positionStrength > 0.7 && handStrength > 0.35 && actions[ACTIONS.RAISE]) {
                const probeSize = pot * 0.4;
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.floor(probeSize), actions[ACTIONS.RAISE].max)
                };
            }
            return { action: ACTIONS.CHECK };
        }
        
        if (adjustedEquity > potOdds && actions[ACTIONS.CALL]) {
            return { action: ACTIONS.CALL };
        }
        
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 低SPR决策（准备全押）
     */
    makeLowSPRDecision(player, actions, factors, gameState, adjustedEquity) {
        const { handStrength, spr } = factors;
        
        // 低SPR时简化决策
        if (adjustedEquity > 0.5) {
            // 强牌全押
            if (actions[ACTIONS.ALLIN]) {
                return { action: ACTIONS.ALLIN };
            }
            if (actions[ACTIONS.RAISE]) {
                return { action: ACTIONS.RAISE, amount: actions[ACTIONS.RAISE].max };
            }
        }
        
        if (adjustedEquity > 0.35) {
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        }
        
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 处理坚果牌
     */
    handleNutsHand(player, actions, factors, gameState) {
        const { positionStrength, phase } = factors;
        const { pot } = gameState;
        
        // 偶尔慢打
        if (phase !== GAME_PHASES.RIVER && Math.random() < 0.2) {
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        }
        
        // 价值最大化
        if (actions[ACTIONS.RAISE]) {
            // 河牌大额下注
            const betMultiplier = phase === GAME_PHASES.RIVER ? 0.8 : 0.65;
            const betSize = Math.floor(pot * betMultiplier);
            return { 
                action: ACTIONS.RAISE, 
                amount: Math.min(Math.max(betSize, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max)
            };
        }
        
        if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 应用性格调整
     */
    applyPersonalityAdjustment(factors) {
        const { positionStrength } = factors;
        
        // 激进性格提高行动倾向
        const baseAdjust = (this.config.aggression - 0.5) * 0.15;
        
        // 位置影响
        const positionAdjust = positionStrength * 0.05;
        
        return baseAdjust + positionAdjust;
    }

    /**
     * 获取VPIP阈值
     */
    getVPIPThreshold(positionStrength) {
        // 早位需要更强的牌，后位可以更松
        const baseThreshold = 20 * (1 - this.config.vpip);
        return baseThreshold * (1 - positionStrength * 0.3);
    }

    /**
     * 获取PFR阈值
     */
    getPFRThreshold(positionStrength) {
        const baseThreshold = 20 * (1 - this.config.pfr);
        return baseThreshold * (1 - positionStrength * 0.2);
    }

    /**
     * 计算翻牌前加注大小
     */
    calculatePreflopRaise(actions, gameState, preflopScore) {
        const { bigBlind, pot } = gameState;
        
        // 标准开池大小 2.5-3.5BB
        let raiseSize = bigBlind * (2.5 + preflopScore / 20);
        
        // 确保在有效范围内
        raiseSize = Math.max(actions[ACTIONS.RAISE].min, Math.floor(raiseSize));
        raiseSize = Math.min(raiseSize, actions[ACTIONS.RAISE].max);
        
        return raiseSize;
    }

    /**
     * 判断是否应该诈唬
     */
    shouldBluff(factors, gameState) {
        const { positionStrength, handStrength, phase } = factors;
        const { activePlayers } = gameState;
        
        // 基础诈唬概率
        let bluffProb = this.config.bluffFreq;
        
        // 后位更容易诈唬
        bluffProb *= (1 + positionStrength);
        
        // 对手少更容易诈唬
        if (activePlayers <= 2) bluffProb *= 1.5;
        
        // 河牌诈唬更有意义
        if (phase === GAME_PHASES.RIVER) bluffProb *= 1.3;
        
        return Math.random() < bluffProb;
    }

    /**
     * 计算诈唬大小
     */
    calculateBluffSize(actions, pot) {
        // 诈唬大小应该让对手有足够的弃牌率
        const bluffSize = Math.floor(pot * (0.6 + Math.random() * 0.2));
        return Math.min(Math.max(bluffSize, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max);
    }

    /**
     * 计算加注金额
     */
    calculateRaiseAmount(actions, factors, gameState, multiplier) {
        const { pot } = gameState;
        const raiseSize = Math.floor(pot * multiplier + actions[ACTIONS.RAISE].min);
        return Math.min(Math.max(raiseSize, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max);
    }

    /**
     * 计算价值下注
     */
    calculateValueBet(actions, factors, gameState, equity) {
        const { pot } = gameState;
        // 权益越高，下注越大
        const betMultiplier = 0.4 + equity * 0.4;
        const betSize = Math.floor(pot * betMultiplier);
        return Math.min(Math.max(betSize, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max);
    }

    /**
     * 计算最优下注大小
     */
    calculateOptimalBetSize(equity, pot, actions) {
        // 基于权益的最优下注
        const optimalRatio = Math.min(0.75, equity * 0.9);
        const betSize = Math.floor(pot * optimalRatio);
        return Math.min(Math.max(betSize, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max);
    }

    /**
     * 计算跟注EV
     */
    calculateCallEV(equity, pot, toCall) {
        if (toCall <= 0) return 1;
        return (equity * (pot + toCall)) - toCall;
    }

    /**
     * 记录决策历史
     */
    recordAction(player, decision, factors) {
        this.actionHistory.push({
            playerId: player.id,
            action: decision.action,
            amount: decision.amount,
            factors: {
                handStrength: factors.handStrength,
                phase: factors.phase
            },
            timestamp: Date.now()
        });
        
        // 保持历史记录在合理范围
        if (this.actionHistory.length > 100) {
            this.actionHistory.shift();
        }
    }

    /**
     * 设置难度
     */
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }

    /**
     * 设置性格
     */
    setPersonality(personality) {
        this.personality = personality;
        this.config = PERSONALITY_CONFIG[personality] || PERSONALITY_CONFIG[AI_PERSONALITY.BALANCED];
    }

    /**
     * 获取AI信息
     */
    getInfo() {
        return {
            difficulty: this.difficulty,
            difficultyName: DIFFICULTY_NAMES[this.difficulty],
            personality: this.personality,
            personalityName: PERSONALITY_NAMES[this.personality],
            config: this.config
        };
    }
}