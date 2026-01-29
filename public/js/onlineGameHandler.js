/**
 * 在线游戏处理器
 * 处理服务器端发来的游戏事件，并将状态同步到 UI
 */
class OnlineGameHandler {
    constructor() {
        this.socket = null;
        this.mySocketId = null;
        this.currentRoom = null;
        this.myHoleCards = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.isMyTurn = false;
        this.phase = 'preflop';
        this.players = new Map();
        
        // UI 元素引用
        this.elements = {
            communityCards: document.getElementById('community-cards'),
            playersContainer: document.getElementById('players-container'),
            potAmount: document.getElementById('pot-amount'),
            playerChipsDisplay: document.getElementById('player-chips-display'),
            playerStatus: document.getElementById('player-status'),
            playerHand: document.getElementById('player-hand'),
            phaseIndicator: document.querySelector('.phase-indicator'),
            foldBtn: document.getElementById('fold-btn'),
            checkCallBtn: document.getElementById('check-call-btn'),
            raiseBtn: document.getElementById('raise-btn'),
            allinBtn: document.getElementById('allin-btn'),
            betSlider: document.getElementById('bet-slider'),
            betAmountInput: document.getElementById('bet-amount-input')
        };
    }

    /**
     * 初始化 Socket 连接（从 lobbyManager 获取）
     */
    initSocket(socket, myId) {
        this.socket = socket;
        this.mySocketId = myId;
        this.setupSocketListeners();
    }

    /**
     * 设置 Socket 监听器
     */
    setupSocketListeners() {
        if (!this.socket) return;

        // 游戏开始
        this.socket.on('gameStarted', (data) => this.handleGameStarted(data));
        
        // 新一手牌
        this.socket.on('newHand', (data) => this.handleNewHand(data));
        
        // 操作结果
        this.socket.on('actionResult', (data) => this.handleActionResult(data));
        
        // 轮到你行动
        this.socket.on('yourTurn', (data) => this.handleYourTurn(data));
        
        // 阶段变化
        this.socket.on('phaseChanged', (data) => this.handlePhaseChanged(data));
        
        // 手牌结束
        this.socket.on('handEnded', (data) => this.handleHandEnded(data));
        
        // 游戏结束
        this.socket.on('gameEnded', (data) => this.handleGameEnded(data));
        
        // 操作错误
        this.socket.on('actionError', (data) => this.handleActionError(data));
    }

    /**
     * 处理游戏开始
     */
    handleGameStarted(data) {
        console.log('游戏开始:', data);
        
        this.currentRoom = data.room;
        this.myHoleCards = data.yourCards || [];
        this.pot = data.pot || 0;
        this.currentBet = data.currentBet || 0;
        this.isMyTurn = data.isYourTurn || false;
        this.phase = 'preflop';
        this.communityCards = [];
        
        // 解析房间内玩家
        this.parseRoomPlayers(data.room);
        
        // 渲染初始游戏状态
        this.renderGameTable();
        this.renderMyHand();
        this.updatePotDisplay();
        this.updatePhaseDisplay();
        
        // 处理盲注
        if (data.blinds) {
            this.showBlindInfo(data.blinds);
        }
        
        // 如果是我的回合
        if (this.isMyTurn) {
            this.enableActionButtons();
            this.showYourTurnIndicator();
        } else {
            this.disableActionButtons();
        }
        
        // 添加游戏日志
        this.addGameLog('🎮 游戏开始！');
    }

    /**
     * 处理新一手牌
     */
    handleNewHand(data) {
        console.log('新一手牌:', data);
        
        this.myHoleCards = data.yourCards || [];
        this.pot = data.pot || 0;
        this.currentBet = data.currentBet || 0;
        this.isMyTurn = data.isYourTurn || false;
        this.phase = 'preflop';
        this.communityCards = [];
        
        // 重新解析玩家状态
        this.parseRoomPlayers(data.room);
        
        // 重新渲染
        this.clearCommunityCards();
        this.renderGameTable();
        this.renderMyHand();
        this.updatePotDisplay();
        this.updatePhaseDisplay();
        
        if (data.blinds) {
            this.showBlindInfo(data.blinds);
        }
        
        if (this.isMyTurn) {
            this.enableActionButtons();
            this.showYourTurnIndicator();
        } else {
            this.disableActionButtons();
        }
        
        this.addGameLog('🃏 新一手牌开始');
    }

