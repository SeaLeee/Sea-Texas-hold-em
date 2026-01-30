/**
 * 资金池管理器
 * 管理玩家的总资金储备，支持买入和卖出筹码
 */
class BankrollManager {
    constructor() {
        this.storageKey = 'poker_bankroll';
        this.transactionKey = 'poker_transactions';
        
        // 默认初始资金
        this.defaultBankroll = 50000;
        
        // 初始化资金池
        this.initBankroll();
    }
    
    /**
     * 初始化资金池
     */
    initBankroll() {
        const existing = localStorage.getItem(this.storageKey);
        if (!existing) {
            const initialData = {
                balance: this.defaultBankroll,
                totalWinnings: 0,
                totalLosses: 0,
                gamesPlayed: 0,
                biggestWin: 0,
                biggestLoss: 0,
                createdAt: Date.now(),
                lastUpdated: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        }
    }
    
    /**
     * 获取资金池数据
     * @returns {Object} 资金池数据
     */
    getBankrollData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : { balance: this.defaultBankroll };
        } catch (e) {
            return { balance: this.defaultBankroll };
        }
    }
    
    /**
     * 获取当前余额
     * @returns {number} 当前余额
     */
    getBalance() {
        return this.getBankrollData().balance;
    }
    
    /**
     * 买入筹码（从资金池扣除）
     * @param {number} amount - 买入金额
     * @returns {Object} { success: boolean, message: string, newBalance: number }
     */
    buyIn(amount) {
        const data = this.getBankrollData();
        
        if (amount <= 0) {
            return { success: false, message: '买入金额必须大于0', newBalance: data.balance };
        }
        
        if (amount > data.balance) {
            return { 
                success: false, 
                message: `余额不足！当前余额: ${this.formatNumber(data.balance)}，需要: ${this.formatNumber(amount)}`,
                newBalance: data.balance 
            };
        }
        
        // 扣除买入金额
        data.balance -= amount;
        data.lastUpdated = Date.now();
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        
        // 记录交易
        this.recordTransaction('buy_in', amount, `买入筹码 ${this.formatNumber(amount)}`);
        
        return { 
            success: true, 
            message: `成功买入 ${this.formatNumber(amount)} 筹码`,
            newBalance: data.balance 
        };
    }
    
    /**
     * 卖出筹码（存入资金池）
     * @param {number} amount - 卖出金额
     * @param {number} buyInAmount - 原始买入金额（用于计算盈亏）
     * @returns {Object} { success: boolean, message: string, newBalance: number, profit: number }
     */
    cashOut(amount, buyInAmount = 0) {
        const data = this.getBankrollData();
        
        if (amount < 0) {
            return { success: false, message: '卖出金额不能为负', newBalance: data.balance, profit: 0 };
        }
        
        const profit = amount - buyInAmount;
        
        // 增加余额
        data.balance += amount;
        data.gamesPlayed += 1;
        data.lastUpdated = Date.now();
        
        // 更新盈亏统计
        if (profit > 0) {
            data.totalWinnings += profit;
            if (profit > data.biggestWin) {
                data.biggestWin = profit;
            }
        } else if (profit < 0) {
            data.totalLosses += Math.abs(profit);
            if (Math.abs(profit) > data.biggestLoss) {
                data.biggestLoss = Math.abs(profit);
            }
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        
        // 记录交易
        const profitText = profit >= 0 ? `+${this.formatNumber(profit)}` : this.formatNumber(profit);
        this.recordTransaction('cash_out', amount, `卖出筹码 ${this.formatNumber(amount)}（${profitText}）`);
        
        return { 
            success: true, 
            message: profit >= 0 
                ? `成功卖出！盈利 ${this.formatNumber(profit)} 💰` 
                : `已结算，亏损 ${this.formatNumber(Math.abs(profit))}`,
            newBalance: data.balance,
            profit: profit
        };
    }
    
    /**
     * 添加奖励金（用于每日奖励等）
     * @param {number} amount - 奖励金额
     * @param {string} reason - 原因
     * @returns {Object} { success: boolean, newBalance: number }
     */
    addBonus(amount, reason = '奖励') {
        if (amount <= 0) {
            return { success: false, newBalance: this.getBalance() };
        }
        
        const data = this.getBankrollData();
        data.balance += amount;
        data.lastUpdated = Date.now();
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        
        this.recordTransaction('bonus', amount, reason);
        
        return { success: true, newBalance: data.balance };
    }
    
    /**
     * 重置资金池（调试用）
     */
    resetBankroll() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.transactionKey);
        this.initBankroll();
    }
    
    /**
     * 记录交易历史
     * @param {string} type - 交易类型
     * @param {number} amount - 金额
     * @param {string} description - 描述
     */
    recordTransaction(type, amount, description) {
        try {
            let transactions = JSON.parse(localStorage.getItem(this.transactionKey) || '[]');
            
            transactions.push({
                type,
                amount,
                description,
                timestamp: Date.now()
            });
            
            // 只保留最近100条记录
            if (transactions.length > 100) {
                transactions = transactions.slice(-100);
            }
            
            localStorage.setItem(this.transactionKey, JSON.stringify(transactions));
        } catch (e) {
            console.warn('记录交易失败:', e);
        }
    }
    
    /**
     * 获取交易历史
     * @param {number} limit - 获取数量
     * @returns {Array} 交易记录列表
     */
    getTransactionHistory(limit = 20) {
        try {
            const transactions = JSON.parse(localStorage.getItem(this.transactionKey) || '[]');
            return transactions.slice(-limit).reverse();
        } catch (e) {
            return [];
        }
    }
    
    /**
     * 获取统计数据
     * @returns {Object} 统计数据
     */
    getStatistics() {
        const data = this.getBankrollData();
        return {
            balance: data.balance,
            totalWinnings: data.totalWinnings || 0,
            totalLosses: data.totalLosses || 0,
            netProfit: (data.totalWinnings || 0) - (data.totalLosses || 0),
            gamesPlayed: data.gamesPlayed || 0,
            biggestWin: data.biggestWin || 0,
            biggestLoss: data.biggestLoss || 0,
            winRate: data.gamesPlayed > 0 
                ? Math.round(((data.totalWinnings || 0) > (data.totalLosses || 0) ? 1 : 0) / data.gamesPlayed * 100) 
                : 0
        };
    }
    
    /**
     * 检查是否可以买入指定金额
     * @param {number} amount - 买入金额
     * @returns {boolean}
     */
    canBuyIn(amount) {
        return this.getBalance() >= amount;
    }
    
    /**
     * 格式化数字
     * @param {number} num - 数字
     * @returns {string} 格式化后的字符串
     */
    formatNumber(num) {
        return num.toLocaleString('zh-CN');
    }
}

// 创建全局实例
const bankrollManager = new BankrollManager();
