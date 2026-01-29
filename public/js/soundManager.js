/**
 * 音效管理器 - 使用Web Audio API生成合成音效
 * 无需额外音频文件，所有音效都是程序生成的
 */
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.5; // 0-1
        
        // 初始化音频上下文（需要用户交互后才能启用）
        this.initialized = false;
    }

    /**
     * 初始化音频上下文（必须在用户交互后调用）
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('[SoundManager] 音效系统已初始化');
        } catch (e) {
            console.warn('[SoundManager] Web Audio API 不可用:', e);
            this.enabled = false;
        }
    }

    /**
     * 设置音量
     * @param {number} volume - 音量 (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * 开关音效
     * @param {boolean} enabled 
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 播放音效
     * @param {string} type - 音效类型
     */
    play(type) {
        if (!this.enabled || !this.initialized || !this.audioContext) return;

        // 确保音频上下文处于运行状态
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        switch (type) {
            case 'deal':
                this.playDealSound();
                break;
            case 'fold':
                this.playFoldSound();
                break;
            case 'check':
                this.playCheckSound();
                break;
            case 'call':
                this.playCallSound();
                break;
            case 'raise':
                this.playRaiseSound();
                break;
            case 'allin':
                this.playAllInSound();
                break;
            case 'win':
                this.playWinSound();
                break;
            case 'chips':
                this.playChipsSound();
                break;
            case 'turn':
                this.playTurnSound();
                break;
            case 'click':
                this.playClickSound();
                break;
            case 'error':
                this.playErrorSound();
                break;
            default:
                console.warn(`[SoundManager] 未知音效类型: ${type}`);
        }
    }

    /**
     * 创建振荡器
     * @param {string} type - 波形类型
     * @param {number} frequency - 频率
     * @param {number} duration - 持续时间
     * @param {number} volume - 音量
     */
    createOscillator(type, frequency, duration, volume = this.volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);

        return { oscillator, gainNode };
    }

    /**
     * 创建噪音
     * @param {number} duration - 持续时间
     * @param {number} volume - 音量
     */
    createNoise(duration, volume = this.volume) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(volume * 0.15, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        // 高通滤波器让噪音更清脆
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, this.audioContext.currentTime);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(this.audioContext.currentTime);
        source.stop(this.audioContext.currentTime + duration);
    }

    /**
     * 发牌音效 - 清脆的卡片滑动声
     */
    playDealSound() {
        // 模拟纸牌声：短促噪音 + 轻微音调
        this.createNoise(0.08, this.volume * 0.6);
        
        setTimeout(() => {
            this.createOscillator('sine', 800, 0.05, this.volume * 0.1);
        }, 20);
    }

    /**
     * 弃牌音效 - 低沉的丢弃声
     */
    playFoldSound() {
        // 下滑音调
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);

        this.createNoise(0.1, this.volume * 0.3);
    }

    /**
     * 过牌音效 - 轻敲声
     */
    playCheckSound() {
        // 双敲击声
        this.createOscillator('sine', 600, 0.05, this.volume * 0.3);
        setTimeout(() => {
            this.createOscillator('sine', 650, 0.05, this.volume * 0.25);
        }, 80);
    }

    /**
     * 跟注音效 - 筹码落下声
     */
    playCallSound() {
        // 多个筹码声
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const freq = 1200 + Math.random() * 400;
                this.createOscillator('sine', freq, 0.08, this.volume * 0.2);
            }, i * 40);
        }
    }

    /**
     * 加注音效 - 更多筹码 + 上升音调
     */
    playRaiseSound() {
        // 上升音调
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.15);

        gainNode.gain.setValueAtTime(this.volume * 0.25, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);

        // 筹码声
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const freq = 1000 + Math.random() * 600;
                this.createOscillator('sine', freq, 0.06, this.volume * 0.15);
            }, 50 + i * 30);
        }
    }

    /**
     * 全押音效 - 戏剧性的声音
     */
    playAllInSound() {
        // 强烈的上升音调
        const oscillator1 = this.audioContext.createOscillator();
        const gainNode1 = this.audioContext.createGain();

        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.3);

        gainNode1.gain.setValueAtTime(this.volume * 0.2, this.audioContext.currentTime);
        gainNode1.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);

        oscillator1.connect(gainNode1);
        gainNode1.connect(this.audioContext.destination);

        oscillator1.start(this.audioContext.currentTime);
        oscillator1.stop(this.audioContext.currentTime + 0.4);

        // 大量筹码声
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const freq = 800 + Math.random() * 800;
                this.createOscillator('sine', freq, 0.1, this.volume * 0.12);
            }, i * 25);
        }

        // 强调音
        setTimeout(() => {
            this.createOscillator('sine', 523.25, 0.15, this.volume * 0.3); // C5
            setTimeout(() => {
                this.createOscillator('sine', 659.25, 0.15, this.volume * 0.3); // E5
            }, 100);
        }, 250);
    }

    /**
     * 获胜音效 - 欢快的音调
     */
    playWinSound() {
        // 胜利旋律: C-E-G-C
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.createOscillator('sine', freq, 0.2, this.volume * 0.3);
            }, index * 120);
        });

        // 筹码收取声
        setTimeout(() => {
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const freq = 1200 + Math.random() * 600;
                    this.createOscillator('sine', freq, 0.08, this.volume * 0.15);
                }, i * 40);
            }
        }, 400);
    }

    /**
     * 筹码声效
     */
    playChipsSound() {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                const freq = 1000 + Math.random() * 500;
                this.createOscillator('sine', freq, 0.07, this.volume * 0.2);
            }, i * 35);
        }
    }

    /**
     * 轮到你了音效
     */
    playTurnSound() {
        // 提示音: 两个上升的音调
        this.createOscillator('sine', 440, 0.1, this.volume * 0.25); // A4
        setTimeout(() => {
            this.createOscillator('sine', 554.37, 0.15, this.volume * 0.3); // C#5
        }, 120);
    }

    /**
     * 点击音效
     */
    playClickSound() {
        this.createOscillator('sine', 800, 0.05, this.volume * 0.2);
    }

    /**
     * 错误音效
     */
    playErrorSound() {
        // 下降的不和谐音
        this.createOscillator('square', 300, 0.1, this.volume * 0.15);
        setTimeout(() => {
            this.createOscillator('square', 200, 0.15, this.volume * 0.15);
        }, 100);
    }
}

// 创建全局音效管理器实例
const soundManager = new SoundManager();
