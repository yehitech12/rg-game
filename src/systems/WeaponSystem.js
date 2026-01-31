import Phaser from 'phaser';
import { Enemies } from '../config/enemies';

export default class WeaponSystem {
    constructor(scene) {
        this.scene = scene;
        this.weapons = {}; // key: weaponName, value: { level: 0, nextFire: 0, stats: {} }
    }

    addWeapon(key, weaponConfig) {
        if (!this.weapons[key]) {
            this.weapons[key] = {
                config: weaponConfig,
                level: 1,
                nextFire: 0,
                baseStats: { ...weaponConfig.baseStats }
            };
        } else {
            // Upgrade logic
            const w = this.weapons[key];
            w.level++;
            // Simple linear upgrade application
            const upgrade = w.config.upgrade;
            if (upgrade.damage) w.baseStats.damage += upgrade.damage;
            if (upgrade.range) w.baseStats.range += upgrade.range;
            if (upgrade.attackSpeed) w.baseStats.attackSpeed += upgrade.attackSpeed; // Lower is faster
            if (upgrade.pierce) w.baseStats.pierce = (w.baseStats.pierce || 1) + upgrade.pierce;
            if (upgrade.count) w.baseStats.count = (w.baseStats.count || 1) + upgrade.count;
        }
    }

    update(time, delta) {
        const player = this.scene.player;
        if (!player) return;

        Object.keys(this.weapons).forEach(key => {
            const weapon = this.weapons[key];

            if (time > weapon.nextFire) {
                const playerAS = player.stats.attackSpeed || 1;
                const baseDelay = weapon.baseStats.attackSpeed / playerAS;
                const timeScale = this.scene.time.timeScale || 1;

                if (this.fireWeapon(weapon, player)) {
                    weapon.nextFire = time + (baseDelay / timeScale);
                }
            }
        });
    }

    getDPS() {
        let total = 0;
        const player = this.scene.player;
        if (!player) return 0;

        /**
         * DPS Calculation Formula:
         * (WeaponDamage * PlayerDamageMult * BulletCount) / (RealCooldown)
         * RealCooldown = BaseWeaponCooldown / PlayerAttackSpeed
         */
        Object.values(this.weapons).forEach(w => {
            const stats = w.baseStats;
            const playerAS = player.stats.attackSpeed || 1;
            const cooldown = stats.attackSpeed / playerAS;
            const bullets = stats.bulletCount || stats.count || 1;
            const dmgMult = player.stats.damage || 1;

            total += (stats.damage * dmgMult * bullets) / (cooldown / 1000);
        });
        return total;
    }

    getRequiredDPS() {
        // Required DPS = (Estimated Enemies per Second) * (Average Enemy HP)
        const enemiesPerSec = 1000 / (this.scene.spawnDelay || 500);

        // Average HP of standard enemies
        const standardEnemies = Object.values(Enemies).filter(e => !e.isBoss);
        if (standardEnemies.length === 0) return 0;
        const avgHP = standardEnemies.reduce((sum, e) => sum + e.hp, 0) / standardEnemies.length;

        return enemiesPerSec * avgHP;
    }

    fireWeapon(weapon, player) {
        const type = weapon.config.type;
        const stats = { ...weapon.baseStats };
        stats.damage *= (player.stats.damage || 1);

        if (type === 'projectile') {
            return this.fireProjectile(stats, player);
        } else if (type === 'multishot') {
            return this.fireMultishot(stats, player);
        } else if (type === 'melee') {
            return this.fireMelee(stats, player);
        } else if (type === 'aura') {
            return this.fireAura(stats, player);
        } else if (type === 'flamethrower') {
            return this.fireFlamethrower(stats, player);
        }
        return false;
    }

    getClosestTargetInRange(targets, range) {
        let closest = null;
        let minDist = range;

        targets.forEach(e => {
            if (e.active) {
                const dist = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, e.x, e.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = e;
                }
            }
        });

