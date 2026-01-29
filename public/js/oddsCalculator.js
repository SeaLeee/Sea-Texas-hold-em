/**
 * 概率计算器和攻略建议系统
 */
class OddsCalculator {
    constructor() {
        // 起手牌强度评分表（基于Chen Formula改良版）
        this.preflopHandRanks = this.initPreflopRanks();
    }

    /**
     * 初始化翻牌前手牌强度表
     */
    initPreflopRanks() {
        // 评分：1-10分，10分最强
        return {
            // 顶级手牌 (9-10分)
            'AA': 10, 'KK': 10, 'QQ': 9.5, 'JJ': 9, 'AKs': 9.5, 'AKo': 9,
            // 强牌 (7-8.5分)
            'TT': 8.5, 'AQs': 8.5, 'AQo': 8, 'AJs': 8, 'KQs': 8,
            '99': 8, 'ATs': 7.5, 'KQo': 7.5, 'KJs': 7.5, 'QJs': 7.5,
            // 中等偏强 (6-7分)
            '88': 7, 'AJo': 7, 'KTs': 7, 'QTs': 7, 'JTs': 7,
            '77': 6.5, 'A9s': 6.5, 'KJo': 6.5, 'QJo': 6.5, 'T9s': 6.5,
            '66': 6, 'A8s': 6, 'K9s': 6, 'J9s': 6, '98s': 6,
            // 可玩手牌 (4-5.5分)
            '55': 5.5, 'A7s': 5.5, 'A6s': 5.5, 'A5s': 5.5, 'KTo': 5.5,
            '44': 5, 'A4s': 5, 'A3s': 5, 'A2s': 5, 'Q9s': 5, 'T8s': 5, '87s': 5,
            '33': 4.5, 'K8s': 4.5, 'J8s': 4.5, '97s': 4.5, '76s': 4.5,
            '22': 4, 'K7s': 4, 'Q8s': 4, '86s': 4, '65s': 4, '54s': 4,
            // 边缘手牌 (2-3.5分)
            'ATo': 3.5, 'K6s': 3.5, 'J7s': 3.5, '96s': 3.5, '75s': 3.5,
            'K5s': 3, 'Q7s': 3, 'T7s': 3, '85s': 3, '64s': 3, '53s': 3,
            // 弱牌 (0-2分)
            'K4s': 2, 'K3s': 2, 'K2s': 2, 'Q6s': 2, 'Q5s': 2, 'Q4s': 2,
            'default': 1.5 // 其他手牌
        };
    }

    /**
     * 将两张牌转换为手牌标识
     */
    getHandKey(card1, card2) {
        const rank1 = this.getRankChar(card1.rank);
        const rank2 = this.getRankChar(card2.rank);
        const suited = card1.suit.name === card2.suit.name ? 's' : 'o';
        
        // 确保高牌在前
        const ranks = [card1.rank, card2.rank].sort((a, b) => b - a);
        const r1 = this.getRankChar(ranks[0]);
        const r2 = this.getRankChar(ranks[1]);
        
        if (r1 === r2) {
            return r1 + r2; // 对子
        }
        return r1 + r2 + suited;
    }

    /**
     * 获取牌点字符
     */
    getRankChar(rank) {
        const chars = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T' };
        return chars[rank] || rank.toString();
    }

    /**
     * 计算翻牌前的胜率估算
     */
    calculatePreflopOdds(holeCards, numOpponents) {
        if (holeCards.length !== 2) return null;
        
        const handKey = this.getHandKey(holeCards[0], holeCards[1]);
        const handStrength = this.preflopHandRanks[handKey] || this.preflopHandRanks['default'];
        
        // 基于手牌强度和对手数量估算胜率
        // 使用经验公式：胜率 ≈ (强度/10)^(对手数^0.5)
        const baseWinRate = handStrength / 10;
        const adjustedWinRate = Math.pow(baseWinRate, Math.pow(numOpponents, 0.4));
        
        return {
            handKey: handKey,
            handStrength: handStrength,
            winProbability: Math.round(adjustedWinRate * 100),
            handCategory: this.categorizeHand(handStrength)
        };
    }

