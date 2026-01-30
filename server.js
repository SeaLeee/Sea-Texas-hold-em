const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Room, ROOM_STATUS, PLAYER_STATUS } = require('./server/Room');
const { OnlineGameManager, GAME_PHASES, ACTIONS } = require('./server/OnlineGameManager');

const app = express();
const server = http.createServer(app);

// 获取环境变量
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 服务器实例ID - 用于调试多实例问题
const SERVER_INSTANCE_ID = Math.random().toString(36).substring(2, 8);
console.log(`服务器实例ID: ${SERVER_INSTANCE_ID}`);

// 配置 Socket.io - 生产环境需要正确的 CORS 设置
const io = new Server(server, {
    cors: {
        origin: NODE_ENV === 'production' 
            ? true  // 允许所有来源（Railway 会处理 HTTPS）
            : "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    // 生产环境优化
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

console.log(`环境: ${NODE_ENV}`);

/**
 * 格式化房间数据给客户端
 * 将服务器端的房间数据转换为lobbyManager期望的格式
 */
function formatRoomForClient(room) {
    return {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        status: room.status,
        blinds: `${room.smallBlind}/${room.bigBlind}`,
        initialChips: room.startingChips,
        hasPassword: !!room.password,
        playerCount: room.players.size,
        players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            nickname: p.name,
            avatar: p.avatar,
            chips: p.chips,
            seatIndex: p.seatIndex,
            isReady: p.isReady,
            isHost: p.id === room.hostId,
            status: p.status
        }))
    };
}

/**
 * 格式化房间列表给客户端
 */
function formatRoomListForClient(room) {
    return {
        id: room.id,
        name: room.name,
        playerCount: room.players.size,
        maxPlayers: room.maxPlayers,
        status: room.status,
        hasPassword: !!room.password,
        blinds: `${room.smallBlind}/${room.bigBlind}`,
        initialChips: room.startingChips
    };
}

// 房间管理
const rooms = new Map();  // roomId -> Room
const playerRooms = new Map();  // socketId -> roomId
const gameManagers = new Map();  // roomId -> OnlineGameManager

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由 - 获取房间列表
app.get('/api/rooms', (req, res) => {
    const roomList = Array.from(rooms.values())
        .filter(room => room.status === ROOM_STATUS.WAITING)
        .map(room => room.getPublicInfo());
    res.json(roomList);
});

