import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const gameScene = this.scene.get('GameScene');

        // Glassmorphism HUD Backgrounds
        this.add.rectangle(10, 10, 250, 210, 0x000000, 0.4).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.2);

        // Level & Score
        this.scoreText = this.add.text(25, 20, 'LEVEL 1', {
            fontSize: '28px',
            fill: '#fff',
            fontStyle: 'bold',
            fontFamily: 'Arial Black'
        });

        this.levelNameText = this.add.text(25, 50, 'FOREST OF FEAR', {
            fontSize: '14px',
            fill: '#00f2fe',
            fontStyle: 'bold',
            fontFamily: 'Arial Black'
        });

        this.diffStatusText = this.add.text(width / 2, 60, 'NORMAL', {
            fontSize: '14px',
            fill: '#aaa',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5, 0);

        // Stylish Bars
        // HP Bar
        this.add.text(25, 75, 'HP', { fontSize: '14px', fill: '#ff4444', fontStyle: 'bold', fontFamily: 'Arial Black' });
        this.hpBg = this.add.rectangle(55, 80, 180, 12, 0x333333).setOrigin(0, 0.5);
        this.hpFill = this.add.rectangle(55, 80, 180, 12, 0xff4444).setOrigin(0, 0.5);
        this.shieldFill = this.add.rectangle(55, 80, 0, 12, 0xffffff).setOrigin(0, 0.5);
        this.hpText = this.add.text(25, 95, '100 / 100', { fontSize: '12px', fill: '#ffcccc', fontFamily: 'Arial Black' });

        // XP Bar (Relocated below HP)
        this.add.text(25, 115, 'XP', { fontSize: '14px', fill: '#ffff00', fontStyle: 'bold', fontFamily: 'Arial Black' });
        this.xpBarBg = this.add.rectangle(55, 120, 180, 12, 0x333333).setOrigin(0, 0.5);
        this.xpBarFill = this.add.rectangle(55, 120, 180, 12, 0xffff00).setOrigin(0, 0.5);
        this.xpText = this.add.text(25, 135, '0 / 100', { fontSize: '12px', fill: '#ffffcc', fontFamily: 'Arial Black' });

        // Overload Energy Bar (Special Skill)
        this.add.text(25, 155, 'PW', { fontSize: '14px', fill: '#00ffff', fontStyle: 'bold', fontFamily: 'Arial Black' });
        this.energyBarBg = this.add.rectangle(55, 160, 180, 12, 0x333333).setOrigin(0, 0.5);
        this.energyBarFill = this.add.rectangle(55, 160, 0, 12, 0x00ffff).setOrigin(0, 0.5);
        this.energyText = this.add.text(25, 175, '0 / 100', { fontSize: '11px', fill: '#ccffff', fontFamily: 'Arial Black' });
        this.energyPrompt = this.add.text(145, 200, 'SPACE TO OVERLOAD', {
            fontSize: '12px',
            fill: '#00ffff',
            fontStyle: 'bold',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5).setVisible(false);

        // Middle Timer Container
        this.add.rectangle(width / 2, 10, 150, 45, 0x000000, 0.4).setOrigin(0.5, 0).setStrokeStyle(1, 0xffffff, 0.2);
        this.timerText = this.add.text(width / 2, 16, '10:00', {
            fontSize: '32px',
            fill: '#fff',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5, 0);

        // Stats UI (Top Right) - Detailed Premium Design
        const statsBoxX = width - 260;
        const statsBoxY = 10;
        this.statsBg = this.add.rectangle(statsBoxX, statsBoxY, 250, 140, 0x000000, 0.5) // Increased height to 140
            .setOrigin(0)
            .setStrokeStyle(1, 0x00ff00, 0.3);

        this.add.text(statsBoxX + 10, statsBoxY + 5, 'ATTRIBUTES', {
            fontSize: '12px',
            fill: '#00ff00',
            fontStyle: 'bold',
            fontFamily: 'Arial Black'
        });

        this.statsText = this.add.text(statsBoxX + 15, statsBoxY + 30, '', {
            fontSize: '15px',
            fill: '#ffffff', // Changed to white
            fontFamily: 'Arial Black',
            lineSpacing: 10
        });

        // Speed Controls - Integrated into the same premium feel
        const speedBoxY = statsBoxY + 150; // Shifted down further for the even taller stats box
        this.add.rectangle(statsBoxX, speedBoxY, 250, 50, 0x000000, 0.5)
            .setOrigin(0)
            .setStrokeStyle(1, 0x00ff00, 0.3);

        this.add.text(statsBoxX + 10, speedBoxY + 5, 'TIME SCALE', {
            fontSize: '10px',
            fill: '#00ff00',
            fontStyle: 'bold',
            fontFamily: 'Arial Black'
        });

        const speeds = [0.5, 1, 2, 3];
        const btnWidth = 45;
        this.speedBtns = [];
        speeds.forEach((s, i) => {
            const x = statsBoxX + 30 + (i * (btnWidth + 10));
            const y = speedBoxY + 30;
            const btn = this.add.rectangle(x, y, btnWidth, 22, 0x222222).setInteractive();
            const txt = this.add.text(x, y, `${s}x`, { fontSize: '13px', fill: '#fff', fontStyle: 'bold', fontFamily: 'Arial Black' }).setOrigin(0.5);

            btn.on('pointerover', () => btn.setFillStyle(0x333333));
            btn.on('pointerout', () => { if (this.currentSpeedValue !== s) btn.setFillStyle(0x222222); });
            btn.on('pointerdown', () => this.setGameSpeed(s));

            if (s === 1) btn.setStrokeStyle(2, 0x00ff00).setFillStyle(0x004400);
            this.speedBtns.push(btn);
        });

        // Listen for keyboard input (+ / -)
        this.input.keyboard.on('keydown-PLUS', () => this.adjustSpeed(1));
        this.input.keyboard.on('keydown-NUMPAD_ADD', () => this.adjustSpeed(1));
        this.input.keyboard.on('keydown-MINUS', () => this.adjustSpeed(-1));
        this.input.keyboard.on('keydown-NUMPAD_SUBTRACT', () => this.adjustSpeed(-1));

        // Boss HP Bar (Refined & Repositioned to not overlap top HUD)
        this.bossHPContainer = this.add.container(width / 2, height - 80).setVisible(false).setDepth(90);

        // Glow effect for boss bar
        const bossBarWidth = Math.min(width * 0.8, 600);
        this.bossHPBg = this.add.rectangle(0, 0, bossBarWidth, 24, 0x000000, 0.7).setStrokeStyle(2, 0xff00ff, 0.5);
        this.bossHPFill = this.add.rectangle(-bossBarWidth / 2, 0, bossBarWidth, 24, 0xff0055).setOrigin(0, 0.5);

        // Add a gradient-like overlay to the fill
        this.bossHPOverlay = this.add.rectangle(-bossBarWidth / 2, 0, bossBarWidth, 10, 0xffffff, 0.2).setOrigin(0, 1);

        this.bossNameText = this.add.text(0, -35, 'BOSS NAME', {
            fontSize: '28px',
            fill: '#ff00ff',
            fontStyle: 'bold',
            fontFamily: 'Arial Black',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#ff00ff', blur: 10, fill: true }
        }).setOrigin(0.5);

        // Correctly assemble Boss container (Fixed: No player hpBg here)
        this.bossHPContainer.add([this.bossHPBg, this.bossHPFill, this.bossHPOverlay, this.bossNameText]);

        // Initial request for data update
        gameScene.updateUI();

        // Consolidated UI update system
        gameScene.events.on('updateScore', (data) => {
            this.scoreText.setText(`LEVEL ${data.level}`);

            const diffNames = { 'normal': 'NORMAL', 'hard': 'HARD', 'hell': 'HELL' };
            const diffColors = { 'normal': '#aaa', 'hard': '#ffaa00', 'hell': '#ff0000' };
            this.diffStatusText.setText(diffNames[gameScene.difficulty] || 'NORMAL');
            this.diffStatusText.setFill(diffColors[gameScene.difficulty] || '#aaa');

            // Update HP Bar
            const hpRatio = Phaser.Math.Clamp(data.hp / data.maxHP, 0, 1);
            this.hpFill.width = 180 * hpRatio;

            // Shield bar - OVERLAYS from left, no overflow beyond 180
            const shieldRatio = Phaser.Math.Clamp((data.shield || 0) / data.maxHP, 0, 1);
            this.shieldFill.width = 180 * shieldRatio;
            this.shieldFill.x = 55; // Reset to match start of HP bar

            let hpString = `${Math.ceil(data.hp)} / ${data.maxHP}`;
            if (data.shield > 0) hpString += ` (+${Math.floor(data.shield)})`;
            this.hpText.setText(hpString);

            // Update XP Bar
            const xpRatio = Phaser.Math.Clamp(data.xp / data.neededXP, 0, 1);
            this.xpBarFill.width = 180 * xpRatio;
            this.xpText.setText(`XP: ${Math.floor(data.xp)} / ${Math.floor(data.neededXP)}`);

            // Update Overload Bar
            const energyRatio = Phaser.Math.Clamp(data.overloadEnergy / data.maxOverloadEnergy, 0, 1);
            this.energyBarFill.width = 180 * energyRatio;
            this.energyText.setText(`${Math.floor(data.overloadEnergy)} / ${data.maxOverloadEnergy}`);

            if (data.overloadActive) {
                this.energyBarFill.setFillStyle(0xffffff);
                this.energyPrompt.setVisible(false);
            } else {
                this.energyBarFill.setFillStyle(0x00ffff);
                this.energyPrompt.setVisible(data.overloadEnergy >= data.maxOverloadEnergy);
            }

            const stats = data.stats;
            this.statsText.setText([
                `💥 DPS : ${Math.floor(data.dps || 0)}`,
                `🎯 REQ : ${Math.floor(data.requiredDPS || 0)}`,
                `⚔️ DMG : x${stats.damage.toFixed(2)}`,
                `⚡ SPD : x${stats.attackSpeed.toFixed(2)}`,
                `👣 MOV : x${stats.moveSpeed.toFixed(2)}`
            ]);
            this.statsText.setColor('#ffffff');
        });

        // Boss Indicators
        this.bossIndicators = this.add.group();

        gameScene.events.on('updateTime', (time) => {
            if (this.timerText) this.timerText.setText(time);
        });

        gameScene.events.on('bossSpawned', (boss) => {
            this.bossHPContainer.setVisible(true);
            this.bossNameText.setText(boss.name ? boss.name.toUpperCase() : 'ELITE ENEMY');
            this.updateBossBar(1, 1);

            // Boss spawn big text alert
            const alertText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 3, 'WARNING: BOSS DETECTED', {
                fontSize: '64px',
                fill: '#ff0000',
                fontFamily: 'Arial Black',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 10
            }).setOrigin(0.5).setAlpha(0).setScale(2);

            this.tweens.add({
                targets: alertText,
                alpha: 1,
                scale: 1,
                duration: 500,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: alertText,
                        alpha: 0,
                        duration: 1000,
                        delay: 1500,
                        onComplete: () => alertText.destroy()
                    });
                }
            });

            // Mobile Optimization
            if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
        });

        gameScene.events.on('updateBossHP', (hp, max) => {
            this.updateBossBar(hp, max);
        });

        gameScene.events.on('bossDied', () => {
            this.bossHPContainer.setVisible(false);
        });

        gameScene.events.on('levelUp', this.showLevelUp, this);

        // Physics Debug Toggle (Bottom Left)
        this.add.rectangle(10, height - 60, 200, 50, 0x000000, 0.4).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.2);
        this.debugCheckbox = this.add.rectangle(25, height - 35, 20, 20, 0x333333).setInteractive().setStrokeStyle(2, 0xffffff);
        this.debugCheck = this.add.text(25, height - 35, '✔', { fontSize: '16px', fill: '#00ff00' }).setOrigin(0.5).setVisible(false);
        this.add.text(50, height - 35, 'DEBUG HITBOX', { fontSize: '14px', fill: '#fff', fontFamily: 'Arial Black' }).setOrigin(0, 0.5);

        this.debugCheckbox.on('pointerdown', () => {
            const isVisible = !this.debugCheck.visible;
            this.debugCheck.setVisible(isVisible);
            gameScene.events.emit('toggleDebug', isVisible);
        });
    }

    updateBossBar(hp, max) {
        const percentage = Math.max(0, hp / max);
        const bossBarWidth = Math.min(window.innerWidth * 0.8, 600);
        this.bossHPFill.width = bossBarWidth * percentage;
        this.bossHPOverlay.width = bossBarWidth * percentage;
    }

    showLevelUp(options, callback) {
        this.scene.pause('GameScene');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const container = this.add.container(0, 0);

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        const title = this.add.text(width / 2, 100, 'LEVEL UP', {
            fontSize: '72px',
            fill: '#ffff00',
            fontFamily: 'Arial Black',
            fontStyle: 'bold italic',
            stroke: '#ff8800',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 0, color: '#ffcc00', blur: 20, fill: true }
        }).setOrigin(0.5);

        // Add a subtle tween to the title
        this.tweens.add({
            targets: title,
            scale: 1.1,
            duration: 800,
            yoyo: true,
            loop: -1,
            ease: 'Sine.easeInOut'
        });
        container.add([bg, title]);

        // Pick 3 random options
        const shuffled = options.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        selected.forEach((opt, index) => {
            const yPos = 280 + index * 130;
            const xPos = width / 2;

            // Option Container for grouping elements
            const optionContainer = this.add.container(xPos, yPos);

            // Premium Glass Card Background with Simulated Gradient
            const cardBg = this.add.graphics();
            // Create a gold/dark-yellow gradient
            cardBg.fillGradientStyle(0x665500, 0x665500, 0x221100, 0x221100, 0.6);
            cardBg.fillRect(-250, -55, 500, 110);
            cardBg.lineStyle(2, 0xffff00, 0.4);
            cardBg.strokeRect(-250, -55, 500, 110);

            // Interaction Hit Area
            const hitArea = this.add.rectangle(0, 0, 500, 110, 0x000000, 0).setInteractive();

            // Highlight bar on the left (Yellow)
            const accentBar = this.add.rectangle(-245, 0, 10, 110, 0xffff00).setOrigin(0.5);

            // Weapon Name & LV
            const levelStr = opt.isNew ? ' [NEW!]' : ` [LV. ${opt.level}]`;
            const nameTxt = this.add.text(0, -25, opt.config.showName.toUpperCase() + levelStr, {
                fontSize: '28px',
                fill: opt.isNew ? '#00f2fe' : '#ffff00',
                fontFamily: 'Orbitron', // Using Orbitron from main theme
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 3
            }).setOrigin(0.5);

            // Description
            const descTxt = this.add.text(0, 15, opt.config.description, {
                fontSize: '16px',
                fill: '#ffffff',
                fontFamily: 'monospace',
                align: 'center',
                wordWrap: { width: 450 }
            }).setOrigin(0.5);

            optionContainer.add([cardBg, accentBar, nameTxt, descTxt, hitArea]);
            container.add(optionContainer);

            // Hover & Interaction Effects
            hitArea.on('pointerover', () => {
                cardBg.clear();
                cardBg.fillGradientStyle(0x887700, 0x887700, 0x332200, 0x332200, 0.8);
                cardBg.fillRect(-250, -55, 500, 110);
                cardBg.lineStyle(3, 0xffff00, 0.8);
                cardBg.strokeRect(-250, -55, 500, 110);

                this.tweens.add({
                    targets: optionContainer,
                    scale: 1.05,
                    duration: 100,
                    ease: 'Power1'
                });
            });

            hitArea.on('pointerout', () => {
                cardBg.clear();
                cardBg.fillGradientStyle(0x665500, 0x665500, 0x221100, 0x221100, 0.6);
                cardBg.fillRect(-250, -55, 500, 110);
                cardBg.lineStyle(2, 0xffff00, 0.4);
                cardBg.strokeRect(-250, -55, 500, 110);

                this.tweens.add({
                    targets: optionContainer,
                    scale: 1.0,
                    duration: 100,
                    ease: 'Power1'
                });
            });

            hitArea.on('pointerdown', () => {
                // Flash effect
                this.tweens.add({
                    targets: optionContainer,
                    alpha: 0.5,
                    duration: 50,
                    yoyo: true,
                    onComplete: () => {
                        container.destroy();
                        this.scene.resume('GameScene');
                        callback(opt);
                    }
                });
            });
        });
    }

    setGameSpeed(s) {
        const gameScene = this.scene.get('GameScene');
        gameScene.events.emit('setSpeed', s);
        this.currentSpeedValue = s; // Explicitly update the tracked value
        this.speedBtns.forEach((b, i) => {
            const btnSpeed = [0.5, 1, 2, 3][i];
            const isActive = btnSpeed === s;
            b.setStrokeStyle(isActive ? 2 : 0, 0x00ff00);
            b.setFillStyle(isActive ? 0x004400 : 0x222222);
        });
    }

    adjustSpeed(direction) {
        const speeds = [0.5, 1, 2, 3];
        let currentIndex = speeds.indexOf(this.currentSpeedValue || 1);
        let nextIndex = Phaser.Math.Clamp(currentIndex + direction, 0, speeds.length - 1);
        this.setGameSpeed(speeds[nextIndex]);
    }

    update() {
        // Init speed if not set
        if (this.currentSpeedValue === undefined) this.currentSpeedValue = 1;
        // Update Boss Indicators
        const gameScene = this.scene.get('GameScene');
        if (!gameScene || !gameScene.enemies) return;

        this.bossIndicators.clear(true, true);

        const cam = gameScene.cameras.main;
        const screenRect = new Phaser.Geom.Rectangle(cam.worldView.x, cam.worldView.y, cam.worldView.width, cam.worldView.height);

        gameScene.enemies.getChildren().forEach(enemy => {
            if (enemy.active && enemy.isBoss) {
                if (!Phaser.Geom.Rectangle.Contains(screenRect, enemy.x, enemy.y)) {
                    // Boss is off-screen, draw pointer
                    this.drawBossPointer(enemy, cam);
                }
            }
        });
    }

    drawBossPointer(boss, cam) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const angle = Phaser.Math.Angle.Between(cam.midPoint.x, cam.midPoint.y, boss.x, boss.y);
        const dist = Math.floor(Phaser.Math.Distance.Between(cam.midPoint.x, cam.midPoint.y, boss.x, boss.y) / 10);

        // Position pointer on screen edge
        const margin = 50;
        const edgeX = centerX + Math.cos(angle) * (centerX - margin);
        const edgeY = centerY + Math.sin(angle) * (centerY - margin);

        const pointer = this.add.container(edgeX, edgeY);

        // Indicator Triangle
        const triangle = this.add.triangle(0, 0, 0, -10, 10, 10, -10, 10, 0xff00ff).setRotation(angle + Math.PI / 2);
        const distText = this.add.text(0, 25, `${dist}m`, { fontSize: '14px', fill: '#ff00ff', fontStyle: 'bold' }).setOrigin(0.5);

        pointer.add([triangle, distText]);
        this.bossIndicators.add(pointer);
    }

    showSummary(stats, callback) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const container = this.add.container(0, 0);

        // Dark Overlay
        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

        // Summary Card
        const cardWidth = 450;
        const cardHeight = 550;
        const card = this.add.rectangle(width / 2, height / 2, cardWidth, cardHeight, 0x111111, 0.9)
            .setStrokeStyle(2, stats.isVictory ? 0x00ff00 : 0xff0000, 0.5);

        // Title
        const titleText = stats.isVictory ? 'MISSION ACCOMPLISHED' : 'ROBOT DEFEATED';
        const titleColor = stats.isVictory ? '#00ff00' : '#ff0000';
        const title = this.add.text(width / 2, height / 2 - 220, titleText, {
            fontSize: '36px',
            fill: titleColor,
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Stats rows
        const startY = height / 2 - 120;
        const rowSpacing = 50;
        const statData = [
            { label: 'DIFFICULTY', value: stats.difficulty.toUpperCase() },
            { label: 'SURVIVAL TIME', value: `${Math.floor(stats.time / 60)}m ${stats.time % 60}s` },
            { label: 'LEVEL REACHED', value: stats.level },
            { label: 'ENEMIES KILLED', value: stats.enemiesKilled }
        ];

        statData.forEach((d, i) => {
            const y = startY + (i * rowSpacing);
            this.add.text(width / 2 - 180, y, d.label, { fontSize: '18px', fill: '#888', fontFamily: 'Arial Black' }).setOrigin(0, 0.5);
            this.add.text(width / 2 + 180, y, d.value, { fontSize: '20px', fill: '#fff', fontFamily: 'Arial Black' }).setOrigin(1, 0.5);
            container.add(this.add.line(0, 0, width / 2 - 180, y + 25, width / 2 + 180, y + 25, 0x333333).setOrigin(0));
        });

        // Confirmation Button
        const btnY = height / 2 + 180;
        const btnBg = this.add.rectangle(width / 2, btnY, 200, 50, stats.isVictory ? 0x00ff00 : 0xff0000, 1)
            .setInteractive({ useHandCursor: true });
        const btnText = this.add.text(width / 2, btnY, 'CONFIRM', {
            fontSize: '24px',
            fill: '#000',
            fontStyle: 'bold',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setAlpha(0.8));
        btnBg.on('pointerout', () => btnBg.setAlpha(1));
        btnBg.on('pointerdown', () => {
            container.destroy();
            callback();
        });

        container.add([bg, card, title, btnBg, btnText]);
        // Add stats texts manually to container as statData loop doesn't add them automatically here
        statData.forEach((d, i) => {
            const y = startY + (i * rowSpacing);
            const l = this.add.text(width / 2 - 180, y, d.label, { fontSize: '18px', fill: '#888', fontFamily: 'Arial Black' }).setOrigin(0, 0.5);
            const v = this.add.text(width / 2 + 180, y, d.value, { fontSize: '20px', fill: '#fff', fontFamily: 'Arial Black' }).setOrigin(1, 0.5);
            container.add([l, v]);
        });
    }
}
