/**
 * 德州扑克牌型判断器
 */
class HandEvaluator {
    /**
     * 评估最佳5张牌组合
     * @param {Card[]} holeCards - 2张底牌
     * @param {Card[]} communityCards - 公共牌（3-5张）
     * @returns {Object} - 包含牌型等级、名称、最佳5张牌和比较值
     */
    static evaluate(holeCards, communityCards) {
        // 合并所有可用的牌
        const allCards = [...holeCards, ...communityCards];
        
        if (allCards.length < 5) {
            return null;
        }

        // 生成所有5张牌的组合
        const combinations = this.getCombinations(allCards, 5);
        
        let bestHand = null;
        let bestScore = -1;

        // 评估每个组合，找出最佳牌型
        for (const combo of combinations) {
            const result = this.evaluateFiveCards(combo);
            if (result.score > bestScore) {
                bestScore = result.score;
                bestHand = result;
            }
        }

        return bestHand;
    }

    /**
     * 评估5张牌的牌型
     * @param {Card[]} cards - 5张牌
     * @returns {Object}
     */
    static evaluateFiveCards(cards) {
        // 按点数排序（降序）
        const sorted = [...cards].sort((a, b) => b.rank - a.rank);
        
        // 检查各种牌型
        const isFlush = this.isFlush(sorted);
        const straightHighCard = this.getStraightHighCard(sorted);
        const isStraight = straightHighCard > 0;
        const groups = this.getGroups(sorted);

        // 皇家同花顺
        if (isFlush && isStraight && straightHighCard === 14) {
            return {
                handRank: HAND_RANKS.ROYAL_FLUSH,
                score: this.calculateScore(10, [14]),
                cards: sorted,
                name: HAND_RANKS.ROYAL_FLUSH.name,
                description: '皇家同花顺'
            };
        }

        // 同花顺
        if (isFlush && isStraight) {
            return {
                handRank: HAND_RANKS.STRAIGHT_FLUSH,
                score: this.calculateScore(9, [straightHighCard]),
                cards: sorted,
                name: HAND_RANKS.STRAIGHT_FLUSH.name,
                description: `${RANKS[straightHighCard].display}高同花顺`
            };
        }

        // 四条
        if (groups.four) {
            const kickers = sorted.filter(c => c.rank !== groups.four).map(c => c.rank);
            return {
                handRank: HAND_RANKS.FOUR_OF_A_KIND,
                score: this.calculateScore(8, [groups.four, ...kickers]),
                cards: sorted,
                name: HAND_RANKS.FOUR_OF_A_KIND.name,
                description: `四条${RANKS[groups.four].display}`
            };
        }

        // 葫芦
        if (groups.three && groups.pairs.length > 0) {
            return {
                handRank: HAND_RANKS.FULL_HOUSE,
                score: this.calculateScore(7, [groups.three, groups.pairs[0]]),
                cards: sorted,
                name: HAND_RANKS.FULL_HOUSE.name,
                description: `葫芦，${RANKS[groups.three].display}带${RANKS[groups.pairs[0]].display}`
            };
        }

        // 同花
        if (isFlush) {
            const ranks = sorted.map(c => c.rank);
            return {
                handRank: HAND_RANKS.FLUSH,
                score: this.calculateScore(6, ranks),
                cards: sorted,
                name: HAND_RANKS.FLUSH.name,
                description: `${sorted[0].suit.symbol}同花`
            };
        }

        // 顺子
        if (isStraight) {
            return {
                handRank: HAND_RANKS.STRAIGHT,
                score: this.calculateScore(5, [straightHighCard]),
                cards: sorted,
                name: HAND_RANKS.STRAIGHT.name,
                description: `${RANKS[straightHighCard].display}高顺子`
            };
        }

        // 三条
        if (groups.three) {
            const kickers = sorted.filter(c => c.rank !== groups.three).map(c => c.rank);
            return {
                handRank: HAND_RANKS.THREE_OF_A_KIND,
                score: this.calculateScore(4, [groups.three, ...kickers]),
                cards: sorted,
                name: HAND_RANKS.THREE_OF_A_KIND.name,
                description: `三条${RANKS[groups.three].display}`
            };
        }

        // 两对
        if (groups.pairs.length >= 2) {
            const kicker = sorted.find(c => !groups.pairs.includes(c.rank)).rank;
            return {
                handRank: HAND_RANKS.TWO_PAIR,
                score: this.calculateScore(3, [groups.pairs[0], groups.pairs[1], kicker]),
                cards: sorted,
                name: HAND_RANKS.TWO_PAIR.name,
                description: `两对，${RANKS[groups.pairs[0]].display}和${RANKS[groups.pairs[1]].display}`
            };
        }

        // 一对
        if (groups.pairs.length === 1) {
            const kickers = sorted.filter(c => c.rank !== groups.pairs[0]).map(c => c.rank);
            return {
                handRank: HAND_RANKS.ONE_PAIR,
                score: this.calculateScore(2, [groups.pairs[0], ...kickers]),
                cards: sorted,
                name: HAND_RANKS.ONE_PAIR.name,
                description: `一对${RANKS[groups.pairs[0]].display}`
            };
        }

        // 高牌
        const ranks = sorted.map(c => c.rank);
        return {
            handRank: HAND_RANKS.HIGH_CARD,
            score: this.calculateScore(1, ranks),
            cards: sorted,
            name: HAND_RANKS.HIGH_CARD.name,
            description: `高牌${RANKS[sorted[0].rank].display}`
        };
    }

