/**
 * 粒子系统引擎 - 为德州扑克游戏提供视觉特效
 * 支持多种粒子效果：胜利庆祝、ALL IN爆炸、筹码飞行等
 */
class ParticleSystem {
    constructor(canvasId = 'particle-canvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.createCanvas(canvasId);
        }
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.emitters = [];
        this.isRunning = false;
        this.lastTime = 0;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * 创建Canvas元素
     */
    createCanvas(id) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = id;
        this.canvas.className = 'particle-canvas';
        document.body.appendChild(this.canvas);
    }

    /**
     * 调整Canvas大小
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * 启动粒子系统
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }

    /**
     * 停止粒子系统
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * 动画循环
     */
    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        if (this.particles.length > 0 || this.emitters.length > 0) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.isRunning = false;
        }
    }

    /**
     * 更新所有粒子
     */
    update(deltaTime) {
        // 更新发射器
        this.emitters = this.emitters.filter(emitter => {
            emitter.update(deltaTime, this);
            return emitter.isAlive();
        });

        // 更新粒子
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.isAlive();
        });
    }

    /**
     * 渲染所有粒子
     */
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const particle of this.particles) {
            particle.render(this.ctx);
        }
    }

    /**
     * 添加粒子
     */
    addParticle(particle) {
        this.particles.push(particle);
        if (!this.isRunning) {
            this.start();
        }
    }

    /**
     * 添加发射器
     */
    addEmitter(emitter) {
        this.emitters.push(emitter);
        if (!this.isRunning) {
            this.start();
        }
    }

    /**
     * 清除所有粒子
     */
    clear() {
        this.particles = [];
        this.emitters = [];
    }

    // ==================== 预设特效 ====================

    /**
     * 胜利庆祝效果 - 金币雨 + 烟花
     */
    celebrateWin(x, y, intensity = 1) {
        const centerX = x || this.canvas.width / 2;
        const centerY = y || this.canvas.height / 2;

        // 金币爆炸
        this.createCoinExplosion(centerX, centerY, Math.floor(50 * intensity));
        
        // 烟花效果
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const fx = centerX + (Math.random() - 0.5) * 300;
                const fy = centerY + (Math.random() - 0.5) * 200;
                this.createFirework(fx, fy);
            }, i * 200);
        }

        // 星星效果
        this.createStarBurst(centerX, centerY, 30);
    }

    /**
     * ALL IN 爆炸效果
     */
    allInExplosion(x, y) {
        const centerX = x || this.canvas.width / 2;
        const centerY = y || this.canvas.height / 2;

        // 火焰爆炸
        this.createFireExplosion(centerX, centerY, 80);
        
        // 冲击波
        this.createShockwave(centerX, centerY);
        
        // 火花
        this.createSparks(centerX, centerY, 50);
    }

    /**
     * 发牌效果
     */
    dealCardEffect(x, y) {
        this.createSparkTrail(x, y, 15);
    }

    /**
     * 筹码移动效果
     */
    chipMoveEffect(fromX, fromY, toX, toY, amount) {
        const chipCount = Math.min(Math.ceil(amount / 100), 20);
        
        for (let i = 0; i < chipCount; i++) {
            setTimeout(() => {
                this.createFlyingChip(fromX, fromY, toX, toY);
            }, i * 50);
        }
    }

    /**
     * 大牌出现效果
     */
    bigHandEffect(x, y, handRank) {
        const centerX = x || this.canvas.width / 2;
        const centerY = y || this.canvas.height / 2;

        // 根据牌型大小决定效果强度
        let intensity = 1;
        if (handRank >= 8) intensity = 3;      // 四条以上
        else if (handRank >= 6) intensity = 2;  // 同花以上
        else if (handRank >= 4) intensity = 1.5; // 三条以上

        this.createGlowEffect(centerX, centerY, intensity);
        this.createStarBurst(centerX, centerY, Math.floor(20 * intensity));
    }

    // ==================== 粒子生成器 ====================

    /**
     * 创建金币爆炸
     */
    createCoinExplosion(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 300;
            const particle = new Particle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 200,
                life: 2 + Math.random(),
                size: 8 + Math.random() * 8,
                color: this.getGoldColor(),
                type: 'coin',
                gravity: 400,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
            this.addParticle(particle);
        }
    }

    /**
     * 创建烟花效果
     */
    createFirework(x, y) {
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < 60; i++) {
            const angle = (i / 60) * Math.PI * 2;
            const speed = 150 + Math.random() * 100;
            const particle = new Particle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1 + Math.random() * 0.5,
                size: 3 + Math.random() * 3,
                color: color,
                type: 'spark',
                gravity: 100,
                fadeOut: true,
                trail: true
            });
            this.addParticle(particle);
        }
    }

    /**
     * 创建星星爆发
     */
    createStarBurst(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            const particle = new Particle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.5 + Math.random(),
                size: 10 + Math.random() * 15,
                color: '#ffd700',
                type: 'star',
                fadeOut: true,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 5,
                scale: 1
            });
            this.addParticle(particle);
        }
    }

    /**
     * 创建火焰爆炸
     */
    createFireExplosion(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 400;
            const particle = new Particle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                life: 0.5 + Math.random() * 0.5,
                size: 15 + Math.random() * 20,
                color: this.getFireColor(),
                type: 'fire',
                gravity: -50,
                fadeOut: true,
                shrink: true
            });
            this.addParticle(particle);
        }
    }

    /**
     * 创建冲击波
     */
    createShockwave(x, y) {
        const particle = new Particle({
            x, y,
            vx: 0,
            vy: 0,
            life: 0.5,
            size: 10,
            color: 'rgba(255, 100, 50, 0.8)',
            type: 'shockwave',
            fadeOut: true,
            expandSpeed: 800
        });
        this.addParticle(particle);
    }

    /**
     * 创建火花
     */
    createSparks(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 200 + Math.random() * 300;
            const particle = new Particle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.4,
                size: 2 + Math.random() * 3,
                color: '#ffff00',
                type: 'spark',
                fadeOut: true,
                trail: true
            });
            this.addParticle(particle);
        }
    }

    /**
     * 创建光辉效果
     */
    createGlowEffect(x, y, intensity) {
        const particle = new Particle({
            x, y,
            vx: 0,
            vy: 0,
            life: 1.5,
            size: 50 * intensity,
            color: 'rgba(255, 215, 0, 0.6)',
            type: 'glow',
            fadeOut: true,
            pulse: true,
            pulseSpeed: 3
        });
        this.addParticle(particle);
    }

    /**
     * 创建闪光轨迹
     */
    createSparkTrail(x, y, count) {
        for (let i = 0; i < count; i++) {
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 30;
            const particle = new Particle({
                x: x + offsetX,
                y: y + offsetY,
                vx: (Math.random() - 0.5) * 50,
                vy: (Math.random() - 0.5) * 50,
                life: 0.3 + Math.random() * 0.3,
                size: 3 + Math.random() * 4,
                color: '#ffffff',
                type: 'spark',
                fadeOut: true
            });
            this.addParticle(particle);
        }
    }

    /**
     * 创建飞行筹码
     */
    createFlyingChip(fromX, fromY, toX, toY) {
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = Math.max(0.5, distance / 500);
        
        const particle = new Particle({
            x: fromX,
            y: fromY,
            targetX: toX,
            targetY: toY,
            vx: dx / duration,
            vy: dy / duration,
            life: duration,
            size: 12,
            color: color,
            type: 'chip',
            rotation: 0,
            rotationSpeed: 15
        });
        this.addParticle(particle);
    }

    // ==================== 辅助函数 ====================

    /**
     * 获取金色渐变
     */
    getGoldColor() {
        const colors = ['#ffd700', '#ffcc00', '#ffaa00', '#ff9900', '#ffdd44'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 获取火焰颜色
     */
    getFireColor() {
        const colors = ['#ff4500', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 获取Canvas元素
     */
    getCanvas() {
        return this.canvas;
    }
}

/**
 * 粒子类
 */
class Particle {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.life = options.life || 1;
        this.maxLife = this.life;
        this.size = options.size || 5;
        this.initialSize = this.size;
        this.color = options.color || '#ffffff';
        this.type = options.type || 'circle';
        this.gravity = options.gravity || 0;
        this.fadeOut = options.fadeOut || false;
        this.shrink = options.shrink || false;
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        this.trail = options.trail || false;
        this.trailLength = options.trailLength || 5;
        this.trailPositions = [];
        this.scale = options.scale || 1;
        this.expandSpeed = options.expandSpeed || 0;
        this.pulse = options.pulse || false;
        this.pulseSpeed = options.pulseSpeed || 1;
        this.targetX = options.targetX;
        this.targetY = options.targetY;
    }

    update(deltaTime) {
        // 保存轨迹
        if (this.trail) {
            this.trailPositions.unshift({ x: this.x, y: this.y });
            if (this.trailPositions.length > this.trailLength) {
                this.trailPositions.pop();
            }
        }

        // 更新位置
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // 应用重力
        this.vy += this.gravity * deltaTime;
        
        // 更新旋转
        this.rotation += this.rotationSpeed * deltaTime;
        
        // 扩展效果
        if (this.expandSpeed > 0) {
            this.size += this.expandSpeed * deltaTime;
        }
        
        // 脉冲效果
        if (this.pulse) {
            this.scale = 1 + Math.sin(this.life * this.pulseSpeed * Math.PI * 2) * 0.3;
        }
        
        // 缩小效果
        if (this.shrink) {
            this.size = this.initialSize * (this.life / this.maxLife);
        }
        
        // 减少生命
        this.life -= deltaTime;
    }

    isAlive() {
        return this.life > 0;
    }

    render(ctx) {
        const alpha = this.fadeOut ? Math.max(0, this.life / this.maxLife) : 1;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);

        switch (this.type) {
            case 'coin':
                this.renderCoin(ctx);
                break;
            case 'star':
                this.renderStar(ctx);
                break;
            case 'fire':
                this.renderFire(ctx);
                break;
            case 'spark':
                this.renderSpark(ctx);
                break;
            case 'shockwave':
                this.renderShockwave(ctx);
                break;
            case 'glow':
                this.renderGlow(ctx);
                break;
            case 'chip':
                this.renderChip(ctx);
                break;
            default:
                this.renderCircle(ctx);
        }

        ctx.restore();

        // 渲染轨迹
        if (this.trail && this.trailPositions.length > 0) {
            this.renderTrail(ctx, alpha);
        }
    }

    renderCircle(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    renderCoin(ctx) {
        // 金币
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size / 2);
        gradient.addColorStop(0, '#fff6a1');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, '#b8860b');
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 金币边缘
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 金币符号
        ctx.fillStyle = '#b8860b';
        ctx.font = `bold ${this.size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
    }

    renderStar(ctx) {
        const spikes = 5;
        const outerRadius = this.size / 2;
        const innerRadius = outerRadius / 2;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, '#ff8c00');
        
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    renderFire(ctx) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, '#ffff00');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    renderSpark(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderShockwave(ctx) {
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;
        ctx.stroke();
    }

    renderGlow(ctx) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    renderChip(ctx) {
        // 筹码
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // 边缘
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 内圈
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    renderTrail(ctx, alpha) {
        ctx.save();
        for (let i = 0; i < this.trailPositions.length; i++) {
            const pos = this.trailPositions[i];
            const trailAlpha = alpha * (1 - i / this.trailPositions.length) * 0.5;
            const trailSize = this.size * (1 - i / this.trailPositions.length) * 0.8;
            
            ctx.globalAlpha = trailAlpha;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, trailSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        ctx.restore();
    }
}

/**
 * 粒子发射器类
 */
class ParticleEmitter {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.rate = options.rate || 10; // 每秒发射数量
        this.life = options.life || 1;
        this.particleConfig = options.particleConfig || {};
        this.timer = 0;
        this.emitInterval = 1 / this.rate;
    }

    update(deltaTime, particleSystem) {
        this.timer += deltaTime;
        this.life -= deltaTime;

        while (this.timer >= this.emitInterval && this.life > 0) {
            this.emit(particleSystem);
            this.timer -= this.emitInterval;
        }
    }

    emit(particleSystem) {
        const config = { ...this.particleConfig };
        config.x = this.x + (Math.random() - 0.5) * (config.spread || 0);
        config.y = this.y + (Math.random() - 0.5) * (config.spread || 0);
        
        const particle = new Particle(config);
        particleSystem.addParticle(particle);
    }

    isAlive() {
        return this.life > 0;
    }
}

// 导出全局实例
let particleSystem = null;

function initParticleSystem() {
    if (!particleSystem) {
        particleSystem = new ParticleSystem('particle-canvas');
    }
    return particleSystem;
}