    /**
     * 处理操作结果
     */
    handleActionResult(data) {
        console.log('操作结果:', data);
        
        this.pot = data.pot;
        this.currentBet = data.currentBet;
        
        // 更新玩家状态
        if (data.room) {
            this.parseRoomPlayers(data.room);
        }
        
        // 显示操作动画/提示
        this.showActionAnimation(data.playerId, data.action, data.amount);
        
        // 更新 UI
        this.updatePotDisplay();
        this.renderGameTable();
        
        // 添加日志
        const playerName = this.getPlayerName(data.playerId);
        const actionText = this.getActionText(data.action, data.amount);
        this.addGameLog(`${playerName} ${actionText}`);
        
        // 如果下一个是我
        if (data.nextPlayerId === this.mySocketId) {
            this.isMyTurn = true;
            this.enableActionButtons();
            this.showYourTurnIndicator();
        } else {
            this.isMyTurn = false;
            this.disableActionButtons();
            this.hideYourTurnIndicator();
        }
    }

    /**
     * 处理轮到你行动
     */
    handleYourTurn(data) {
        console.log('轮到你行动:', data);
        
        this.isMyTurn = true;
        this.pot = data.pot;
        this.currentBet = data.currentBet;
        
        this.updatePotDisplay();
        this.enableActionButtons(data.availableActions);
        this.showYourTurnIndicator();
        
        // 播放提示音
        if (window.soundManager) {
            window.soundManager.playSound('yourTurn');
        }
    }

    /**
     * 处理阶段变化
     */
    handlePhaseChanged(data) {
        console.log('阶段变化:', data);
        
        this.phase = data.newPhase;
        this.communityCards = data.communityCards || [];
        this.currentBet = 0;
        
        // 显示新公共牌
        this.renderCommunityCards(data.newCards, true);
        this.updatePhaseDisplay();
        
        // 显示阶段提示
        this.showPhaseAnnouncement(data.newPhase);
        
        // 添加日志
        const phaseNames = {
            'flop': '翻牌',
            'turn': '转牌',
            'river': '河牌'
        };
        this.addGameLog(`📍 ${phaseNames[data.newPhase] || data.newPhase}`);
        
        // 如果下一个是我
        if (data.nextPlayerId === this.mySocketId) {
            this.isMyTurn = true;
            this.enableActionButtons();
            this.showYourTurnIndicator();
        } else {
            this.isMyTurn = false;
            this.disableActionButtons();
        }
    }

    /**
     * 处理手牌结束
     */
    handleHandEnded(data) {
        console.log('手牌结束:', data);
        
        this.isMyTurn = false;
        this.disableActionButtons();
        this.hideYourTurnIndicator();
        
        // 显示结果
        this.showHandResult(data);
        
        // 添加日志
        if (data.winners && data.winners.length > 0) {
            data.winners.forEach(w => {
                this.addGameLog(`🏆 ${w.name} 赢得 ${w.winAmount} 筹码`);
                if (w.evaluation) {
                    this.addGameLog(`   牌型: ${w.evaluation.description}`);
                }
            });
        }
        
        // 如果是摊牌，显示所有人的手牌
        if (data.reason === 'showdown' && data.allHands) {
            this.showAllHands(data.allHands);
        }
    }

    /**
     * 处理游戏结束
     */
    handleGameEnded(data) {
        console.log('游戏结束:', data);
        
        this.showGameOverModal(data);
        this.addGameLog('🎊 游戏结束！');
    }

    /**
     * 处理操作错误
     */
    handleActionError(data) {
        console.log('操作错误:', data);
        this.showErrorMessage(data.error);
    }

    // ==================== UI 渲染方法 ====================

    /**
     * 解析房间玩家
     */
    parseRoomPlayers(room) {
        this.players.clear();
        if (!room || !room.players) return;
        
        room.players.forEach(p => {
            this.players.set(p.id, {
                id: p.id,
                name: p.name || p.nickname,
                avatar: p.avatar,
                chips: p.chips,
                currentBet: p.currentBet || 0,
                status: p.status,
                isDealer: p.isDealer,
                isSmallBlind: p.isSmallBlind,
                isBigBlind: p.isBigBlind,
                seatIndex: p.seatIndex,
                holeCards: p.holeCards
            });
        });
    }