// API路由 - 获取服务器状态（用于调试）
app.get('/api/status', (req, res) => {
    res.json({
        serverId: SERVER_INSTANCE_ID,
        timestamp: Date.now(),
        roomCount: rooms.size,
        connectedPlayers: playerRooms.size,
        rooms: Array.from(rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            playerCount: r.players.size
        }))
    });
});

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
    console.log(`玩家连接: ${socket.id}`);

    // 获取房间列表
    socket.on('getRooms', () => {
        const roomList = Array.from(rooms.values())
            .filter(room => room.status === ROOM_STATUS.WAITING)
            .map(room => formatRoomListForClient(room));
        socket.emit('roomList', roomList);
    });

    // 创建房间
    socket.on('createRoom', (options) => {
        // 解析盲注设置
        let smallBlind = 10, bigBlind = 20;
        if (options.blinds) {
            const blindsParts = options.blinds.split('/');
            smallBlind = parseInt(blindsParts[0]) || 10;
            bigBlind = parseInt(blindsParts[1]) || 20;
        }

        const room = new Room({
            name: options.roomName || `房间 ${rooms.size + 1}`,
            maxPlayers: options.maxPlayers || 6,
            smallBlind: smallBlind,
            bigBlind: bigBlind,
            startingChips: options.initialChips || 1000,
            password: options.password || null,
            hostId: socket.id
        });

        rooms.set(room.id, room);
        
        // 创建者自动加入房间
        const playerInfo = options.player || {};
        const joinResult = room.addPlayer(socket.id, {
            name: playerInfo.nickname || '房主',
            avatar: playerInfo.avatar || '😀'
        });

        if (joinResult.success) {
            socket.join(room.id);
            playerRooms.set(socket.id, room.id);
            
            socket.emit('roomCreated', {
                success: true,
                room: formatRoomForClient(room)
            });
            
            // 广播房间列表更新
            io.emit('roomListUpdated');
            
            console.log(`房间创建: ${room.id} by ${socket.id}`);
        } else {
            socket.emit('roomCreated', {
                success: false,
                error: joinResult.error
            });
        }
    });

    // 加入房间
    socket.on('joinRoom', (data) => {
        const { roomId, password, player: playerData } = data;
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('joinRoomResult', { success: false, error: '房间不存在' });
            return;
        }

        const joinResult = room.addPlayer(socket.id, {
            name: playerData?.nickname || `玩家`,
            avatar: playerData?.avatar || '😀',
            password: password
        });

        if (joinResult.success) {
            socket.join(roomId);
            playerRooms.set(socket.id, roomId);
            
            socket.emit('joinRoomResult', {
                success: true,
                room: formatRoomForClient(room)
            });

            // 通知房间内其他玩家
            socket.to(roomId).emit('playerJoined', {
                player: {
                    ...joinResult.player,
                    nickname: joinResult.player.name
                },
                room: formatRoomForClient(room)
            });

            // 广播房间列表更新
            io.emit('roomListUpdated');

            console.log(`玩家加入房间: ${socket.id} -> ${roomId}`);
        } else {
            socket.emit('joinRoomResult', { success: false, error: joinResult.error });
        }
    });

    // 离开房间
    socket.on('leaveRoom', () => {
        handleLeaveRoom(socket);
    });

    // 玩家准备
    socket.on('toggleReady', () => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        const result = room.toggleReady(socket.id);
        if (result.success) {
            io.to(roomId).emit('playerReadyChanged', {
                playerId: socket.id,
                isReady: result.isReady,
                room: formatRoomForClient(room)
            });
        }
    });

    // 开始游戏
    socket.on('startGame', () => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        // 只有房主可以开始游戏
        if (room.hostId !== socket.id) {
            socket.emit('gameStartResult', { success: false, error: '只有房主可以开始游戏' });
            return;
        }

        const result = room.startGame();
        if (result.success) {
            // 创建游戏管理器
            const gameManager = new OnlineGameManager(room);
            gameManagers.set(roomId, gameManager);

            // 开始第一手牌
            const handResult = gameManager.startNewHand();
            
            // 向每个玩家发送他们的底牌
            for (const [playerId, player] of room.players) {
                io.to(playerId).emit('gameStarted', {
                    room: room.getFullInfo(),
                    yourCards: player.holeCards,
                    dealerPosition: handResult.dealerPosition,
                    blinds: handResult.blinds,
                    pot: handResult.pot,
                    currentBet: handResult.currentBet,
                    currentPlayerId: handResult.currentPlayerId,
                    isYourTurn: playerId === handResult.currentPlayerId
                });
            }

            // 广播房间列表更新
            io.emit('roomListUpdated');

            console.log(`游戏开始: 房间 ${roomId}`);
        } else {
            socket.emit('gameStartResult', { success: false, error: result.error });
        }
    });

    // 玩家操作
    socket.on('playerAction', (data) => {
        const { action, amount } = data;
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        const gameManager = gameManagers.get(roomId);
        if (!room || !gameManager) return;

        const result = gameManager.handleAction(socket.id, action, amount);
        
        if (result.success) {
            // 广播操作结果
            io.to(roomId).emit('actionResult', {
                ...result,
                room: room.getFullInfo()
            });

            // 如果手牌结束
            if (result.handEnded) {
                io.to(roomId).emit('handEnded', {
                    reason: result.reason,
                    winners: result.winners,
                    allHands: result.allHands,
                    pot: result.pot
                });
            }
            // 如果阶段结束
            else if (result.phaseEnded) {
                io.to(roomId).emit('phaseChanged', {
                    newPhase: result.newPhase,
                    newCards: result.newCards,
                    communityCards: result.communityCards,
                    nextPlayerId: result.nextPlayerId
                });
            }
            // 通知下一个玩家
            else {
                io.to(result.nextPlayerId).emit('yourTurn', {
                    pot: room.pot,
                    currentBet: room.currentBet,
                    availableActions: gameManager.getAvailableActions(result.nextPlayerId)
                });
            }
        } else {
            socket.emit('actionError', { error: result.error });
        }
    });

    // 下一手牌
    socket.on('nextHand', () => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        const gameManager = gameManagers.get(roomId);
        if (!room || !gameManager) return;

        // 只有房主可以开始下一手
        if (room.hostId !== socket.id) {
            return;
        }

        const handResult = gameManager.startNewHand();
        
        if (handResult.ended) {
            // 游戏结束
            io.to(roomId).emit('gameEnded', {
                winner: handResult.winner
            });
            room.status = ROOM_STATUS.FINISHED;
        } else {
            // 向每个玩家发送他们的底牌
            for (const [playerId, player] of room.players) {
                io.to(playerId).emit('newHand', {
                    yourCards: player.holeCards,
                    dealerPosition: handResult.dealerPosition,
                    blinds: handResult.blinds,
                    pot: handResult.pot,
                    currentBet: handResult.currentBet,
                    currentPlayerId: handResult.currentPlayerId,
                    isYourTurn: playerId === handResult.currentPlayerId,
                    room: room.getFullInfo()
                });
            }
        }
    });

    // 发送聊天消息
    socket.on('chatMessage', (data) => {
        // 兼容两种格式：直接字符串或对象 { roomId, message }
        const messageText = typeof data === 'string' ? data : (data.message || data);
        
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player) return;

        io.to(roomId).emit('chatMessage', {
            playerId: socket.id,
            sender: player.name,        // 使用 sender 字段与前端一致
            playerName: player.name,    // 保留 playerName 以兼容
            message: messageText,       // 确保是字符串
            timestamp: Date.now()
        });
    });

    // 断开连接
    socket.on('disconnect', () => {
        console.log(`玩家断开连接: ${socket.id}`);
        handleLeaveRoom(socket);
    });
});

