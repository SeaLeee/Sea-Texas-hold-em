/**
 * 扑克牌类
 */
class Card {
    /**
     * 创建一张扑克牌
     * @param {number} rank - 点数 (2-14, 其中11=J, 12=Q, 13=K, 14=A)
     * @param {Object} suit - 花色对象
     */
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
        this.faceUp = false;  // 是否正面朝上
    }

    /**
     * 获取点数显示值
     * @returns {string}
     */
    getRankDisplay() {
        return RANKS[this.rank].display;
    }

    /**
     * 获取花色符号
     * @returns {string}
     */
    getSuitSymbol() {
        return this.suit.symbol;
    }

    /**
     * 获取花色颜色
     * @returns {string}
     */
    getColor() {
        return this.suit.color;
    }

    /**
     * 翻牌
     */
    flip() {
        this.faceUp = !this.faceUp;
    }

    /**
     * 设置为正面朝上
     */
    reveal() {
        this.faceUp = true;
    }

    /**
     * 设置为背面朝上
     */
    hide() {
        this.faceUp = false;
    }

    /**
     * 比较两张牌的大小
     * @param {Card} other - 另一张牌
     * @returns {number} - 正数表示大于，负数表示小于，0表示相等
     */
    compareTo(other) {
        return this.rank - other.rank;
    }

    /**
     * 生成扑克牌的HTML元素
     * @param {string} size - 尺寸类型: 'normal', 'small', 'mini'
     * @param {boolean} showBack - 是否显示背面
     * @returns {HTMLElement}
     */
    toHTML(size = 'normal', showBack = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `poker-card ${this.getColor()}`;
        
        if (size === 'small') {
            cardDiv.classList.add('small');
        } else if (size === 'mini') {
            cardDiv.classList.add('mini');
        }

        if (showBack || !this.faceUp) {
            cardDiv.classList.add('back');
            return cardDiv;
        }

        // 正面牌面
        const topCorner = document.createElement('div');
        topCorner.className = 'card-corner top';
        topCorner.innerHTML = `
            <span class="card-rank">${this.getRankDisplay()}</span>
            <span class="card-suit-small">${this.getSuitSymbol()}</span>
        `;

        const center = document.createElement('div');
        center.className = 'card-center';
        center.textContent = this.getSuitSymbol();

        const bottomCorner = document.createElement('div');
        bottomCorner.className = 'card-corner bottom';
        bottomCorner.innerHTML = `
            <span class="card-rank">${this.getRankDisplay()}</span>
            <span class="card-suit-small">${this.getSuitSymbol()}</span>
        `;

        cardDiv.appendChild(topCorner);
        cardDiv.appendChild(center);
        cardDiv.appendChild(bottomCorner);

        return cardDiv;
    }

    /**
     * 获取牌的字符串表示
     * @returns {string}
     */
    toString() {
        return `${this.getRankDisplay()}${this.getSuitSymbol()}`;
    }

    /**
     * 创建牌的唯一标识
     * @returns {string}
     */
    getId() {
        return `${this.suit.name}-${this.rank}`;
    }

    /**
     * 克隆牌
     * @returns {Card}
     */
    clone() {
        const card = new Card(this.rank, this.suit);
        card.faceUp = this.faceUp;
        return card;
    }
}
