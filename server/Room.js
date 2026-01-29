/**
 * 房间管理类 - 管理德州扑克联机房间
 */
const { v4: uuidv4 } = require('uuid');

// 房间状态
const ROOM_STATUS = {
    WAITING: 'waiting',      // 等待玩家加入
    READY: 'ready',          // 准备开始
    PLAYING: 'playing',      // 游戏进行中
    FINISHED: 'finished'     // 游戏结束
};

// 玩家状态
const PLAYER_STATUS = {
    WAITING: 'waiting',      // 等待中
    READY: 'ready',          // 已准备
    PLAYING: 'playing',      // 游戏中
    FOLDED: 'folded',        // 已弃牌
    ALLIN: 'allin',          // 已全押
    OUT: 'out'               // 已出局
};

class Room {
    constructor(options = {}) {
        this.id = options.id || uuidv4().substring(0, 8).toUpperCase();
        this.name = options.name || `房间 ${this.id}`;
        this.hostId = options.hostId || null;
        this.maxPlayers = options.maxPlayers || 6;
        this.minPlayers = options.minPlayers || 2;
        this.smallBlind = options.smallBlind || 10;
        this.bigBlind = options.bigBlind || 20;
        this.startingChips = options.startingChips || 1000;
        this.password = options.password || null;
        
        this.status = ROOM_STATUS.WAITING;
        this.players = new Map();  // socketId -> Player
        this.spectators = new Set();  // 观战者 socketIds
        
        // 游戏状态
        this.gameState = null;
        this.currentPlayerIndex = -1;
        this.dealerPosition = 0;
        this.pot = 0;
        this.communityCards = [];
        this.currentBet = 0;
        this.phase = 'waiting';
        this.roundNumber = 0;
        
        this.createdAt = Date.now();
        this.lastActivityAt = Date.now();
    }

    /**
     * 添加玩家到房间
     */
    addPlayer(socketId, playerInfo) {
        if (this.players.size >= this.maxPlayers) {
            return { success: false, error: '房间已满' };
        }
        
        if (this.status === ROOM_STATUS.PLAYING) {
            return { success: false, error: '游戏已开始，无法加入' };
        }

        if (this.password && playerInfo.password !== this.password) {
            return { success: false, error: '房间密码错误' };
        }

        const seatIndex = this.getAvailableSeat();
        const player = {
            id: socketId,
            name: playerInfo.name || `玩家${this.players.size + 1}`,
            avatar: playerInfo.avatar || this.getRandomAvatar(),
            chips: this.startingChips,
            currentBet: 0,
            holeCards: [],
            status: PLAYER_STATUS.WAITING,
            isReady: false,
            seatIndex: seatIndex,
            isHost: this.players.size === 0,
            joinedAt: Date.now()
        };

        this.players.set(socketId, player);
        
        if (this.players.size === 1) {
            this.hostId = socketId;
        }

        this.lastActivityAt = Date.now();
        return { success: true, player, seatIndex };
    }

    /**
     * 移除玩家
     */
    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (!player) {
            return { success: false, error: '玩家不存在' };
        }

        this.players.delete(socketId);
        
        // 如果房主离开，转移房主权限
        if (this.hostId === socketId && this.players.size > 0) {
            const newHost = this.players.keys().next().value;
            this.hostId = newHost;
            this.players.get(newHost).isHost = true;
        }

        this.lastActivityAt = Date.now();
        return { success: true, player };
    }

    /**
     * 玩家准备/取消准备
     */
    toggleReady(socketId) {
        const player = this.players.get(socketId);
        if (!player) {
            return { success: false, error: '玩家不存在' };
        }

        player.isReady = !player.isReady;
        this.lastActivityAt = Date.now();
        
        return { success: true, isReady: player.isReady };
    }

    /**
     * 检查是否可以开始游戏
     */
    canStart() {
        if (this.players.size < this.minPlayers) {
            return { canStart: false, reason: `需要至少${this.minPlayers}名玩家` };
        }

        const readyCount = Array.from(this.players.values()).filter(p => p.isReady || p.isHost).length;
        if (readyCount < this.players.size) {
            return { canStart: false, reason: '还有玩家未准备' };
        }

        return { canStart: true };
    }

    /**
     * 开始游戏
     */
    startGame() {
        const canStartResult = this.canStart();
        if (!canStartResult.canStart) {
            return { success: false, error: canStartResult.reason };
        }

        this.status = ROOM_STATUS.PLAYING;
        this.roundNumber = 0;
        
        // 初始化所有玩家状态
        for (const player of this.players.values()) {
            player.status = PLAYER_STATUS.PLAYING;
            player.chips = this.startingChips;
        }

        this.lastActivityAt = Date.now();
        return { success: true };
    }

    /**
     * 获取可用座位
     */
    getAvailableSeat() {
        const usedSeats = new Set(Array.from(this.players.values()).map(p => p.seatIndex));
        for (let i = 0; i < this.maxPlayers; i++) {
            if (!usedSeats.has(i)) return i;
        }
        return -1;
    }

    /**
     * 获取随机头像
     */
    getRandomAvatar() {
        const avatars = ['😀', '😎', '🤠', '🤡', '👻', '🤖', '👽', '🎃', '🦊', '🐱', '🐶', '🐼'];
        return avatars[Math.floor(Math.random() * avatars.length)];
    }

    /**
     * 获取房间公开信息（用于房间列表）
     */
    getPublicInfo() {
        return {
            id: this.id,
            name: this.name,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            status: this.status,
            hasPassword: !!this.password,
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            hostName: this.hostId ? this.players.get(this.hostId)?.name : null
        };
    }

    /**
     * 获取房间详细信息（用于房间内玩家）
     */
    getFullInfo() {
        return {
            ...this.getPublicInfo(),
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                chips: p.chips,
                seatIndex: p.seatIndex,
                isReady: p.isReady,
                isHost: p.isHost,
                status: p.status
            })),
            gameState: this.getGameState()
        };
    }

    /**
     * 获取游戏状态
     */
    getGameState() {
        if (this.status !== ROOM_STATUS.PLAYING) {
            return null;
        }

        return {
            phase: this.phase,
            pot: this.pot,
            currentBet: this.currentBet,
            communityCards: this.communityCards,
            currentPlayerIndex: this.currentPlayerIndex,
            dealerPosition: this.dealerPosition,
            roundNumber: this.roundNumber
        };
    }

    /**
     * 检查房间是否为空
     */
    isEmpty() {
        return this.players.size === 0;
    }

    /**
     * 检查房间是否过期（超过30分钟无活动）
     */
    isExpired() {
        return Date.now() - this.lastActivityAt > 30 * 60 * 1000;
    }
}

module.exports = { Room, ROOM_STATUS, PLAYER_STATUS };
