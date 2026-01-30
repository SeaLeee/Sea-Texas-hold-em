/**
 * GTO策略分析器 - 提供牌局分析和策略教学
 * GTO (Game Theory Optimal) 是博弈论最优策略
 */
class GTOAnalyzer {
    constructor() {
        // GTO策略知识库
        this.strategyDatabase = {
            preflop: this.getPreflopStrategies(),
            postflop: this.getPostflopStrategies(),
            concepts: this.getGTOConcepts()
        };
    }

    /**
     * 分析本轮牌局
     * @param {Object} handData - 本手牌数据
     * @returns {Object} 分析结果
     */
    analyzeHand(handData) {
        const {
            humanPlayer,
            holeCards,
            communityCards,
            actionHistory,
            result,
            pot,
            phase
        } = handData;

        const analysis = {
            summary: '',
            keyMoments: [],
            suggestions: [],
            concepts: [],
            rating: 0,  // 0-100 表现评分
            improvements: []
        };

        // 1. 分析起手牌选择
        const preflopAnalysis = this.analyzePreflopDecision(holeCards, actionHistory);
        analysis.keyMoments.push(preflopAnalysis);

        // 2. 分析关键决策点
        if (actionHistory && actionHistory.length > 0) {
            const criticalDecisions = this.findCriticalDecisions(actionHistory, communityCards);
            analysis.keyMoments.push(...criticalDecisions);
        }

        // 3. 分析最终结果
        const outcomeAnalysis = this.analyzeOutcome(result, holeCards, communityCards);
        analysis.summary = outcomeAnalysis.summary;
        analysis.rating = outcomeAnalysis.rating;

        // 4. 提供改进建议
        analysis.suggestions = this.generateSuggestions(analysis.keyMoments);

        // 5. 推荐相关GTO概念
        analysis.concepts = this.getRelevantConcepts(holeCards, communityCards, actionHistory);

        return analysis;
    }

    /**
     * 分析翻牌前决策
     */
    analyzePreflopDecision(holeCards, actionHistory) {
        if (!holeCards || holeCards.length < 2) {
            return {
                phase: 'preflop',
                title: '翻牌前',
                analysis: '无法分析',
                isOptimal: true
            };
        }

        const handKey = this.getHandKey(holeCards);
        const handStrength = this.evaluateHandStrength(handKey);
        const playerActions = actionHistory?.filter(a => a.isHuman && a.phase === 'preflop') || [];
        
        let analysis = '';
        let isOptimal = true;
        let suggestion = '';

        if (handStrength >= 8) {
            // 顶级牌
            analysis = `${handKey} 是顶级起手牌（前5%），应该积极加注建立底池`;
            const didRaise = playerActions.some(a => a.action === 'raise' || a.action === 'allin');
            if (!didRaise && playerActions.length > 0) {
                isOptimal = false;
                suggestion = '建议：顶级牌应该主动加注，不要慢打';
            }
        } else if (handStrength >= 6) {
            // 强牌
            analysis = `${handKey} 是强势手牌，适合在多数位置加注开池`;
            suggestion = '可以用来对抗单个加注者';
        } else if (handStrength >= 4) {
            // 中等牌
            analysis = `${handKey} 是可玩手牌，位置很重要`;
            suggestion = '在后位可以适当游戏，前位谨慎';
        } else {
            // 边缘/弱牌
            const didPlay = playerActions.some(a => a.action !== 'fold');
            analysis = `${handKey} 是边缘手牌`;
            if (didPlay) {
                suggestion = '这类牌在无人加注时可以尝试偷盲，但不宜过多投资';
            }
        }

        return {
            phase: 'preflop',
            title: '翻牌前分析',
            handKey,
            handStrength,
            analysis,
            suggestion,
            isOptimal,
            icon: handStrength >= 6 ? '💪' : handStrength >= 4 ? '🤔' : '⚠️'
        };
    }

    /**
     * 查找关键决策点
     */
    findCriticalDecisions(actionHistory, communityCards) {
        const decisions = [];
        
        if (!actionHistory) return decisions;

        const humanActions = actionHistory.filter(a => a.isHuman);
        
        for (const action of humanActions) {
            // 大额下注/加注决策
            if (action.action === 'raise' || action.action === 'allin') {
                decisions.push({
                    phase: action.phase,
                    title: `${this.getPhaseNameCN(action.phase)} - 加注决策`,
                    analysis: `你加注到 ${action.amount}`,
                    suggestion: this.getAggressionAdvice(action, communityCards),
                    icon: '🔥',
                    isOptimal: true
                });
            }
            
            // 弃牌决策
            if (action.action === 'fold') {
                decisions.push({
                    phase: action.phase,
                    title: `${this.getPhaseNameCN(action.phase)} - 弃牌`,
                    analysis: '你选择弃牌',
                    suggestion: this.getFoldAdvice(action),
                    icon: '🏳️',
                    isOptimal: true  // 弃牌通常是合理的
                });
            }
            
            // 跟注大额下注
            if (action.action === 'call' && action.amount > action.pot * 0.5) {
                decisions.push({
                    phase: action.phase,
                    title: `${this.getPhaseNameCN(action.phase)} - 大额跟注`,
                    analysis: `你跟注了 ${action.amount}（${Math.round(action.amount / action.pot * 100)}% 底池）`,
                    suggestion: this.getCallAdvice(action, communityCards),
                    icon: '💰',
                    isOptimal: true
                });
            }
        }

        return decisions;
    }

