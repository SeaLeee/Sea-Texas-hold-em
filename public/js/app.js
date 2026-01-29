/**
 * 德州扑克游戏 - 主应用入口
 */
class TexasHoldemApp {
    constructor() {
        this.game = new GameManager();
        this.ui = new UI();
        this.currentSettings = null;
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
            onBackToMenu: () => this.backToMenu()
        });

        // 设置游戏回调
        this.game.onStateChange = (state) => this.ui.updateGameUI(state);
        this.game.onPlayerAction = (player, action, amount) => this.logPlayerAction(player, action, amount);
        this.game.onRoundEnd = (result) => this.handleRoundEnd(result);
        this.game.onGameEnd = (result) => this.handleGameEnd(result);

        console.log('德州扑克游戏已初始化');
    }

    /**
     * 开始游戏
     */
    startGame(settings) {
        this.currentSettings = settings;
        this.game.initialize(settings);
        this.ui.showGameScreen();
        this.ui.addLog(`游戏开始！难度: ${DIFFICULTY_NAMES[settings.difficulty]}, 玩家数: ${settings.playerCount}`);
        
        // 延迟开始第一手牌
        setTimeout(() => {
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
        switch (action) {
            case ACTIONS.FOLD:
                message += '弃牌';
                break;
            case ACTIONS.CHECK:
                message += '过牌';
                break;
            case ACTIONS.CALL:
                message += `跟注 ${amount}`;
                break;
            case ACTIONS.RAISE:
                message += `加注到 ${player.currentBet}`;
                break;
            case ACTIONS.ALLIN:
                message += `全押 ${amount}`;
                // 触发ALL IN粒子效果
                this.triggerAllInParticles(player);
                break;
        }
        this.ui.addLog(message);
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

        this.game.startNewHand();
        this.ui.addLog(`第 ${this.game.roundNumber} 轮开始`);
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
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    const app = new TexasHoldemApp();
    app.init();
});
