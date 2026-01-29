/**
 * 牌组类
 */
class Deck {
    constructor() {
        this.cards = [];
        this.init();
    }

    /**
     * 初始化一副标准的52张扑克牌
     */
    init() {
        this.cards = [];
        for (const suit of SUIT_LIST) {
            for (const rank of RANK_LIST) {
                this.cards.push(new Card(rank, suit));
            }
        }
    }

    /**
     * Fisher-Yates 洗牌算法
     */
    shuffle() {
        const cards = this.cards;
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
    }

    /**
     * 多次洗牌以增加随机性
     * @param {number} times - 洗牌次数
     */
    shuffleMultiple(times = 3) {
        for (let i = 0; i < times; i++) {
            this.shuffle();
        }
    }

    /**
     * 发一张牌
     * @param {boolean} faceUp - 是否正面朝上
     * @returns {Card|null}
     */
    deal(faceUp = false) {
        if (this.cards.length === 0) {
            return null;
        }
        const card = this.cards.pop();
        if (faceUp) {
            card.reveal();
        }
        return card;
    }

    /**
     * 发多张牌
     * @param {number} count - 发牌数量
     * @param {boolean} faceUp - 是否正面朝上
     * @returns {Card[]}
     */
    dealMultiple(count, faceUp = false) {
        const cards = [];
        for (let i = 0; i < count && this.cards.length > 0; i++) {
            cards.push(this.deal(faceUp));
        }
        return cards;
    }

    /**
     * 烧牌（弃掉顶部一张牌）
     * @returns {Card|null}
     */
    burn() {
        return this.cards.pop();
    }

    /**
     * 获取剩余牌数
     * @returns {number}
     */
    remaining() {
        return this.cards.length;
    }

    /**
     * 重置牌组
     */
    reset() {
        this.init();
    }

    /**
     * 重置并洗牌
     */
    resetAndShuffle() {
        this.reset();
        this.shuffleMultiple();
    }

    /**
     * 查看顶部牌（不取出）
     * @returns {Card|null}
     */
    peek() {
        if (this.cards.length === 0) {
            return null;
        }
        return this.cards[this.cards.length - 1];
    }

    /**
     * 检查牌组是否为空
     * @returns {boolean}
     */
    isEmpty() {
        return this.cards.length === 0;
    }
}
