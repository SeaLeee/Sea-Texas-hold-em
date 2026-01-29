# ♠ 德州扑克 Texas Hold'em ♥

一个完整的网页版德州扑克游戏，支持单人对战AI，具有精美的UI界面和完整的游戏规则实现。

![德州扑克](https://img.shields.io/badge/Game-Texas%20Hold'em-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-brightgreen)

## ✨ 功能特点

### 🎮 游戏功能
- **完整的德州扑克规则**：翻牌前、翻牌、转牌、河牌、摊牌全流程
- **智能AI对手**：三种难度等级（简单、中等、困难）
- **可调节设置**：
  - AI玩家数量（2-5人）
  - 初始筹码（1,000 / 5,000 / 10,000）
  - 盲注大小（10/20、25/50、50/100）

### 🃏 牌型判断
完整实现所有德州扑克牌型（从高到低）：
1. 皇家同花顺 (Royal Flush)
2. 同花顺 (Straight Flush)
3. 四条 (Four of a Kind)
4. 葫芦 (Full House)
5. 同花 (Flush)
6. 顺子 (Straight)
7. 三条 (Three of a Kind)
8. 两对 (Two Pair)
9. 一对 (One Pair)
10. 高牌 (High Card)

### 🤖 AI难度说明
| 难度 | 特点 |
|------|------|
| 简单 | 较多随机操作，不考虑底池赔率 |
| 中等 | 基础牌力评估，考虑底池赔率 |
| 困难 | 高级EV计算，位置优势利用，偶尔诈唬 |

### 🎨 UI设计
- 精美的扑克牌桌设计
- CSS纯手绘扑克牌（无需图片资源）
- 流畅的发牌和翻牌动画
- 响应式布局适配不同屏幕
- 游戏日志实时记录

## 🚀 快速开始

### 本地运行

```bash
# 克隆项目
git clone <repository-url>
cd texas-holdem

# 安装依赖
npm install

# 启动服务器
npm start
```

服务器启动后，打开浏览器访问 `http://localhost:3000`

### Railway 部署

本项目已配置好 Railway 部署所需的所有设置：

1. 在 [Railway](https://railway.app/) 创建新项目
2. 连接你的 GitHub 仓库
3. Railway 会自动检测 Node.js 项目并部署
4. 部署完成后即可通过提供的URL访问游戏

**部署配置说明：**
- `package.json` 中已配置 `start` 脚本
- `engines` 字段指定 Node.js 版本 >= 18.0.0
- 服务器会自动使用 `PORT` 环境变量

## 📁 项目结构

```
texas-holdem/
├── package.json          # 项目配置和依赖
├── server.js            # Express 静态服务器
├── README.md            # 项目说明文档
└── public/              # 前端静态资源
    ├── index.html       # 游戏主页面
    ├── css/
    │   ├── styles.css   # 主样式文件
    │   ├── cards.css    # 扑克牌样式
    │   └── animations.css # 动画效果
    └── js/
        ├── constants.js     # 常量定义
        ├── card.js          # Card 类
        ├── deck.js          # Deck 类（牌组）
        ├── handEvaluator.js # 牌型判断器
        ├── player.js        # Player 类
        ├── ai.js            # AI 决策逻辑
        ├── gameManager.js   # 游戏流程管理
        ├── ui.js            # UI 渲染和交互
        └── app.js           # 应用入口
```

## 🎯 操作说明

### 游戏操作
| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 弃牌 | F | 放弃本轮游戏 |
| 过牌/跟注 | C | 无需下注时过牌，需要时跟注 |
| 加注 | R | 提高下注金额（使用滑块选择金额） |
| 全押 | A | 押上所有筹码 |

### 加注技巧
- 使用滑块或直接输入金额
- 快捷按钮：1/2底池、3/4底池、1x底池

## 🛠️ 技术栈

- **前端**：原生 HTML5 + CSS3 + JavaScript (ES6+)
- **后端**：Node.js + Express（静态文件服务）
- **部署**：Railway / 任何支持 Node.js 的平台

## 📝 游戏规则

1. **盲注阶段**：小盲位和大盲位强制下注
2. **翻牌前**：每位玩家获得2张底牌，进行第一轮下注
3. **翻牌**：发出3张公共牌，进行第二轮下注
4. **转牌**：发出第4张公共牌，进行第三轮下注
5. **河牌**：发出第5张公共牌，进行最后一轮下注
6. **摊牌**：使用5张公共牌+2张底牌中最好的5张组合比较大小

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢所有德州扑克爱好者的支持！

---

**Enjoy the game! 祝您好运！ 🍀**