    /**
     * 渲染游戏桌面
     */
    renderGameTable() {
        if (!this.elements.playersContainer) return;
        
        const playerCount = this.players.size;
        const positions = this.getPlayerPositions(playerCount);
        
        let html = '';
        let index = 0;
        
        for (const [playerId, player] of this.players) {
            const isMe = playerId === this.mySocketId;
            const isFolded = player.status === 'folded';
            const isAllIn = player.status === 'allin';
            const isActive = player.status === 'playing';
            
            const posClass = positions[index] || 'position-bottom';
            
            html += `
                <div class="player-seat ${posClass} ${isFolded ? 'folded' : ''} ${isAllIn ? 'all-in' : ''} ${isMe ? 'is-human' : ''}"
                     data-player-id="${playerId}">
                    <div class="player-avatar">${player.avatar || '👤'}</div>
                    <div class="player-info">
                        <div class="player-name">${player.name}${player.isDealer ? ' 🎯' : ''}</div>
                        <div class="player-chips">💰 ${player.chips?.toLocaleString() || 0}</div>
                    </div>
                    ${player.currentBet > 0 ? `<div class="player-bet">下注: ${player.currentBet}</div>` : ''}
                    ${isAllIn ? '<div class="player-status-badge all-in-badge">ALL IN</div>' : ''}
                    ${isFolded ? '<div class="player-status-badge folded-badge">弃牌</div>' : ''}
                    ${!isMe && player.holeCards && player.holeCards.length > 0 ? this.renderPlayerCards(player.holeCards, isFolded) : ''}
                </div>
            `;
            index++;
        }
        
        this.elements.playersContainer.innerHTML = html;
    }

    /**
     * 获取玩家位置样式
     */
    getPlayerPositions(count) {
        const positionMaps = {
            2: ['position-top', 'position-bottom'],
            3: ['position-top', 'position-left', 'position-right'],
            4: ['position-top', 'position-left', 'position-right', 'position-bottom'],
            5: ['position-top', 'position-top-left', 'position-left', 'position-right', 'position-top-right'],
            6: ['position-top', 'position-top-left', 'position-left', 'position-right', 'position-top-right', 'position-bottom']
        };
        return positionMaps[count] || positionMaps[6];
    }

    /**
     * 渲染玩家卡牌（用于摊牌显示）
     */
    renderPlayerCards(cards, isFolded) {
        if (!cards || cards.length === 0) return '';
        
        let html = '<div class="player-cards">';
        cards.forEach(card => {
            if (card) {
                html += this.createCardElement(card, !isFolded);
            }
        });
        html += '</div>';
        return html;
    }

    /**
     * 创建卡牌 HTML
     */
    createCardElement(card, faceUp = true) {
        if (!faceUp || !card) {
            return '<div class="poker-card card-back"></div>';
        }
        
        const suitSymbols = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        };
        
        const suitClass = card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black';
        const symbol = suitSymbols[card.suit] || card.suit;
        
