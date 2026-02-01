import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.selectedLevel = 1;
        this.selectedDifficulty = 'normal';
    }

    create() {
        const { width, height } = this.scale;

        // --- 1. PREMIUM BACKGROUND ---
        // Deep Space Gradient
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x05050a, 0x05050a, 0x1a1a2e, 0x16213e, 1);
        graphics.fillRect(0, 0, width, height);

        // Animated Particle Background
        this.createParticles(width, height);

        // Grid Overlay (Cyberpunk feel)
        this.createGrid(width, height);

        // --- 2. TITLE SECTION ---
        // Main Title with Glow
        const titleContainer = this.add.container(width / 2, height * 0.15);

        const titleGlow = this.add.text(0, 0, 'ANTIGRAVITY SURVIVOR', {
            fontSize: '80px',
            fontFamily: 'Orbitron, Arial Black',
            fill: '#00f2fe',
            align: 'center'
        }).setOrigin(0.5).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);

        const title = this.add.text(0, 0, 'ANTIGRAVITY SURVIVOR', {
            fontSize: '80px',
            fontFamily: 'Orbitron, Arial Black',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        titleContainer.add([titleGlow, title]);

        // Breathing Animation for Title
        this.tweens.add({
            targets: titleGlow,
            alpha: 0.7,
            scale: 1.05,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle
        this.add.text(width / 2, height * 0.23, 'SYSTEM STATUS: OVERLOAD ACTIVE', {
            fontSize: '18px',
            fontFamily: 'monospace',
            fill: '#00f2fe',
            letterSpacing: 4
        }).setOrigin(0.5).setAlpha(0.8);

        // --- 3. SELECTION PANELS (Glassmorphism) ---
        this.createSelectionPanels(width, height);

        // --- 4. START BUTTON ---
        this.createStartButton(width, height);
    }

    createParticles(width, height) {
        const particles = this.add.graphics();
        this.particleArray = [];

        for (let i = 0; i < 50; i++) {
            this.particleArray.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.2,
                alpha: Math.random() * 0.5 + 0.2
            });
        }

        this.particlesGraphics = particles;
    }

    createGrid(width, height) {
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x00f2fe, 0.05);

        const spacing = 40;
        for (let x = 0; x < width; x += spacing) {
            grid.lineBetween(x, 0, x, height);
        }
        for (let y = 0; y < height; y += spacing) {
            grid.lineBetween(0, y, width, y);
        }
    }

    createSelectionPanels(width, height) {
        // Level Selection
        const levelY = height * 0.45;
        this.add.text(width / 2, levelY - 50, 'DEPLOYMENT ZONE', {
            fontSize: '20px',
            fontFamily: 'Orbitron',
            fill: '#aaa'
        }).setOrigin(0.5);

        this.levelBtn = this.createMenuButton(width / 2, levelY, 'FOREST OF FEAR', 300, 60, () => {
            // Already selected
        }, true, 0x00f2fe);

        // Difficulty Selection
        const diffY = height * 0.65;
        this.add.text(width / 2, diffY - 50, 'THREAT LEVEL', {
            fontSize: '20px',
            fontFamily: 'Orbitron',
            fill: '#aaa'
        }).setOrigin(0.5);

        const diffs = [
            { id: 'normal', label: 'RECRUIT', color: 0x00ff00 },
            { id: 'hard', label: 'ELITE', color: 0xffaa00 },
            { id: 'hell', label: 'NIGHTMARE', color: 0xff0000 }
        ];

        this.diffButtons = {};
        const spacing = 220;
        const startX = width / 2 - spacing;

        diffs.forEach((d, i) => {
            const btn = this.createMenuButton(startX + i * spacing, diffY, d.label, 180, 50, () => {
                this.selectDifficulty(d.id);
            }, d.id === 'normal', d.color);
            this.diffButtons[d.id] = btn;
        });
    }

    createMenuButton(x, y, label, w, h, callback, isSelected, themeColor) {
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        const text = this.add.text(0, 0, label, {
            fontSize: '18px',
            fontFamily: 'Orbitron',
            fill: isSelected ? '#ffffff' : '#888888'
        }).setOrigin(0.5);

        const draw = (selected) => {
            bg.clear();
            // Outer Border
            bg.lineStyle(2, selected ? themeColor : 0x333333, 1);
            // Glass effect
            bg.fillStyle(selected ? themeColor : 0x000000, selected ? 0.2 : 0.4);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);

            if (selected) {
                text.setFill('#ffffff');
                // Inner glow
                bg.lineStyle(1, 0xffffff, 0.3);
                bg.strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 2);
            } else {
                text.setFill('#888888');
            }
        };

        draw(isSelected);
        container.add([bg, text]);

        bg.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

        bg.on('pointerover', () => {
            if (this.selectedDifficulty !== label.toLowerCase()) {
                this.tweens.add({ targets: container, scale: 1.05, duration: 100 });
                bg.lineStyle(2, themeColor, 0.8);
                bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
            }
        });

        bg.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
            draw(this.isButtonSelected(label));
        });

        bg.on('pointerdown', () => {
            callback();
            this.cameras.main.shake(100, 0.005);
        });

        container.updateState = (selected) => draw(selected);
        return container;
    }

    isButtonSelected(label) {
        if (label === 'RECRUIT' && this.selectedDifficulty === 'normal') return true;
        if (label === 'ELITE' && this.selectedDifficulty === 'hard') return true;
        if (label === 'NIGHTMARE' && this.selectedDifficulty === 'hell') return true;
        if (label === 'FOREST OF FEAR') return true;
        return false;
    }

    createStartButton(width, height) {
        const btnX = width / 2;
        const btnY = height * 0.85;
        const container = this.add.container(btnX, btnY);

        const bg = this.add.graphics();
        bg.fillStyle(0x00f2fe, 1);
        bg.fillRoundedRect(-150, -35, 300, 70, 35);

        // Add a secondary glow
        const glow = this.add.graphics();
        glow.lineStyle(4, 0x00f2fe, 0.5);
        glow.strokeRoundedRect(-155, -40, 310, 80, 40);

        const text = this.add.text(0, 0, 'INITIATE COMBAT', {
            fontSize: '28px',
            fontFamily: 'Orbitron',
            fill: '#05050a',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([glow, bg, text]);

        bg.setInteractive(new Phaser.Geom.Rectangle(-150, -35, 300, 70), Phaser.Geom.Rectangle.Contains);

        bg.on('pointerover', () => {
            this.tweens.add({ targets: container, scale: 1.1, duration: 150 });
            this.tweens.add({ targets: glow, alpha: 1, duration: 150 });
        });

        bg.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 150 });
            this.tweens.add({ targets: glow, alpha: 0.5, duration: 150 });
        });

        bg.on('pointerdown', () => {
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene', {
                    level: this.selectedLevel,
                    difficulty: this.selectedDifficulty
                });
                this.scene.stop('MenuScene');
            });
        });

        // Pulse animation for glow
        this.tweens.add({
            targets: glow,
            scale: 1.02,
            alpha: 0.8,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }

    update(time, delta) {
        // Update particles
        if (this.particlesGraphics) {
            this.particlesGraphics.clear();
            const { width, height } = this.scale;
            this.particleArray.forEach(p => {
                p.y -= p.speed;
                if (p.y < 0) p.y = height;
                this.particlesGraphics.fillStyle(0xffffff, p.alpha);
                this.particlesGraphics.fillCircle(p.x, p.y, p.size);
            });
        }
    }

    selectDifficulty(id) {
        this.selectedDifficulty = id;
        Object.keys(this.diffButtons).forEach(key => {
            this.diffButtons[key].updateState(key === id);
        });
    }
}
