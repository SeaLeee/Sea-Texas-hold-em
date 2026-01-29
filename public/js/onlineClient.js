/**
 * 联机客户端 - 处理 Socket.IO 通信和联机游戏逻辑
 */
class OnlineClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentRoom = null;
        this.mySocketId = null;
        this.myCards = [];
        this.isMyTurn = false;
        
        // UI 回调
        this.callbacks = {
            onConnected: null,
            onDisconnected: null,
            onRoomList: null,
            onRoomCreated: null,
            onRoomJoined: null,
            onRoomLeft: null,
            onPlayerJoined: null,
            onPlayerLeft: null,
            onPlayerReady: null,
            onGameStarted: null,
            onNewHand: null,
            onActionResult: null,
            onPhaseChanged: null,
            onHandEnded: null,
            onGameEnded: null,
            onYourTurn: null,
            onChatMessage: null,
            onError: null
        };
    }

    /**
     * 连接到服务器
     */
    connect() {
        if (this.socket) {
            this.disconnect();
        }

        // 连接到服务器
        this.socket = io();

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.mySocketId = this.socket.id;
            console.log('已连接到服务器:', this.mySocketId);
            this.emit('onConnected');
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.currentRoom = null;
            console.log('已断开连接');
            this.emit('onDisconnected');
        });

        // 房间相关事件
        this.socket.on('roomList', (rooms) => {
            this.emit('onRoomList', rooms);
        });

        this.socket.on('roomListUpdated', () => {
            this.getRooms();
        });

        this.socket.on('roomCreated', (data) => {
            if (data.success) {
                this.currentRoom = data.room;
            }
            this.emit('onRoomCreated', data);
        });

        this.socket.on('joinRoomResult', (data) => {
            if (data.success) {
                this.currentRoom = data.room;
            }
            this.emit('onRoomJoined', data);
        });

        this.socket.on('leftRoom', (data) => {
            this.currentRoom = null;
            this.emit('onRoomLeft', data);
        });

        this.socket.on('playerJoined', (data) => {
            this.currentRoom = data.room;
            this.emit('onPlayerJoined', data);
        });

        this.socket.on('playerLeft', (data) => {
            this.currentRoom = data.room;
            this.emit('onPlayerLeft', data);
        });

        this.socket.on('playerReadyChanged', (data) => {
            this.currentRoom = data.room;
            this.emit('onPlayerReady', data);
        });

        // 游戏相关事件
        this.socket.on('gameStarted', (data) => {
            this.currentRoom = data.room;
            this.myCards = data.yourCards;
            this.isMyTurn = data.isYourTurn;
            this.emit('onGameStarted', data);
        });

        this.socket.on('newHand', (data) => {
            this.currentRoom = data.room;
            this.myCards = data.yourCards;
            this.isMyTurn = data.isYourTurn;
            this.emit('onNewHand', data);
        });

        this.socket.on('actionResult', (data) => {
            this.currentRoom = data.room;
            this.isMyTurn = data.nextPlayerId === this.mySocketId;
            this.emit('onActionResult', data);
        });

        this.socket.on('phaseChanged', (data) => {
            this.isMyTurn = data.nextPlayerId === this.mySocketId;
            this.emit('onPhaseChanged', data);
        });

        this.socket.on('handEnded', (data) => {
            this.isMyTurn = false;
            this.emit('onHandEnded', data);
        });

        this.socket.on('gameEnded', (data) => {
            this.isMyTurn = false;
            this.emit('onGameEnded', data);
        });

        this.socket.on('yourTurn', (data) => {
            this.isMyTurn = true;
            this.emit('onYourTurn', data);
        });

        this.socket.on('chatMessage', (data) => {
            this.emit('onChatMessage', data);
        });

        this.socket.on('actionError', (data) => {
            this.emit('onError', data.error);
        });

        this.socket.on('gameStartResult', (data) => {
            if (!data.success) {
                this.emit('onError', data.error);
            }
        });
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentRoom = null;
    }

    /**
     * 触发回调
     */
    emit(eventName, data = null) {
        if (this.callbacks[eventName]) {
            this.callbacks[eventName](data);
        }
    }

    /**
     * 设置回调
     */
    on(eventName, callback) {
        this.callbacks[eventName] = callback;
    }

    /**
     * 获取房间列表
     */
    getRooms() {
        if (this.socket) {
            this.socket.emit('getRooms');
        }
    }

    /**
     * 创建房间
     */
    createRoom(options) {
        if (this.socket) {
            this.socket.emit('createRoom', options);
        }
    }

    /**
     * 加入房间
     */
    joinRoom(roomId, playerName, playerAvatar, password = null) {
        if (this.socket) {
            this.socket.emit('joinRoom', {
                roomId,
                playerName,
                playerAvatar,
                password
            });
        }
    }

    /**
     * 离开房间
     */
    leaveRoom() {
        if (this.socket) {
            this.socket.emit('leaveRoom');
        }
    }

    /**
     * 切换准备状态
     */
    toggleReady() {
        if (this.socket) {
            this.socket.emit('toggleReady');
        }
    }

    /**
     * 开始游戏
     */
    startGame() {
        if (this.socket) {
            this.socket.emit('startGame');
        }
    }

    /**
     * 执行游戏操作
     */
    doAction(action, amount = 0) {
        if (this.socket) {
            this.socket.emit('playerAction', { action, amount });
        }
    }

    /**
     * 开始下一手
     */
    nextHand() {
        if (this.socket) {
            this.socket.emit('nextHand');
        }
    }

    /**
     * 发送聊天消息
     */
    sendChat(message) {
        if (this.socket) {
            this.socket.emit('chatMessage', message);
        }
    }

    /**
     * 检查是否是房主
     */
    isHost() {
        if (!this.currentRoom) return false;
        const me = this.currentRoom.players.find(p => p.id === this.mySocketId);
        return me && me.isHost;
    }

    /**
     * 获取我的玩家信息
     */
    getMyPlayer() {
        if (!this.currentRoom) return null;
        return this.currentRoom.players.find(p => p.id === this.mySocketId);
    }
}

// 创建全局实例
const onlineClient = new OnlineClient();
