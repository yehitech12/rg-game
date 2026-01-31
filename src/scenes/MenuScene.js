import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.selectedLevel = 1;
        this.selectedDifficulty = 'normal';
    }

    preload() {
        // Any specific menu assets would go here
    }

    create() {
        const { width, height } = this.scale;

        // Background Gradient (Mockup using Graphics)
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x0f0c29, 0x0f0c29, 0x302b63, 0x24243e, 1);
        graphics.fillRect(0, 0, width, height);

        // Title
        const title = this.add.text(width / 2, height * 0.15, 'ROGUELIKE SURVIVOR', {
            fontSize: '64px',
            fontWeight: 'bold',
            fontFamily: 'Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Glow effect for title
        title.setShadow(0, 0, '#00f2fe', 10, true, true);

        // Subtitle/Version
        this.add.text(width / 2, height * 0.22, 'v1.2.0 - OVERLOAD UPDATE', {
            fontSize: '18px',
            fill: '#888'
        }).setOrigin(0.5);

        // --- LEVEL SELECTION ---
        this.add.text(width / 2, height * 0.35, 'SELECT LEVEL', {
            fontSize: '24px',
            fill: '#00f2fe'
        }).setOrigin(0.5);

        const levelContainer = this.add.container(width / 2, height * 0.45);
        const levelBtn = this.createButton(0, 0, 'FOREST OF FEAR', () => {
            this.selectedLevel = 1;
        }, true);
        levelContainer.add(levelBtn);

        // --- DIFFICULTY SELECTION ---
        this.add.text(width / 2, height * 0.55, 'SELECT DIFFICULTY', {
            fontSize: '24px',
            fill: '#ff0055'
        }).setOrigin(0.5);

        const diffContainer = this.add.container(width / 2, height * 0.65);

        const diffs = [
            { id: 'normal', label: 'NORMAL', x: -150, color: 0x00ff00 },
            { id: 'hard', label: 'HARD', x: 0, color: 0xffaa00 },
            { id: 'hell', label: 'HELL', x: 150, color: 0xff0000 }
        ];

        this.diffButtons = {};

        diffs.forEach(d => {
            const btn = this.createButton(d.x, 0, d.label, () => {
                this.selectDifficulty(d.id);
            }, d.id === 'normal', d.color);
            diffContainer.add(btn);
            this.diffButtons[d.id] = btn;
        });

        // --- START BUTTON ---
        const startBtn = this.add.container(width / 2, height * 0.85);
        const startBg = this.add.graphics();
        startBg.fillStyle(0x00f2fe, 1);
        startBg.fillRoundedRect(-150, -30, 300, 60, 10);

        const startText = this.add.text(0, 0, 'ENGAGE', {
            fontSize: '32px',
            fontWeight: 'bold',
            fill: '#000'
        }).setOrigin(0.5);

        startBtn.add([startBg, startText]);
        startBg.setInteractive(new Phaser.Geom.Rectangle(-150, -30, 300, 60), Phaser.Geom.Rectangle.Contains);

        startBg.on('pointerover', () => {
            startBg.clear();
            startBg.fillStyle(0xffffff, 1);
            startBg.fillRoundedRect(-150, -30, 300, 60, 10);
            this.tweens.add({ targets: startBtn, scale: 1.1, duration: 100 });
        });

        startBg.on('pointerout', () => {
            startBg.clear();
            startBg.fillStyle(0x00f2fe, 1);
            startBg.fillRoundedRect(-150, -30, 300, 60, 10);
            this.tweens.add({ targets: startBtn, scale: 1.0, duration: 100 });
        });

        startBg.on('pointerdown', () => {
            this.scene.start('GameScene', {
                level: this.selectedLevel,
                difficulty: this.selectedDifficulty
            });
            this.scene.stop('MenuScene');
        });
    }

    createButton(x, y, label, callback, isSelected = false, activeColor = 0x00f2fe) {
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        const text = this.add.text(0, 0, label, {
            fontSize: '18px',
            fill: isSelected ? '#fff' : '#888'
        }).setOrigin(0.5);

        const drawBg = (selected) => {
            bg.clear();
            if (selected) {
                bg.lineStyle(2, activeColor, 1);
                bg.fillStyle(activeColor, 0.2);
                text.setFill('#fff');
            } else {
                bg.lineStyle(1, 0x444444, 1);
                bg.fillStyle(0x000000, 0.5);
                text.setFill('#888');
            }
            bg.strokeRoundedRect(-70, -20, 140, 40, 5);
            bg.fillRoundedRect(-70, -20, 140, 40, 5);
        };

        drawBg(isSelected);
        container.add([bg, text]);

        bg.setInteractive(new Phaser.Geom.Rectangle(-70, -20, 140, 40), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerdown', () => {
            callback();
            // This is a bit hacky for a generic button, but works for the menu
            if (label === 'NORMAL' || label === 'HARD' || label === 'HELL') {
                // handled by selectDifficulty
            } else {
                drawBg(true);
            }
        });

        container.updateState = (selected) => drawBg(selected);

        return container;
    }

    selectDifficulty(id) {
        this.selectedDifficulty = id;
        Object.keys(this.diffButtons).forEach(key => {
            this.diffButtons[key].updateState(key === id);
        });
    }
}
