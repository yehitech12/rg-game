import Phaser from 'phaser';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy');
        this.speed = 50;
        this.health = 20;
        this.damage = 10;
        this.target = null;

        // Burn Debuff Properties
        this.burnStacks = 0;
        this.nextBurnTick = 0;
        this.burnResetTime = 0;

        // Stun & Slow Properties
        this.isStunned = false;
        this.stunUntil = 0;
        this.slowFactor = 1.0;
        this.slowUntil = 0;
        this.stunGraphics = scene.add.graphics();
    }

    setTarget(target) {
        this.target = target;
    }

    spawn(x, y, config) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);

        // Apply config
        this.maxHealth = config.hp;
        this.health = config.hp;
        this.speed = config.speed;
        this.damage = config.damage;
        this.xpValue = config.xp;
        this.isBoss = config.isBoss || false;
        this.attackType = config.attackType;
        this.attackRange = config.attackRange || 100;
        this.attackCooldown = config.attackCooldown || 3000;
        this.nextAttack = 0;
        this.configColor = config.color;
        this.isMegaBoss = config.isMegaBoss || false;

        // Reset Debuffs
        this.burnStacks = 0;
        this.nextBurnTick = 0;
        this.burnResetTime = 0;

        // Reset Stun
        this.isStunned = false;
        this.stunUntil = 0;

        this.setTexture(config.sprite);
        this.setScale(config.scale || 1);

        // Elite chance (10%)
        this.isElite = false;
        if (!this.isBoss && Math.random() < 0.1) {
            this.isElite = true;
            this.setScale(this.scale * 1.5);
            this.health *= 3;
            this.maxHealth = this.health;
            this.damage *= 2;
            this.xpValue *= 5;
            this.setTint(0xffff00); // Gold tint
        } else if (config.color) {
            this.setTint(config.color);
        } else {
            this.clearTint();
        }

        // Play slime or skeleton animation if applicable
        if (config.sprite === 'slime' && this.scene.anims.exists('slime_move')) {
            this.play('slime_move');
        } else if (config.sprite === 'skeleton' && this.scene.anims.exists('skeleton_move')) {
            this.play('skeleton_move');
        } else if (config.sprite === 'knight' && this.scene.anims.exists('knight_move')) {
            this.play('knight_move');
        } else if (config.sprite === 'rock' && this.scene.anims.exists('rock_move')) {
            this.play('rock_move');
        } else if (config.sprite === 'boss_slime' && this.scene.anims.exists('boss_slime_move')) {
            this.play('boss_slime_move');
        } else {
            this.stop();
        }

        // 縮小 Hitbox 並精確置中，解決「被撞位置不對」的體感問題
        const hbWidth = this.width * 0.7;
        const hbHeight = this.height * 0.7;
        this.body.setSize(hbWidth, hbHeight);
        this.body.setOffset((this.width - hbWidth) / 2, (this.height - hbHeight) / 2);

        // Boss health tracking
        if (this.isBoss) {
            this.scene.events.emit('bossSpawned', this);
        }
    }

    addBurnStack(count = 1) {
        this.burnStacks += count;
        this.burnResetTime = this.scene.time.now + 10000; // 10s reset
        this.setTint(0xff6600); // Burning color
    }

    takeDamage(amount, isDot = false) {
        this.health -= amount;

        if (this.isBoss) {
            this.scene.events.emit('updateBossHP', this.health, this.maxHealth);
        }

        if (this.health <= 0) {
            this.die();
        } else if (!isDot) {
            this.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => {
                if (this.active) {
                    if (this.burnStacks > 0) this.setTint(0xff6600);
                    else if (this.isElite) this.setTint(0xffff00);
                    else if (this.isBoss && this.configColor) this.setTint(this.configColor);
                    else this.clearTint();
                }
            });
        }
    }

    die() {
        if (this.isBoss) {
            this.scene.events.emit('bossDied');
        }
        this.stunGraphics.clear();
        this.isDying = true; // 標記正在死亡
        this.body.setVelocity(0); // 立即停止移動

        // Play death animation if slime or skeleton
        if (this.texture.key.includes('slime') && this.scene.anims.exists('slime_die')) {
            this.play('slime_die');
            this.once('animationcomplete', () => {
                this.finishDeath();
            });
        } else if (this.texture.key.includes('skeleton') && this.scene.anims.exists('skeleton_die')) {
            this.play('skeleton_die');
            this.once('animationcomplete', () => {
                this.finishDeath();
            });
        } else if (this.texture.key.includes('knight') && this.scene.anims.exists('knight_die')) {
            this.play('knight_die');
            this.body.setVelocity(0);
            this.once('animationcomplete', () => {
                this.finishDeath();
            });
        } else if (this.texture.key.includes('rock') && this.scene.anims.exists('rock_die')) {
            this.play('rock_die');
            this.body.setVelocity(0);
            this.once('animationcomplete', () => {
                this.finishDeath();
            });
        } else if (this.texture.key.includes('boss_slime') && this.scene.anims.exists('boss_slime_die')) {
            this.play('boss_slime_die');
            this.body.setVelocity(0);
            this.once('animationcomplete', () => {
                this.finishDeath();
            });
        } else {
            this.finishDeath();
        }
    }

    finishDeath() {
        this.isDying = false;
        this.setActive(false);
        this.setVisible(false);
        if (this.scene.enemyDied) {
            this.scene.enemyDied(this.x, this.y, this.xpValue, this.isBoss, this.isMegaBoss);
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active || !this.target || this.isDying) {
            if (this.isDying) this.body.setVelocity(0); // 確保死亡時速度為 0
            return;
        }

        // Stun Logic
        if (this.isStunned) {
            if (time > this.stunUntil) {
                this.isStunned = false;
                this.stunGraphics.clear();
                this.clearTint();
                if (this.isElite) this.setTint(0xffff00);
            } else {
                this.body.setVelocity(0);
                this.updateStunGraphics(time);
                return;
            }
        } else {
            this.stunGraphics.clear();
        }

        // Apply movement with speed multipliers (stun, slow, etc.)
        let currentSpeed = this.speed;
        if (this.isStunned) currentSpeed = 0;
        else if (time < this.slowUntil) currentSpeed *= this.slowFactor;

        // Boss Attack Logic
        if (this.isBoss && time > this.nextAttack) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
            if (dist < 400) {
                this.performAttack(time);
            }
        }

        this.scene.physics.moveToObject(this, this.target, currentSpeed);
        this.setFlipX(this.target.x >= this.x);

        // Burn Debuff Logic
        if (this.burnStacks > 0) {
            if (time > this.nextBurnTick) {
                const burnDamage = this.burnStacks * 5;
                this.takeDamage(burnDamage, true);
                this.nextBurnTick = time + 1000;
            }

            if (time > this.burnResetTime) {
                this.burnStacks = 0;
                this.clearTint();
                if (this.isElite) this.setTint(0xffff00);
                else if (this.isBoss && this.configColor) this.setTint(this.configColor);
            }
        }
    }

    stun(duration) {
        this.isStunned = true;
        this.stunUntil = this.scene.time.now + duration;
        this.setTint(0x00ffff); // Cyan for stun
        this.body.setVelocity(0);
    }

    slow(factor, duration) {
        this.slowFactor = factor;
        this.slowUntil = this.scene.time.now + duration;
        if (!this.isStunned) this.setTint(0x0088ff); // Deep blue for slow
    }

    updateStunGraphics(time) {
        this.stunGraphics.clear();
        this.stunGraphics.lineStyle(2, 0xffff00, 1);

        const centerX = this.x;
        const centerY = this.y - this.displayHeight / 2 - 10;
        const radius = 15;
        const speed = 0.01;

        // Draw 3 small "stars" rotating
        for (let i = 0; i < 3; i++) {
            const angle = (time * speed) + (i * Math.PI * 2 / 3);
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius * 0.5; // Ellipse
            this.stunGraphics.fillStyle(0xffff00, 1);
            this.stunGraphics.fillCircle(px, py, 3);
        }
    }

    performAttack(time) {
        this.nextAttack = time + this.attackCooldown;
        const scene = this.scene;

        const indicator = scene.add.graphics();
        indicator.lineStyle(2, 0xff0000, 1);
        indicator.fillStyle(0xff0000, 0.3);

        const tx = this.target.x;
        const ty = this.target.y;

        if (this.attackType === 'aoe' || this.attackType === 'stomp') {
            const range = this.attackRange;
            indicator.fillCircle(this.x, this.y, range);
            scene.time.delayedCall(1000, () => {
                indicator.destroy();
                if (Phaser.Math.Distance.Between(this.x, this.y, scene.player.x, scene.player.y) < range) {
                    scene.hitPlayer(scene.player, { damage: this.damage * 1.5, active: true, x: this.x, y: this.y });
                }
            });
        } else if (this.attackType === 'dash') {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
            indicator.fillRect(0, -20, 500, 40);
            indicator.setPosition(this.x, this.y);
            indicator.setRotation(angle);

            scene.time.delayedCall(1000, () => {
                indicator.destroy();
                scene.physics.velocityFromRotation(angle, 1000, this.body.velocity);
                scene.time.delayedCall(300, () => {
                    if (this.active) this.body.setVelocity(0);
                });
            });
        } else if (this.attackType === 'fire') {
            indicator.slice(this.x, this.y, 400, Phaser.Math.Angle.Between(this.x, this.y, tx, ty) - 0.5, Phaser.Math.Angle.Between(this.x, this.y, tx, ty) + 0.5);
            indicator.fillPath();
            scene.time.delayedCall(1000, () => {
                indicator.destroy();
                for (let i = -2; i <= 2; i++) {
                    const b = scene.bullets.get();
                    if (b) b.fire(this.x, this.y, tx + i * 50, ty + i * 50, { damage: this.damage, speed: 300, color: 0xff0000 });
                }
            });
        } else {
            indicator.destroy();
        }
    }
}