/**
 * 处理玩家离开房间
 */
function handleLeaveRoom(socket) {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const result = room.removePlayer(socket.id);
    
    if (result.success) {
        socket.leave(roomId);
        playerRooms.delete(socket.id);

        // 如果房间为空，删除房间
        if (room.isEmpty()) {
            rooms.delete(roomId);
            gameManagers.delete(roomId);
            console.log(`房间删除: ${roomId}`);
        } else {
            // 通知房间内其他玩家
            io.to(roomId).emit('playerLeft', {
                playerId: socket.id,
                playerName: result.player.name,
                newHostId: room.hostId,
                room: room.getFullInfo()
            });
        }

        socket.emit('leftRoom', { success: true });
        
        // 广播房间列表更新
        io.emit('roomListUpdated');
    }
}

// 定期清理过期房间
setInterval(() => {
    for (const [roomId, room] of rooms) {
        if (room.isEmpty() || room.isExpired()) {
            rooms.delete(roomId);
            gameManagers.delete(roomId);
            console.log(`清理过期房间: ${roomId}`);
        }
    }
}, 5 * 60 * 1000);  // 每5分钟检查一次

// 启动服务器
server.listen(PORT, () => {
    console.log(`德州扑克游戏服务器运行在端口 ${PORT}`);
    console.log(`访问 http://localhost:${PORT} 开始游戏`);
    console.log(`联机模式已启用 - Socket.IO 已就绪`);
});