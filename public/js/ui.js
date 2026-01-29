/**
 * UI管理器 - 处理界面渲染和用户交互
 */
class UI {
    constructor() {
        // DOM元素缓存
        this.elements = {};
        this.cacheElements();
        
        // 当前游戏状态引用
        this.gameState = null;
        
        // 下注滑块状态
        this.isRaiseMode = false;
        this.raiseAmount = 0;
        
        // 概率计算器
        this.oddsCalculator = new OddsCalculator();
        
        // 面板状态
        this.panelStates = {
            odds: false,
            strategy: false,
            stats: false
        };
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            // 屏幕
            menuScreen: document.getElementById('menu-screen'),
            gameScreen: document.getElementById('game-screen'),
            
            // 菜单元素
            startGameBtn: document.getElementById('start-game-btn'),
            rulesBtn: document.getElementById('rules-btn'),
            difficultyBtns: document.querySelectorAll('.diff-btn'),
            playerCountBtns: document.querySelectorAll('.count-btn'),
            chipsBtns: document.querySelectorAll('.chips-btn'),
            blindsBtns: document.querySelectorAll('.blinds-btn'),
            
            // 模态框
            rulesModal: document.getElementById('rules-modal'),
            resultModal: document.getElementById('result-modal'),
            gameoverModal: document.getElementById('gameover-modal'),
            
            // 游戏区域
            potAmount: document.getElementById('pot-amount'),
            currentBlinds: document.getElementById('current-blinds'),
            phaseIndicator: document.querySelector('.phase-indicator'),
            communityCards: document.getElementById('community-cards'),
            playersContainer: document.getElementById('players-container'),
            
            // 玩家控制
            playerHand: document.getElementById('player-hand'),
            playerChipsDisplay: document.getElementById('player-chips-display'),
            playerStatus: document.getElementById('player-status'),
            
            // 操作按钮
            foldBtn: document.getElementById('fold-btn'),
            checkCallBtn: document.getElementById('check-call-btn'),
            raiseBtn: document.getElementById('raise-btn'),
            allinBtn: document.getElementById('allin-btn'),
            
            // 下注滑块
            betSliderContainer: document.getElementById('bet-slider-container'),
            betSlider: document.getElementById('bet-slider'),
            betAmountInput: document.getElementById('bet-amount-input'),
            presetBtns: document.querySelectorAll('.preset-btn'),
            
            // 结果
            resultTitle: document.getElementById('result-title'),
            resultDetails: document.getElementById('result-details'),
            nextRoundBtn: document.getElementById('next-round-btn'),
            
            // 游戏结束
            gameoverTitle: document.getElementById('gameover-title'),
            gameoverDetails: document.getElementById('gameover-details'),
            restartBtn: document.getElementById('restart-btn'),
            backMenuBtn: document.getElementById('back-menu-btn'),
            
            // 日志
            gameLog: document.getElementById('game-log'),
            logContent: document.getElementById('log-content'),
            toggleLogBtn: document.getElementById('toggle-log'),
            
            // 菜单按钮
            menuBtn: document.getElementById('menu-btn'),
            
            // 概率计算器面板
            oddsPanel: document.getElementById('odds-panel'),
            oddsToggleBtn: document.getElementById('show-odds-btn'),
            winProbValue: document.getElementById('win-prob'),
            handCategory: document.getElementById('hand-category'),
            strengthFill: document.getElementById('strength-fill'),
            handKey: document.getElementById('hand-key'),
            drawsList: document.getElementById('draws-list'),
            probsList: document.getElementById('probabilities-list'),
            
            // 攻略建议面板
            strategyPanel: document.getElementById('strategy-panel'),
            strategyToggleBtn: document.getElementById('show-strategy-btn'),
            adviceAction: document.getElementById('advice-action'),
            confidenceFill: document.getElementById('confidence-fill'),
            confidenceText: document.getElementById('confidence-text'),
            adviceReason: document.getElementById('advice-reason'),
            detailsList: document.getElementById('details-list'),
            
            // 数据统计面板
            statsPanel: document.getElementById('stats-panel'),
            statsToggleBtn: document.getElementById('show-stats-btn'),
            statPot: document.getElementById('stat-pot'),
            statToCall: document.getElementById('stat-to-call'),
            statPotOdds: document.getElementById('stat-pot-odds'),
            statActivePlayers: document.getElementById('stat-active-players'),
            playersChipsList: document.getElementById('players-chips-list'),
            
            // 工具栏按钮容器
            toolbarButtons: document.querySelector('.toolbar-buttons')
        };
    }

    /**
     * 初始化UI事件监听
     * @param {Object} callbacks - 回调函数对象
     */
    initEventListeners(callbacks) {
        // 开始游戏按钮
        this.elements.startGameBtn.addEventListener('click', () => {
            const settings = this.getMenuSettings();
            callbacks.onStartGame(settings);
        });

        // 规则按钮
        this.elements.rulesBtn.addEventListener('click', () => {
            this.showModal('rulesModal');
        });

        // 关闭模态框
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAllModals();
            });
        });

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });

        // 菜单选项按钮组
        this.setupButtonGroup('.diff-btn', 'data-difficulty');
        this.setupButtonGroup('.count-btn', 'data-count');
        this.setupButtonGroup('.chips-btn', 'data-chips');
        this.setupButtonGroup('.blinds-btn', 'data-blinds');
        this.setupButtonGroup('.pers-btn', 'data-personality');
        
        // 小伙伴选择
        this.selectedBuddies = [];
        this.setupBuddySelector();

        // 游戏操作按钮
        this.elements.foldBtn.addEventListener('click', () => {
            callbacks.onPlayerAction(ACTIONS.FOLD);
        });

        this.elements.checkCallBtn.addEventListener('click', () => {
            const action = this.elements.checkCallBtn.dataset.action;
            callbacks.onPlayerAction(action);
        });

        this.elements.raiseBtn.addEventListener('click', () => {
            if (this.isRaiseMode) {
                callbacks.onPlayerAction(ACTIONS.RAISE, this.raiseAmount);
                this.hideRaiseSlider();
            } else {
                this.showRaiseSlider();
            }
        });

        this.elements.allinBtn.addEventListener('click', () => {
            callbacks.onPlayerAction(ACTIONS.ALLIN);
        });

        // 下注滑块
        this.elements.betSlider.addEventListener('input', (e) => {
            this.updateRaiseAmount(parseInt(e.target.value));
        });

        this.elements.betAmountInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value) || 0;
            this.updateRaiseAmount(value);
            this.elements.betSlider.value = value;
        });

        // 预设下注按钮
        this.elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const multiplier = parseFloat(btn.dataset.multiplier);
                const amount = Math.floor(this.gameState.pot * multiplier) + this.gameState.currentBet;
                this.updateRaiseAmount(amount);
                this.elements.betSlider.value = amount;
            });
        });

        // 下一轮按钮
        this.elements.nextRoundBtn.addEventListener('click', () => {
            this.hideModal('resultModal');
            callbacks.onNextRound();
        });

        // 重新开始按钮
        this.elements.restartBtn.addEventListener('click', () => {
            this.hideModal('gameoverModal');
            callbacks.onRestart();
        });

        // 返回菜单按钮
        this.elements.backMenuBtn.addEventListener('click', () => {
            this.hideModal('gameoverModal');
            callbacks.onBackToMenu();
        });

        // 菜单按钮
        this.elements.menuBtn.addEventListener('click', () => {
            callbacks.onBackToMenu();
        });

        // 日志折叠
        this.elements.toggleLogBtn.addEventListener('click', () => {
            const content = this.elements.logContent;
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            this.elements.toggleLogBtn.textContent = isHidden ? '−' : '+';
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (this.elements.gameScreen.classList.contains('active') && 
                this.gameState && 
                this.gameState.phase !== GAME_PHASES.WAITING &&
                this.gameState.phase !== GAME_PHASES.SHOWDOWN) {
                
                const key = e.key.toLowerCase();
                
                if (key === KEYBOARD_SHORTCUTS.FOLD && !this.elements.foldBtn.disabled) {
                    callbacks.onPlayerAction(ACTIONS.FOLD);
                } else if (key === KEYBOARD_SHORTCUTS.CHECK_CALL && !this.elements.checkCallBtn.disabled) {
                    const action = this.elements.checkCallBtn.dataset.action;
                    callbacks.onPlayerAction(action);
                } else if (key === KEYBOARD_SHORTCUTS.RAISE && !this.elements.raiseBtn.disabled) {
                    if (this.isRaiseMode) {
                        callbacks.onPlayerAction(ACTIONS.RAISE, this.raiseAmount);
                        this.hideRaiseSlider();
                    } else {
                        this.showRaiseSlider();
                    }
                } else if (key === KEYBOARD_SHORTCUTS.ALLIN && !this.elements.allinBtn.disabled) {
                    callbacks.onPlayerAction(ACTIONS.ALLIN);
                } else if (key === 'escape' && this.isRaiseMode) {
                    this.hideRaiseSlider();
                }
            }
        });
    }

    /**
     * 设置按钮组
     * @param {string} selector - 选择器
     * @param {string} dataAttr - 数据属性
     */
    setupButtonGroup(selector, dataAttr) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    /**
     * 获取菜单设置
     * @returns {Object}
     */
    getMenuSettings() {
        const difficulty = document.querySelector('.diff-btn.active')?.dataset.difficulty || AI_DIFFICULTY.MEDIUM;
        const playerCount = parseInt(document.querySelector('.count-btn.active')?.dataset.count) || 4;
        const startingChips = parseInt(document.querySelector('.chips-btn.active')?.dataset.chips) || 5000;
        const blindsStr = document.querySelector('.blinds-btn.active')?.dataset.blinds || '10/20';
        const [smallBlind, bigBlind] = blindsStr.split('/').map(Number);
        const aiPersonality = document.querySelector('.pers-btn.active')?.dataset.personality || AI_PERSONALITY.BALANCED;

        return {
            difficulty,
            playerCount,
            startingChips,
            smallBlind,
            bigBlind,
            aiPersonality,
            selectedBuddies: this.selectedBuddies || []
        };
    }

    /**
     * 设置小伙伴选择器
     */
    setupBuddySelector() {
        const buddyCards = document.querySelectorAll('.buddy-card');
        const selectedCountEl = document.getElementById('selected-count');
        const maxBuddiesEl = document.getElementById('max-buddies');
        
        // 获取当前最大可选数量
        const getMaxBuddies = () => {
            const playerCount = parseInt(document.querySelector('.count-btn.active')?.dataset.count || '4');
            return playerCount - 1; // 玩家数量-1（不包括自己）
        };
        
        // 更新最大选择数量显示
        const updateMaxBuddies = () => {
            const maxBuddies = getMaxBuddies();
            if (maxBuddiesEl) {
                maxBuddiesEl.textContent = maxBuddies;
            }
            this.updateBuddyCardStates(maxBuddies);
        };
        
        // 初始化最大选择数量
        updateMaxBuddies();
        
        // 监听玩家数量变化
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                updateMaxBuddies();
            });
        });
        
        // 处理卡片点击/触摸的通用函数
        const handleCardSelect = (card, e) => {
            // 阻止默认行为和冒泡
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            const buddyId = card.dataset.buddy;
            const index = this.selectedBuddies.indexOf(buddyId);
            const maxBuddies = getMaxBuddies();
            
            if (index > -1) {
                // 已选择，取消选择
                this.selectedBuddies.splice(index, 1);
                card.classList.remove('selected');
            } else {
                // 检查是否超过最大数量
                if (this.selectedBuddies.length >= maxBuddies) {
                    return; // 已达最大数量，不再添加
                }
                // 未选择，添加选择
                this.selectedBuddies.push(buddyId);
                card.classList.add('selected');
            }
            
            // 更新计数显示
            if (selectedCountEl) {
                selectedCountEl.textContent = this.selectedBuddies.length;
            }
            
            // 更新卡片状态
            this.updateBuddyCardStates(maxBuddies);
        };
        
        buddyCards.forEach(card => {
            // 标记是否正在处理触摸，防止触摸后又触发click
            let touchHandled = false;
            
            // 触摸事件 - 移动端优先
            card.addEventListener('touchstart', (e) => {
                touchHandled = false;
            }, { passive: true });
            
            card.addEventListener('touchend', (e) => {
                // 检查是否是简单的点击（没有滑动）
                touchHandled = true;
                handleCardSelect(card, e);
            }, { passive: false });
            
            // 点击事件 - 桌面端和作为移动端后备
            card.addEventListener('click', (e) => {
                // 如果触摸事件已处理，跳过click
                if (touchHandled) {
                    touchHandled = false;
                    return;
                }
                handleCardSelect(card, e);
            });
        });
    }
    
    /**
     * 更新小伙伴卡片状态（禁用/启用）
     */
    updateBuddyCardStates(maxBuddies) {
        const buddyCards = document.querySelectorAll('.buddy-card');
        const isMaxReached = this.selectedBuddies.length >= maxBuddies;
        
        buddyCards.forEach(card => {
            const isSelected = card.classList.contains('selected');
            if (isMaxReached && !isSelected) {
                card.classList.add('disabled');
            } else {
                card.classList.remove('disabled');
            }
        });
        
        // 如果选择数量超过最大数，自动取消多余的选择
        while (this.selectedBuddies.length > maxBuddies) {
            const removedId = this.selectedBuddies.pop();
            const card = document.querySelector(`.buddy-card[data-buddy="${removedId}"]`);
            if (card) {
                card.classList.remove('selected');
            }
        }
        
        // 更新计数显示
        const selectedCountEl = document.getElementById('selected-count');
        if (selectedCountEl) {
            selectedCountEl.textContent = this.selectedBuddies.length;
        }
    }

    /**
     * 切换到游戏界面
     */
    showGameScreen() {
        this.elements.menuScreen.classList.remove('active');
        this.elements.gameScreen.classList.add('active');
        this.elements.gameLog.classList.add('active');
        this.clearLog();
        this.showToolbar();
        this.initToolbarPanels();
    }

    /**
     * 切换到菜单界面
     */
    showMenuScreen() {
        this.elements.gameScreen.classList.remove('active');
        this.elements.menuScreen.classList.add('active');
        this.elements.gameLog.classList.remove('active');
    }

    /**
     * 更新游戏界面
     * @param {Object} state - 游戏状态
     */
    updateGameUI(state) {
        const previousPhase = this.gameState?.phase;
        const previousPlayerIndex = this.gameState?.currentPlayerIndex;
        
        this.gameState = state;

        // 更新顶部信息
        this.elements.potAmount.textContent = this.formatNumber(state.pot);
        this.elements.phaseIndicator.textContent = state.phaseName;
        this.elements.currentBlinds.textContent = `${state.settings.smallBlind}/${state.settings.bigBlind}`;

        // 更新公共牌
        this.renderCommunityCards(state.communityCards);

        // 更新玩家区域
        this.renderPlayers(state);

        // 更新人类玩家区域
        this.updatePlayerControls(state);
        
        // 更新数据面板
        this.updatePanelsData();
        
        // 阶段变化时显示公告
        if (previousPhase !== state.phase && state.phase !== GAME_PHASES.WAITING) {
            this.showPhaseAnnouncement(state.phaseName);
        }
        
        // 轮到玩家行动时显示提示
        const humanPlayer = state.players.find(p => p.isHuman);
        const isMyTurn = humanPlayer && 
                         state.players[state.currentPlayerIndex]?.id === humanPlayer.id && 
                         state.phase !== GAME_PHASES.WAITING &&
                         state.phase !== GAME_PHASES.SHOWDOWN;
        
        if (isMyTurn && previousPlayerIndex !== state.currentPlayerIndex) {
            this.showYourTurnIndicator();
        }
    }

    /**
     * 显示阶段公告
     * @param {string} phaseName - 阶段名称
     */
    showPhaseAnnouncement(phaseName) {
        // 移除已存在的公告
        const existingAnnouncement = document.querySelector('.phase-announcement');
        if (existingAnnouncement) {
            existingAnnouncement.remove();
        }
        
        const announcement = document.createElement('div');
        announcement.className = 'phase-announcement';
        
        // 根据阶段设置不同图标
        let icon = '🎴';
        switch (phaseName) {
            case 'Preflop':
                icon = '🃏';
                break;
            case 'Flop':
                icon = '🎯';
                break;
            case 'Turn':
                icon = '🔄';
                break;
            case 'River':
                icon = '🌊';
                break;
            case 'Showdown':
                icon = '🏆';
                break;
        }
        
        announcement.innerHTML = `
            <span class="phase-icon">${icon}</span>
            <span class="phase-name">${phaseName}</span>
        `;
        
        document.body.appendChild(announcement);
        
        // 自动移除
        setTimeout(() => {
            announcement.classList.add('fade-out');
            setTimeout(() => announcement.remove(), 500);
        }, 1500);
    }

    /**
     * 显示轮到你行动的提示
     */
    showYourTurnIndicator() {
        // 移除已存在的提示
        const existingIndicator = document.querySelector('.your-turn-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'your-turn-indicator';
        indicator.innerHTML = `
            <span class="turn-icon">👆</span>
            <span class="turn-text">轮到你行动！</span>
        `;
        
        document.body.appendChild(indicator);
        
        // 播放提示音效（如果有）
        // this.playSound('your-turn');
        
        // 自动移除
        setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => indicator.remove(), 500);
        }, 2000);
    }

    /**
     * 渲染公共牌
     * @param {Card[]} cards - 公共牌数组
     */
    renderCommunityCards(cards) {
        this.elements.communityCards.innerHTML = '';

        // 创建5个位置
        for (let i = 0; i < 5; i++) {
            if (i < cards.length) {
                const cardEl = cards[i].toHTML('normal');
                cardEl.classList.add('dealing');
                cardEl.style.animationDelay = `${i * 0.1}s`;
                this.elements.communityCards.appendChild(cardEl);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'card-placeholder';
                this.elements.communityCards.appendChild(placeholder);
            }
        }
    }

    /**
     * 渲染玩家
     * @param {Object} state - 游戏状态
     */
    renderPlayers(state) {
        this.elements.playersContainer.innerHTML = '';

        const positions = this.getPlayerPositions(state.players.length);

        state.players.forEach((player, index) => {
            const seat = this.createPlayerSeat(player, index, state, positions[index]);
            this.elements.playersContainer.appendChild(seat);
        });
    }

    /**
     * 获取玩家位置配置
     * @param {number} count - 玩家数量
     * @returns {Array}
     */
    getPlayerPositions(count) {
        const positions = {
            2: [
                { bottom: '-5%', left: '50%', transform: 'translate(-50%, 0)' },
                { top: '-5%', left: '50%', transform: 'translate(-50%, 0)' }
            ],
            3: [
                { bottom: '-5%', left: '50%', transform: 'translate(-50%, 0)' },
                { top: '30%', left: '5%', transform: 'translate(0, -50%)' },
                { top: '30%', right: '5%', left: 'auto', transform: 'translate(0, -50%)' }
            ],
            4: [
                { bottom: '-5%', left: '50%', transform: 'translate(-50%, 0)' },
                { bottom: '20%', left: '8%', transform: 'translate(0, 0)' },
                { top: '-5%', left: '50%', transform: 'translate(-50%, 0)' },
                { bottom: '20%', right: '8%', left: 'auto', transform: 'translate(0, 0)' }
            ],
            5: [
                { bottom: '-5%', left: '50%', transform: 'translate(-50%, 0)' },
                { bottom: '15%', left: '8%', transform: 'translate(0, 0)' },
                { top: '15%', left: '15%', transform: 'translate(0, 0)' },
                { top: '15%', right: '15%', left: 'auto', transform: 'translate(0, 0)' },
                { bottom: '15%', right: '8%', left: 'auto', transform: 'translate(0, 0)' }
            ],
            6: [
                { bottom: '-5%', left: '50%', transform: 'translate(-50%, 0)' },
                { bottom: '10%', left: '5%', transform: 'translate(0, 0)' },
                { top: '25%', left: '5%', transform: 'translate(0, 0)' },
                { top: '-5%', left: '50%', transform: 'translate(-50%, 0)' },
                { top: '25%', right: '5%', left: 'auto', transform: 'translate(0, 0)' },
                { bottom: '10%', right: '5%', left: 'auto', transform: 'translate(0, 0)' }
            ]
        };

        return positions[count] || positions[4];
    }

    /**
     * 创建玩家座位元素
     * @param {Player} player - 玩家
     * @param {number} index - 索引
     * @param {Object} state - 游戏状态
     * @param {Object} position - 位置样式
     * @returns {HTMLElement}
     */
    createPlayerSeat(player, index, state, position) {
        const seat = document.createElement('div');
        seat.className = 'player-seat';
        seat.id = `player-seat-${player.id}`;

        // 应用位置
        Object.assign(seat.style, position);

        // 状态类
        if (index === state.currentPlayerIndex && player.canAct()) {
            seat.classList.add('active');
        }
        if (player.status === PLAYER_STATUS.FOLDED) {
            seat.classList.add('folded');
        }

        // 头像
        const avatar = document.createElement('div');
        avatar.className = 'player-avatar';
        avatar.textContent = player.avatar;
        if (index === state.currentPlayerIndex && player.canAct()) {
            avatar.classList.add('active-glow');
        }

        // 手牌
        const cards = document.createElement('div');
        cards.className = 'player-cards';
        if (player.holeCards.length > 0) {
            player.holeCards.forEach(card => {
                const cardEl = card.toHTML('mini', !player.isHuman && state.phase !== GAME_PHASES.SHOWDOWN);
                cards.appendChild(cardEl);
            });
        }

        // 信息栏
        const info = document.createElement('div');
        info.className = 'player-info';
        
        const name = document.createElement('div');
        name.className = 'player-name';
        name.textContent = player.name;
        
        const posText = player.getPositionText();
        if (posText) {
            const badge = document.createElement('span');
            badge.className = 'position-badge';
            badge.textContent = ` (${posText})`;
            badge.style.fontSize = '0.7em';
            badge.style.opacity = '0.7';
            name.appendChild(badge);
        }

        const chips = document.createElement('div');
        chips.className = 'player-chips-display';
        chips.textContent = `💰 ${this.formatNumber(player.chips)}`;

        info.appendChild(name);
        info.appendChild(chips);

        // 当前下注显示
        if (player.currentBet > 0) {
            const betDisplay = document.createElement('div');
            betDisplay.className = 'player-bet-display';
            betDisplay.textContent = `下注: ${this.formatNumber(player.currentBet)}`;
            betDisplay.style.top = 'auto';
            betDisplay.style.bottom = '-25px';
            seat.appendChild(betDisplay);
        }

        // 操作指示器
        if (player.lastAction && state.phase !== GAME_PHASES.SHOWDOWN) {
            const actionIndicator = document.createElement('div');
            actionIndicator.className = 'player-action-indicator';
            actionIndicator.textContent = ACTION_NAMES[player.lastAction] || '';
            
            // 根据操作类型设置颜色
            switch (player.lastAction) {
                case ACTIONS.FOLD:
                    actionIndicator.style.background = '#666';
                    break;
                case ACTIONS.RAISE:
                case ACTIONS.ALLIN:
                    actionIndicator.style.background = '#f44336';
                    break;
                case ACTIONS.CALL:
                    actionIndicator.style.background = '#2196f3';
                    break;
                default:
                    actionIndicator.style.background = '#4caf50';
            }
            
            seat.appendChild(actionIndicator);
        }

        // 状态显示
        const statusText = player.getStatusText();
        if (statusText) {
            const status = document.createElement('div');
            status.className = 'player-action-indicator';
            status.textContent = statusText;
            status.style.background = player.status === PLAYER_STATUS.ALLIN ? '#f44336' : '#666';
            seat.appendChild(status);
        }

        // 庄家按钮
        if (player.isDealer) {
            const dealerBtn = document.createElement('div');
            dealerBtn.className = 'dealer-button';
            dealerBtn.textContent = 'D';
            dealerBtn.style.position = 'absolute';
            dealerBtn.style.bottom = '-10px';
            dealerBtn.style.right = '-10px';
            avatar.appendChild(dealerBtn);
        }

        seat.appendChild(cards);
        seat.appendChild(avatar);
        seat.appendChild(info);

        // 添加对话气泡（如果玩家有对话）
        if (player.currentDialogue) {
            const dialogueEl = this.createDialogueBubble(player.currentDialogue);
            seat.appendChild(dialogueEl);
        }

        return seat;
    }

    /**
     * 创建对话气泡
     * @param {string} text - 对话内容
     * @param {string} type - 对话类型
     * @returns {HTMLElement}
     */
    createDialogueBubble(text, type = '') {
        const bubble = document.createElement('div');
        bubble.className = `player-dialogue ${type}`;
        bubble.textContent = text;
        return bubble;
    }

    /**
     * 显示玩家对话
     * @param {Player} player - 玩家
     * @param {string} type - 对话类型
     */
    showPlayerDialogue(player, type) {
        // 先尝试从玩家配置获取对话
        let dialogue = player.speak(type);
        
        // 如果没有对话配置，使用默认对话
        if (!dialogue) {
            const defaultDialogues = {
                win: ['赢了！', '哈哈！', '太棒了！', '就是这么强！'],
                lose: ['算了...', '下次再来', '唉...', '运气不好'],
                bluff: ['你敢跟吗？', '来啊！', '不服？', '有胆就跟！'],
                allIn: ['全押！', '梭哈！', '孤注一掷！', '拼了！'],
                taunt: ['就这？', '太菜了', '再来！', '不过如此']
            };
            const dialogueList = defaultDialogues[type];
            if (dialogueList) {
                dialogue = dialogueList[Math.floor(Math.random() * dialogueList.length)];
            }
        }
        
        if (dialogue) {
            const seat = document.getElementById(`player-seat-${player.id}`);
            if (seat) {
                // 移除旧的对话气泡
                const oldBubble = seat.querySelector('.player-dialogue');
                if (oldBubble) {
                    oldBubble.remove();
                }
                
                // 添加新的对话气泡
                const bubble = this.createDialogueBubble(dialogue, type);
                seat.appendChild(bubble);
                
                // 自动移除对话气泡
                setTimeout(() => {
                    if (bubble.parentNode) {
                        bubble.remove();
                    }
                }, 3000);
            }
        }
    }

    /**
     * 显示AI思考指示器
     * @param {Player} player - AI玩家
     * @param {boolean} isThinking - 是否正在思考
     */
    showAIThinking(player, isThinking) {
        const seat = document.getElementById(`player-seat-${player.id}`);
        if (!seat) return;
        
        // 移除旧的思考指示器
        const oldIndicator = seat.querySelector('.thinking-indicator');
        if (oldIndicator) {
            oldIndicator.remove();
        }
        
        if (isThinking) {
            // 添加思考指示器
            const indicator = document.createElement('div');
            indicator.className = 'thinking-indicator';
            indicator.innerHTML = `
                <span class="thinking-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
                <span class="thinking-text">思考中</span>
            `;
            seat.appendChild(indicator);
            
            // 添加思考中的样式类
            seat.classList.add('is-thinking');
        } else {
            // 移除思考中的样式类
            seat.classList.remove('is-thinking');
        }
    }

    /**
     * 更新玩家控制区域
     * @param {Object} state - 游戏状态
     */
    updatePlayerControls(state) {
        const humanPlayer = state.players.find(p => p.isHuman);
        if (!humanPlayer) return;

        // 更新手牌
        this.elements.playerHand.innerHTML = '';
        humanPlayer.holeCards.forEach(card => {
            card.reveal();
            const cardEl = card.toHTML('normal');
            this.elements.playerHand.appendChild(cardEl);
        });

        // 更新筹码显示
        this.elements.playerChipsDisplay.textContent = this.formatNumber(humanPlayer.chips);

        // 更新状态
        const isMyTurn = state.players[state.currentPlayerIndex]?.isHuman && 
                         state.phase !== GAME_PHASES.WAITING &&
                         state.phase !== GAME_PHASES.SHOWDOWN;
        
        if (isMyTurn) {
            this.elements.playerStatus.textContent = '轮到你行动！';
            this.elements.playerStatus.classList.add('blink');
        } else if (state.phase === GAME_PHASES.WAITING) {
            this.elements.playerStatus.textContent = '等待开始...';
            this.elements.playerStatus.classList.remove('blink');
        } else if (state.phase === GAME_PHASES.SHOWDOWN) {
            this.elements.playerStatus.textContent = '摊牌';
            this.elements.playerStatus.classList.remove('blink');
        } else {
            this.elements.playerStatus.textContent = '等待其他玩家...';
            this.elements.playerStatus.classList.remove('blink');
        }

        // 更新操作按钮
        this.updateActionButtons(state, humanPlayer, isMyTurn);
    }

    /**
     * 更新操作按钮状态
     * @param {Object} state - 游戏状态
     * @param {Player} player - 人类玩家
     * @param {boolean} isMyTurn - 是否轮到玩家
     */
    updateActionButtons(state, player, isMyTurn) {
        const actions = player.getAvailableActions(state.currentBet, state.minRaise);

        // 禁用所有按钮（如果不是玩家回合）
        const disabled = !isMyTurn || !player.canAct();

        // 弃牌按钮
        this.elements.foldBtn.disabled = disabled || !actions[ACTIONS.FOLD];

        // 过牌/跟注按钮
        if (actions[ACTIONS.CHECK]) {
            this.elements.checkCallBtn.querySelector('.btn-text').textContent = '过牌';
            this.elements.checkCallBtn.querySelector('.btn-amount').textContent = '';
            this.elements.checkCallBtn.dataset.action = ACTIONS.CHECK;
            this.elements.checkCallBtn.disabled = disabled;
        } else if (actions[ACTIONS.CALL]) {
            this.elements.checkCallBtn.querySelector('.btn-text').textContent = '跟注';
            this.elements.checkCallBtn.querySelector('.btn-amount').textContent = this.formatNumber(actions[ACTIONS.CALL]);
            this.elements.checkCallBtn.dataset.action = ACTIONS.CALL;
            this.elements.checkCallBtn.disabled = disabled;
        } else {
            this.elements.checkCallBtn.disabled = true;
        }

        // 加注按钮
        if (actions[ACTIONS.RAISE]) {
            this.elements.raiseBtn.disabled = disabled;
            this.elements.raiseBtn.querySelector('.btn-text').textContent = '加注';
            
            // 更新滑块范围
            this.elements.betSlider.min = actions[ACTIONS.RAISE].min;
            this.elements.betSlider.max = actions[ACTIONS.RAISE].max;
            this.elements.betSlider.value = actions[ACTIONS.RAISE].min;
            this.raiseAmount = actions[ACTIONS.RAISE].min;
        } else {
            this.elements.raiseBtn.disabled = true;
        }

        // 全押按钮
        if (actions[ACTIONS.ALLIN]) {
            this.elements.allinBtn.disabled = disabled;
        } else {
            this.elements.allinBtn.disabled = true;
        }

        // 隐藏加注滑块
        if (disabled) {
            this.hideRaiseSlider();
        }
    }

    /**
     * 显示加注滑块
     */
    showRaiseSlider() {
        this.isRaiseMode = true;
        this.elements.betSliderContainer.classList.add('active');
        this.elements.raiseBtn.querySelector('.btn-text').textContent = '确认加注';
        this.updateRaiseAmount(parseInt(this.elements.betSlider.value));
    }

    /**
     * 隐藏加注滑块
     */
    hideRaiseSlider() {
        this.isRaiseMode = false;
        this.elements.betSliderContainer.classList.remove('active');
        this.elements.raiseBtn.querySelector('.btn-text').textContent = '加注';
    }

    /**
     * 更新加注金额
     * @param {number} amount - 金额
     */
    updateRaiseAmount(amount) {
        const min = parseInt(this.elements.betSlider.min);
        const max = parseInt(this.elements.betSlider.max);
        this.raiseAmount = Math.max(min, Math.min(max, amount));
        this.elements.betAmountInput.value = this.raiseAmount;
        this.elements.raiseBtn.querySelector('.btn-amount').textContent = this.formatNumber(this.raiseAmount);
    }

    /**
     * 显示回合结果
     * @param {Object} result - 结果对象
     */
    showRoundResult(result) {
        const { winners, isTie, reason } = result;

        let title = '';
        if (reason === 'fold') {
            title = `${winners[0].player.name} 获胜！`;
        } else if (isTie) {
            title = '平局！';
        } else {
            const winner = winners[0];
            title = winner.player.isHuman ? '🎉 你赢了！' : `${winner.player.name} 获胜`;
        }

        this.elements.resultTitle.textContent = title;

        // 生成详情
        let detailsHTML = '';
        
        // 获取所有玩家信息（包括弃牌的）
        const allPlayers = result.allPlayers || [];
        const showdownPlayers = result.allResults || [];
        
        if (reason === 'fold') {
            // 其他人弃牌获胜，显示赢家信息和所有玩家的底牌
            for (const w of winners) {
                detailsHTML += `
                    <div class="result-player winner">
                        <span class="result-player-name">${w.player.name}</span>
                        <div class="result-player-cards">${this.renderPlayerCards(w.player)}</div>
                        <span class="result-player-hand">其他玩家弃牌</span>
                        <span class="result-player-winnings">+${this.formatNumber(result.winAmount || 0)}</span>
                    </div>
                `;
            }
            // 显示弃牌玩家的底牌
            for (const player of allPlayers) {
                if (!winners.some(w => w.player.id === player.id) && player.holeCards && player.holeCards.length > 0) {
                    detailsHTML += `
                        <div class="result-player folded">
                            <span class="result-player-name">${player.name}</span>
                            <div class="result-player-cards">${this.renderPlayerCards(player)}</div>
                            <span class="result-player-hand">已弃牌</span>
                            <span class="result-player-winnings"></span>
                        </div>
                    `;
                }
            }
        } else if (showdownPlayers.length > 0) {
            // 正常摊牌，显示所有参与摊牌玩家的底牌
            for (const r of showdownPlayers) {
                const isWinner = winners.some(w => w.player.id === r.player.id);
                detailsHTML += `
                    <div class="result-player ${isWinner ? 'winner' : ''}">
                        <span class="result-player-name">${r.player.name}</span>
                        <div class="result-player-cards">${this.renderPlayerCards(r.player)}</div>
                        <span class="result-player-hand">${r.evaluation ? r.evaluation.description : ''}</span>
                        <span class="result-player-winnings">${isWinner ? '+' + this.formatNumber(r.winAmount || 0) : ''}</span>
                    </div>
                `;
            }
            // 显示弃牌玩家的底牌
            for (const player of allPlayers) {
                if (!showdownPlayers.some(r => r.player.id === player.id) && player.holeCards && player.holeCards.length > 0) {
                    detailsHTML += `
                        <div class="result-player folded">
                            <span class="result-player-name">${player.name}</span>
                            <div class="result-player-cards">${this.renderPlayerCards(player)}</div>
                            <span class="result-player-hand">已弃牌</span>
                            <span class="result-player-winnings"></span>
                        </div>
                    `;
                }
            }
        } else {
            // 后备方案：只有赢家信息
            for (const w of winners) {
                detailsHTML += `
                    <div class="result-player winner">
                        <span class="result-player-name">${w.player.name}</span>
                        <div class="result-player-cards">${this.renderPlayerCards(w.player)}</div>
                        <span class="result-player-hand">${reason === 'fold' ? '其他玩家弃牌' : ''}</span>
                        <span class="result-player-winnings">+${this.formatNumber(result.winAmount || 0)}</span>
                    </div>
                `;
            }
        }

        this.elements.resultDetails.innerHTML = detailsHTML;
        this.showModal('resultModal');
    }

    /**
     * 渲染玩家底牌的HTML
     * @param {Player} player - 玩家对象
     * @returns {string} HTML字符串
     */
    renderPlayerCards(player) {
        if (!player.holeCards || player.holeCards.length === 0) {
            return '';
        }
        
        let html = '';
        for (const card of player.holeCards) {
            const color = card.getColor();
            const rankDisplay = card.getRankDisplay();
            const suitSymbol = card.getSuitSymbol();
            html += `<span class="result-card ${color}">${rankDisplay}${suitSymbol}</span>`;
        }
        return html;
    }

    /**
     * 显示游戏结束
     * @param {Object} result - 结果对象
     */
    showGameOver(result) {
        const { winner, rankings, totalRounds } = result;

        const title = winner.isHuman ? '🏆 恭喜你获得最终胜利！' : `游戏结束 - ${winner.name} 获胜`;
        this.elements.gameoverTitle.textContent = title;

        let detailsHTML = `<p>共进行了 ${totalRounds} 轮</p><div class="rankings">`;
        
        rankings.forEach((player, index) => {
            detailsHTML += `
                <div class="result-player ${index === 0 ? 'winner' : ''}">
                    <span class="result-player-name">#${index + 1} ${player.name}</span>
                    <span class="result-player-winnings">💰 ${this.formatNumber(player.chips)}</span>
                </div>
            `;
        });

        detailsHTML += '</div>';
        this.elements.gameoverDetails.innerHTML = detailsHTML;
        this.showModal('gameoverModal');
    }

    /**
     * 显示模态框
     * @param {string} modalKey - 模态框键名
     */
    showModal(modalKey) {
        this.elements[modalKey].classList.add('active');
    }

    /**
     * 隐藏模态框
     * @param {string} modalKey - 模态框键名
     */
    hideModal(modalKey) {
        this.elements[modalKey].classList.remove('active');
    }

    /**
     * 隐藏所有模态框
     */
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    /**
     * 添加日志条目
     * @param {string} message - 日志消息
     */
    addLog(message) {
        const entry = document.createElement('div');
        entry.className = 'log-entry fade-in';
        
        const time = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        entry.innerHTML = `<span class="log-time">${time}</span>${message}`;
        this.elements.logContent.insertBefore(entry, this.elements.logContent.firstChild);

        // 限制日志条数
        while (this.elements.logContent.children.length > 50) {
            this.elements.logContent.removeChild(this.elements.logContent.lastChild);
        }
    }

    /**
     * 清空日志
     */
    clearLog() {
        this.elements.logContent.innerHTML = '';
    }

    /**
     * 格式化数字
     * @param {number} num - 数字
     * @returns {string}
     */
    formatNumber(num) {
        return num.toLocaleString('zh-CN');
    }

    /**
     * 高亮赢家
     * @param {number[]} winnerIds - 赢家ID数组
     */
    highlightWinners(winnerIds) {
        winnerIds.forEach(id => {
            const seat = document.getElementById(`player-seat-${id}`);
            if (seat) {
                seat.classList.add('winner');
                seat.classList.add('win-celebrate');
            }
        });
    }

    /**
     * 初始化工具栏面板事件
     */
    initToolbarPanels() {
        // 重新获取工具栏按钮引用（确保DOM已加载）
        const oddsBtn = document.getElementById('show-odds-btn');
        const strategyBtn = document.getElementById('show-strategy-btn');
        const statsBtn = document.getElementById('show-stats-btn');
        
        // 更新缓存的元素引用
        if (oddsBtn) this.elements.oddsToggleBtn = oddsBtn;
        if (strategyBtn) this.elements.strategyToggleBtn = strategyBtn;
        if (statsBtn) this.elements.statsToggleBtn = statsBtn;
        
        // 概率计算器面板切换
        if (oddsBtn) {
            // 移除旧监听器（如果有）
            oddsBtn.replaceWith(oddsBtn.cloneNode(true));
            const newOddsBtn = document.getElementById('show-odds-btn');
            this.elements.oddsToggleBtn = newOddsBtn;
            newOddsBtn.addEventListener('click', () => {
                console.log('概率计算器按钮被点击');
                this.togglePanel('odds');
            });
        }
        
        // 攻略建议面板切换
        if (strategyBtn) {
            strategyBtn.replaceWith(strategyBtn.cloneNode(true));
            const newStrategyBtn = document.getElementById('show-strategy-btn');
            this.elements.strategyToggleBtn = newStrategyBtn;
            newStrategyBtn.addEventListener('click', () => {
                console.log('攻略建议按钮被点击');
                this.togglePanel('strategy');
            });
        }
        
        // 数据统计面板切换
        if (statsBtn) {
            statsBtn.replaceWith(statsBtn.cloneNode(true));
            const newStatsBtn = document.getElementById('show-stats-btn');
            this.elements.statsToggleBtn = newStatsBtn;
            newStatsBtn.addEventListener('click', () => {
                console.log('数据统计按钮被点击');
                this.togglePanel('stats');
            });
        }
        
        // 面板内关闭按钮
        document.querySelectorAll('.toggle-panel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = e.target.closest('.odds-panel, .strategy-panel, .stats-panel');
                if (panel) {
                    panel.classList.remove('active');
                    // 更新对应工具栏按钮状态
                    if (panel.classList.contains('odds-panel')) {
                        this.panelStates.odds = false;
                        this.elements.oddsToggleBtn?.classList.remove('active');
                    } else if (panel.classList.contains('strategy-panel')) {
                        this.panelStates.strategy = false;
                        this.elements.strategyToggleBtn?.classList.remove('active');
                    } else if (panel.classList.contains('stats-panel')) {
                        this.panelStates.stats = false;
                        this.elements.statsToggleBtn?.classList.remove('active');
                    }
                }
            });
        });
        
        // ALL IN 按钮点击动画
        if (this.elements.allinBtn) {
            this.elements.allinBtn.addEventListener('click', () => {
                if (!this.elements.allinBtn.disabled) {
                    this.elements.allinBtn.classList.add('clicked');
                    setTimeout(() => {
                        this.elements.allinBtn.classList.remove('clicked');
                    }, 600);
                }
            });
        }
        
        // 初始化面板拖拽功能
        this.initPanelDragging();
    }

    /**
     * 初始化面板拖拽功能
     */
    initPanelDragging() {
        const panels = [
            this.elements.oddsPanel,
            this.elements.strategyPanel,
            this.elements.statsPanel
        ];
        
        panels.forEach(panel => {
            if (!panel) return;
            
            const header = panel.querySelector('.panel-header');
            if (!header) return;
            
            let isDragging = false;
            let startX, startY;
            let initialLeft, initialTop;
            
            // 添加拖拽手柄样式
            header.style.cursor = 'move';
            
            // 鼠标事件
            header.addEventListener('mousedown', (e) => {
                // 如果点击的是关闭按钮，不启动拖拽
                if (e.target.classList.contains('toggle-panel-btn')) return;
                
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                
                // 获取当前位置
                const rect = panel.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                
                // 确保面板使用绝对定位
                panel.style.position = 'fixed';
                panel.style.left = `${initialLeft}px`;
                panel.style.top = `${initialTop}px`;
                panel.style.right = 'auto';
                
                // 添加拖拽中样式
                panel.classList.add('dragging');
                
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newLeft = initialLeft + deltaX;
                let newTop = initialTop + deltaY;
                
                // 边界限制
                const panelRect = panel.getBoundingClientRect();
                const maxLeft = window.innerWidth - panelRect.width;
                const maxTop = window.innerHeight - panelRect.height;
                
                newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                newTop = Math.max(0, Math.min(newTop, maxTop));
                
                panel.style.left = `${newLeft}px`;
                panel.style.top = `${newTop}px`;
            });
            
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    panel.classList.remove('dragging');
                }
            });
            
            // 触摸事件（移动端）
            header.addEventListener('touchstart', (e) => {
                if (e.target.classList.contains('toggle-panel-btn')) return;
                
                const touch = e.touches[0];
                isDragging = true;
                startX = touch.clientX;
                startY = touch.clientY;
                
                const rect = panel.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                
                panel.style.position = 'fixed';
                panel.style.left = `${initialLeft}px`;
                panel.style.top = `${initialTop}px`;
                panel.style.right = 'auto';
                
                panel.classList.add('dragging');
            }, { passive: true });
            
            header.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                
                const touch = e.touches[0];
                const deltaX = touch.clientX - startX;
                const deltaY = touch.clientY - startY;
                
                let newLeft = initialLeft + deltaX;
                let newTop = initialTop + deltaY;
                
                const panelRect = panel.getBoundingClientRect();
                const maxLeft = window.innerWidth - panelRect.width;
                const maxTop = window.innerHeight - panelRect.height;
                
                newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                newTop = Math.max(0, Math.min(newTop, maxTop));
                
                panel.style.left = `${newLeft}px`;
                panel.style.top = `${newTop}px`;
            }, { passive: true });
            
            header.addEventListener('touchend', () => {
                if (isDragging) {
                    isDragging = false;
                    panel.classList.remove('dragging');
                }
            });
        });
    }

    /**
     * 切换面板显示
     * @param {string} panelType - 面板类型 ('odds' | 'strategy' | 'stats')
     */
    togglePanel(panelType) {
        const panelMap = {
            odds: { panel: this.elements.oddsPanel, btn: this.elements.oddsToggleBtn },
            strategy: { panel: this.elements.strategyPanel, btn: this.elements.strategyToggleBtn },
            stats: { panel: this.elements.statsPanel, btn: this.elements.statsToggleBtn }
        };
        
        const { panel, btn } = panelMap[panelType];
        
        if (!panel) return;
        
        this.panelStates[panelType] = !this.panelStates[panelType];
        
        if (this.panelStates[panelType]) {
            panel.classList.add('active');
            btn?.classList.add('active');
            // 打开面板时立即更新数据
            this.updatePanelsData();
        } else {
            panel.classList.remove('active');
            btn?.classList.remove('active');
        }
    }

    /**
     * 更新所有打开的面板数据
     */
    updatePanelsData() {
        if (!this.gameState) return;
        
        const humanPlayer = this.gameState.players.find(p => p.isHuman);
        if (!humanPlayer || humanPlayer.holeCards.length < 2) return;
        
        // 获取阶段名称
        const phaseName = this.gameState.phaseName || 'Preflop';
        
        // 计算赔率和建议
        const oddsInfo = this.oddsCalculator.calculateOdds(
            humanPlayer.holeCards,
            this.gameState.communityCards,
            this.gameState.players.length
        );
        
        const advice = this.oddsCalculator.getAdvice(
            humanPlayer.holeCards,
            this.gameState.communityCards,
            this.gameState.pot,
            this.gameState.currentBet - humanPlayer.currentBet,
            humanPlayer.chips,
            this.gameState.players.filter(p => p.canAct()).length
        );
        
        // 更新概率计算器面板
        if (this.panelStates.odds) {
            this.updateOddsPanel(oddsInfo, phaseName);
        }
        
        // 更新攻略建议面板
        if (this.panelStates.strategy) {
            this.updateStrategyPanel(advice);
        }
        
        // 更新数据统计面板
        if (this.panelStates.stats) {
            this.updateStatsPanel(humanPlayer);
        }
    }

    /**
     * 更新概率计算器面板
     * @param {Object} oddsInfo - 赔率信息
     * @param {string} phaseName - 阶段名称
     */
    updateOddsPanel(oddsInfo, phaseName) {
        // 胜率
        if (this.elements.winProbValue) {
            this.elements.winProbValue.textContent = Math.round(oddsInfo.winProbability);
        }
        
        // 当前牌型
        if (this.elements.handCategory) {
            this.elements.handCategory.textContent = oddsInfo.currentHand || '等待发牌';
        }
        
        // 手牌强度条
        if (this.elements.strengthFill) {
            this.elements.strengthFill.style.width = `${oddsInfo.handStrength}%`;
        }
        
        // 手牌表示
        if (this.elements.handKey) {
            this.elements.handKey.textContent = oddsInfo.handKey || '';
        }
        
        // 听牌列表
        if (this.elements.drawsList) {
            this.elements.drawsList.innerHTML = '';
            
            if (oddsInfo.draws && oddsInfo.draws.length > 0) {
                oddsInfo.draws.forEach(draw => {
                    const item = document.createElement('div');
                    item.className = 'draw-item';
                    item.innerHTML = `
                        <span class="draw-name">${draw.name}</span>
                        <span class="draw-outs">${draw.outs} outs (${draw.probability}%)</span>
                    `;
                    this.elements.drawsList.appendChild(item);
                });
            } else {
                const noDraws = document.createElement('div');
                noDraws.className = 'draw-item';
                noDraws.innerHTML = `<span class="draw-name">无明显听牌</span>`;
                this.elements.drawsList.appendChild(noDraws);
            }
        }
        
        // 各牌型概率
        if (this.elements.probsList) {
            this.elements.probsList.innerHTML = '';
            
            const handTypes = [
                { name: '皇家同花顺', achieved: oddsInfo.handRank === 9 },
                { name: '同花顺', achieved: oddsInfo.handRank === 8 },
                { name: '四条', achieved: oddsInfo.handRank === 7 },
                { name: '葫芦', achieved: oddsInfo.handRank === 6 },
                { name: '同花', achieved: oddsInfo.handRank === 5 },
                { name: '顺子', achieved: oddsInfo.handRank === 4 },
                { name: '三条', achieved: oddsInfo.handRank === 3 },
                { name: '两对', achieved: oddsInfo.handRank === 2 },
                { name: '一对', achieved: oddsInfo.handRank === 1 },
                { name: '高牌', achieved: oddsInfo.handRank === 0 }
            ];
            
            handTypes.forEach(ht => {
                const item = document.createElement('div');
                item.className = `prob-item ${ht.achieved ? 'achieved' : ''}`;
                item.innerHTML = `
                    <span class="prob-name">${ht.name}</span>
                    <span class="prob-percent">${ht.achieved ? '✓' : '-'}</span>
                `;
                this.elements.probsList.appendChild(item);
            });
        }
    }

    /**
     * 更新攻略建议面板
     * @param {Object} advice - 建议信息
     */
    updateStrategyPanel(advice) {
        // 建议图标和动作
        const iconMap = {
            'FOLD': '🚫',
            'CHECK': '✋',
            'CALL': '📞',
            'RAISE': '💪',
            'ALLIN': '🔥'
        };
        
        const actionTextMap = {
            'FOLD': '弃牌',
            'CHECK': '过牌',
            'CALL': '跟注',
            'RAISE': '加注',
            'ALLIN': 'ALL IN'
        };
        
        // 更新建议动作区域
        if (this.elements.adviceAction) {
            const icon = iconMap[advice.action] || '🤔';
            const text = actionTextMap[advice.action] || advice.action;
            this.elements.adviceAction.innerHTML = `
                <span class="advice-icon">${icon}</span>
                <span class="advice-text">${text}</span>
            `;
        }
        
        // 置信度
        if (this.elements.confidenceFill) {
            this.elements.confidenceFill.style.width = `${advice.confidence}%`;
        }
        
        if (this.elements.confidenceText) {
            let confidenceLevel = '低';
            if (advice.confidence >= 80) confidenceLevel = '非常高';
            else if (advice.confidence >= 60) confidenceLevel = '高';
            else if (advice.confidence >= 40) confidenceLevel = '中等';
            this.elements.confidenceText.textContent = `置信度: ${confidenceLevel} (${advice.confidence}%)`;
        }
        
        // 原因
        if (this.elements.adviceReason) {
            this.elements.adviceReason.textContent = advice.reason || '根据当前牌局情况分析';
        }
        
        // 详细信息
        if (this.elements.detailsList) {
            this.elements.detailsList.innerHTML = '';
            
            if (advice.details && advice.details.length > 0) {
                advice.details.forEach(detail => {
                    const li = document.createElement('li');
                    li.textContent = detail;
                    this.elements.detailsList.appendChild(li);
                });
            }
        }
    }

    /**
     * 更新数据统计面板
     * @param {Player} humanPlayer - 人类玩家
     */
    updateStatsPanel(humanPlayer) {
        // 底池金额
        if (this.elements.statPot) {
            this.elements.statPot.textContent = this.formatNumber(this.gameState.pot);
        }
        
        // 需要跟注金额
        if (this.elements.statToCall) {
            const toCall = this.gameState.currentBet - humanPlayer.currentBet;
            this.elements.statToCall.textContent = this.formatNumber(Math.max(0, toCall));
        }
        
        // 底池赔率
        if (this.elements.statPotOdds) {
            const toCall = (this.gameState.currentBet || 0) - (humanPlayer.currentBet || 0);
            const pot = this.gameState.pot || 0;
            if (toCall > 0 && (pot + toCall) > 0) {
                const potOdds = ((toCall / (pot + toCall)) * 100).toFixed(1);
                this.elements.statPotOdds.textContent = isNaN(potOdds) ? '--' : `${potOdds}%`;
            } else {
                this.elements.statPotOdds.textContent = '--';
            }
        }
        
        // 活跃玩家数
        if (this.elements.statActivePlayers) {
            const activePlayers = this.gameState.players.filter(p => p.canAct()).length;
            this.elements.statActivePlayers.textContent = activePlayers;
        }
        
        // 各玩家筹码列表
        if (this.elements.playersChipsList) {
            this.elements.playersChipsList.innerHTML = '';
            
            this.gameState.players.forEach(player => {
                const item = document.createElement('div');
                item.className = 'player-chip-item';
                
                if (player.isHuman) {
                    item.classList.add('is-human');
                }
                if (player.status === PLAYER_STATUS.FOLDED) {
                    item.classList.add('is-folded');
                }
                
                const statusBadge = player.status === PLAYER_STATUS.ALLIN ? ' [ALL IN]' :
                                   player.status === PLAYER_STATUS.FOLDED ? ' [弃牌]' : '';
                
                item.innerHTML = `
                    <span>${player.name}${statusBadge}</span>
                    <span>💰 ${this.formatNumber(player.chips)}</span>
                `;
                this.elements.playersChipsList.appendChild(item);
            });
        }
    }

    /**
     * 显示工具栏
     */
    showToolbar() {
        if (this.elements.toolbarButtons) {
            this.elements.toolbarButtons.style.display = 'flex';
        }
    }

    /**
     * 隐藏工具栏
     */
    hideToolbar() {
        if (this.elements.toolbarButtons) {
            this.elements.toolbarButtons.style.display = 'none';
        }
        // 关闭所有面板
        this.elements.oddsPanel?.classList.remove('active');
        this.elements.strategyPanel?.classList.remove('active');
        this.elements.statsPanel?.classList.remove('active');
        this.panelStates = { odds: false, strategy: false, stats: false };
    }
}