    /**
     * 分析最终结果
     */
    analyzeOutcome(result, holeCards, communityCards) {
        if (!result) {
            return { summary: '无法分析结果', rating: 50 };
        }

        const isWinner = result.winners?.some(w => w.player?.isHuman);
        const handKey = this.getHandKey(holeCards);
        let summary = '';
        let rating = 50;

        if (isWinner) {
            if (result.reason === 'fold') {
                summary = `✅ 你凭借 ${handKey} 成功让对手弃牌，赢得底池`;
                rating = 75;
            } else {
                const handDesc = result.winners[0]?.evaluation?.description || '最佳牌型';
                summary = `🏆 恭喜！你以 ${handDesc} 获胜`;
                rating = 85;
            }
        } else {
            if (result.reason === 'fold') {
                summary = `你弃牌了，这手牌结束`;
                rating = 50;  // 弃牌不扣分
            } else {
                summary = `这轮你没有获胜，继续加油`;
                rating = 40;
            }
        }

        return { summary, rating };
    }

    /**
     * 生成改进建议
     */
    generateSuggestions(keyMoments) {
        const suggestions = [];
        
        for (const moment of keyMoments) {
            if (moment.suggestion) {
                suggestions.push({
                    phase: moment.phase,
                    text: moment.suggestion,
                    priority: moment.isOptimal ? 'low' : 'high'
                });
            }
        }

        // 添加通用建议
        if (suggestions.length === 0) {
            suggestions.push({
                phase: 'general',
                text: '保持耐心，等待好牌时再投入更多筹码',
                priority: 'medium'
            });
        }

        return suggestions;
    }

    /**
     * 获取相关GTO概念
     */
    getRelevantConcepts(holeCards, communityCards, actionHistory) {
        const concepts = [];
        const allConcepts = this.strategyDatabase.concepts;

        // 根据牌局情况推荐概念
        if (holeCards && holeCards.length === 2) {
            const isPair = holeCards[0].rank === holeCards[1].rank;
            const isSuited = holeCards[0].suit === holeCards[1].suit;
            const isConnector = Math.abs(
                this.getRankValue(holeCards[0].rank) - 
                this.getRankValue(holeCards[1].rank)
            ) <= 2;

            if (isPair) {
                concepts.push(allConcepts.find(c => c.id === 'setMining'));
            }
            if (isSuited) {
                concepts.push(allConcepts.find(c => c.id === 'suitedConnectors'));
            }
            if (isConnector) {
                concepts.push(allConcepts.find(c => c.id === 'positionPlay'));
            }
        }

        // 添加基础概念
        concepts.push(allConcepts.find(c => c.id === 'potOdds'));
        
        return concepts.filter(c => c);  // 过滤掉undefined
    }

    /**
     * 获取手牌key (如 "AKs", "JTo", "22")
     */
    getHandKey(holeCards) {
        if (!holeCards || holeCards.length < 2) return '';
        
        const ranks = [holeCards[0].rank, holeCards[1].rank];
        const rankValues = ranks.map(r => this.getRankValue(r));
        
        // 确保高牌在前
        if (rankValues[0] < rankValues[1]) {
            ranks.reverse();
        }
        
        const isSuited = holeCards[0].suit === holeCards[1].suit;
        const isPair = ranks[0] === ranks[1];
        
        const r1 = this.getRankSymbol(ranks[0]);
        const r2 = this.getRankSymbol(ranks[1]);
        
        if (isPair) {
            return `${r1}${r2}`;
        }
        return `${r1}${r2}${isSuited ? 's' : 'o'}`;
    }

    /**
     * 评估手牌强度 (1-10)
     */
    evaluateHandStrength(handKey) {
        const premiumHands = ['AA', 'KK', 'QQ', 'AKs', 'AKo'];
        const strongHands = ['JJ', 'TT', 'AQs', 'AQo', 'AJs', 'KQs'];
        const mediumHands = ['99', '88', '77', 'ATs', 'AJo', 'KJs', 'QJs', 'JTs'];
        const playableHands = ['66', '55', 'A9s', 'A8s', 'KTs', 'QTs', 'J9s', 'T9s', '98s'];

        if (premiumHands.includes(handKey)) return 9 + Math.random();
        if (strongHands.includes(handKey)) return 7 + Math.random();
        if (mediumHands.includes(handKey)) return 5 + Math.random();
        if (playableHands.includes(handKey)) return 4 + Math.random();
        
        // 检查是否同花或对子
        if (handKey.includes('s')) return 3 + Math.random();
        if (handKey.length === 2) return 3 + Math.random();  // 对子
        
        return 2 + Math.random();
    }

