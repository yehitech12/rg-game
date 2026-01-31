import Phaser from 'phaser';
import Player from '../objects/Player';
import Enemy from '../objects/Enemy';
import Bullet from '../objects/Bullet';
import ExpGem from '../objects/ExpGem';
import Box from '../objects/Box';
import WeaponSystem from '../systems/WeaponSystem';
import { Weapons } from '../config/weapons';
import { Enemies } from '../config/enemies';

// Assets served from /public/assets/
const playerImg = 'assets/robot.png';
const bgImg = 'assets/BG1.png';
const enemyImg = 'assets/enemy.png';
const bulletImg = 'assets/bullet.png';
const xpGemImg = 'assets/xp_gem.png';
const dragonImg = 'assets/dragon.png';
const bossSlimeImg = 'assets/boss_slime.png';
const bossBatImg = 'assets/boss_bat.png';
const bossGolemImg = 'assets/boss_golem.png';
const bossDemonImg = 'assets/boss_demon.png';
const chestImg = 'assets/chest.png';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.player = null;
        this.enemies = null;
        this.bullets = null;
        this.xpGems = null;
        this.boxes = null;

        this.spawnDelay = 800;
        this.maxEnemies = 100;
        this.level = 1;
        this.currentXP = 0;
        this.neededXP = 100;
        this.gameTimer = 0;

        this.levelUpPending = 0;
        this.isLevelingUp = false;

        this.overloadEnergy = 0;
        this.maxOverloadEnergy = 100;
        this.overloadActive = false;
        this.overloadDuration = 10000;
        this.overloadEndTime = 0;
        this.difficulty = 'normal';
        this.enemiesKilled = 0;
    }

    init(data) {
        this.difficulty = data.difficulty || 'normal';
        this.selectedLevel = data.level || 1;

        // Reset all states for restart
        this.spawnDelay = 800;
        this.maxEnemies = 100;
        this.level = 1;
        this.currentXP = 0;
        this.neededXP = 100;
        this.gameTimer = 0;
        this.levelUpPending = 0;
        this.isLevelingUp = false;
        this.overloadEnergy = 0;
        this.overloadActive = false;
        this.enemiesKilled = 0;
    }

    preload() {
        this.load.image('player_raw', playerImg);
        this.load.image('player_robot2_raw', 'assets/Robot2.png');
        this.load.image('bg', bgImg);
        this.load.image('enemy', enemyImg);
        this.load.image('enemy_weak', 'assets/enemy_weak.png');
        this.load.image('enemy_fast', enemyImg);
        this.load.image('enemy_tank', 'assets/enemy_strong.png');
        this.load.image('bullet', bulletImg);
        this.load.image('xp_gem', xpGemImg);
        this.load.image('dragon', dragonImg);
        this.load.image('boss_slime', bossSlimeImg);
        this.load.image('boss_bat', bossBatImg);
        this.load.image('boss_golem', bossGolemImg);
        this.load.image('boss_demon', bossDemonImg);
        this.load.image('chest', chestImg);
    }

    create() {
        // No world bounds - infinite map
        this.physics.world.setBounds();

        // Add BG1 background as tileSprite (seamless repeating)
        // Make it large enough to cover the viewport
        const bgWidth = window.innerWidth * 2;
        const bgHeight = window.innerHeight * 2;
        this.background = this.add.tileSprite(0, 0, bgWidth, bgHeight, 'bg');
        this.background.setTint(0x888888); // Darken and desaturate to emphasize foreground
        this.background.setAlpha(0.7);
        this.background.setScrollFactor(0); // Fixed to camera

        this.player = new Player(this, 0, 0);

        // Process player texture (Only once or reuse)
        if (!this.textures.exists('player_clean')) {
            const texture = this.textures.get('player_raw').getSourceImage();
            const canvas = this.textures.createCanvas('player_clean', texture.width, texture.height);
            const ctx = canvas.getContext();
            ctx.drawImage(texture, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i] > 240 && imageData.data[i + 1] > 240 && imageData.data[i + 2] > 240) {
                    imageData.data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            canvas.refresh();
        }

        this.player.setTexture('player_clean');
        this.player.setScale(0.04);
        this.player.shield = 0;

        // Process Robot2 texture for Overload mode
        if (!this.textures.exists('player_robot2')) {
            const robot2Texture = this.textures.get('player_robot2_raw').getSourceImage();
            const robot2Canvas = this.textures.createCanvas('player_robot2', robot2Texture.width, robot2Texture.height);
            const robot2Ctx = robot2Canvas.getContext();
            robot2Ctx.drawImage(robot2Texture, 0, 0);
            const robot2Data = robot2Ctx.getImageData(0, 0, robot2Canvas.width, robot2Canvas.height);
            for (let i = 0; i < robot2Data.data.length; i += 4) {
                if (robot2Data.data[i] > 240 && robot2Data.data[i + 1] > 240 && robot2Data.data[i + 2] > 240) {
                    robot2Data.data[i + 3] = 0;
                }
            }
            robot2Ctx.putImageData(robot2Data, 0, 0);
            robot2Canvas.refresh();
        }

        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true, maxSize: 1000 });
        this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true, maxSize: 1000 });
        this.xpGems = this.physics.add.group({ classType: ExpGem, runChildUpdate: true, maxSize: 2000 });
        this.boxes = this.physics.add.group({ classType: Box, runChildUpdate: true });

        this.weaponSystem = new WeaponSystem(this);
        this.weaponSystem.addWeapon('Handgun', Weapons['Handgun']);

        // Create fire texture
        if (!this.textures.exists('fire')) {
            const fireGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            fireGraphics.fillStyle(0xff4400, 1);
            fireGraphics.fillCircle(8, 8, 8);
            fireGraphics.generateTexture('fire', 16, 16);
        }

        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.bullets, this.boxes, this.hitBox, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);

        this.events.off('setSpeed');
        this.events.on('setSpeed', (multiplier) => {
            this.time.timeScale = multiplier;
            this.physics.world.timeScale = 1 / multiplier;
        });

        this.spawnTimer = this.time.addEvent({ delay: this.spawnDelay, callback: this.spawnEnemy, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 30000, callback: this.spawnBox, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 1000, callback: this.updateGameTimer, callbackScope: this, loop: true });

        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.overloadEnergy >= this.maxOverloadEnergy && !this.overloadActive) {
                this.activateOverload();
            }
        });

        // Launch UI Scene
        this.scene.launch('UIScene');

        this.updateUI();
    }

    update(time, delta) {
        if (this.player) {
            this.player.update();

            // Update background tilePosition for seamless scrolling
            if (this.background) {
                this.background.tilePositionX = this.cameras.main.scrollX;
                this.background.tilePositionY = this.cameras.main.scrollY;
            }

            // Update weapon system to fire bullets
            if (this.weaponSystem) {
                this.weaponSystem.update(time, this.player);
            }

            if (this.overloadActive) {
                if (time > this.overloadEndTime) {
                    this.deactivateOverload();
                } else {
                    this.updateUI();
                }
            }
        }
    }

    updateUI() {
        if (!this.weaponSystem) return;
        this.events.emit('updateScore', {
            level: this.level,
            xp: this.currentXP,
            neededXP: this.neededXP,
            hp: this.player.health,
            maxHP: this.player.maxHealth,
            shield: this.player.shield,
            overloadEnergy: this.overloadEnergy,
            maxOverloadEnergy: this.maxOverloadEnergy,
            overloadActive: this.overloadActive,
            stats: this.player.stats,
            dps: this.weaponSystem.getDPS(),
            requiredDPS: this.weaponSystem.getRequiredDPS()
        });
    }

    spawnEnemy() {
        if (!this.player || this.enemies.countActive() > this.maxEnemies) return;

        const distance = Phaser.Math.Between(700, 1000);
        const angle = Phaser.Math.Between(0, 360);
        const x = this.player.x + distance * Math.cos(Phaser.Math.DegToRad(angle));
        const y = this.player.y + distance * Math.sin(Phaser.Math.DegToRad(angle));

        const enemy = this.enemies.get();
        if (enemy) {
            let type = 'slime';
            const roll = Math.random();
            if (roll < 0.5) type = 'slime';
            else if (roll < 0.75) type = 'fast';
            else if (roll < 0.90) type = 'tank';
            else type = 'dragon';

            const config = { ...Enemies[type] };

            // Apply Difficulty Modifiers
            if (this.difficulty === 'hard') {
                config.hp *= 1.8;
                config.damage *= 1.5;
                config.xp *= 1.1;
            } else if (this.difficulty === 'hell') {
                config.hp *= 4.0;
                config.damage *= 2.5;
                config.xp *= 1.2;
            }

            enemy.spawn(x, y, config);
            enemy.setTarget(this.player);
        }
    }

    spawnBox() {
        if (!this.player || this.boxes.countActive() > 2) return;
        const x = this.player.x + Phaser.Math.Between(-600, 600);
        const y = this.player.y + Phaser.Math.Between(-600, 600);
        const box = this.boxes.get();
        if (box) box.spawn(x, y);
    }

    spawnBoss() {
        const distance = 800;
        const angle = Phaser.Math.Between(0, 360);
        const x = this.player.x + distance * Math.cos(Phaser.Math.DegToRad(angle));
        const y = this.player.y + distance * Math.sin(Phaser.Math.DegToRad(angle));

        const minutes = Math.floor(this.gameTimer / 60);
        let key = 'boss_slime';
        if (minutes >= 10) key = 'boss_demon';
        else if (minutes >= 8) key = 'boss_dragon';
        else if (minutes >= 6) key = 'boss_golem';
        else if (minutes >= 4) key = 'boss_bat';
        else if (minutes >= 2) key = 'boss_slime';

        const boss = this.enemies.get();
        if (boss) {
            const config = { ...Enemies[key] };

            // Apply Difficulty Modifiers
            if (this.difficulty === 'hard') {
                config.hp *= 1.5;
                config.damage *= 1.3;
            } else if (this.difficulty === 'hell') {
                config.hp *= 3.0;
                config.damage *= 2.0;
            }

            boss.spawn(x, y, config);
            boss.setTarget(this.player);

            const txt = this.add.text(this.player.x, this.player.y - 150, `${Enemies[key].name} APPEARED!`, { fontSize: '40px', fill: '#ff00ff' }).setOrigin(0.5);
            this.tweens.add({ targets: txt, alpha: 0, duration: 4000, onComplete: () => txt.destroy() });
        }
    }

    hitEnemy(bullet, enemy) {
        if (bullet.active && enemy.active) {
            enemy.takeDamage(bullet.damage);

            if (bullet.burnStacks > 0) {
                enemy.addBurnStack(bullet.burnStacks);
            }

            bullet.hit();

            const text = this.add.text(enemy.x, enemy.y - 20, Math.floor(bullet.damage), { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);
            this.tweens.add({ targets: text, y: enemy.y - 50, alpha: 0, duration: 500, onComplete: () => text.destroy() });
        }
    }

    hitBox(bullet, box) {
        if (bullet.active && box.active) {
            box.takeDamage();
            bullet.hit();
        }
    }

    spawnItem(x, y) {
        const type = Phaser.Math.Between(1, 3);
        const colors = [0x00ff00, 0x00ffff, 0xffff00];
        const labels = ['HEAL', 'VACUUM', 'BUFF'];

        const circle = this.add.circle(x, y, 15, colors[type - 1]);
        this.physics.add.existing(circle);

        const txt = this.add.text(x, y - 30, labels[type - 1], { fontSize: '14px', fill: '#fff' }).setOrigin(0.5);

        const overlap = this.physics.add.overlap(this.player, circle, () => {
            overlap.destroy();
            circle.destroy();
            txt.destroy();
            this.applyPowerup(type);
        });
    }

    applyPowerup(type) {
        if (type === 1) {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
        } else if (type === 2) {
            this.xpGems.getChildren().forEach(gem => {
                if (gem.active) {
                    this.tweens.add({
                        targets: gem,
                        x: this.player.x,
                        y: this.player.y,
                        duration: 500,
                        onComplete: () => this.collectGem(this.player, gem)
                    });
                }
            });
        } else if (type === 3) {
            this.player.stats.damage *= 1.2;
            this.time.delayedCall(10000, () => {
                this.player.stats.damage /= 1.2;
            });
        }
        this.updateUI();
    }

    enemyDied(x, y, xpValue) {
        this.enemiesKilled++;
        const gem = this.xpGems.get();
        if (gem) {
            gem.spawn(x, y, xpValue);
        }

        if (!this.overloadActive) {
            this.overloadEnergy = Math.min(this.maxOverloadEnergy, this.overloadEnergy + 5);
            this.updateUI();
        }
    }

    hitPlayer(player, enemy) {
        if (enemy.active) {
            let remainingDamage = enemy.damage;
            if (player.shield > 0) {
                const absorbed = Math.min(player.shield, remainingDamage);
                player.shield -= absorbed;
                remainingDamage -= absorbed;
            }

            if (remainingDamage > 0) {
                player.health -= remainingDamage;
            }

            player.lastDamageTime = this.time.now;
            this.cameras.main.shake(100, 0.01);

            const damageText = this.add.text(player.x, player.y - 40, `-${enemy.damage}`, {
                fontSize: '20px',
                fill: remainingDamage > 0 ? '#ff0000' : '#ffffff'
            }).setOrigin(0.5);
            this.tweens.add({
                targets: damageText,
                y: player.y - 80,
                alpha: 0,
                duration: 1000,
                onComplete: () => damageText.destroy()
            });

            this.updateUI();

            if (player.health <= 0) {
                this.gameOver(false);
            }
        }

        const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
        enemy.x += Math.cos(angle) * 20;
        enemy.y += Math.sin(angle) * 20;
    }

    collectGem(player, gem) {
        if (gem.active) {
            gem.setActive(false);
            gem.setVisible(false);
            this.gainXP(gem.value);
        }
    }

    updateGameTimer() {
        this.gameTimer++;

        if (this.gameTimer % 30 === 0 && this.spawnDelay > 100) {
            this.spawnDelay = Math.max(100, this.spawnDelay - 40);
            this.spawnTimer.reset({ delay: this.spawnDelay, callback: this.spawnEnemy, callbackScope: this, loop: true });
            this.maxEnemies += 50;
        }

        if (this.gameTimer > 0 && this.gameTimer % 120 === 0) {
            this.spawnBoss();
        }

        const mins = Math.floor(this.gameTimer / 60);
        const secs = this.gameTimer % 60;
        this.events.emit('updateTime', `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

        if (this.gameTimer >= 600) {
            this.gameOver(true);
        }
    }

    gameOver(isVictory) {
        this.scene.pause();
        const ui = this.scene.get('UIScene');
        ui.showSummary({
            isVictory: isVictory,
            level: this.level,
            enemiesKilled: this.enemiesKilled,
            time: this.gameTimer,
            difficulty: this.difficulty
        }, () => {
            this.scene.resume();
            this.events.off('updateScore');
            this.events.off('updateTime');
            this.events.off('bossSpawned');
            this.events.off('updateBossHP');
            this.events.off('bossDied');
            this.events.off('setSpeed');
            this.scene.stop('UIScene');
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
        });
    }

    gainXP(amount) {
        this.currentXP += amount;

        while (this.currentXP >= this.neededXP) {
            this.currentXP -= this.neededXP;
            this.neededXP = Math.floor(this.neededXP * 1.3);
            this.levelUpPending++;
        }

        if (this.levelUpPending > 0 && !this.isLevelingUp) {
            this.triggerLevelUp();
        }
        this.updateUI();
    }

    activateOverload() {
        this.overloadActive = true;
        this.overloadEndTime = this.time.now + this.overloadDuration;

        this.player.setTexture('player_robot2');
        this.player.setScale(0.75);
        this.player.body.setSize(120, 120);
        this.player.shield = 50;

        const currentDPS = this.weaponSystem.getDPS();
        this.savedWeapons = { ...this.weaponSystem.weapons };
        this.weaponSystem.weapons = {};

        this.weaponSystem.addWeapon('Overload_Flame', Weapons['Overload_Flame']);
        this.weaponSystem.addWeapon('Overload_MG1', Weapons['Overload_MachineGun']);
        this.weaponSystem.addWeapon('Overload_MG2', Weapons['Overload_MachineGun']);
        this.weaponSystem.addWeapon('Overload_Aura', Weapons['Overload_Aura']);

        const overloadBaseDPS = this.weaponSystem.getDPS();
        const scalar = overloadBaseDPS > 0 ? (currentDPS * 2) / overloadBaseDPS : 2;
        Object.values(this.weaponSystem.weapons).forEach(w => {
            w.baseStats.damage *= scalar;
        });

        this.cameras.main.flash(500, 255, 255, 255);
        this.updateUI();
    }

    deactivateOverload() {
        this.overloadActive = false;
        this.overloadEnergy = 0;
        this.player.setTexture('player_clean');
        this.player.setScale(0.04);
        this.player.body.setSize(64, 64);
        this.weaponSystem.weapons = this.savedWeapons;
        this.updateUI();
    }

    triggerLevelUp() {
        if (this.levelUpPending <= 0) {
            this.isLevelingUp = false;
            return;
        }

        this.isLevelingUp = true;
        const weaponKeys = Object.keys(Weapons).filter(k => !k.startsWith('Overload_'));
        const options = [];
        const selected = Phaser.Utils.Array.Shuffle(weaponKeys).slice(0, 3);
        selected.forEach(key => {
            options.push({ key: key, config: Weapons[key] });
        });

        const ui = this.scene.get('UIScene');
        ui.showLevelUp(options, (choice) => {
            this.level++;
            this.levelUpPending--;
            if (choice) {
                this.weaponSystem.addWeapon(choice.key, Weapons[choice.key]);

                if (this.overloadActive && this.savedWeapons) {
                    if (!this.savedWeapons[choice.key]) {
                        this.savedWeapons[choice.key] = {
                            config: choice.config,
                            level: 1,
                            nextFire: 0,
                            baseStats: { ...choice.config.baseStats }
                        };
                    } else {
                        const w = this.savedWeapons[choice.key];
                        w.level++;
                        const up = w.config.upgrade;
                        if (up.damage) w.baseStats.damage += up.damage;
                        if (up.range) w.baseStats.range += up.range;
                        if (up.attackSpeed) w.baseStats.attackSpeed += up.attackSpeed;
                        if (up.pierce) w.baseStats.pierce = (w.baseStats.pierce || 1) + up.pierce;
                        if (up.count) w.baseStats.count = (w.baseStats.count || 1) + up.count;
                    }
                }
            }
            this.scene.resume('GameScene');
            if (this.levelUpPending > 0) {
                this.time.delayedCall(100, () => this.triggerLevelUp());
            } else {
                this.isLevelingUp = false;
            }
        });
    }
}