        return closest;
    }

    fireProjectile(stats, player) {
        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        const target = this.getClosestTargetInRange(targets, stats.range * 1.5);
        if (!target) return false;

        const bullet = this.scene.bullets.get();
        if (bullet) {
            bullet.fire(player.x, player.y, target.x, target.y, stats);
        }
        return true;
    }

    fireMultishot(stats, player) {
        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        const target = this.getClosestTargetInRange(targets, stats.range);
        if (!target) return false;

        const count = stats.count || 3;
        for (let i = 0; i < count; i++) {
            const bullet = this.scene.bullets.get();
            if (bullet) {
                const angleOffset = (i - (count - 1) / 2) * 15;
                const angleToTarget = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
                const finalAngle = angleToTarget + Phaser.Math.DegToRad(angleOffset);
                const tx = player.x + Math.cos(finalAngle) * 100;
                const ty = player.y + Math.sin(finalAngle) * 100;
                bullet.fire(player.x, player.y, tx, ty, stats);
            }
        }
        return true;
    }

    fireMelee(stats, player) {
        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        const target = this.getClosestTargetInRange(targets, stats.range * 1.5);
        let angle;

        if (target) {
            angle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
        } else {
            const pointer = this.scene.input.activePointer;
            angle = Phaser.Math.Angle.Between(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, pointer.x, pointer.y);
        }

        const graphics = this.scene.add.graphics();
        const duration = stats.duration || 250;
        const startAngle = angle - 1.2;
        const endAngle = angle + 1.2;

        this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: duration,
            onUpdate: (tween) => {
                const t = tween.getValue();
                graphics.clear();
                graphics.lineStyle(4, stats.color || 0xcccccc, 1 - t);
                graphics.fillStyle(stats.color || 0xcccccc, 0.3 * (1 - t));
                const currentEnd = startAngle + (endAngle - startAngle) * t;
                graphics.slice(player.x, player.y, stats.range, startAngle, currentEnd, false);
                graphics.fillPath();
                graphics.strokePath();
            },
            onComplete: () => graphics.destroy()
        });

        targets.forEach(e => {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
            if (dist <= stats.range + 30) {
                const angleToEnemy = Phaser.Math.Angle.Between(player.x, player.y, e.x, e.y);
                const diff = Phaser.Math.Angle.Wrap(angleToEnemy - angle);
                if (Math.abs(diff) < 1.3) {
                    if (e.takeDamage) e.takeDamage(stats.damage);
                }
            }
        });
        return true;
    }

    fireAura(stats, player) {
        const circle = this.scene.add.circle(player.x, player.y, stats.range, stats.color, 0.2);
        this.scene.tweens.add({
            targets: circle,
            scale: 1.1,
            alpha: 0,
            duration: 300,
            onComplete: () => circle.destroy()
        });

        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        targets.forEach(e => {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
            if (dist <= stats.range) {
                if (e.takeDamage) e.takeDamage(stats.damage);
            }
        });

        return true;
    }

    fireFlamethrower(stats, player) {
        // High-frequency spray of small particles
        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        const closest = this.getClosestTargetInRange(targets, stats.range);

        let targetAngle;
        if (closest) {
            targetAngle = Phaser.Math.Angle.Between(player.x, player.y, closest.x, closest.y);
        } else {
            const pointer = this.scene.input.activePointer;
            targetAngle = Phaser.Math.Angle.Between(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, pointer.x, pointer.y);
        }

        // Spray 3 "flames" per fire event (balanced)
        const count = stats.count || 3;
        for (let i = 0; i < count; i++) {
            const bullet = this.scene.bullets.get();
            if (bullet) {
                const spread = Phaser.Math.DegToRad(25);
                const angle = targetAngle + Phaser.Math.FloatBetween(-spread, spread);
                const tx = player.x + Math.cos(angle) * stats.range;
                const ty = player.y + Math.sin(angle) * stats.range;

                // Use procedural 'fire' texture
                bullet.setTexture('fire');
                bullet.fire(player.x, player.y, tx, ty, {
                    ...stats,
                    speed: stats.speed * (0.8 + Math.random() * 0.4),
                    scale: 0.8 + Math.random() * 1.2,
                    duration: (stats.range / (stats.speed || 300)) * 1000
                });
                bullet.setAlpha(0.6);
                bullet.setBlendMode(Phaser.BlendModes.ADD); // Glow effect
            }
        }
        return true;
    }
}
