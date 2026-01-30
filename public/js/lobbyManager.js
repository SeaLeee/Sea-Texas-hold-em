/**
 * 联机大厅管理器
 * 处理大厅界面的所有交互逻辑
 */
class LobbyManager {
    constructor() {
        this.selectedAvatar = '😀';
        this.selectedSize = 6;
        this.isConnected = false;
        this.currentRoom = null;
        this.mySocketId = null;
        this.isReady = false;
        
        this.initElements();
        this.initEventListeners();
    }
    
    initElements() {
        // 大厅界面元素
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.roomScreen = document.getElementById('room-screen');
        this.menuScreen = document.getElementById('menu-screen');
        this.gameScreen = document.getElementById('game-screen');
        
        // 连接状态
        this.connectionStatus = document.getElementById('connection-status');
        this.statusDot = this.connectionStatus?.querySelector('.status-dot');
        this.statusText = this.connectionStatus?.querySelector('.status-text');
        
        // 玩家设置
        this.nicknameInput = document.getElementById('player-nickname');
        this.avatarSelector = document.getElementById('avatar-selector');
        
        // 创建房间
        this.roomNameInput = document.getElementById('room-name-input');
        this.roomBlindsSelect = document.getElementById('room-blinds');
        this.roomChipsSelect = document.getElementById('room-chips');
        this.roomPasswordInput = document.getElementById('room-password');
        this.createRoomBtn = document.getElementById('create-room-btn');
        
        // 房间列表
        this.roomList = document.getElementById('room-list');
        this.refreshRoomsBtn = document.getElementById('refresh-rooms-btn');
        
        // 快速加入
        this.roomIdInput = document.getElementById('room-id-input');
        this.joinPasswordInput = document.getElementById('join-password');
        this.quickJoinBtn = document.getElementById('quick-join-btn');
        
        // 房间界面元素
        this.roomTitle = document.getElementById('room-title');
        this.roomIdDisplay = document.getElementById('room-id-display');
        this.roomBlindsDisplay = document.getElementById('room-blinds-display');
        this.roomChipsDisplay = document.getElementById('room-chips-display');
        this.roomPlayersGrid = document.getElementById('room-players-grid');
        this.readyBtn = document.getElementById('ready-btn');
        this.startOnlineBtn = document.getElementById('start-online-btn');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendChatBtn = document.getElementById('send-chat-btn');
        
        // 导航按钮
        this.backToMenuBtn = document.getElementById('back-to-menu-btn');
        this.onlineGameBtn = document.getElementById('online-game-btn');
    }
    
