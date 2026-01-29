/**
 * 德州扑克游戏常量定义
 */

// 花色定义
const SUITS = {
    SPADE: { name: 'spade', symbol: '♠', color: 'black' },
    HEART: { name: 'heart', symbol: '♥', color: 'red' },
    DIAMOND: { name: 'diamond', symbol: '♦', color: 'red' },
    CLUB: { name: 'club', symbol: '♣', color: 'black' }
};

// 花色数组（用于生成牌组）
const SUIT_LIST = [SUITS.SPADE, SUITS.HEART, SUITS.DIAMOND, SUITS.CLUB];

// 点数定义
const RANKS = {
    2: { value: 2, display: '2' },
    3: { value: 3, display: '3' },
    4: { value: 4, display: '4' },
    5: { value: 5, display: '5' },
    6: { value: 6, display: '6' },
    7: { value: 7, display: '7' },
    8: { value: 8, display: '8' },
    9: { value: 9, display: '9' },
    10: { value: 10, display: '10' },
    11: { value: 11, display: 'J' },
    12: { value: 12, display: 'Q' },
    13: { value: 13, display: 'K' },
    14: { value: 14, display: 'A' }
};

// 点数数组（用于生成牌组）
const RANK_LIST = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// 牌型等级（从高到低）
const HAND_RANKS = {
    ROYAL_FLUSH: { rank: 10, name: '皇家同花顺', nameEn: 'Royal Flush' },
    STRAIGHT_FLUSH: { rank: 9, name: '同花顺', nameEn: 'Straight Flush' },
    FOUR_OF_A_KIND: { rank: 8, name: '四条', nameEn: 'Four of a Kind' },
    FULL_HOUSE: { rank: 7, name: '葫芦', nameEn: 'Full House' },
    FLUSH: { rank: 6, name: '同花', nameEn: 'Flush' },
    STRAIGHT: { rank: 5, name: '顺子', nameEn: 'Straight' },
    THREE_OF_A_KIND: { rank: 4, name: '三条', nameEn: 'Three of a Kind' },
    TWO_PAIR: { rank: 3, name: '两对', nameEn: 'Two Pair' },
    ONE_PAIR: { rank: 2, name: '一对', nameEn: 'One Pair' },
    HIGH_CARD: { rank: 1, name: '高牌', nameEn: 'High Card' }
};

// 游戏阶段
const GAME_PHASES = {
    WAITING: 'waiting',           // 等待开始
    PREFLOP: 'preflop',          // 翻牌前
    FLOP: 'flop',                // 翻牌
    TURN: 'turn',                // 转牌
    RIVER: 'river',              // 河牌
    SHOWDOWN: 'showdown'         // 摊牌
};

// 阶段显示名称
const PHASE_NAMES = {
    [GAME_PHASES.WAITING]: '等待开始',
    [GAME_PHASES.PREFLOP]: '翻牌前',
    [GAME_PHASES.FLOP]: '翻牌',
    [GAME_PHASES.TURN]: '转牌',
    [GAME_PHASES.RIVER]: '河牌',
    [GAME_PHASES.SHOWDOWN]: '摊牌'
};

// 玩家动作
const ACTIONS = {
    FOLD: 'fold',       // 弃牌
    CHECK: 'check',     // 过牌
    CALL: 'call',       // 跟注
    RAISE: 'raise',     // 加注
    ALLIN: 'allin',     // 全押
    BET: 'bet'          // 下注
};

// 动作显示名称
const ACTION_NAMES = {
    [ACTIONS.FOLD]: '弃牌',
    [ACTIONS.CHECK]: '过牌',
    [ACTIONS.CALL]: '跟注',
    [ACTIONS.RAISE]: '加注',
    [ACTIONS.ALLIN]: '全押',
    [ACTIONS.BET]: '下注'
};

// 玩家状态
const PLAYER_STATUS = {
    ACTIVE: 'active',           // 活跃
    FOLDED: 'folded',          // 已弃牌
    ALLIN: 'allin',            // 已全押
    OUT: 'out'                 // 已出局（筹码为0）
};

// AI难度
const AI_DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

// 难度显示名称
const DIFFICULTY_NAMES = {
    [AI_DIFFICULTY.EASY]: '简单',
    [AI_DIFFICULTY.MEDIUM]: '中等',
    [AI_DIFFICULTY.HARD]: '困难'
};

// AI性格类型
const AI_PERSONALITY = {
    CONSERVATIVE: 'conservative',  // 保守型 - 紧凶
    BALANCED: 'balanced',          // 平衡型 - 标准TAG
    AGGRESSIVE: 'aggressive',      // 激进型 - 松凶
    MANIAC: 'maniac'              // 疯狂型 - 超激进
};

// 性格显示名称
const PERSONALITY_NAMES = {
    [AI_PERSONALITY.CONSERVATIVE]: '🛡️ 保守型',
    [AI_PERSONALITY.BALANCED]: '⚖️ 平衡型',
    [AI_PERSONALITY.AGGRESSIVE]: '🔥 激进型',
    [AI_PERSONALITY.MANIAC]: '💀 疯狂型'
};

// 性格参数配置
const PERSONALITY_CONFIG = {
    [AI_PERSONALITY.CONSERVATIVE]: {
        vpip: 0.15,        // 入池率
        pfr: 0.10,         // 翻前加注率
        aggression: 0.3,   // 激进度
        bluffFreq: 0.05,   // 诈唬频率
        foldToPressure: 0.7 // 面对压力弃牌率
    },
    [AI_PERSONALITY.BALANCED]: {
        vpip: 0.25,
        pfr: 0.18,
        aggression: 0.5,
        bluffFreq: 0.15,
        foldToPressure: 0.5
    },
    [AI_PERSONALITY.AGGRESSIVE]: {
        vpip: 0.35,
        pfr: 0.28,
        aggression: 0.7,
        bluffFreq: 0.25,
        foldToPressure: 0.3
    },
    [AI_PERSONALITY.MANIAC]: {
        vpip: 0.50,
        pfr: 0.40,
        aggression: 0.9,
        bluffFreq: 0.40,
        foldToPressure: 0.15
    }
};

// 默认游戏设置
const DEFAULT_SETTINGS = {
    difficulty: AI_DIFFICULTY.MEDIUM,
    playerCount: 4,
    startingChips: 5000,
    smallBlind: 10,
    bigBlind: 20,
    actionTimeout: 30000  // 30秒操作超时
};

// 玩家头像表情
const PLAYER_AVATARS = ['😎', '🤠', '🧐', '😏', '🤔', '😤'];

// AI名称列表
const AI_NAMES = [
    '阿强', '小明', '老王', '大李', 
    '张三', '李四', '王五', '赵六',
    'Jack', 'Mike', 'Tom', 'Alex'
];

// 键盘快捷键
const KEYBOARD_SHORTCUTS = {
    FOLD: 'f',
    CHECK_CALL: 'c',
    RAISE: 'r',
    ALLIN: 'a'
};

// 动画时间（毫秒）
const ANIMATION_DURATION = {
    CARD_DEAL: 300,
    CARD_FLIP: 600,
    CHIP_MOVE: 500,
    PHASE_TRANSITION: 1000,
    AI_THINK: 1500
};
