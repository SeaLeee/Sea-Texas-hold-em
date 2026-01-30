/**
 * VIP会员管理器
 * 管理用户VIP状态和白名单功能
 */
class VIPManager {
    constructor() {
        this.storageKey = 'poker_vip_status';
        this.whitelistKey = 'poker_vip_whitelist';
        
        // 预设的VIP白名单（模拟数据库）
        this.defaultWhitelist = [
            'vip_user_001',
            'vip_user_002',
            'premium_player',
            'admin'
        ];
        
        // 初始化白名单到localStorage
        this.initWhitelist();
    }
    
    /**
     * 初始化白名单
     */
    initWhitelist() {
        const existingWhitelist = localStorage.getItem(this.whitelistKey);
        if (!existingWhitelist) {
            localStorage.setItem(this.whitelistKey, JSON.stringify(this.defaultWhitelist));
        }
    }
    
    /**
     * 获取当前用户ID
     * @returns {string} 用户ID
     */
    getCurrentUserId() {
        let userId = localStorage.getItem('poker_user_id');
        if (!userId) {
            // 生成随机用户ID
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('poker_user_id', userId);
        }
        return userId;
    }
    
    /**
     * 检查用户是否是VIP
     * @param {string} userId - 用户ID（可选，默认当前用户）
     * @returns {boolean} 是否是VIP
     */
    isVIP(userId = null) {
        const targetUserId = userId || this.getCurrentUserId();
        
        // 方式1: 检查是否在白名单中
        const whitelist = this.getWhitelist();
        if (whitelist.includes(targetUserId)) {
            return true;
        }
        
        // 方式2: 检查是否手动设置了VIP状态
        const vipStatus = localStorage.getItem(this.storageKey);
        if (vipStatus) {
            const status = JSON.parse(vipStatus);
            if (status.isVIP && status.expireTime > Date.now()) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 获取VIP白名单
     * @returns {Array} 白名单用户列表
     */
    getWhitelist() {
        try {
            const whitelist = localStorage.getItem(this.whitelistKey);
            return whitelist ? JSON.parse(whitelist) : [];
        } catch (e) {
            return [];
        }
    }
    
    /**
     * 添加用户到白名单
     * @param {string} userId - 用户ID
     * @returns {boolean} 是否添加成功
     */
    addToWhitelist(userId) {
        const whitelist = this.getWhitelist();
        if (!whitelist.includes(userId)) {
            whitelist.push(userId);
            localStorage.setItem(this.whitelistKey, JSON.stringify(whitelist));
            return true;
        }
        return false;
    }
    
    /**
     * 从白名单移除用户
     * @param {string} userId - 用户ID
     * @returns {boolean} 是否移除成功
     */
    removeFromWhitelist(userId) {
        const whitelist = this.getWhitelist();
        const index = whitelist.indexOf(userId);
        if (index > -1) {
            whitelist.splice(index, 1);
            localStorage.setItem(this.whitelistKey, JSON.stringify(whitelist));
            return true;
        }
        return false;
    }
    
    /**
     * 设置用户VIP状态（临时激活，用于测试）
     * @param {number} durationDays - VIP有效天数
     */
    activateVIP(durationDays = 30) {
        const expireTime = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
        const status = {
            isVIP: true,
            activatedAt: Date.now(),
            expireTime: expireTime
        };
        localStorage.setItem(this.storageKey, JSON.stringify(status));
    }
    
    /**
     * 取消VIP状态
     */
    deactivateVIP() {
        localStorage.removeItem(this.storageKey);
    }
    
    /**
     * 获取VIP剩余时间（毫秒）
     * @returns {number} 剩余毫秒数，0表示非VIP
     */
    getVIPRemainingTime() {
        const vipStatus = localStorage.getItem(this.storageKey);
        if (vipStatus) {
            const status = JSON.parse(vipStatus);
            if (status.isVIP && status.expireTime > Date.now()) {
                return status.expireTime - Date.now();
            }
        }
        return 0;
    }
    
    /**
     * 格式化剩余时间
     * @returns {string} 格式化的剩余时间字符串
     */
    getFormattedRemainingTime() {
        const remaining = this.getVIPRemainingTime();
        if (remaining <= 0) {
            return '未激活';
        }
        
        const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        
        if (days > 0) {
            return `${days}天${hours}小时`;
        } else {
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            return `${hours}小时${minutes}分钟`;
        }
    }
    
    /**
     * 获取VIP特权列表
     * @returns {Array} 特权列表
     */
    getVIPPrivileges() {
        return [
            { name: 'GTO策略分析', description: '每局结束后获取专业策略分析和改进建议', icon: '📊' },
            { name: '高级数据统计', description: '查看详细的历史数据和趋势分析', icon: '📈' },
            { name: '专属牌桌皮肤', description: '解锁精美的VIP专属牌桌主题', icon: '🎨' },
            { name: '优先客服支持', description: '享受VIP专属客服通道', icon: '💬' }
        ];
    }
}

// 创建全局实例
const vipManager = new VIPManager();