    initEventListeners() {
        // 返回菜单
        this.backToMenuBtn?.addEventListener('click', () => this.goToMenu());
        this.onlineGameBtn?.addEventListener('click', () => this.goToLobby());
        
        // 头像选择
        this.avatarSelector?.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => this.selectAvatar(option));
        });
        
        // 房间大小选择
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectRoomSize(btn));
        });
        
        // 创建房间
        this.createRoomBtn?.addEventListener('click', () => this.createRoom());
        
        // 刷新房间列表
        this.refreshRoomsBtn?.addEventListener('click', () => this.refreshRoomList());
        
        // 快速加入
        this.quickJoinBtn?.addEventListener('click', () => this.quickJoinRoom());
        
        // 房间内操作
        this.readyBtn?.addEventListener('click', () => this.toggleReady());
        this.startOnlineBtn?.addEventListener('click', () => this.startGame());
        this.leaveRoomBtn?.addEventListener('click', () => this.leaveRoom());
        
        // 聊天
        this.sendChatBtn?.addEventListener('click', () => this.sendChat());
        this.chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });
        
        // 随机生成默认昵称
        if (this.nicknameInput && !this.nicknameInput.value) {
            this.nicknameInput.value = '玩家' + Math.floor(Math.random() * 10000);
        }
    }
    
    // 连接到服务器
    async connect() {
        this.updateConnectionStatus('connecting');
        
        try {
            // 动态加载Socket.io客户端
            if (typeof io === 'undefined') {
                await this.loadSocketIO();
            }
            
            // 自动检测服务器URL - 支持本地开发和生产环境
            // 生产环境使用当前页面的origin，本地开发使用3000端口
            const serverUrl = window.location.origin;
            console.log('连接到服务器:', serverUrl);
            
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });
            
            this.socket.on('connect', () => {
                console.log('已连接到服务器');
                this.isConnected = true;
                this.mySocketId = this.socket.id;
                this.updateConnectionStatus('connected');
                this.refreshRoomList();
                
                // 获取服务器状态用于调试
                this.fetchServerStatus();
            });
            
            this.socket.on('disconnect', () => {
                console.log('与服务器断开连接');
                this.isConnected = false;
                this.updateConnectionStatus('disconnected');
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('连接错误:', error);
                this.updateConnectionStatus('disconnected');
                this.showMessage('无法连接到服务器，请确保服务器已启动', 'error');
            });
            
            // 监听服务器事件
            this.setupSocketListeners();
            
        } catch (error) {
            console.error('连接失败:', error);
            this.updateConnectionStatus('disconnected');
            this.showMessage('连接服务器失败', 'error');
        }
    }
    
    loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.onload = resolve;
            script.onerror = () => {
                // 尝试从CDN加载
                const cdnScript = document.createElement('script');
                cdnScript.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
                cdnScript.onload = resolve;
                cdnScript.onerror = reject;
                document.head.appendChild(cdnScript);
            };
            document.head.appendChild(script);
        });
    }
    
    setupSocketListeners() {
        // 房间列表更新
        this.socket.on('roomList', (rooms) => {
            this.updateRoomList(rooms);
        });
        
        // 创建房间结果
        this.socket.on('roomCreated', (data) => {
            if (data.success) {
                this.currentRoom = data.room;
                this.enterRoom(data.room);
            } else {
                this.showMessage(data.message || '创建房间失败', 'error');
            }
        });
        
        // 加入房间结果 (服务器发送 joinRoomResult)
        this.socket.on('joinRoomResult', (data) => {
            if (data.success) {
                this.currentRoom = data.room;
                this.enterRoom(data.room);
            } else {
                this.showMessage(data.error || '加入房间失败', 'error');
            }
        });
        
        // 房间更新
        this.socket.on('roomUpdate', (room) => {
            this.currentRoom = room;
            this.updateRoomDisplay();
        });
        
        // 玩家加入
        this.socket.on('playerJoined', (data) => {
            // 服务器发送的 player 对象使用 name 而不是 nickname
            const playerName = data.player.nickname || data.player.name || '玩家';
            this.addChatMessage(null, `${playerName} 加入了房间`, true);
            this.currentRoom = this.normalizeRoomData(data.room);
            this.updateRoomDisplay();
        });
        
        // 玩家离开
        this.socket.on('playerLeft', (data) => {
            this.addChatMessage(null, `${data.playerName} 离开了房间`, true);
            if (data.newHostId) {
                this.addChatMessage(null, `房主已变更`, true);
            }
            this.currentRoom = this.normalizeRoomData(data.room);
            this.updateRoomDisplay();
        });
        
        // 玩家准备状态变化 (服务器发送 playerReadyChanged)
        this.socket.on('playerReadyChanged', (data) => {
            const statusText = data.isReady ? '已准备' : '取消准备';
            // 找到对应玩家名称
            const player = this.currentRoom?.players?.find(p => p.id === data.playerId);
            const nickname = player?.nickname || player?.name || '玩家';
            this.addChatMessage(null, `${nickname} ${statusText}`, true);
            this.currentRoom = this.normalizeRoomData(data.room);
            this.updateRoomDisplay();
        });
        
        // 游戏开始
        this.socket.on('gameStarted', (data) => {
            this.addChatMessage(null, '游戏开始！', true);
            this.startOnlineGame(data);
        });
        
        // 聊天消息
        this.socket.on('chatMessage', (data) => {
            this.addChatMessage(data.sender, data.message);
        });
        
        // 错误消息
        this.socket.on('error', (data) => {
            this.showMessage(data.message, 'error');
        });
    }
    
    updateConnectionStatus(status) {
        if (!this.statusDot || !this.statusText) return;
        
        this.statusDot.className = 'status-dot ' + status;
        
        switch(status) {
            case 'connected':
                this.statusText.textContent = '已连接';
                break;
            case 'connecting':
                this.statusText.textContent = '连接中...';
                break;
            case 'disconnected':
                this.statusText.textContent = '未连接';
                break;
        }
    }
    
    // 界面切换
    goToMenu() {
        if (this.currentRoom) {
            this.leaveRoom();
        }
        this.switchScreen('menu');
    }
    
    goToLobby() {
        this.switchScreen('lobby');
        if (!this.isConnected) {
            this.connect();
        } else {
            this.refreshRoomList();
        }
    }
    
    switchScreen(screen) {
        // 隐藏所有界面
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        // 显示目标界面
        switch(screen) {
            case 'menu':
                this.menuScreen?.classList.add('active');
                break;
            case 'lobby':
                this.lobbyScreen?.classList.add('active');
                break;
            case 'room':
                this.roomScreen?.classList.add('active');
                break;
            case 'game':
                this.gameScreen?.classList.add('active');
                break;
        }
    }
    
    // 头像选择
    selectAvatar(option) {
        this.avatarSelector.querySelectorAll('.avatar-option').forEach(o => {
            o.classList.remove('selected');
        });
        option.classList.add('selected');
        this.selectedAvatar = option.dataset.avatar;
    }
    
    // 房间大小选择
    selectRoomSize(btn) {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedSize = parseInt(btn.dataset.size);
    }
    
    // 创建房间
    createRoom() {
        if (!this.isConnected) {
            this.showMessage('请等待连接服务器', 'warning');
            return;
        }
        
        const nickname = this.nicknameInput?.value.trim() || '玩家' + Math.floor(Math.random() * 10000);
        const roomName = this.roomNameInput?.value.trim() || nickname + '的房间';
        const blinds = this.roomBlindsSelect?.value || '10/20';
        const chips = parseInt(this.roomChipsSelect?.value || '5000');
        const password = this.roomPasswordInput?.value || '';
        
        this.socket.emit('createRoom', {
            roomName,
            maxPlayers: this.selectedSize,
            blinds,
            initialChips: chips,
            password,
            player: {
                nickname,
                avatar: this.selectedAvatar
            }
        });
    }
    
    // 刷新房间列表
    refreshRoomList() {
        if (!this.isConnected) return;
        this.socket.emit('getRooms');
    }
    
    // 更新房间列表显示
    updateRoomList(rooms) {
        if (!this.roomList) return;
        
        if (!rooms || rooms.length === 0) {
            this.roomList.innerHTML = '<div class="no-rooms">暂无可用房间，点击上方刷新或创建新房间</div>';
            return;
        }
        
        this.roomList.innerHTML = rooms.map(room => `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-card-info">
                    <div class="room-card-name">
                        ${room.name}
                        ${room.hasPassword ? '<span class="lock-icon">🔒</span>' : ''}
                    </div>
                    <div class="room-card-details">
                        <span class="room-card-players">👥 ${room.playerCount}/${room.maxPlayers}</span>
                        <span>盲注: ${room.blinds}</span>
                        <span>筹码: ${room.initialChips.toLocaleString()}</span>
                    </div>
                </div>
                <span class="room-card-status ${room.status}">${this.getStatusText(room.status)}</span>
                <button class="join-btn" ${room.status !== 'waiting' || room.playerCount >= room.maxPlayers ? 'disabled' : ''}>
                    加入
                </button>
            </div>
        `).join('');
        
        // 绑定加入按钮事件
        this.roomList.querySelectorAll('.room-card').forEach(card => {
            const joinBtn = card.querySelector('.join-btn');
            joinBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.joinRoom(card.dataset.roomId);
            });
        });
    }
    
    getStatusText(status) {
        switch(status) {
            case 'waiting': return '等待中';
            case 'playing': return '游戏中';
            case 'full': return '已满';
            default: return status;
        }
    }
    
    // 加入房间
    joinRoom(roomId, password = '') {
        if (!this.isConnected) {
            this.showMessage('请等待连接服务器', 'warning');
            return;
        }
        
        const nickname = this.nicknameInput?.value.trim() || '玩家' + Math.floor(Math.random() * 10000);
        
        this.socket.emit('joinRoom', {
            roomId,
            password,
            player: {
                nickname,
                avatar: this.selectedAvatar
            }
        });
    }
    
    // 快速加入
    quickJoinRoom() {
        const roomId = this.roomIdInput?.value.trim();
        const password = this.joinPasswordInput?.value || '';
        
        if (!roomId) {
            this.showMessage('请输入房间ID', 'warning');
            return;
        }
        
        this.joinRoom(roomId, password);
    }
    
    // 进入房间
    enterRoom(room) {
        this.currentRoom = room;
        this.isReady = false;
        this.switchScreen('room');
        this.updateRoomDisplay();
        this.clearChat();
        this.addChatMessage(null, '欢迎来到 ' + room.name, true);
    }
    
    // 更新房间显示
    updateRoomDisplay() {
        const room = this.currentRoom;
        if (!room) return;
        
        // 更新房间信息
        if (this.roomTitle) this.roomTitle.textContent = room.name;
        if (this.roomIdDisplay) this.roomIdDisplay.textContent = 'ID: ' + room.id;
        if (this.roomBlindsDisplay) this.roomBlindsDisplay.textContent = room.blinds;
        if (this.roomChipsDisplay) this.roomChipsDisplay.textContent = room.initialChips.toLocaleString();
        
        // 更新座位
        this.updateSeats(room);
        
        // 更新按钮状态
        this.updateButtons(room);
    }
    
    updateSeats(room) {
        if (!this.roomPlayersGrid) return;
        
        const players = room.players || [];
        const maxPlayers = room.maxPlayers || 6;
        
        let html = '';
        for (let i = 0; i < maxPlayers; i++) {
            const player = players[i];
            if (player) {
                const isSelf = player.id === this.mySocketId;
                const isHost = player.id === room.hostId;
                const statusClass = player.isReady ? 'ready' : 'waiting';
                
                html += `
                    <div class="seat-card occupied ${statusClass} ${isSelf ? 'is-self' : ''} ${isHost ? 'is-host' : ''}">
                        <div class="seat-avatar">${player.avatar}</div>
                        <div class="seat-name">${player.nickname}</div>
                        <div class="seat-status ${statusClass}">
                            ${isHost ? '👑 房主' : (player.isReady ? '✓ 已准备' : '等待中')}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="seat-card empty">
                        <div class="empty-seat-text">空座位</div>
                    </div>
                `;
            }
        }
        
        this.roomPlayersGrid.innerHTML = html;
    }
    
    updateButtons(room) {
        const myPlayer = room.players?.find(p => p.id === this.mySocketId);
        const isHost = myPlayer?.id === room.hostId;
        
        // 准备按钮
        if (this.readyBtn) {
            if (isHost) {
                this.readyBtn.style.display = 'none';
            } else {
                this.readyBtn.style.display = 'block';
                this.isReady = myPlayer?.isReady || false;
                this.readyBtn.textContent = this.isReady ? '✗ 取消准备' : '✓ 准备';
                this.readyBtn.classList.toggle('is-ready', this.isReady);
            }
        }
        
        // 开始游戏按钮（仅房主可见）
        if (this.startOnlineBtn) {
            if (isHost) {
                this.startOnlineBtn.style.display = 'block';
                // 检查是否所有人都准备了
                const allReady = room.players?.length >= 2 && 
                    room.players.filter(p => p.id !== room.hostId).every(p => p.isReady);
                this.startOnlineBtn.disabled = !allReady;
            } else {
                this.startOnlineBtn.style.display = 'none';
            }
        }
    }
    
    // 切换准备状态
    toggleReady() {
        if (!this.isConnected || !this.currentRoom) return;
        
        this.socket.emit('toggleReady', {
            roomId: this.currentRoom.id
        });
    }
    
    // 开始游戏
    startGame() {
        if (!this.isConnected || !this.currentRoom) return;
        
        this.socket.emit('startGame', {
            roomId: this.currentRoom.id
        });
    }
    
    // 离开房间
    leaveRoom() {
        if (this.socket && this.currentRoom) {
            this.socket.emit('leaveRoom', {
                roomId: this.currentRoom.id
            });
        }
        this.currentRoom = null;
        this.isReady = false;
        this.switchScreen('lobby');
        this.refreshRoomList();
    }
    
    // 聊天功能
    sendChat() {
        const message = this.chatInput?.value.trim();
        if (!message || !this.isConnected || !this.currentRoom) return;
        
        this.socket.emit('chatMessage', {
            roomId: this.currentRoom.id,
            message
        });
        
        this.chatInput.value = '';
    }
    
    addChatMessage(sender, message, isSystem = false) {
        if (!this.chatMessages) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message' + (isSystem ? ' system' : '');
        
        if (isSystem) {
            msgDiv.textContent = message;
        } else {
            msgDiv.innerHTML = `<span class="sender">${sender}:</span><span class="content">${message}</span>`;
        }
        
        this.chatMessages.appendChild(msgDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    clearChat() {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = '';
        }
    }
    
    // 开始在线游戏
    startOnlineGame(gameData) {
        // 切换到游戏界面
        this.switchScreen('game');
        
        // 初始化在线游戏处理器并传递 Socket 连接
        if (window.onlineGameHandler) {
            window.onlineGameHandler.initSocket(this.socket, this.mySocketId);
            // ★ 关键修复：直接调用 handleGameStarted 传递游戏数据
            // 因为 initSocket 之后才注册监听器，此时 gameStarted 事件已经错过
            window.onlineGameHandler.handleGameStarted(gameData);
        }
    }
    
    /**
     * 规范化服务器返回的房间数据格式
     * 将服务器的 name 字段转换为客户端期望的 nickname
     */
    normalizeRoomData(room) {
        if (!room) return room;
        
        // 规范化玩家数据
        if (room.players) {
            room.players = room.players.map(p => ({
                ...p,
                nickname: p.nickname || p.name
            }));
        }
        
        // 规范化盲注格式
        if (!room.blinds && room.smallBlind && room.bigBlind) {
            room.blinds = `${room.smallBlind}/${room.bigBlind}`;
        }
        
        // 规范化筹码
        if (!room.initialChips && room.startingChips) {
            room.initialChips = room.startingChips;
        }
        
        return room;
    }
    
    /**
     * 获取服务器状态 - 用于调试连接问题
     */
    async fetchServerStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            console.log('服务器状态:', status);
            
            // 在连接状态旁边显示服务器ID（调试用）
            if (this.statusText) {
                this.statusText.textContent = `已连接 [${status.serverId}]`;
            }
            
            // 在控制台显示详细信息
            console.log(`服务器实例ID: ${status.serverId}`);
            console.log(`当前房间数: ${status.roomCount}`);
            console.log(`连接玩家数: ${status.connectedPlayers}`);
            console.log(`房间列表:`, status.rooms);
        } catch (error) {
            console.error('获取服务器状态失败:', error);
        }
    }
    
    // 显示消息提示
    showMessage(text, type = 'info') {
        // 简单的消息提示
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.textContent = text;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
            color: white;
            border-radius: 8px;
            z-index: 10001;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: toastIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 创建全局实例
window.lobbyManager = new LobbyManager();
