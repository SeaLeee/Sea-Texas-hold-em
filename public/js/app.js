/**
 * 德州扑克游戏 - 主应用入口
 */
class TexasHoldemApp {
    constructor() {
        this.game = new GameManager();
        this.ui = new UI();
        this.currentSettings = null;
        this.buyInAmount = 0;  // 记录买入金额用于计算盈亏
    }

    /**
     * 初始化应用
     */
    init() {
        // 设置UI回调
        this.ui.initEventListeners({
            onStartGame: (settings) => this.startGame(settings),
            onPlayerAction: (action, amount) => this.handlePlayerAction(action, amount),
            onNextRound: () => this.startNextRound(),
            onRestart: () => this.restartGame(),
            onBackToMenu: () => this.backToMenu(),
            onSettle: () => this.settleGame()
        });

        // 设置游戏回调
        this.game.onStateChange = (state) => this.ui.updateGameUI(state);
        this.game.onPlayerAction = (player, action, amount) => {
            this.logPlayerAction(player, action, amount);
            // 显示NPC行动反馈气泡（非人类玩家）
            if (!player.isHuman) {
                this.ui.showActionFeedback(player, action, amount);
            }
        };
        this.game.onRoundEnd = (result) => this.handleRoundEnd(result);
        this.game.onGameEnd = (result) => this.handleGameEnd(result);
        this.game.onAIThinking = (player, isThinking) => this.ui.showAIThinking(player, isThinking);

        // 初始化音效系统（需要用户交互触发）
        this.initSoundSystem();
        
        // 初始化资金池显示
        this.initBankrollDisplay();

        console.log('德州扑克游戏已初始化');
    }
    
    /**
     * 初始化资金池显示
     */
    initBankrollDisplay() {
        this.updateBankrollDisplay();
        
        // 绑定资金池详情按钮事件
        const detailBtn = document.getElementById('bankroll-detail-btn');
        if (detailBtn) {
            detailBtn.addEventListener('click', () => {
                this.showBankrollDetails();
            });
        }
    }
    
    /**
     * 更新资金池显示
     */
    updateBankrollDisplay() {
        const amountElement = document.getElementById('bankroll-amount');
        if (amountElement && typeof bankrollManager !== 'undefined') {
            const balance = bankrollManager.getBalance();
            amountElement.textContent = balance.toLocaleString('zh-CN');
        }
    }
    