    /**
     * 分类手牌强度
     */
    categorizeHand(strength) {
        if (strength >= 9) return { level: '顶级', color: '#ffd700', description: '极强手牌，可以激进游戏' };
        if (strength >= 7) return { level: '强牌', color: '#4caf50', description: '强手牌，适合主动下注' };
        if (strength >= 5) return { level: '中等', color: '#2196f3', description: '可玩手牌，需要谨慎' };
        if (strength >= 3) return { level: '边缘', color: '#ff9800', description: '边缘牌，位置好可尝试' };
        return { level: '弱牌', color: '#f44336', description: '弱牌，建议弃牌' };
    }

    /**
     * 计算翻牌后的牌型概率和胜率
     */
    calculatePostflopOdds(holeCards, communityCards, numOpponents) {
        const allCards = [...holeCards, ...communityCards];
        
        // 评估当前手牌
        const currentEval = HandEvaluator.evaluate(holeCards, communityCards);
        
        // 计算听牌概率（如果还有公共牌要发）
        const draws = this.calculateDraws(holeCards, communityCards);
        
        // 估算胜率
        const winProbability = this.estimateWinProbability(currentEval, draws, communityCards.length, numOpponents);
        
        return {
            currentHand: currentEval,
            draws: draws,
            winProbability: winProbability,
            handStrength: this.getHandStrengthLevel(currentEval.rank)
        };
    }

    /**
     * 计算听牌（顺子听牌、同花听牌等）
     */
    calculateDraws(holeCards, communityCards) {
        const allCards = [...holeCards, ...communityCards];
        const draws = {
            flushDraw: false,
            flushOuts: 0,
            straightDraw: false,
            straightOuts: 0,
            setDraw: false,
            totalOuts: 0
        };

        if (communityCards.length >= 5) {
            return draws; // 河牌阶段，无需计算听牌
        }

        // 检查同花听牌
        const suitCounts = {};
        allCards.forEach(card => {
            suitCounts[card.suit.name] = (suitCounts[card.suit.name] || 0) + 1;
        });
        
        for (const suit in suitCounts) {
            if (suitCounts[suit] === 4) {
                draws.flushDraw = true;
                draws.flushOuts = 9; // 剩余9张同花
            }
        }

        // 检查顺子听牌
        const ranks = [...new Set(allCards.map(c => c.rank))].sort((a, b) => a - b);
        
        // 检查两端顺子听牌（OESD）和卡顺
        const straightOuts = this.countStraightOuts(ranks);
        if (straightOuts > 0) {
            draws.straightDraw = true;
            draws.straightOuts = straightOuts;
        }

        // 检查对子变三条
        const rankCounts = {};
        allCards.forEach(card => {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        });
        
        for (const rank in rankCounts) {
            if (rankCounts[rank] === 2) {
                draws.setDraw = true;
                break;
            }
        }

        // 计算总outs（去除重复）
        draws.totalOuts = draws.flushOuts + draws.straightOuts;
        if (draws.flushDraw && draws.straightDraw) {
            draws.totalOuts -= 2; // 约有2张牌既是同花又是顺子
        }

        return draws;
    }

    /**
     * 计算顺子听牌的outs
     */
    countStraightOuts(ranks) {
        // 添加A作为1来检查A-2-3-4-5
        if (ranks.includes(14)) {
            ranks = [1, ...ranks];
        }

        let maxConsecutive = 0;
        let currentConsecutive = 1;
        let gaps = [];

        for (let i = 1; i < ranks.length; i++) {
            if (ranks[i] === ranks[i-1] + 1) {
                currentConsecutive++;
            } else if (ranks[i] === ranks[i-1] + 2) {
                // 有一个gap
                gaps.push(ranks[i-1] + 1);
                currentConsecutive++;
            } else {
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
                currentConsecutive = 1;
                gaps = [];
            }
        }
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);

        // 两端顺子听牌（4张连续）
        if (maxConsecutive >= 4) {
            return 8; // 两端各4张
        }
        // 卡顺（中间缺一张）
        if (gaps.length === 1 && maxConsecutive >= 4) {
            return 4; // 只有中间4张
        }