    /**
     * 检查是否为同花
     * @param {Card[]} cards - 5张已排序的牌
     * @returns {boolean}
     */
    static isFlush(cards) {
        const suit = cards[0].suit.name;
        return cards.every(c => c.suit.name === suit);
    }

    /**
     * 获取顺子的最高牌点数
     * @param {Card[]} cards - 5张已排序的牌
     * @returns {number} - 顺子最高牌的点数，非顺子返回0
     */
    static getStraightHighCard(cards) {
        const ranks = cards.map(c => c.rank);
        
        // 检查普通顺子
        let isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (ranks[i] - ranks[i + 1] !== 1) {
                isStraight = false;
                break;
            }
        }
        if (isStraight) {
            return ranks[0];
        }

        // 检查A-2-3-4-5（最小顺子，A作为1）
        if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && 
            ranks[3] === 3 && ranks[4] === 2) {
            return 5;  // 5高顺子
        }

        return 0;
    }

    /**
     * 获取牌的分组信息
     * @param {Card[]} cards - 5张已排序的牌
     * @returns {Object}
     */
    static getGroups(cards) {
        const counts = {};
        for (const card of cards) {
            counts[card.rank] = (counts[card.rank] || 0) + 1;
        }

        const result = {
            four: null,
            three: null,
            pairs: []
        };

        for (const [rank, count] of Object.entries(counts)) {
            const r = parseInt(rank);
            if (count === 4) {
                result.four = r;
            } else if (count === 3) {
                result.three = r;
            } else if (count === 2) {
                result.pairs.push(r);
            }
        }

        // 对子按点数降序排列
        result.pairs.sort((a, b) => b - a);

        return result;
    }

    /**
     * 计算牌型分数（用于比较大小）
     * @param {number} handRank - 牌型等级 (1-10)
     * @param {number[]} values - 比较值数组
     * @returns {number}
     */
    static calculateScore(handRank, values) {
        // 使用大数字作为基数，确保牌型等级是最重要的
        let score = handRank * 100000000;
        
        // 每个比较值最多占用2位数字
        for (let i = 0; i < values.length && i < 5; i++) {
            score += values[i] * Math.pow(100, 4 - i);
        }
        
        return score;
    }

    /**
     * 生成组合
     * @param {Array} arr - 原数组
     * @param {number} k - 组合大小
     * @returns {Array[]}
     */
    static getCombinations(arr, k) {
        const result = [];
        
        function combine(start, combo) {
            if (combo.length === k) {
                result.push([...combo]);
                return;
            }
            
            for (let i = start; i < arr.length; i++) {
                combo.push(arr[i]);
                combine(i + 1, combo);
                combo.pop();
            }
        }
        
        combine(0, []);
        return result;
    }

    /**
     * 比较两个牌型
     * @param {Object} hand1 - 第一个牌型评估结果
     * @param {Object} hand2 - 第二个牌型评估结果
     * @returns {number} - 正数表示hand1胜，负数表示hand2胜，0表示平局
     */
    static compareHands(hand1, hand2) {
        return hand1.score - hand2.score;
    }

    /**
     * 确定多个玩家中的赢家
     * @param {Array} players - 玩家数组，每个玩家需要有holeCards属性
     * @param {Card[]} communityCards - 公共牌
     * @returns {Object} - 包含赢家和他们的牌型信息
     */
    static determineWinners(players, communityCards) {
        const results = [];
        
        for (const player of players) {
            if (player.status === PLAYER_STATUS.FOLDED) {
                continue;
            }
            
            const evaluation = this.evaluate(player.holeCards, communityCards);
            results.push({
                player: player,
                evaluation: evaluation
            });
        }

        if (results.length === 0) {
            return { winners: [], isTie: false };
        }

        // 按分数排序
        results.sort((a, b) => b.evaluation.score - a.evaluation.score);

        // 找出所有赢家（可能平局）
        const highestScore = results[0].evaluation.score;
        const winners = results.filter(r => r.evaluation.score === highestScore);

        return {
            winners: winners,
            isTie: winners.length > 1,
            allResults: results
        };
    }
}
