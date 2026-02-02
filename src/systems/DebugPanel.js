import Phaser from 'phaser';
import { Weapons } from '../config/weapons';

export default class DebugPanel {
    constructor(uiScene) {
        this.uiScene = uiScene;
        this.gameScene = uiScene.scene.get('GameScene');
        this.isVisible = false;
        this.container = null;
        this.levelLabels = {}; // 用於追蹤並更新等級文字
        this.createPanel();

        // Listen for Tab key to toggle
        this.uiScene.input.keyboard.on('keydown-TAB', (event) => {
            event.preventDefault();
            this.toggle();
        });
    }

    createPanel() {
        this.container = this.uiScene.add.container(50, 50).setDepth(20000);

        // 1. Blocker Background
        const blocker = this.uiScene.add.rectangle(150, 275, 300, 550, 0x000000, 0.95);
        blocker.setStrokeStyle(2, 0xff00ff, 1);
        blocker.setInteractive();
        this.container.add(blocker);

        // Title
        const title = this.uiScene.add.text(150, 25, 'DEBUG TEST PANEL', {
            fontSize: '22px',
            fontFamily: 'Orbitron',
            fill: '#ff00ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(title);

        let yOffset = 70;

        // Weapon Selection & Levels
        const weaponKeys = Object.keys(Weapons);
        weaponKeys.forEach(key => {
            const weaponConfig = Weapons[key];
            const weaponName = weaponConfig.showName || key;
            const currentLevel = this.gameScene.weaponSystem.weapons[key] ? this.gameScene.weaponSystem.weapons[key].level : 0;

            const rowY = yOffset;

            const nameText = this.uiScene.add.text(30, rowY, weaponName, {
                fontSize: '14px', fill: '#ffffff'
            }).setOrigin(0, 0.5);

            const levelText = this.uiScene.add.text(145, rowY, `LV: ${currentLevel}`, {
                fontSize: '14px', fill: '#00f2fe'
            }).setOrigin(0, 0.5);

            this.levelLabels[key] = levelText; // 儲存引用以便同步

            this.createLevelButton(195, rowY, ' - ', 0xff0000, () => this.adjustWeapon(key, -1));
            this.createLevelButton(245, rowY, ' + ', 0x00ff00, () => this.adjustWeapon(key, 1));

            this.container.add([nameText, levelText]);
            yOffset += 35;
        });

        // Command Buttons
        yOffset += 20;
        this.createFullWidthButton(150, yOffset, 'TOGGLE INVINCIBLE', () => {
            this.gameScene.player.isInvincible = !this.gameScene.player.isInvincible;
            console.log(`Invincible: ${this.gameScene.player.isInvincible}`);
        });

        yOffset += 45;
        this.createFullWidthButton(150, yOffset, 'KILL ALL ENEMIES', () => {
            this.gameScene.enemies.getChildren().forEach(e => {
                if (e.active) e.takeDamage(999999);
            });
        });

        yOffset += 45;
        this.createFullWidthButton(150, yOffset, 'INSTANT LEVEL UP', () => {
            this.gameScene.currentXP = this.gameScene.neededXP;
        });

        this.container.setVisible(this.isVisible);
    }

    createLevelButton(x, y, label, color, callback) {
        const btnBg = this.uiScene.add.rectangle(x, y, 36, 26, 0x333333).setInteractive({ useHandCursor: true });
        const btnText = this.uiScene.add.text(x, y, label, { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setStrokeStyle(2, color));
        btnBg.on('pointerout', () => btnBg.setStrokeStyle(0));
        btnBg.on('pointerdown', () => {
            callback();
        });

        this.container.add([btnBg, btnText]);
    }

    createFullWidthButton(x, y, label, callback) {
        const btnBg = this.uiScene.add.rectangle(x, y, 240, 36, 0x333333).setInteractive({ useHandCursor: true });
        const btnText = this.uiScene.add.text(x, y, label, {
            fontSize: '14px',
            fontFamily: 'Orbitron',
            fill: '#ffffff'
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setFillStyle(0x555555).setStrokeStyle(2, 0xff00ff));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0x333333).setStrokeStyle(0));
        btnBg.on('pointerdown', callback);

        this.container.add([btnBg, btnText]);
    }

    adjustWeapon(key, delta) {
        const weaponSystem = this.gameScene.weaponSystem;
        let currentLevel = weaponSystem.weapons[key] ? weaponSystem.weapons[key].level : 0;
        let newLevel = Math.max(0, Math.min(5, currentLevel + delta));

        if (newLevel === 0) {
            delete weaponSystem.weapons[key];
            // 特殊處理：須佐能乎等級 0 時隱藏外觀
            if (key === 'Susanoo' && this.gameScene.player.susanoo) {
                this.gameScene.player.susanoo.container.setVisible(false);
            }
        } else {
            // 如果從 0 升級，確保顯示外觀
            if (key === 'Susanoo' && this.gameScene.player.susanoo) {
                this.gameScene.player.susanoo.container.setVisible(true);
            }

            if (!weaponSystem.weapons[key]) {
                weaponSystem.addWeapon(key, Weapons[key]);
                // Catch up level
                for (let i = 1; i < newLevel; i++) this.upgradeWeaponToLevel(key, i + 1);
            } else {
                if (delta > 0) {
                    this.upgradeWeaponToLevel(key, newLevel);
                } else {
                    const nextFire = weaponSystem.weapons[key].nextFire;
                    delete weaponSystem.weapons[key];
                    weaponSystem.addWeapon(key, Weapons[key]);
                    weaponSystem.weapons[key].nextFire = nextFire;
                    for (let i = 1; i < newLevel; i++) this.upgradeWeaponToLevel(key, i + 1);
                }
            }
        }

        this.refreshAllLevels(); // 同步所有等級文字
        if (this.gameScene.updateUI) this.gameScene.updateUI();
    }

    upgradeWeaponToLevel(key, targetLevel) {
        const weaponSystem = this.gameScene.weaponSystem;
        const weapon = weaponSystem.weapons[key];
        if (!weapon || !Weapons[key].upgrades || targetLevel <= 1) return;

        const upgrade = Weapons[key].upgrades[targetLevel - 2];
        if (upgrade) {
            for (let stat in upgrade) {
                if (weapon.baseStats[stat] !== undefined) weapon.baseStats[stat] += upgrade[stat];
            }
            weapon.level = targetLevel;
        }
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.setVisible(this.isVisible);

        if (this.isVisible) {
            this.gameScene.events.emit('pause');
            this.refreshAllLevels(); // 打開時同步一次等級
        } else {
            this.gameScene.events.emit('resume');
        }
    }

    refreshAllLevels() {
        Object.keys(Weapons).forEach(key => {
            const currentLevel = this.gameScene.weaponSystem.weapons[key] ? this.gameScene.weaponSystem.weapons[key].level : 0;
            if (this.levelLabels[key]) {
                this.levelLabels[key].setText(`LV: ${currentLevel}`);
            }
        });
    }
}