        return 0;
    }

    /**
     * 估算胜率
     */
    estimateWinProbability(currentEval, draws, communityCardCount, numOpponents) {
        // 基于当前牌型的基础胜率
        const baseStrength = currentEval.rank / 10;
        
        // 考虑听牌的潜在价值
        let drawBonus = 0;
        if (communityCardCount < 5) {
            const remainingCards = 5 - communityCardCount;
            // 每张out大约2%胜率（转牌）或4%胜率（翻牌到河牌）
            drawBonus = draws.totalOuts * (remainingCards === 2 ? 0.04 : 0.02);
        }

        // 调整对手数量影响
        let winProb = (baseStrength + drawBonus) * Math.pow(0.85, numOpponents - 1);
        
        // 确保在0-100范围内
        winProb = Math.max(0, Math.min(1, winProb));
        
        return Math.round(winProb * 100);
    }

    /**
     * 获取手牌强度等级
     */
    getHandStrengthLevel(handRank) {
        const levels = {
            10: { level: '皇家同花顺', color: '#ffd700', tier: 'S' },
            9: { level: '同花顺', color: '#ffd700', tier: 'S' },
            8: { level: '四条', color: '#e91e63', tier: 'A' },
            7: { level: '葫芦', color: '#9c27b0', tier: 'A' },
            6: { level: '同花', color: '#673ab7', tier: 'B' },
            5: { level: '顺子', color: '#3f51b5', tier: 'B' },
            4: { level: '三条', color: '#2196f3', tier: 'C' },
            3: { level: '两对', color: '#03a9f4', tier: 'C' },
            2: { level: '一对', color: '#00bcd4', tier: 'D' },
            1: { level: '高牌', color: '#607d8b', tier: 'E' }
        };
        return levels[handRank] || levels[1];
    }

    /**
     * 计算各种牌型出现的概率
     */
    calculateHandProbabilities(holeCards, communityCards) {
        const currentCardCount = holeCards.length + communityCards.length;
        const remainingCards = 7 - currentCardCount;
        
        if (remainingCards <= 0) {
            return null; // 所有牌已发
        }

        // 使用统计概率（简化版）
        const probabilities = {
            royalFlush: { name: '皇家同花顺', prob: 0.0001, achieved: false },
            straightFlush: { name: '同花顺', prob: 0.0015, achieved: false },
            fourOfAKind: { name: '四条', prob: 0.024, achieved: false },
            fullHouse: { name: '葫芦', prob: 0.14, achieved: false },
            flush: { name: '同花', prob: 0.20, achieved: false },
            straight: { name: '顺子', prob: 0.39, achieved: false },
            threeOfAKind: { name: '三条', prob: 2.1, achieved: false },
            twoPair: { name: '两对', prob: 4.75, achieved: false },
            onePair: { name: '一对', prob: 42.3, achieved: false },
            highCard: { name: '高牌', prob: 50.1, achieved: false }
        };

        // 检查当前已有的牌型
        if (communityCards.length > 0) {
            const currentEval = HandEvaluator.evaluate(holeCards, communityCards);
            switch(currentEval.rank) {
                case 10: probabilities.royalFlush.achieved = true; break;
                case 9: probabilities.straightFlush.achieved = true; break;
                case 8: probabilities.fourOfAKind.achieved = true; break;
                case 7: probabilities.fullHouse.achieved = true; break;
                case 6: probabilities.flush.achieved = true; break;
                case 5: probabilities.straight.achieved = true; break;
                case 4: probabilities.threeOfAKind.achieved = true; break;
                case 3: probabilities.twoPair.achieved = true; break;
                case 2: probabilities.onePair.achieved = true; break;
            }
        }

        // 根据听牌调整概率
        const draws = this.calculateDraws(holeCards, communityCards);
        if (draws.flushDraw) {
            probabilities.flush.prob = remainingCards === 2 ? 35 : 19;
        }
        if (draws.straightDraw) {
            const isOESD = draws.straightOuts >= 8;
            probabilities.straight.prob = remainingCards === 2 ? 
                (isOESD ? 31.5 : 16.5) : (isOESD ? 17 : 8.5);
        }

        return probabilities;
    }

    /**
     * 生成策略建议
     */
    generateStrategyAdvice(gameState, holeCards, communityCards) {
        const phase = gameState.phase;
        const pot = gameState.pot;
        const currentBet = gameState.currentBet;
        const playerChips = gameState.humanPlayer?.chips || 0;
        const numOpponents = gameState.activePlayers - 1;
        const position = gameState.humanPlayer?.position || 'middle';
        
        let advice = {
            action: '',
            reason: '',
            confidence: 0,
            details: []
        };

        // 翻牌前策略
        if (phase === GAME_PHASES.PREFLOP) {
            const preflopOdds = this.calculatePreflopOdds(holeCards, numOpponents);
            advice = this.getPreflopAdvice(preflopOdds, currentBet, playerChips, position, pot);
        } 
        // 翻牌后策略
        else if (communityCards.length > 0) {
            const postflopOdds = this.calculatePostflopOdds(holeCards, communityCards, numOpponents);
            advice = this.getPostflopAdvice(postflopOdds, currentBet, playerChips, pot, phase);
        }

        return advice;
    }

    /**
     * 翻牌前建议
     */
    getPreflopAdvice(odds, currentBet, chips, position, pot) {
        const strength = odds.handStrength;
        const category = odds.handCategory;
        const callCost = currentBet;
        const potOdds = callCost > 0 ? pot / callCost : 0;

        let advice = {
            action: '',
            reason: '',
            confidence: 0,
            details: []
        };

        // 顶级牌 (9-10分)
        if (strength >= 9) {
            advice.action = '加注/再加注';
            advice.reason = `你有${category.level}手牌（${odds.handKey}），应该积极建立底池`;
            advice.confidence = 95;
            advice.details = [
                '这是前5%的起手牌',
                '建议加注3-4倍大盲',
                '如果有人再加注，可以考虑4-bet'
            ];
        }
        // 强牌 (7-8.5分)
        else if (strength >= 7) {
            advice.action = currentBet > 0 ? '跟注/加注' : '加注';
            advice.reason = `${odds.handKey}是强势手牌，${position === 'late' ? '在后位更有优势' : '标准打法是加注'}`;
            advice.confidence = 80;
            advice.details = [
                '这是前15%的起手牌',
                '可以用来开池加注',
                '面对加注可以跟注，看情况再加注'
            ];
        }
        // 中等牌 (5-6.5分)
        else if (strength >= 5) {
            if (position === 'late' || currentBet === 0) {
                advice.action = currentBet > 0 ? '跟注' : '加注/过牌';
                advice.reason = `${odds.handKey}是可玩手牌，${position === 'late' ? '后位可以尝试' : '谨慎游戏'}`;
                advice.confidence = 60;
            } else {
                advice.action = '弃牌/谨慎跟注';
                advice.reason = `${odds.handKey}在前位相对较弱，面对加注要谨慎`;
                advice.confidence = 55;
            }
            advice.details = [
                '中等强度手牌',
                '位置很重要',
                '不要过度投资'
            ];
        }
        // 边缘和弱牌 (<5分)
        else {
            if (currentBet === 0 && position === 'late') {
                advice.action = '可以尝试偷盲';
                advice.reason = `${odds.handKey}较弱，但后位无人加注可尝试偷盲`;
                advice.confidence = 40;
            } else {
                advice.action = '弃牌';
                advice.reason = `${odds.handKey}是弱牌，长期来看弃牌是正确选择`;
                advice.confidence = 85;
            }
            advice.details = [
                '弱势起手牌',
                '不值得冒险',
                '等待更好的机会'
            ];
        }

        return advice;
    }

    /**
     * 翻牌后建议
     */
    getPostflopAdvice(odds, currentBet, chips, pot, phase) {
        const handRank = odds.currentHand.rank;
        const draws = odds.draws;
        const winProb = odds.winProbability;
        const potOdds = currentBet > 0 ? (currentBet / (pot + currentBet)) * 100 : 0;

        let advice = {
            action: '',
            reason: '',
            confidence: 0,
            details: []
        };

        // 极强牌型（葫芦以上）
        if (handRank >= 7) {
            advice.action = '价值下注/加注';
            advice.reason = `你有${odds.handStrength.level}！应该积极建立底池获取价值`;
            advice.confidence = 95;
            advice.details = [
                '这是极强牌型',
                '下注2/3到满池',
                '考虑慢打诱导对手'
            ];
        }
        // 强牌型（顺子、同花）
        else if (handRank >= 5) {
            advice.action = '下注/加注';
            advice.reason = `${odds.handStrength.level}是强牌，应该保护并获取价值`;
            advice.confidence = 85;
            advice.details = [
                '注意听牌可能',
                '下注1/2到2/3底池',
                '面对加注要谨慎评估'
            ];
        }
        // 中等牌型（三条、两对）
        else if (handRank >= 3) {
            if (currentBet === 0) {
                advice.action = '下注';
                advice.reason = `${odds.handStrength.level}值得下注获取价值`;
                advice.confidence = 70;
            } else {
                advice.action = potOdds < winProb ? '跟注' : '考虑弃牌';
                advice.reason = `底池赔率${potOdds.toFixed(1)}% vs 胜率${winProb}%`;
                advice.confidence = 65;
            }
            advice.details = [
                `当前胜率约${winProb}%`,
                `底池赔率${potOdds.toFixed(1)}%`,
                winProb > potOdds ? '赔率有利' : '赔率不利'
            ];
        }
        // 一对
        else if (handRank === 2) {
            if (draws.flushDraw || draws.straightDraw) {
                advice.action = potOdds < draws.totalOuts * 2 ? '跟注（半诈唬）' : '弃牌';
                advice.reason = `一对+听牌，有${draws.totalOuts}张outs`;
                advice.confidence = 60;
            } else {
                advice.action = currentBet > pot * 0.3 ? '考虑弃牌' : '谨慎跟注';
                advice.reason = '一对在多人底池中较弱';
                advice.confidence = 55;
            }
            advice.details = [
                `${draws.totalOuts}张补牌`,
                `胜率约${winProb}%`,
                '注意对手的betting pattern'
            ];
        }
        // 高牌或听牌
        else {
            if (draws.flushDraw || draws.straightDraw) {
                const impliedOdds = draws.totalOuts * 2; // 2:1法则
                if (potOdds < impliedOdds) {
                    advice.action = '跟注（追听牌）';
                    advice.reason = `有${draws.totalOuts}张outs，隐含赔率足够`;
                    advice.confidence = 55;
                } else {
                    advice.action = '弃牌';
                    advice.reason = '赔率不足以追听牌';
                    advice.confidence = 70;
                }
                advice.details = [
                    draws.flushDraw ? '同花听牌' : '',
                    draws.straightDraw ? '顺子听牌' : '',
                    `需要${(1 / (draws.totalOuts * 2 / 100)).toFixed(1)}:1赔率`
                ].filter(d => d);
            } else {
                advice.action = currentBet > 0 ? '弃牌' : '过牌';
                advice.reason = '没有成牌也没有听牌，放弃这手牌';
                advice.confidence = 85;
                advice.details = ['认输是明智的选择', '等待更好的机会'];
            }
        }

        return advice;
    }

    /**
     * 统一的赔率计算接口
     * @param {Card[]} holeCards - 手牌
     * @param {Card[]} communityCards - 公共牌
     * @param {number} numOpponents - 对手数量
     * @returns {Object} 赔率信息
     */
    calculateOdds(holeCards, communityCards, numOpponents) {
        if (!holeCards || holeCards.length < 2) {
            return {
                winProbability: 0,
                handStrength: 0,
                handKey: '--',
                currentHand: '等待发牌',
                handRank: 0,
                draws: []
            };
        }
        
        // 翻牌前
        if (!communityCards || communityCards.length === 0) {
            const preflopOdds = this.calculatePreflopOdds(holeCards, numOpponents);
            return {
                winProbability: preflopOdds.winProbability,
                handStrength: preflopOdds.handStrength * 10,
                handKey: preflopOdds.handKey,
                currentHand: preflopOdds.handCategory.level + ' - ' + preflopOdds.handCategory.description,
                handRank: 0,
                draws: []
            };
        }
        
        // 翻牌后
        const postflopOdds = this.calculatePostflopOdds(holeCards, communityCards, numOpponents);
        const draws = [];
        
        if (postflopOdds.draws.flushDraw) {
            draws.push({
                name: '同花听牌',
                outs: postflopOdds.draws.flushOuts,
                probability: Math.round(postflopOdds.draws.flushOuts * 2)
            });
        }
        if (postflopOdds.draws.straightDraw) {
            draws.push({
                name: '顺子听牌',
                outs: postflopOdds.draws.straightOuts,
                probability: Math.round(postflopOdds.draws.straightOuts * 2)
            });
        }
        
        return {
            winProbability: postflopOdds.winProbability,
            handStrength: postflopOdds.handStrength.tier === 'S' ? 100 :
                          postflopOdds.handStrength.tier === 'A' ? 85 :
                          postflopOdds.handStrength.tier === 'B' ? 70 :
                          postflopOdds.handStrength.tier === 'C' ? 55 :
                          postflopOdds.handStrength.tier === 'D' ? 35 : 20,
            handKey: this.getHandKey(holeCards[0], holeCards[1]),
            currentHand: postflopOdds.currentHand?.description || postflopOdds.handStrength.level,
            handRank: postflopOdds.currentHand?.rank || 0,
            draws: draws
        };
    }
    
    /**
     * 统一的建议接口
     * @param {Card[]} holeCards - 手牌
     * @param {Card[]} communityCards - 公共牌
     * @param {number} pot - 底池
     * @param {number} toCall - 需要跟注金额
     * @param {number} chips - 玩家筹码
     * @param {number} activePlayers - 活跃玩家数
     * @returns {Object} 建议信息
     */
    getAdvice(holeCards, communityCards, pot, toCall, chips, activePlayers) {
        if (!holeCards || holeCards.length < 2) {
            return {
                action: 'WAIT',
                confidence: 0,
                reason: '等待发牌...',
                details: []
            };
        }
        
        const numOpponents = Math.max(1, activePlayers - 1);
        const currentBet = toCall;
        
        // 根据阶段生成建议
        const phase = (!communityCards || communityCards.length === 0) ? GAME_PHASES.PREFLOP :
                      communityCards.length === 3 ? GAME_PHASES.FLOP :
                      communityCards.length === 4 ? GAME_PHASES.TURN : GAME_PHASES.RIVER;
        
        const gameState = {
            phase: phase,
            pot: pot,
            currentBet: currentBet,
            humanPlayer: { chips: chips, position: 'middle' },
            activePlayers: activePlayers
        };
        
        const advice = this.generateStrategyAdvice(gameState, holeCards, communityCards);
        
        // 转换 action 格式
        const actionMap = {
            '加注': 'RAISE',
            '加注/再加注': 'RAISE',
            '跟注': 'CALL',
            '跟注/加注': 'CALL',
            '过牌': 'CHECK',
            '弃牌': 'FOLD',
            '下注': 'RAISE',
            '价值下注/加注': 'RAISE',
            '下注/加注': 'RAISE',
            '可以尝试偷盲': 'RAISE',
            '弃牌/谨慎跟注': 'FOLD',
            '谨慎跟注': 'CALL',
            '跟注（追听牌）': 'CALL',
            '跟注（半诈唬）': 'CALL',
            '考虑弃牌': 'FOLD',
            '加注/过牌': chips > currentBet ? 'RAISE' : 'CHECK'
        };
        
        return {
            action: actionMap[advice.action] || 'CHECK',
            confidence: advice.confidence,
            reason: advice.reason,
            details: advice.details
        };
    }

    /**
     * 获取完整的分析报告
     */
    getFullAnalysis(gameState) {
        const humanPlayer = gameState.players.find(p => p.isHuman);
        if (!humanPlayer || humanPlayer.holeCards.length < 2) {
            return null;
        }

        const holeCards = humanPlayer.holeCards;
        const communityCards = gameState.communityCards || [];
        const numOpponents = gameState.players.filter(p => p.canAct() && !p.isHuman).length;

        let analysis = {
            phase: gameState.phase,
            phaseName: PHASE_NAMES[gameState.phase],
            odds: null,
            probabilities: null,
            advice: null,
            potInfo: {
                pot: gameState.pot,
                currentBet: gameState.currentBet,
                toCall: gameState.currentBet - (humanPlayer.currentBet || 0),
                potOdds: 0
            }
        };

        // 计算底池赔率
        if (analysis.potInfo.toCall > 0) {
            analysis.potInfo.potOdds = (analysis.potInfo.toCall / (gameState.pot + analysis.potInfo.toCall) * 100).toFixed(1);
        }

        // 翻牌前分析
        if (gameState.phase === GAME_PHASES.PREFLOP) {
            analysis.odds = this.calculatePreflopOdds(holeCards, numOpponents);
        } else {
            analysis.odds = this.calculatePostflopOdds(holeCards, communityCards, numOpponents);
        }

        // 牌型概率
        analysis.probabilities = this.calculateHandProbabilities(holeCards, communityCards);

        // 策略建议
        const adviceState = {
            phase: gameState.phase,
            pot: gameState.pot,
            currentBet: gameState.currentBet,
            humanPlayer: humanPlayer,
            activePlayers: gameState.players.filter(p => p.canAct()).length
        };
        analysis.advice = this.generateStrategyAdvice(adviceState, holeCards, communityCards);

        return analysis;
    }
}

// 创建全局实例
const oddsCalculator = new OddsCalculator();
