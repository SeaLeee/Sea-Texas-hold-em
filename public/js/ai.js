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
        
        // 数学家模式：完全基于EV和概率计算
        if (this.config.useMathMode) {
            const decision = this.makeMathematicianDecision(player, availableActions, decisionFactors, gameState);
            this.recordAction(player, decision, decisionFactors);
            return decision;
        }
        
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
     * 翻牌后决策 - 增强版：更难对付，不轻易弃牌
     */
    makePostflopDecision(player, actions, factors, gameState, adjustedEquity) {
        const { handStrength, potOdds, toCall, drawPotential, positionStrength } = factors;
        const { bigBlind, pot } = gameState;
        
        // 计算弃牌抵抗力（基于性格的foldToPressure）
        const foldResistance = 1 - this.config.foldToPressure;
        
        // 分析对手行为：玩家加注是否可能是诈唬
        const isPlayerBluffing = this.detectPlayerBluff(gameState, factors);
        
        // 诈唬判断
        if (handStrength < 0.25 && this.shouldBluff(factors, gameState)) {
            if (actions[ACTIONS.RAISE]) {
                const bluffSize = this.calculateBluffSize(actions, pot);
                return { action: ACTIONS.RAISE, amount: bluffSize };
            }
        }
        
        // 弱牌处理 - 大幅降低弃牌率
        // 原来是0.25就弃牌，现在根据性格和玩家行为动态调整
        const foldThreshold = 0.12 - (foldResistance * 0.06); // 最低0.06，最高0.12
        
        if (adjustedEquity < foldThreshold) {
            // 即使是弱牌，也有一定概率跟注（抓诈唬）
            if (isPlayerBluffing && Math.random() < 0.4 + foldResistance * 0.3) {
                if (actions[ACTIONS.CALL]) {
                    console.log(`[AI ${player.name}] 识别到玩家可能诈唬，决定跟注抓鸡`);
                    return { action: ACTIONS.CALL };
                }
            }
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            // 面对大额加注，根据性格决定是否弃牌
            if (toCall > pot * 0.5 && Math.random() < this.config.foldToPressure * 0.5) {
                return { action: ACTIONS.FOLD };
            }
            // 小额跟注
            if (toCall <= bigBlind * 3 && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            return { action: ACTIONS.FOLD };
        }
        
        // 边缘牌：更激进处理
        if (adjustedEquity < 0.35) {
            if (toCall === 0 && actions[ACTIONS.CHECK]) {
                // 有一定概率探针下注
                if (Math.random() < this.config.aggression * 0.4 && actions[ACTIONS.RAISE]) {
                    const probeSize = Math.floor(pot * 0.35);
                    return { action: ACTIONS.RAISE, amount: Math.min(probeSize, actions[ACTIONS.RAISE].max) };
                }
                return { action: ACTIONS.CHECK };
            }
            // 提高跟注意愿
            if (adjustedEquity > potOdds * 0.7 && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            // 检测诈唬时更愿意跟注
            if (isPlayerBluffing && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            // 小额跟注不轻易弃牌
            if (toCall <= bigBlind * 4 && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
            // 只有面对大额加注才考虑弃牌
            if (toCall > pot * 0.7) {
                return { action: ACTIONS.FOLD };
            }
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            return { action: ACTIONS.FOLD };
        }
        
        // 中等牌 - 更激进
        if (adjustedEquity < 0.55) {
            // 提高加注频率
            if (actions[ACTIONS.RAISE] && Math.random() < this.config.aggression * 1.2) {
                const raiseAmount = this.calculateRaiseAmount(actions, factors, gameState, 0.6);
                return { action: ACTIONS.RAISE, amount: raiseAmount };
            }
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        }
        
        // 较强牌 - 偶尔慢打设陷阱
        if (adjustedEquity < 0.75) {
            // 20%概率慢打
            if (Math.random() < 0.2 && positionStrength > 0.5) {
                if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
                if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            }
            if (actions[ACTIONS.RAISE]) {
                const raiseAmount = this.calculateValueBet(actions, factors, gameState, adjustedEquity);
                return { action: ACTIONS.RAISE, amount: raiseAmount };
            }
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        }
        
        // 强牌：价值最大化，偶尔慢打
        if (Math.random() < 0.15) {
            // 15%概率慢打诱导对手加注
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        }
        
        if (actions[ACTIONS.RAISE]) {
            const raiseAmount = this.calculateValueBet(actions, factors, gameState, adjustedEquity);
            return { action: ACTIONS.RAISE, amount: raiseAmount };
        }
        
        if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 检测玩家是否在诈唬
     */
    detectPlayerBluff(gameState, factors) {
        const { toCall, pot, phase } = { ...gameState, ...factors };
        
        // 玩家加注过大可能是诈唬
        if (toCall > pot * 0.8) {
            return Math.random() < 0.4; // 40%概率认为是诈唬
        }
        
        // 河牌圈突然大额加注
        if (factors.phase === GAME_PHASES.RIVER && toCall > pot * 0.6) {
            return Math.random() < 0.35;
        }
        
        // 之前一直check突然加注
        // 这里可以添加更多行为分析逻辑
        
        return Math.random() < 0.2; // 基础20%诈唬概率
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
     * 高级翻牌后决策（困难AI）- 增强版：更多高级策略
     */
    makeAdvancedPostflopDecision(player, actions, factors, gameState, adjustedEquity, callEV) {
        const { handStrength, potOdds, toCall, positionStrength, drawPotential, phase } = factors;
        const { pot, bigBlind } = gameState;
        
        // 计算弃牌抵抗力
        const foldResistance = 1 - this.config.foldToPressure;
        
        // 检测玩家诈唬
        const isPlayerBluffing = this.detectPlayerBluff(gameState, factors);
        
        // 坚果牌处理 - 更多陷阱策略
        if (handStrength >= 0.85) {
            return this.handleNutsHandAdvanced(player, actions, factors, gameState);
        }
        
        // 强牌陷阱（check-raise）
        if (handStrength >= 0.65 && toCall === 0) {
            const trapChance = this.config.trapFreq || 0.3;
            if (Math.random() < trapChance && actions[ACTIONS.CHECK]) {
                console.log(`[AI ${player.name}] 设置check-raise陷阱`);
                // 标记准备check-raise
                player._checkRaiseReady = true;
                return { action: ACTIONS.CHECK };
            }
        }
        
        // 执行check-raise
        if (player._checkRaiseReady && toCall > 0 && actions[ACTIONS.RAISE]) {
            player._checkRaiseReady = false;
            const checkRaiseSize = Math.floor(toCall * 3 + pot * 0.5);
            console.log(`[AI ${player.name}] 执行check-raise!`);
            return { 
                action: ACTIONS.RAISE, 
                amount: Math.min(checkRaiseSize, actions[ACTIONS.RAISE].max)
            };
        }
        
        // 半诈唬（有听牌的情况）- 更激进
        if (drawPotential > 0.15 && handStrength < 0.45) {
            if (actions[ACTIONS.RAISE] && Math.random() < this.config.aggression * 1.2) {
                const semiBluff = pot * (0.5 + this.config.aggression * 0.3);
                console.log(`[AI ${player.name}] 半诈唬加注`);
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.floor(semiBluff), actions[ACTIONS.RAISE].max)
                };
            }
        }
        
        // 反诈唬（识别到玩家诈唬时反击）
        if (isPlayerBluffing && handStrength > 0.3) {
            if (actions[ACTIONS.RAISE] && Math.random() < 0.5 + foldResistance * 0.3) {
                const counterBluff = Math.floor(toCall * 2.5 + pot * 0.4);
                console.log(`[AI ${player.name}] 识别诈唬，反加注`);
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(counterBluff, actions[ACTIONS.RAISE].max)
                };
            }
            // 至少跟注抓诈唬
            if (actions[ACTIONS.CALL]) {
                console.log(`[AI ${player.name}] 识别诈唬，跟注抓鸡`);
                return { action: ACTIONS.CALL };
            }
        }
        
        // EV正的情况下跟注 - 降低弃牌率
        if (callEV > -bigBlind * 2 && adjustedEquity > potOdds * 0.7) {
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        }
        
        // 价值下注 - 更激进
        if (adjustedEquity > 0.45 && actions[ACTIONS.RAISE]) {
            const betSize = this.calculateOptimalBetSize(adjustedEquity, pot, actions);
            return { action: ACTIONS.RAISE, amount: betSize };
        }
        
        // 中等牌力 - 不轻易弃牌
        if (adjustedEquity > 0.25) {
            if (toCall <= bigBlind * 5 && actions[ACTIONS.CALL]) {
                return { action: ACTIONS.CALL };
            }
            // 小额探针下注
            if (toCall === 0 && actions[ACTIONS.RAISE] && Math.random() < this.config.aggression) {
                const probeSize = pot * 0.35;
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.floor(probeSize), actions[ACTIONS.RAISE].max)
                };
            }
        }
        
        // 过牌/跟注
        if (toCall === 0 && actions[ACTIONS.CHECK]) {
            // 后位考虑下注
            if (positionStrength > 0.6 && handStrength > 0.30 && actions[ACTIONS.RAISE]) {
                const probeSize = pot * 0.45;
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.floor(probeSize), actions[ACTIONS.RAISE].max)
                };
            }
            return { action: ACTIONS.CHECK };
        }
        
        // 弱牌但小额跟注
        if (toCall <= bigBlind * 3 && actions[ACTIONS.CALL]) {
            return { action: ACTIONS.CALL };
        }
        
        if (adjustedEquity > potOdds && actions[ACTIONS.CALL]) {
            return { action: ACTIONS.CALL };
        }
        
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        
        // 只有面对超大加注才弃牌
        if (toCall > pot * 0.8) {
            return { action: ACTIONS.FOLD };
        }
        
        if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 处理坚果牌 - 高级版，更多陷阱
     */
    handleNutsHandAdvanced(player, actions, factors, gameState) {
        const { positionStrength, phase, toCall } = factors;
        const { pot } = gameState;
        
        // 河牌阶段 - 最大化价值
        if (phase === GAME_PHASES.RIVER) {
            // 如果对手已经下注，考虑超额加注
            if (toCall > 0 && actions[ACTIONS.RAISE]) {
                const overbet = Math.floor(pot * 1.2 + toCall);
                console.log(`[AI ${player.name}] 河牌坚果牌，超额加注`);
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(overbet, actions[ACTIONS.RAISE].max)
                };
            }
            // 河牌无人下注，大额价值下注
            if (actions[ACTIONS.RAISE]) {
                const valueBet = Math.floor(pot * 0.85);
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.max(valueBet, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max)
                };
            }
        }
        
        // 翻牌/转牌 - 偶尔慢打
        if (Math.random() < 0.3) {
            // 30%概率慢打
            if (toCall > 0 && actions[ACTIONS.CALL]) {
                console.log(`[AI ${player.name}] 坚果牌慢打，跟注`);
                return { action: ACTIONS.CALL };
            }
            if (actions[ACTIONS.CHECK]) {
                console.log(`[AI ${player.name}] 坚果牌慢打，过牌`);
                return { action: ACTIONS.CHECK };
            }
        }
        
        // 标准价值加注
        if (actions[ACTIONS.RAISE]) {
            const betMultiplier = 0.6 + Math.random() * 0.2;
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

    // =====================================================
    // 数学家模式 - 完全基于概率和EV计算的决策系统
    // =====================================================

    /**
     * 数学家型AI决策 - 完全基于数学概率
     * 核心公式：EV = (Equity × Pot) - ((1 - Equity) × Call)
     * 只在EV为正时行动
     */
    makeMathematicianDecision(player, actions, factors, gameState) {
        const { phase } = gameState;
        
        console.log(`[🧠 数学家] 开始计算...`);
        
        // 翻牌前使用起手牌概率表
        if (phase === GAME_PHASES.PREFLOP) {
            return this.mathPreflopDecision(player, actions, factors, gameState);
        }
        
        // 翻牌后使用精确EV计算
        return this.mathPostflopDecision(player, actions, factors, gameState);
    }

    /**
     * 数学家翻牌前决策
     * 基于起手牌胜率表和底池赔率
     */
    mathPreflopDecision(player, actions, factors, gameState) {
        const { toCall, positionStrength } = factors;
        const { bigBlind, pot, activePlayers } = gameState;
        
        const preflopScore = this.getPreflopScore(player.holeCards);
        
        // 计算起手牌对应的胜率（基于起手牌表）
        // AA = 85%, KK = 82%, QQ = 80%, AKs = 67%, etc.
        const preflopEquity = this.getPreflopEquity(preflopScore, activePlayers);
        
        console.log(`[🧠 数学家] 起手牌评分: ${preflopScore}/20, 预估胜率: ${(preflopEquity * 100).toFixed(1)}%`);
        
        // 计算底池赔率
        const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
        
        // EV计算: EV = equity × (pot + toCall) - (1 - equity) × toCall
        const callEV = this.calculatePreciseEV(preflopEquity, pot, toCall);
        
        console.log(`[🧠 数学家] Pot Odds: ${(potOdds * 100).toFixed(1)}%, Call EV: ${callEV.toFixed(2)}`);
        
        // 无需跟注的情况
        if (toCall === 0) {
            // 只有正EV的牌才开池加注
            const openRaiseEV = this.calculateOpenRaiseEV(preflopEquity, pot, bigBlind, activePlayers);
            
            if (openRaiseEV > this.config.evThreshold && preflopScore >= 8 && actions[ACTIONS.RAISE]) {
                // 数学最优加注尺寸: 2.5-3x BB
                const raiseSize = Math.floor(bigBlind * (2.5 + positionStrength * 0.5));
                console.log(`[🧠 数学家] 开池加注EV为正 (${openRaiseEV.toFixed(2)}), 加注 ${raiseSize}`);
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.max(raiseSize, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max)
                };
            }
            
            if (actions[ACTIONS.CHECK]) {
                console.log(`[🧠 数学家] 免费看牌，过牌`);
                return { action: ACTIONS.CHECK };
            }
        }
        
        // 面对加注：严格按照底池赔率
        if (this.config.potOddsStrict) {
            // 需要的胜率 = 跟注额 / (底池 + 跟注额)
            const requiredEquity = potOdds;
            
            if (preflopEquity >= requiredEquity * 1.1) { // 10%安全边际
                // 超强牌考虑3-bet
                if (preflopScore >= 16 && callEV > bigBlind * 3 && actions[ACTIONS.RAISE]) {
                    const threeBetSize = Math.floor(toCall * 3 + bigBlind);
                    console.log(`[🧠 数学家] 超强牌，3-bet 到 ${threeBetSize}`);
                    return { 
                        action: ACTIONS.RAISE, 
                        amount: Math.min(threeBetSize, actions[ACTIONS.RAISE].max)
                    };
                }
                
                if (actions[ACTIONS.CALL]) {
                    console.log(`[🧠 数学家] 胜率 ${(preflopEquity * 100).toFixed(1)}% > 需要 ${(requiredEquity * 100).toFixed(1)}%, 跟注`);
                    return { action: ACTIONS.CALL };
                }
            } else {
                console.log(`[🧠 数学家] 胜率 ${(preflopEquity * 100).toFixed(1)}% < 需要 ${(requiredEquity * 100).toFixed(1)}%, 弃牌`);
                if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
                return { action: ACTIONS.FOLD };
            }
        }
        
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 数学家翻牌后决策
     * 完全基于手牌强度、底池赔率和隐含赔率
     */
    mathPostflopDecision(player, actions, factors, gameState) {
        const { handStrength, potOdds, toCall, drawPotential, equity, spr, phase } = factors;
        const { pot, bigBlind, activePlayers } = gameState;
        
        // 计算精确权益（包含听牌）
        const totalEquity = Math.min(1, equity + drawPotential * this.getDrawMultiplier(phase));
        
        // 计算隐含赔率（深筹码时更重要）
        const impliedOdds = spr > 5 ? drawPotential * 0.3 : 0;
        const adjustedEquity = Math.min(1, totalEquity + impliedOdds);
        
        // 精确EV计算
        const callEV = this.calculatePreciseEV(adjustedEquity, pot, toCall);
        const foldEV = 0; // 弃牌EV总是0
        
        console.log(`[🧠 数学家] 权益: ${(adjustedEquity * 100).toFixed(1)}%, Pot Odds: ${(potOdds * 100).toFixed(1)}%, EV: ${callEV.toFixed(2)}`);
        
        // 无需跟注的情况 - 考虑价值下注
        if (toCall === 0) {
            const betEV = this.calculateBetEV(adjustedEquity, pot, bigBlind, activePlayers);
            
            if (betEV > this.config.evThreshold && actions[ACTIONS.RAISE]) {
                // 数学最优下注尺寸取决于权益
                const optimalBetSize = this.calculateMathOptimalBet(adjustedEquity, pot, phase);
                console.log(`[🧠 数学家] 下注EV为正 (${betEV.toFixed(2)}), 下注 ${optimalBetSize}`);
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.max(optimalBetSize, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max)
                };
            }
            
            console.log(`[🧠 数学家] 下注EV不足，过牌`);
            if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        }
        
        // 需要跟注的情况 - 严格EV决策
        if (callEV > this.config.evThreshold) {
            // EV为正，考虑加注还是跟注
            const raiseEV = this.calculateRaiseEV(adjustedEquity, pot, toCall, bigBlind);
            
            if (raiseEV > callEV && adjustedEquity > 0.55 && actions[ACTIONS.RAISE]) {
                // 加注EV更高
                const raiseSize = this.calculateMathOptimalRaise(adjustedEquity, pot, toCall);
                console.log(`[🧠 数学家] 加注EV (${raiseEV.toFixed(2)}) > 跟注EV (${callEV.toFixed(2)}), 加注 ${raiseSize}`);
                return { 
                    action: ACTIONS.RAISE, 
                    amount: Math.min(Math.max(raiseSize, actions[ACTIONS.RAISE].min), actions[ACTIONS.RAISE].max)
                };
            }
            
            console.log(`[🧠 数学家] 跟注EV为正 (${callEV.toFixed(2)}), 跟注`);
            if (actions[ACTIONS.CALL]) return { action: ACTIONS.CALL };
        }
        
        // EV为负
        console.log(`[🧠 数学家] EV为负 (${callEV.toFixed(2)}), 弃牌`);
        if (actions[ACTIONS.CHECK]) return { action: ACTIONS.CHECK };
        return { action: ACTIONS.FOLD };
    }

    /**
     * 获取起手牌预估胜率
     */
    getPreflopEquity(preflopScore, activePlayers) {
        // 基于起手牌评分估算对抗多个对手的胜率
        // 起手牌评分20分对应约85%胜率(单挑)，随对手数增加递减
        const baseEquity = 0.35 + (preflopScore / 20) * 0.5; // 35%-85%
        
        // 对手数量调整
        const opponentAdjust = Math.pow(0.88, activePlayers - 1);
        
        return Math.min(0.95, baseEquity * opponentAdjust);
    }

    /**
     * 计算精确EV
     * EV = Equity × (Pot + Call) - (1 - Equity) × Call
     * 简化为: EV = Equity × Pot + Equity × Call - Call + Equity × Call
     * = Equity × Pot - Call × (1 - Equity)
     */
    calculatePreciseEV(equity, pot, toCall) {
        if (toCall <= 0) return equity * pot;
        return (equity * (pot + toCall)) - toCall;
    }

    /**
     * 计算开池加注EV
     */
    calculateOpenRaiseEV(equity, pot, bigBlind, activePlayers) {
        // 假设对手有约30%的概率跟注
        const foldEquity = 0.6 - activePlayers * 0.05;
        const raiseSize = bigBlind * 2.5;
        
        // EV = 弃牌概率 × 底池 + 跟注概率 × (胜率 × 新底池 - 加注额)
        const callProb = 1 - foldEquity;
        const newPot = pot + raiseSize * 2;
        
        return foldEquity * pot + callProb * (equity * newPot - raiseSize);
    }

    /**
     * 计算下注EV
     */
    calculateBetEV(equity, pot, bigBlind, activePlayers) {
        // 简化模型：假设对手有一定概率弃牌
        const betSize = pot * 0.5; // 半池下注
        const foldEquity = 0.4; // 假设对手40%弃牌率
        
        // EV = 弃牌概率 × 底池 + 跟注概率 × (胜率 × 新底池 - 下注额)
        const callProb = 1 - foldEquity;
        const newPot = pot + betSize * 2;
        
        return foldEquity * pot + callProb * (equity * newPot - betSize);
    }

    /**
     * 计算加注EV
     */
    calculateRaiseEV(equity, pot, toCall, bigBlind) {
        const raiseSize = toCall * 2.5;
        const foldEquity = 0.35; // 假设对手35%弃牌率
        
        const callProb = 1 - foldEquity;
        const newPot = pot + toCall + raiseSize * 2;
        
        return foldEquity * (pot + toCall) + callProb * (equity * newPot - raiseSize);
    }

    /**
     * 计算数学最优下注大小
     * 基于权益和底池大小
     */
    calculateMathOptimalBet(equity, pot, phase) {
        // 权益越高，下注越大
        // 河牌阶段通常下注更大
        let betRatio;
        
        if (equity > 0.75) {
            // 超强牌：大额价值下注
            betRatio = 0.75 + Math.random() * 0.15;
        } else if (equity > 0.55) {
            // 强牌：中等价值下注
            betRatio = 0.5 + Math.random() * 0.15;
        } else if (equity > 0.35) {
            // 中等牌：小额下注或过牌
            betRatio = 0.33;
        } else {
            // 弱牌：诈唬或过牌
            betRatio = Math.random() < 0.18 ? 0.6 : 0;
        }
        
        if (phase === GAME_PHASES.RIVER) {
            betRatio *= 1.2; // 河牌下注大一些
        }
        
        return Math.floor(pot * betRatio);
    }

    /**
     * 计算数学最优加注大小
     */
    calculateMathOptimalRaise(equity, pot, toCall) {
        // 基于权益的最优加注
        // 权益高时加注大，权益低时加注小
        let raiseMultiplier;
        
        if (equity > 0.75) {
            raiseMultiplier = 3.5; // 强牌大加注
        } else if (equity > 0.55) {
            raiseMultiplier = 2.5; // 中强牌标准加注
        } else {
            raiseMultiplier = 2; // 最小加注
        }
        
        return Math.floor(toCall * raiseMultiplier + pot * 0.3);
    }

    /**
     * 获取听牌乘数（不同阶段听牌价值不同）
     */
    getDrawMultiplier(phase) {
        switch (phase) {
            case GAME_PHASES.FLOP:
                return 0.8; // 翻牌有两条街可以中
            case GAME_PHASES.TURN:
                return 0.45; // 转牌只有一条街
            case GAME_PHASES.RIVER:
                return 0; // 河牌没有听牌价值
            default:
                return 0;
        }
    }
}
