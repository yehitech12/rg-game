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

        // Reset Debuffs
        this.burnStacks = 0;
        this.nextBurnTick = 0;
        this.burnResetTime = 0;

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

        this.body.setSize(this.width * 0.8, this.height * 0.8);

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
        this.setActive(false);
        this.setVisible(false);
        if (this.scene.enemyDied) {
            this.scene.enemyDied(this.x, this.y, this.xpValue);
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (!this.active || !this.target) return;

        // Boss Attack Logic
        if (this.isBoss && time > this.nextAttack) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
            if (dist < 400) {
                this.performAttack(time);
            }
        }

        this.scene.physics.moveToObject(this, this.target, this.speed);
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