    /**
     * 获取阶段中文名
     */
    getPhaseNameCN(phase) {
        const names = {
            'preflop': '翻牌前',
            'flop': '翻牌',
            'turn': '转牌',
            'river': '河牌'
        };
        return names[phase] || phase;
    }

    /**
     * 加注建议
     */
    getAggressionAdvice(action, communityCards) {
        const advices = [
            '主动加注可以给对手施加压力，迫使弱牌弃牌',
            '加注同时有两种赢法：对手弃牌或摊牌获胜',
            '合适的加注尺寸通常是底池的50%-100%',
            '持续下注可以保护你的范围，让对手难以读牌'
        ];
        return advices[Math.floor(Math.random() * advices.length)];
    }

    /**
     * 弃牌建议
     */
    getFoldAdvice(action) {
        const advices = [
            '适时弃牌是德州扑克最重要的技能之一',
            '不要为沉没成本买单，果断放弃弱牌',
            '好的玩家知道什么时候该放手',
            '弃牌后可以观察对手的打法，收集信息'
        ];
        return advices[Math.floor(Math.random() * advices.length)];
    }

    /**
     * 跟注建议
     */
    getCallAdvice(action, communityCards) {
        const advices = [
            '大额跟注需要足够的底池赔率支持',
            '考虑隐含赔率：如果成牌后能赢更多，跟注更有价值',
            '不要只看当前牌力，还要考虑你的听牌潜力',
            '如果对手范围很窄，你需要更强的牌才能跟注'
        ];
        return advices[Math.floor(Math.random() * advices.length)];
    }

    /**
     * 获取牌面值
     */
    getRankValue(rank) {
        const values = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
            '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return values[rank] || 0;
    }

    /**
     * 获取牌面符号
     */
    getRankSymbol(rank) {
        if (rank === '10') return 'T';
        return rank;
    }

    /**
     * 翻牌前策略库
     */
    getPreflopStrategies() {
        return {
            openRaise: {
                utg: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'],
                mp: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'KQs'],
                co: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'KQs', 'KQo', 'KJs', 'QJs', 'JTs'],
                btn: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'A9s', 'A8s', 'KQs', 'KQo', 'KJs', 'KJo', 'KTs', 'QJs', 'QJo', 'QTs', 'JTs', 'J9s', 'T9s', '98s']
            },
            threeBet: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs'],
            call3Bet: ['TT', '99', '88', 'AQo', 'AJs', 'ATs', 'KQs']
        };
    }

    /**
     * 翻牌后策略库
     */
    getPostflopStrategies() {
        return {
            cbetFreq: 0.65,  // 持续下注频率
            cbetSize: {
                dry: 0.33,   // 干燥牌面33%底池
                wet: 0.66    // 湿润牌面66%底池
            },
            checkRaise: {
                value: 0.15,  // 价值下注加注率
                bluff: 0.08   // 诈唬加注率
            }
        };
    }

    /**
     * GTO概念库
     */
    getGTOConcepts() {
        return [
            {
                id: 'potOdds',
                name: '底池赔率',
                icon: '🎯',
                description: '底池赔率是指你需要跟注的金额与底池大小的比率。如果你的胜率高于底池赔率，跟注就是+EV的。',
                example: '底池100，对手下注50，你需要跟注50赢150，赔率是50:150=1:3，需要25%以上胜率'
            },
            {
                id: 'positionPlay',
                name: '位置优势',
                icon: '📍',
                description: '后位（按钮位）可以最后行动，获取最多信息，是德州扑克最重要的优势之一。',
                example: '在按钮位可以玩更多起手牌，看到对手行动后再做决定'
            },
            {
                id: 'setMining',
                name: '挖矿打法',
                icon: '⛏️',
                description: '用小对子便宜地看翻牌，希望中三条。需要足够的隐含赔率（对手筹码深度）。',
                example: '拿着66跟注翻牌前加注，翻牌出6就中了三条，可能赢大底池'
            },
            {
                id: 'suitedConnectors',
                name: '同花连张',
                icon: '🎴',
                description: '同花连张（如78s）可以做成顺子或同花，有很强的多路成牌潜力。',
                example: '87s可以做成45678顺子，也可能做成同花，还能中两对或三条'
            },
            {
                id: 'bluffToBetRatio',
                name: '诈唬比例',
                icon: '🎭',
                description: 'GTO策略要求你的下注范围包含适当比例的诈唬，否则对手可以轻松跟注你所有价值牌。',
                example: '如果你只在有牌时下注，对手可以把你读透；加入诈唬让对手猜不透'
            },
            {
                id: 'impliedOdds',
                name: '隐含赔率',
                icon: '💎',
                description: '隐含赔率考虑的是如果你成牌，之后还能从对手那里赢得多少筹码。',
                example: '听同花时当前赔率不够，但如果对手筹码很深，成牌后能赢更多'
            }
        ];
    }
}

// 创建全局实例
const gtoAnalyzer = new GTOAnalyzer();