    /**
     * 显示资金池详情
     */
    showBankrollDetails() {
        if (typeof bankrollManager === 'undefined') return;
        
        const stats = bankrollManager.getStatistics();
        const transactions = bankrollManager.getTransactionHistory(5);
        
        // 创建或获取详情弹窗
        let detailModal = document.getElementById('bankroll-detail-modal');
        if (!detailModal) {
            detailModal = document.createElement('div');
            detailModal.id = 'bankroll-detail-modal';
            detailModal.className = 'modal';
            document.body.appendChild(detailModal);
        }
        
        const transactionsHTML = transactions.length > 0 
            ? transactions.map(t => `
                <div class="transaction-item ${t.type}">
                    <span class="trans-desc">${t.description}</span>
                    <span class="trans-time">${new Date(t.timestamp).toLocaleString('zh-CN', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                </div>
            `).join('')
            : '<div class="no-transactions">暂无交易记录</div>';
        
        detailModal.innerHTML = `
            <div class="modal-content bankroll-detail-content">
                <span class="close-btn">&times;</span>
                <div class="bankroll-detail-header">
                    <span class="bankroll-detail-icon">💎</span>
                    <h2>我的资金</h2>
                </div>
                <div class="bankroll-stats">
                    <div class="stat-row main-balance">
                        <span class="stat-name">当前余额</span>
                        <span class="stat-value gold">${stats.balance.toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-name">总盈利</span>
                        <span class="stat-value green">+${stats.totalWinnings.toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-name">总亏损</span>
                        <span class="stat-value red">-${stats.totalLosses.toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-name">净盈亏</span>
                        <span class="stat-value ${stats.netProfit >= 0 ? 'green' : 'red'}">${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toLocaleString('zh-CN')}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-name">游戏场次</span>
                        <span class="stat-value">${stats.gamesPlayed}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-name">最大单笔盈利</span>
                        <span class="stat-value green">+${stats.biggestWin.toLocaleString('zh-CN')}</span>
                    </div>
                </div>
                <div class="transactions-section">
                    <h3>📜 最近交易</h3>
                    <div class="transactions-list">
                        ${transactionsHTML}
                    </div>
                </div>
                <div class="bankroll-actions">
                    <button class="bankroll-bonus-btn" id="claim-bonus-btn">🎁 领取每日奖励</button>
                </div>
            </div>
        `;
        
        // 绑定关闭事件
        detailModal.querySelector('.close-btn').addEventListener('click', () => {
            detailModal.classList.remove('active');
        });
        
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                detailModal.classList.remove('active');
            }
        });
        
        // 绑定领取奖励事件
        detailModal.querySelector('#claim-bonus-btn').addEventListener('click', () => {
            this.claimDailyBonus();
            detailModal.classList.remove('active');
        });
        
        detailModal.classList.add('active');
    }
    
    /**
     * 领取每日奖励
     */
    claimDailyBonus() {
        if (typeof bankrollManager === 'undefined') return;
        
        const lastClaimKey = 'poker_last_daily_bonus';
        const lastClaim = localStorage.getItem(lastClaimKey);
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        
        if (lastClaim && (now - parseInt(lastClaim)) < dayMs) {
            const remaining = dayMs - (now - parseInt(lastClaim));
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            alert(`今日已领取！下次可领取时间：${hours}小时${minutes}分钟后`);
            return;
        }
        
        // 发放奖励
        const bonusAmount = 1000;
        bankrollManager.addBonus(bonusAmount, '每日登录奖励');
        localStorage.setItem(lastClaimKey, now.toString());
        
        this.updateBankrollDisplay();
        alert(`🎉 恭喜获得每日奖励 ${bonusAmount.toLocaleString('zh-CN')} 筹码！`);
    }

    /**
     * 初始化音效系统
     */
    initSoundSystem() {
        // 在用户首次交互时初始化音效
        const initSound = () => {
            if (typeof soundManager !== 'undefined') {
                soundManager.init();
            }
            document.removeEventListener('click', initSound);
            document.removeEventListener('keydown', initSound);
        };
        
        document.addEventListener('click', initSound);
        document.addEventListener('keydown', initSound);
    }

    /**
     * 开始游戏
     */
    startGame(settings) {
        this.currentSettings = settings;
        this.game.initialize(settings);
        this.ui.showGameScreen();
        
        // 根据游戏模式显示/隐藏结算按钮
        const isFlowMode = settings.gameMode === GAME_MODE.FLOW;
        this.ui.setSettleButtonVisible(isFlowMode);
        
        // 添加模式提示日志
        if (isFlowMode) {
            this.ui.addLog(`🔥 血流模式 - 随时可点击"结算"结束游戏`);
        } else {
            this.ui.addLog(`🎯 计局模式 - 共 ${settings.maxRounds} 局`);
        }
        
        this.ui.addLog(`游戏开始！难度: ${DIFFICULTY_NAMES[settings.difficulty]}, 玩家数: ${settings.playerCount}`);
        
        // 延迟开始第一手牌
        setTimeout(() => {
            // 播放发牌音效
            this.playSound('deal');
            this.game.startNewHand();
            this.ui.addLog(`第 ${this.game.roundNumber} 轮开始`);
        }, 500);
    }

    /**
     * 处理玩家操作
     */
    handlePlayerAction(action, amount) {
        this.game.handlePlayerAction(action, amount);
    }

    /**
     * 记录玩家操作日志
     */
    logPlayerAction(player, action, amount) {
        let message = `<strong>${player.name}</strong> `;
        let dialogueType = null;
        let soundType = null;
        
        switch (action) {
            case ACTIONS.FOLD:
                message += '弃牌';
                soundType = 'fold';
                // NPC弃牌时偶尔会说话
                if (!player.isHuman && Math.random() < 0.5) {
                    dialogueType = 'lose';
                }
                break;
            case ACTIONS.CHECK:
                message += '过牌';
                soundType = 'check';
                // NPC过牌时偶尔会嘲讽
                if (!player.isHuman && Math.random() < 0.3) {
                    dialogueType = 'taunt';
                }
                break;
            case ACTIONS.CALL:
                message += `跟注 ${amount}`;
                soundType = 'call';
                // NPC跟注时可能会说话
                if (!player.isHuman && Math.random() < 0.4) {
                    dialogueType = Math.random() < 0.5 ? 'taunt' : 'bluff';
                }
                break;
            case ACTIONS.RAISE:
                message += `加注到 ${player.currentBet}`;
                soundType = 'raise';
                // AI加注时高概率会嘲讽
                if (!player.isHuman && Math.random() < 0.7) {
                    dialogueType = Math.random() < 0.6 ? 'taunt' : 'bluff';
                }
                break;
            case ACTIONS.ALLIN:
                message += `全押 ${amount}`;
                soundType = 'allin';
                // 触发ALL IN粒子效果
                this.triggerAllInParticles(player);
                // AI全押时必定会说话
                if (!player.isHuman) {
                    dialogueType = 'allIn';
                }
                break;
        }
        
        // 播放操作音效
        this.playSound(soundType);
        
        this.ui.addLog(message);
        
        // 触发NPC对话 - 放宽条件，只要是NPC就显示
        if (dialogueType && !player.isHuman) {
            this.ui.showPlayerDialogue(player, dialogueType);
        }
    }

    /**
     * 播放音效
     * @param {string} type - 音效类型
     */
    playSound(type) {
        if (typeof soundManager !== 'undefined' && type) {
            soundManager.play(type);
        }
    }

    /**
     * 触发ALL IN粒子效果
     * @param {Player} player - 执行ALL IN的玩家
     */
    triggerAllInParticles(player) {
        const playerSeat = document.getElementById(`player-seat-${player.id}`);
        if (playerSeat && this.game.getParticleSystem()) {
            const rect = playerSeat.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            this.game.triggerAllInEffect(x, y);
            
            // 添加高亮动画类
            playerSeat.classList.add('all-in-highlight');
            setTimeout(() => {
                playerSeat.classList.remove('all-in-highlight');
            }, 800);
        }
    }

    /**
     * 处理回合结束
     */
    handleRoundEnd(result) {
        const winnerNames = result.winners.map(w => w.player.name).join(', ');
        
        // 播放获胜音效
        this.playSound('win');
        
        if (result.reason === 'fold') {
            this.ui.addLog(`<strong>${winnerNames}</strong> 获胜（其他玩家弃牌），赢得 ${result.winAmount} 筹码`);
        } else {
            const handDesc = result.winners[0].evaluation?.description || '';
            this.ui.addLog(`<strong>${winnerNames}</strong> 以 ${handDesc} 获胜，赢得 ${result.winAmount} 筹码`);
        }

        // 高亮赢家
        this.ui.highlightWinners(result.winners.map(w => w.player.id));

        // 触发赢家粒子效果
        this.triggerWinnerParticles(result);
        
        // 触发赢家对话
        result.winners.forEach(winner => {
            if (winner.player.isBuddy && winner.player.isBuddy()) {
                this.ui.showPlayerDialogue(winner.player, 'win');
            }
        });
        
        // 如果玩家输了，NPC可能会嘲讽
        const humanPlayer = this.game.getHumanPlayer();
        const humanLost = humanPlayer && !result.winners.some(w => w.player.id === humanPlayer.id);
        if (humanLost && Math.random() < 0.5) {
            // 找一个赢家NPC来嘲讽
            const npcWinner = result.winners.find(w => w.player.isBuddy && w.player.isBuddy());
            if (npcWinner) {
                setTimeout(() => {
                    this.ui.showPlayerDialogue(npcWinner.player, 'taunt');
                }, 1000);
            }
        }

        // 显示结果弹窗
        setTimeout(() => {
            this.ui.showRoundResult(result);
        }, 1500);
    }

    /**
     * 触发赢家粒子效果
     * @param {Object} result - 回合结果
     */
    triggerWinnerParticles(result) {
        result.winners.forEach((winner, index) => {
            const playerSeat = document.getElementById(`player-seat-${winner.player.id}`);
            if (playerSeat && this.game.getParticleSystem()) {
                const rect = playerSeat.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                
                // 延迟触发，让效果更有层次
                setTimeout(() => {
                    this.game.triggerWinEffect(x, y, result.winAmount);
                }, index * 200);
            }
        });
    }

    /**
     * 开始下一轮
     */
    startNextRound() {
        // 检查人类玩家是否出局
        const humanPlayer = this.game.getHumanPlayer();
        if (!humanPlayer || humanPlayer.chips <= 0) {
            this.handleGameEnd({
                winner: this.game.players[0],
                rankings: this.game.players.sort((a, b) => b.chips - a.chips),
                totalRounds: this.game.roundNumber
            });
            return;
        }
        
        // 计局模式下检查是否达到最大局数
        if (this.game.gameMode === GAME_MODE.ROUNDS && 
            this.game.maxRounds > 0 && 
            this.game.roundNumber >= this.game.maxRounds) {
            // 达到最大局数，自动结算
            const rankings = [...this.game.players].sort((a, b) => b.chips - a.chips);
            this.handleGameEnd({
                winner: rankings[0],
                rankings: rankings,
                totalRounds: this.game.roundNumber,
                reason: 'rounds_complete' // 标记为按局数结束
            });
            return;
        }

        // 播放发牌音效
        this.playSound('deal');
        this.game.startNewHand();
        this.ui.addLog(`第 ${this.game.roundNumber} 轮开始`);
        
        // 计局模式下显示剩余局数
        if (this.game.gameMode === GAME_MODE.ROUNDS && this.game.maxRounds > 0) {
            const remaining = this.game.maxRounds - this.game.roundNumber;
            if (remaining <= 3 && remaining > 0) {
                this.ui.addLog(`⚠️ 剩余 ${remaining} 局`);
            }
        }
    }

    /**
     * 处理游戏结束
     */
    handleGameEnd(result) {
        this.ui.addLog(`游戏结束！${result.winner.name} 获得最终胜利！`);
        this.ui.showGameOver(result);
    }

    /**
     * 重新开始游戏
     */
    restartGame() {
        if (this.currentSettings) {
            this.startGame(this.currentSettings);
        }
    }

    /**
     * 返回菜单
     */
    backToMenu() {
        this.ui.showMenuScreen();
    }
    
    /**
     * 结算游戏（血流模式下手动触发）
     */
    settleGame() {
        // 确认是否要结算
        const confirmed = confirm('确定要结算当前游戏吗？将按当前筹码数量进行排名。');
        if (!confirmed) return;
        
        // 按筹码排序
        const rankings = [...this.game.players].sort((a, b) => b.chips - a.chips);
        
        this.handleGameEnd({
            winner: rankings[0],
            rankings: rankings,
            totalRounds: this.game.roundNumber,
            reason: 'manual_settle' // 标记为手动结算
        });
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    const app = new TexasHoldemApp();
    app.init();
});
