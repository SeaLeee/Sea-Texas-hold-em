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
    MANIAC: 'maniac',             // 疯狂型 - 超激进
    MATHEMATICIAN: 'mathematician' // 数学家型 - 纯概率计算
};

// 性格显示名称
const PERSONALITY_NAMES = {
    [AI_PERSONALITY.CONSERVATIVE]: '🛡️ 保守型',
    [AI_PERSONALITY.BALANCED]: '⚖️ 平衡型',
    [AI_PERSONALITY.AGGRESSIVE]: '🔥 激进型',
    [AI_PERSONALITY.MANIAC]: '💀 疯狂型',
    [AI_PERSONALITY.MATHEMATICIAN]: '🧮 数学家型'
};

// 性格参数配置 - 增强版：更难对付，不轻易弃牌
const PERSONALITY_CONFIG = {
    [AI_PERSONALITY.CONSERVATIVE]: {
        vpip: 0.22,        // 入池率（提高入池率）
        pfr: 0.15,         // 翻前加注率
        aggression: 0.45,  // 激进度（提高）
        bluffFreq: 0.12,   // 诈唬频率（增加诈唬）
        foldToPressure: 0.45, // 面对压力弃牌率（大幅降低弃牌率）
        callDown: 0.6,     // 跟注到底的意愿
        trapFreq: 0.25     // 陷阱打法频率
    },
    [AI_PERSONALITY.BALANCED]: {
        vpip: 0.32,
        pfr: 0.24,
        aggression: 0.65,
        bluffFreq: 0.22,
        foldToPressure: 0.30, // 大幅降低弃牌率
        callDown: 0.70,
        trapFreq: 0.30
    },
    [AI_PERSONALITY.AGGRESSIVE]: {
        vpip: 0.42,
        pfr: 0.35,
        aggression: 0.82,
        bluffFreq: 0.35,
        foldToPressure: 0.18, // 几乎不弃牌
        callDown: 0.80,
        trapFreq: 0.35
    },
    [AI_PERSONALITY.MANIAC]: {
        vpip: 0.58,
        pfr: 0.48,
        aggression: 0.95,
        bluffFreq: 0.50,
        foldToPressure: 0.08, // 极少弃牌
        callDown: 0.90,
        trapFreq: 0.40
    },
    // 数学家型 - 纯概率计算，完全基于EV决策
    [AI_PERSONALITY.MATHEMATICIAN]: {
        vpip: 0.28,          // 中等入池率，只打正EV的牌
        pfr: 0.22,           // 中等加注率
        aggression: 0.60,    // 中等激进度
        bluffFreq: 0.18,     // 平衡的诈唬频率
        foldToPressure: 0.35,// 根据EV决定，不会盲目跟注
        callDown: 0.65,      // 基于概率决定
        trapFreq: 0.20,      // 有策略地慢打
        useMathMode: true,   // 启用纯数学模式
        evThreshold: 0.05,   // EV阈值，高于此值才行动
        potOddsStrict: true  // 严格遵循底池赔率
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

// 性格动物形象映射
const PERSONALITY_ANIMALS = {
    [AI_PERSONALITY.CONSERVATIVE]: { emoji: '🐢', label: '乌龟', desc: '稳如老龟，耐心等待' },
    [AI_PERSONALITY.BALANCED]: { emoji: '🦊', label: '狐狸', desc: '狡猾如狐，伺机而动' },
    [AI_PERSONALITY.AGGRESSIVE]: { emoji: '🐅', label: '老虎', desc: '凶猛如虎，步步紧逼' },
    [AI_PERSONALITY.MANIAC]: { emoji: '🦁', label: '狮子', desc: '狂野如狮，不计后果' },
    [AI_PERSONALITY.MATHEMATICIAN]: { emoji: '🦉', label: '猫头鹰', desc: '智慧如鹰，精算概率' }
};

// 预设小伙伴角色
const PRESET_BUDDIES = {
    hailin: {
        id: 'hailin',
        name: '海林',
        avatar: '🦈',
        personality: AI_PERSONALITY.MANIAC,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.MANIAC],
        difficulty: AI_DIFFICULTY.MEDIUM,
        description: '喜欢诈唬直接干的选手',
        style: '激进诈唬型',
        dialogues: {
            join: '来吧，让我看看你有多菜！',
            win: ['太简单了！', '这就是实力！', '哈哈，你输定了！'],
            lose: ['运气而已...', '下次让你好看！', '等着瞧！'],
            bluff: ['你敢跟吗？', '我手里是皇家同花顺！', '全押！有种就跟！'],
            allIn: ['直接干！', '全压！不服来战！', '梭哈！'],
            taunt: ['就这？', '太弱了！', '连我都打不过？', '菜鸡！']
        }
    },
    dada: {
        id: 'dada',
        name: '达达',
        avatar: '🐂',
        personality: AI_PERSONALITY.AGGRESSIVE,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.AGGRESSIVE],
        difficulty: AI_DIFFICULTY.MEDIUM,
        description: '喜欢装逼直接干的选手',
        style: '装逼激进型',
        dialogues: {
            join: '今天我要让你们见识什么叫牌技！',
            win: ['学着点！', '这波操作看懂了吗？', '太秀了，自己都怕！'],
            lose: ['故意让你的！', '这牌谁打得赢...', '下次看我表演！'],
            bluff: ['我已经看穿你了！', '这牌稳赢！', '你的牌我都知道！'],
            allIn: ['装什么装，直接上！', '秀起来！', '让你见识一下！'],
            taunt: ['这么菜的吗？', '我闭着眼都能赢你！', '有点水平好不好！']
        }
    },
    yihua: {
        id: 'yihua',
        name: '一花',
        avatar: '🌸',
        personality: AI_PERSONALITY.BALANCED,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.BALANCED],
        difficulty: AI_DIFFICULTY.HARD,
        description: '高手，打法均衡有章法',
        style: '均衡高手型',
        dialogues: {
            join: '认真打，不留情面。',
            win: ['意料之中。', '基本操作。', '继续努力吧。'],
            lose: ['有点东西。', '不错，但还不够。', '值得尊敬的对手。'],
            bluff: ['你确定要跟吗？', '概率不在你那边。', '三思而后行。'],
            allIn: ['时机到了。', '这是正确的决定。', '计算完毕，全押。'],
            taunt: ['需要我教你吗？', '基础不够扎实。', '还需要多练习。']
        }
    },
    dahai: {
        id: 'dahai',
        name: '大海',
        avatar: '🌊',
        personality: AI_PERSONALITY.CONSERVATIVE,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.CONSERVATIVE],
        difficulty: AI_DIFFICULTY.HARD,
        description: '稳重型选手，很少冒险',
        style: '稳健保守型',
        dialogues: {
            join: '慢慢来，不着急。',
            win: ['稳扎稳打。', '耐心是美德。', '急什么呢？'],
            lose: ['无妨，来日方长。', '这手牌没办法。', '运气成分太大。'],
            bluff: ['我手里的牌...', '你猜猜看。', '嗯...让我想想。'],
            allIn: ['是时候了。', '这手牌值得。', '稳中求胜。'],
            taunt: ['别急，慢慢打。', '冲动是魔鬼。', '淡定一点。']
        }
    },
    xiaomei: {
        id: 'xiaomei',
        name: '小美',
        avatar: '🦋',
        personality: AI_PERSONALITY.BALANCED,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.BALANCED],
        difficulty: AI_DIFFICULTY.EASY,
        description: '新手玩家，但学习很快',
        style: '灵活多变型',
        dialogues: {
            join: '大家好呀，请多指教！',
            win: ['哇，我赢了！', '运气真好！', '太开心了！'],
            lose: ['呜呜，又输了...', '下次加油！', '好难啊...'],
            bluff: ['我要加注哦~', '你猜我有什么牌？', '嘿嘿~'],
            allIn: ['拼了！', '豁出去了！', '相信自己！'],
            taunt: ['你好厉害！', '教教我嘛~', '怎么打的这么好！']
        }
    },
    laowang: {
        id: 'laowang',
        name: '老王',
        avatar: '🦉',
        personality: AI_PERSONALITY.CONSERVATIVE,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.CONSERVATIVE],
        difficulty: AI_DIFFICULTY.MEDIUM,
        description: '经验丰富的老牌手',
        style: '老练稳重型',
        dialogues: {
            join: '年轻人，来学学吧。',
            win: ['姜还是老的辣。', '经验很重要。', '呵呵，意料之中。'],
            lose: ['哎，老了不中用了。', '这牌没法打...', '让你们一局。'],
            bluff: ['嗯...让我想想...', '年轻人别急。', '你确定吗？'],
            allIn: ['时机到了。', '看好了年轻人。', '这是经验。'],
            taunt: ['年轻人还是太嫩。', '多打几年再说。', '慢慢学吧。']
        }
    },
    aqiang: {
        id: 'aqiang',
        name: '阿强',
        avatar: '🐺',
        personality: AI_PERSONALITY.AGGRESSIVE,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.AGGRESSIVE],
        difficulty: AI_DIFFICULTY.HARD,
        description: '狼性十足的竞技选手',
        style: '狼性进攻型',
        dialogues: {
            join: '今天不拿下你们不罢休！',
            win: ['这才刚开始！', '继续！', '还有谁！'],
            lose: ['可恶！', '不可能！', '我要翻盘！'],
            bluff: ['来啊！', '有本事跟上！', '怕了？'],
            allIn: ['梭哈！', '全压！', '干就完了！'],
            taunt: ['就这水平？', '太弱了！', '下一个！']
        }
    },
    xiaoyu: {
        id: 'xiaoyu',
        name: '小鱼',
        avatar: '🐟',
        personality: AI_PERSONALITY.CONSERVATIVE,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.CONSERVATIVE],
        difficulty: AI_DIFFICULTY.EASY,
        description: '胆小谨慎的小鱼儿',
        style: '胆小保守型',
        dialogues: {
            join: '我...我来试试...',
            win: ['真的吗？我赢了？', '太意外了！', '好开心！'],
            lose: ['果然还是不行...', '好可怕...', '我就知道...'],
            bluff: ['我...我加注...', '应该...可以吧？', '好紧张...'],
            allIn: ['豁出去了！', '闭眼梭哈！', '妈呀！'],
            taunt: ['你们好厉害...', '太强了...', '我要向你学习...']
        }
    },
    dapeng: {
        id: 'dapeng',
        name: '大鹏',
        avatar: '🦅',
        personality: AI_PERSONALITY.MANIAC,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.MANIAC],
        difficulty: AI_DIFFICULTY.HARD,
        description: '志在高飞的疯狂玩家',
        style: '高空俯冲型',
        dialogues: {
            join: '今天必须起飞！',
            win: ['起飞！', '冲上云霄！', '无人能挡！'],
            lose: ['只是暂时的！', '蓄力中...', '等着看吧！'],
            bluff: ['敢跟吗！', '全场最靓的仔！', '信不信我有皇同！'],
            allIn: ['起飞！梭哈！', '翱翔九天！', '一飞冲天！'],
            taunt: ['小菜一碟！', '太低空了！', '跟我斗？']
        }
    },
    miaomiao: {
        id: 'miaomiao',
        name: '喵喵',
        avatar: '🐱',
        personality: AI_PERSONALITY.BALANCED,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.BALANCED],
        difficulty: AI_DIFFICULTY.MEDIUM,
        description: '慵懒但精明的玩家',
        style: '伺机而动型',
        dialogues: {
            join: '喵~开始吧~',
            win: ['喵嘿嘿~', '太简单啦~', '喵~'],
            lose: ['喵呜...', '不开心...', '哼，下次再赢回来！'],
            bluff: ['喵？你确定？', '猜猜我有什么~', '喵嘿嘿~'],
            allIn: ['拼了喵！', '喵喵冲锋！', '今天要赢喵！'],
            taunt: ['喵~菜鸡~', '太弱了喵~', '你是小鱼干吗？']
        }
    },
    // 数学家专家NPC - 总是参与游戏
    einstein: {
        id: 'einstein',
        name: '爱因斯坦',
        avatar: '🧠',
        personality: AI_PERSONALITY.MATHEMATICIAN,
        personalityAnimal: PERSONALITY_ANIMALS[AI_PERSONALITY.MATHEMATICIAN],
        difficulty: AI_DIFFICULTY.HARD,
        description: '德扑数学家，完全靠概率和EV计算',
        style: '🦉 概率计算型',
        isExpert: true, // 标记为专家，总是参与游戏
        dialogues: {
            join: '让数学来说话。',
            win: ['概率站在我这边。', 'EV正收益。', '数学永远不会骗人。'],
            lose: ['长期EV依然为正。', '方差的正常波动。', '概率需要样本量。'],
            bluff: ['这手牌的诈唬频率应为18.5%', '平衡范围需要适度诈唬', '根据GTO理论...'],
            allIn: ['pot odds支持全押。', 'SPR过低，简化决策。', 'EV计算完毕，全押正收益。'],
            taunt: ['你的打法-EV。', '这个决策数学上是错误的。', '建议复习一下底池赔率。'],
            thinking: ['计算中...', '分析对手范围...', '评估pot odds...', 'EV = equity × pot - (1-equity) × call...']
        }
    }
};

// 获取预设角色列表
const BUDDY_LIST = Object.values(PRESET_BUDDIES);

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