        return `
            <div class="poker-card ${suitClass}">
                <span class="card-rank">${card.rank}</span>
                <span class="card-suit">${symbol}</span>
            </div>
        `;
    }

    /**
     * 渲染我的手牌
     */
    renderMyHand() {
        if (!this.elements.playerHand) return;
        
        let html = '';
        if (this.myHoleCards && this.myHoleCards.length > 0) {
            this.myHoleCards.forEach(card => {
                html += this.createCardElement(card, true);
            });
        }
        
        this.elements.playerHand.innerHTML = html;
        
        // 更新我的筹码显示
        const myPlayer = this.players.get(this.mySocketId);
        if (myPlayer && this.elements.playerChipsDisplay) {
            this.elements.playerChipsDisplay.textContent = myPlayer.chips?.toLocaleString() || '0';
        }
    }

    /**
     * 渲染公共牌
     */
    renderCommunityCards(newCards = null, animate = false) {
        if (!this.elements.communityCards) return;
        
        let html = '';
        
        // 渲染已有的公共牌
        this.communityCards.forEach((card, index) => {
            const isNew = newCards && newCards.some(nc => 
                nc.suit === card.suit && nc.rank === card.rank
            );
            html += `
                <div class="community-card-slot ${isNew && animate ? 'card-dealing' : ''}">
                    ${this.createCardElement(card, true)}
                </div>
            `;
        });
        
        // 补充空位
        for (let i = this.communityCards.length; i < 5; i++) {
            html += '<div class="card-placeholder"></div>';
        }
        
        this.elements.communityCards.innerHTML = html;
        
        // 播放发牌音效
        if (newCards && newCards.length > 0 && window.soundManager) {
            window.soundManager.playSound('deal');
        }
    }

    /**
     * 清空公共牌
     */
    clearCommunityCards() {
        if (!this.elements.communityCards) return;
        this.elements.communityCards.innerHTML = `
            <div class="card-placeholder"></div>
            <div class="card-placeholder"></div>
            <div class="card-placeholder"></div>
            <div class="card-placeholder"></div>
            <div class="card-placeholder"></div>
        `;
    }

    /**
     * 更新底池显示
     */
    updatePotDisplay() {
        if (this.elements.potAmount) {
            this.elements.potAmount.textContent = this.pot?.toLocaleString() || '0';
        }
    }

    /**
     * 更新阶段显示
     */
    updatePhaseDisplay() {
        if (!this.elements.phaseIndicator) return;
        
        const phaseNames = {
            'preflop': '翻牌前',
            'flop': '翻牌',
            'turn': '转牌',
            'river': '河牌',
            'showdown': '摊牌'
        };
        
        this.elements.phaseIndicator.textContent = phaseNames[this.phase] || this.phase;
    }

    // ==================== 操作按钮控制 ====================

    /**
     * 启用操作按钮
     */
    enableActionButtons(availableActions = null) {
        const myPlayer = this.players.get(this.mySocketId);
        if (!myPlayer) return;
        
        const canCheck = myPlayer.currentBet >= this.currentBet;
        const callAmount = this.currentBet - (myPlayer.currentBet || 0);
        const minRaise = this.currentBet * 2;
        
        // 弃牌按钮始终可用
        if (this.elements.foldBtn) {
            this.elements.foldBtn.disabled = false;
        }
        
        // 过牌/跟注按钮
        if (this.elements.checkCallBtn) {
            this.elements.checkCallBtn.disabled = false;
            const btnText = this.elements.checkCallBtn.querySelector('.btn-text');
            const btnAmount = this.elements.checkCallBtn.querySelector('.btn-amount');
            
            if (canCheck) {
                if (btnText) btnText.textContent = '过牌';
                if (btnAmount) btnAmount.textContent = '';
            } else {
                if (btnText) btnText.textContent = callAmount >= myPlayer.chips ? '跟注(全押)' : '跟注';
                if (btnAmount) btnAmount.textContent = Math.min(callAmount, myPlayer.chips);
            }
        }
        
        // 加注按钮
        if (this.elements.raiseBtn) {
            const canRaise = myPlayer.chips > callAmount;
            this.elements.raiseBtn.disabled = !canRaise;
            
            // 设置滑块范围
            if (this.elements.betSlider && canRaise) {
                this.elements.betSlider.min = minRaise;
                this.elements.betSlider.max = myPlayer.chips + (myPlayer.currentBet || 0);
                this.elements.betSlider.value = minRaise;
            }
            if (this.elements.betAmountInput) {
                this.elements.betAmountInput.value = minRaise;
            }
        }
        
        // All-in 按钮
        if (this.elements.allinBtn) {
            this.elements.allinBtn.disabled = myPlayer.chips <= 0;
        }
        
        // 绑定按钮事件
        this.bindActionButtons();
    }

    /**
     * 禁用操作按钮
     */
    disableActionButtons() {
        ['foldBtn', 'checkCallBtn', 'raiseBtn', 'allinBtn'].forEach(btnName => {
            if (this.elements[btnName]) {
                this.elements[btnName].disabled = true;
            }
        });
    }

    /**
     * 绑定操作按钮事件
     */
    bindActionButtons() {
        // 弃牌
        if (this.elements.foldBtn) {
            this.elements.foldBtn.onclick = () => this.sendAction('fold');
        }
        
        // 过牌/跟注
        if (this.elements.checkCallBtn) {
            this.elements.checkCallBtn.onclick = () => {
                const myPlayer = this.players.get(this.mySocketId);
                const canCheck = myPlayer && myPlayer.currentBet >= this.currentBet;
                this.sendAction(canCheck ? 'check' : 'call');
            };
        }
        
        // 加注
        if (this.elements.raiseBtn) {
            this.elements.raiseBtn.onclick = () => {
                const amount = parseInt(this.elements.betAmountInput?.value || 0);
                this.sendAction('raise', amount);
            };
        }
        
        // All-in
        if (this.elements.allinBtn) {
            this.elements.allinBtn.onclick = () => this.sendAction('allin');
        }
    }

    /**
     * 发送操作到服务器
     */
    sendAction(action, amount = 0) {
        if (!this.socket || !this.isMyTurn) return;
        
        console.log('发送操作:', action, amount);
        this.socket.emit('playerAction', { action, amount });
        
        // 禁用按钮，防止重复点击
        this.disableActionButtons();
        this.hideYourTurnIndicator();
        this.isMyTurn = false;
        
        // 播放音效
        if (window.soundManager) {
            if (action === 'fold') {
                window.soundManager.playSound('fold');
            } else {
                window.soundManager.playSound('chips');
            }
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 获取玩家名字
     */
    getPlayerName(playerId) {
        const player = this.players.get(playerId);
        return player?.name || '未知玩家';
    }

    /**
     * 获取操作文本
     */
    getActionText(action, amount) {
        const actions = {
            'fold': '弃牌',
            'check': '过牌',
            'call': `跟注 ${amount}`,
            'raise': `加注到 ${amount}`,
            'allin': `全押 ${amount}`
        };
        return actions[action] || action;
    }

    /**
     * 显示盲注信息
     */
    showBlindInfo(blinds) {
        if (blinds.smallBlind) {
            const sbName = this.getPlayerName(blinds.smallBlind.playerId);
            this.addGameLog(`${sbName} 下小盲注 ${blinds.smallBlind.amount}`);
        }
        if (blinds.bigBlind) {
            const bbName = this.getPlayerName(blinds.bigBlind.playerId);
            this.addGameLog(`${bbName} 下大盲注 ${blinds.bigBlind.amount}`);
        }
    }

    /**
     * 显示操作动画
     */
    showActionAnimation(playerId, action, amount) {
        const playerSeat = document.querySelector(`[data-player-id="${playerId}"]`);
        if (!playerSeat) return;
        
        // 添加操作指示器
        const indicator = document.createElement('div');
        indicator.className = `action-indicator action-${action}`;
        indicator.textContent = this.getActionText(action, amount);
        playerSeat.appendChild(indicator);
        
        // 动画后移除
        setTimeout(() => indicator.remove(), 2000);
    }

    /**
     * 显示轮到你行动指示器
     */
    showYourTurnIndicator() {
        // 移除已有的指示器
        this.hideYourTurnIndicator();
        
        const indicator = document.createElement('div');
        indicator.className = 'your-turn-indicator';
        indicator.innerHTML = '<span>⏰ 轮到你行动</span>';
        document.body.appendChild(indicator);
        
        // 更新状态显示
        if (this.elements.playerStatus) {
            this.elements.playerStatus.textContent = '轮到你行动！';
        }
    }

    /**
     * 隐藏轮到你行动指示器
     */
    hideYourTurnIndicator() {
        const indicator = document.querySelector('.your-turn-indicator');
        if (indicator) indicator.remove();
        
        if (this.elements.playerStatus) {
            this.elements.playerStatus.textContent = '等待中...';
        }
    }

    /**
     * 显示阶段公告
     */
    showPhaseAnnouncement(phase) {
        const phaseNames = {
            'flop': '翻牌',
            'turn': '转牌',
            'river': '河牌',
            'showdown': '摊牌'
        };
        
        const announcement = document.createElement('div');
        announcement.className = 'phase-announcement';
        announcement.innerHTML = `
            <h2>${phaseNames[phase] || phase}</h2>
            <p>${this.getPhaseDescription(phase)}</p>
        `;
        document.body.appendChild(announcement);
        
        // 自动移除
        setTimeout(() => announcement.remove(), 2000);
    }

    /**
     * 获取阶段描述
     */
    getPhaseDescription(phase) {
        const descriptions = {
            'flop': '发出三张公共牌',
            'turn': '发出第四张公共牌',
            'river': '发出第五张公共牌',
            'showdown': '比较手牌大小'
        };
        return descriptions[phase] || '';
    }

    /**
     * 显示手牌结果
     */
    showHandResult(data) {
        const modal = document.getElementById('result-modal');
        const resultTitle = document.getElementById('result-title');
        const resultDetails = document.getElementById('result-details');
        
        if (!modal) return;
        
        let title = '本轮结果';
        let html = '';
        
        if (data.winners && data.winners.length > 0) {
            data.winners.forEach(winner => {
                const isMe = winner.playerId === this.mySocketId;
                html += `
                    <div class="winner-info ${isMe ? 'is-me' : ''}">
                        <span class="winner-icon">${isMe ? '🎉' : '🏆'}</span>
                        <span class="winner-name">${winner.name}</span>
                        <span class="winner-amount">+${winner.winAmount}</span>
                        ${winner.evaluation ? `<span class="winner-hand">${winner.evaluation.description}</span>` : ''}
                    </div>
                `;
                
                if (isMe) {
                    title = '🎉 恭喜你赢了！';
                }
            });
        }
        
        if (resultTitle) resultTitle.textContent = title;
        if (resultDetails) resultDetails.innerHTML = html;
        
        modal.classList.add('active');
        
        // 绑定下一轮按钮
        const nextRoundBtn = document.getElementById('next-round-btn');
        if (nextRoundBtn) {
            nextRoundBtn.onclick = () => {
                modal.classList.remove('active');
                // 房主可以开始下一手
                this.socket?.emit('nextHand');
            };
        }
    }

    /**
     * 显示所有玩家手牌（摊牌时）
     */
    showAllHands(allHands) {
        // 更新每个玩家位置显示手牌
        allHands.forEach(hand => {
            const playerSeat = document.querySelector(`[data-player-id="${hand.playerId}"]`);
            if (playerSeat && hand.holeCards) {
                let cardsHtml = '<div class="player-cards showdown">';
                hand.holeCards.forEach(card => {
                    cardsHtml += this.createCardElement(card, true);
                });
                cardsHtml += `<div class="hand-type">${hand.evaluation?.description || ''}</div>`;
                cardsHtml += '</div>';
                
                const existingCards = playerSeat.querySelector('.player-cards');
                if (existingCards) {
                    existingCards.outerHTML = cardsHtml;
                } else {
                    playerSeat.insertAdjacentHTML('beforeend', cardsHtml);
                }
            }
        });
    }

    /**
     * 显示游戏结束弹窗
     */
    showGameOverModal(data) {
        const modal = document.getElementById('gameover-modal');
        const title = document.getElementById('gameover-title');
        const details = document.getElementById('gameover-details');
        
        if (!modal) return;
        
        const winner = data.winner;
        const isMe = winner?.id === this.mySocketId;
        
        if (title) {
            title.textContent = isMe ? '🎊 恭喜你获胜！' : '游戏结束';
        }
        
        if (details) {
            details.innerHTML = `
                <div class="gameover-winner">
                    <span class="winner-avatar">${winner?.avatar || '👑'}</span>
                    <span class="winner-name">${winner?.name || '获胜者'}</span>
                    <span class="winner-chips">筹码: ${winner?.chips?.toLocaleString() || 0}</span>
                </div>
            `;
        }
        
        modal.classList.add('active');
    }

    /**
     * 显示错误消息
     */
    showErrorMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-message toast-error';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: #f44336;
            color: white;
            border-radius: 8px;
            z-index: 10001;
            animation: toastIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    /**
     * 添加游戏日志
     */
    addGameLog(message) {
        const logContent = document.getElementById('log-content');
        if (!logContent) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }
}

// 创建全局实例
window.onlineGameHandler = new OnlineGameHandler();
