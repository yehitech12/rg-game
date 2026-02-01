import Phaser from 'phaser';
import { Enemies } from '../config/enemies';

export default class WeaponSystem {
    constructor(scene) {
        this.scene = scene;
        this.weapons = {}; // key: weaponName, value: { level: 0, nextFire: 0, baseStats: {} }
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
            const w = this.weapons[key];
            if (w.level >= 5) return; // MAX level

            w.level++;
            const upgrade = w.config.upgrades ? w.config.upgrades[w.level - 2] : null;

            if (upgrade) {
                Object.keys(upgrade).forEach(stat => {
                    if (typeof upgrade[stat] === 'number') {
                        // Special handling: attackSpeed decreases for faster firing
                        // Most other stats are additive
                        w.baseStats[stat] = (w.baseStats[stat] || 0) + upgrade[stat];
                    } else {
                        // Boolean or complex stats just get overwritten
                        w.baseStats[stat] = upgrade[stat];
                    }
                });
            }
        }
    }

    update(time, delta) {
        const player = this.scene.player;
        if (!player) return;

        // Force visual update for Susanoo every frame (decoupled from fire rate)
        if (player.susanoo && player.susanoo.container && player.susanoo.container.active) {
            player.susanoo.container.setPosition(player.x, player.y);
        }

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

        Object.values(this.weapons).forEach(w => {
            const stats = w.baseStats;
            const playerAS = player.stats.attackSpeed || 1;
            const cooldown = Math.max(50, stats.attackSpeed / playerAS);
            const bullets = stats.count || 1;
            const dmgMult = player.stats.damage || 1;

            let theoreticalDmg = stats.damage * dmgMult * bullets;

            // Adjust for weapon types that hit multiple enemies or bounce
            if (w.config.type === 'lightning') theoreticalDmg *= (1 + (stats.count || 0) * 0.5);
            if (w.config.type === 'aura' || w.config.type === 'melee') theoreticalDmg *= 2; // Arbitrary AOE bonus

            total += theoreticalDmg / (cooldown / 1000);
        });
        return total;
    }

    getRequiredDPS() {
        const enemiesPerSec = 1000 / (this.scene.spawnDelay || 500);
        const timeScaling = 1 + (Math.floor(this.scene.gameTimer / 60) * 0.1);

        // Average HP estimate
        const avgHP = 50 * timeScaling;
        return enemiesPerSec * avgHP;
    }

    fireWeapon(weapon, player) {
        const type = weapon.config.type;
        const stats = { ...weapon.baseStats };
        stats.damage *= (player.stats.damage || 1);
        stats.level = weapon.level || 1; // 加入武器等級

        switch (type) {
            case 'projectile': return this.fireProjectile(stats, player);
            case 'multishot': return this.fireMultishot(stats, player);
            case 'melee': return this.fireMelee(stats, player);
            case 'aura': return this.fireAura(stats, player);
            case 'flamethrower': return this.fireFlamethrower(stats, player);
            case 'lightning': return this.fireLightning(stats, player);
            case 'shotgun': return this.fireShotgun(stats, player);
            case 'beam_cannon': return this.fireHeavyCannon(stats, player);
            case 'susanoo': return this.activateSusanoo(stats, player);
            default: return false;
        }
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

        const count = stats.count || 1;
        const burstDelay = 50; // 50ms interval between shots in a burst
        const inaccuracy = stats.inaccuracy || 0; // Random spread in degrees

        const baseAngle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);

        for (let i = 0; i < count; i++) {
            this.scene.time.delayedCall(i * burstDelay, () => {
                if (!player.active) return;

                const bullet = this.scene.bullets.get();
                if (bullet) {
                    // Apply random inaccuracy
                    const randomOffset = inaccuracy > 0 ? Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-inaccuracy, inaccuracy)) : 0;
                    const finalAngle = baseAngle + randomOffset;

                    const tx = player.x + Math.cos(finalAngle) * 100;
                    const ty = player.y + Math.sin(finalAngle) * 100;
                    bullet.fire(player.x, player.y, tx, ty, stats);

                    if (stats.explodeRange) {
                        bullet.explodeRange = stats.explodeRange;
                    }
                }
            });
        }
        return true;
    }

    fireShotgun(stats, player) {
        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        const target = this.getClosestTargetInRange(targets, stats.range * 1.2);
        if (!target) return false;

        const burstDelay = 20; // Even tighter for shotgun

        // Muzzle Flash Effect
        const flash = this.scene.add.circle(player.x, player.y, 40, 0xffcc00, 0.8);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 100,
            onComplete: () => flash.destroy()
        });

        const count = stats.count || 5;
        const totalSpread = stats.spread || 45;
        const baseAngle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);

        for (let i = 0; i < count; i++) {
            const bullet = this.scene.bullets.get();
            if (bullet) {
                // Calculate even fan spread
                const angleOffset = Phaser.Math.DegToRad((i - (count - 1) / 2) * (totalSpread / (count - 1 || 1)));
                const finalAngle = baseAngle + angleOffset;

                const tx = player.x + Math.cos(finalAngle) * 100;
                const ty = player.y + Math.sin(finalAngle) * 100;

                // Shotgun visual: Long golden shockwave
                const bulletSpeed = 1500; // Even faster
                const duration = (stats.range / bulletSpeed) * 1000;

                bullet.fire(player.x, player.y, tx, ty, {
                    ...stats,
                    bulletSpeed: bulletSpeed,
                    duration: duration,
                    isShockwave: true,
                    color: 0xffe600 // Brighter gold
                });
                bullet.setBlendMode(Phaser.BlendModes.ADD); // GLOW

                if (stats.stunDuration) {
                    bullet.stunDuration = stats.stunDuration;
                }
            }
        }

        // Shotgun recoil feel
        this.scene.cameras.main.shake(100, 0.003);
        return true;
    }

    fireHeavyCannon(stats, player) {
        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        // Find optimal target (most HP or closest)
        const target = this.getClosestTargetInRange(targets, stats.range);
        if (!target && targets.length === 0) return false;

        const tempTarget = target || targets[0];
        const angle = Phaser.Math.Angle.Between(player.x, player.y, tempTarget.x, tempTarget.y);

        // Visuals
        const beamGraphics = this.scene.add.graphics({ blendMode: 'ADD' });
        beamGraphics.depth = 50;

        const duration = stats.duration || 2000;
        const tickRate = stats.tickRate || 200;
        const baseWidth = stats.width || 80;
        const range = stats.range || 700;
        const damage = stats.damage || 30;
        const startTime = this.scene.time.now;

        // 根據等級調整寬度：LV1=40%, LV2=60%, LV3=80%, LV4=100%, LV5=120%
        const level = stats.level || 1;
        const widthMultiplier = 0.2 + (level * 0.2); // LV1=0.4, LV2=0.6, LV3=0.8, LV4=1.0, LV5=1.2
        const width = baseWidth * widthMultiplier;

        // Camera shake on fire (強力震動)
        this.scene.cameras.main.shake(duration, 0.005);

        const timerEvent = this.scene.time.addEvent({
            delay: 30, // 30fps update roughly
            repeat: Math.floor(duration / 30),
            callback: () => {
                if (!player.active) {
                    timerEvent.remove();
                    beamGraphics.destroy();
                    return;
                }

                beamGraphics.clear();

                // Draw Complex Multi-Layer Beam with Pulsing
                beamGraphics.save();
                beamGraphics.translateCanvas(player.x, player.y);
                beamGraphics.rotateCanvas(angle);

                const pulse = Math.sin(this.scene.time.now / 50) * 5; // Breathing effect
                const fastPulse = Math.sin(this.scene.time.now / 30) * 3; // Faster pulse

                // Dynamic Beam Growth: "Shooting out" effect
                const elapsed = this.scene.time.now - startTime;

                // Grow to full length in 300ms (Fast and impactful)
                const growthTime = 300;
                const growProgress = Math.min(elapsed / growthTime, 1);

                // Ease out the growth for impact
                const ease = 1 - Math.pow(1 - growProgress, 3);
                const currentRange = range * ease;

                // Taper Logic: Start narrow at player, widen out
                const taperLength = 80;

                // Helper to draw tapered beam
                const drawTaperedBeam = (w, color, alpha) => {
                    beamGraphics.fillStyle(color, alpha);
                    beamGraphics.beginPath();
                    beamGraphics.moveTo(0, 0);

                    if (currentRange <= taperLength) {
                        const currentW = (currentRange / taperLength) * w;
                        beamGraphics.lineTo(currentRange, -currentW / 2);
                        beamGraphics.lineTo(currentRange, currentW / 2);
                    } else {
                        beamGraphics.lineTo(taperLength, -w / 2);
                        beamGraphics.lineTo(currentRange, -w / 2);
                        beamGraphics.lineTo(currentRange, w / 2);
                        beamGraphics.lineTo(taperLength, w / 2);
                    }
                    beamGraphics.closePath();
                    beamGraphics.fillPath();
                };

                // 1. Outer Glow (紅橙色外暈 - 雙層)
                drawTaperedBeam(width + 60 + pulse * 4, 0xff1100, 0.2);
                drawTaperedBeam(width + 50 + pulse * 3, 0xff3300, 0.3);

                // 2. Secondary Glow (橙色 - 帶快速脈衝)
                drawTaperedBeam(width + 30 + fastPulse, 0xff6600, 0.5);

                // 3. Main Beam (亮橙色)
                drawTaperedBeam(width, 0xff9900, 0.9);

                // 4. Inner Core (黃白色核心)
                drawTaperedBeam(width / 2.5, 0xffee00, 1);

                // 5. Brightest Core (純白 - 帶脈衝)
                drawTaperedBeam(width / 5 + fastPulse * 0.5, 0xffffff, 1);

                // 6. Spiral Energy Lines (螺旋能量線 - 三條)
                const segments = Math.floor(currentRange / 25);
                const step = currentRange / (segments || 1);
                const spiralSpeed = this.scene.time.now / 100;

                if (segments > 0) {
                    // 紅色螺旋（最外層）
                    beamGraphics.lineStyle(4, 0xff0000, 0.8);
                    beamGraphics.beginPath();
                    beamGraphics.moveTo(0, 0);
                    for (let i = 1; i <= segments; i++) {
                        const lx = i * step;
                        const scale = lx < taperLength ? (lx / taperLength) : 1;
                        const spiralOffset = Math.sin(i * 0.5 + spiralSpeed) * (width / 3) * scale;
                        beamGraphics.lineTo(lx, spiralOffset);
                    }
                    beamGraphics.strokePath();

                    // 黃色螺旋（反向）
                    beamGraphics.lineStyle(3, 0xffff00, 0.9);
                    beamGraphics.beginPath();
                    beamGraphics.moveTo(0, 0);
                    for (let i = 1; i <= segments; i++) {
                        const lx = i * step;
                        const scale = lx < taperLength ? (lx / taperLength) : 1;
                        const spiralOffset = Math.sin(i * 0.5 - spiralSpeed) * (width / 4) * scale;
                        beamGraphics.lineTo(lx, spiralOffset);
                    }
                    beamGraphics.strokePath();

                    // 白色螺旋（核心，快速旋轉）
                    beamGraphics.lineStyle(2, 0xffffff, 1);
                    beamGraphics.beginPath();
                    beamGraphics.moveTo(0, 0);
                    for (let i = 1; i <= segments; i++) {
                        const lx = i * step;
                        const scale = lx < taperLength ? (lx / taperLength) : 1;
                        const spiralOffset = Math.sin(i * 0.7 + spiralSpeed * 2) * (width / 6) * scale;
                        beamGraphics.lineTo(lx, spiralOffset);
                    }
                    beamGraphics.strokePath();
                }

                // 7. Edge Lightning (光束邊緣閃電)
                if (segments > 0 && Math.random() > 0.5) {
                    beamGraphics.lineStyle(2, 0xffff00, 0.7);
                    beamGraphics.beginPath();
                    const startY = (Math.random() > 0.5 ? 1 : -1) * width / 2;
                    beamGraphics.moveTo(taperLength, startY);

                    for (let i = 1; i <= Math.min(segments, 8); i++) {
                        const lx = taperLength + (i * step);
                        const ly = startY + Phaser.Math.FloatBetween(-15, 15);
                        beamGraphics.lineTo(lx, ly);
                    }
                    beamGraphics.strokePath();
                }

                beamGraphics.restore();

                // 8. Beam Tip Explosion (光束尾端爆炸效果)
                if (currentRange > 100 && Math.random() > 0.7) {
                    const tipX = player.x + Math.cos(angle) * currentRange;
                    const tipY = player.y + Math.sin(angle) * currentRange;

                    const explosion = this.scene.add.circle(tipX, tipY,
                        Phaser.Math.Between(width / 2, width),
                        Phaser.Math.RND.pick([0xff0000, 0xff6600, 0xff9900]));
                    explosion.setBlendMode(Phaser.BlendModes.ADD);
                    explosion.setAlpha(0.8);

                    this.scene.tweens.add({
                        targets: explosion,
                        scaleX: 2,
                        scaleY: 2,
                        alpha: 0,
                        duration: 200,
                        onComplete: () => explosion.destroy()
                    });
                }

                // 9. Energy Pulse Rings (能量脈衝波紋 - 增加頻率)
                if (Math.random() > 0.5 && currentRange > 100) {
                    const dist = Phaser.Math.Between(50, currentRange - 50);
                    const px = player.x + Math.cos(angle) * dist;
                    const py = player.y + Math.sin(angle) * dist;

                    const ring = this.scene.add.graphics();
                    ring.lineStyle(4, 0xff6600, 1);
                    ring.strokeCircle(px, py, width / 2);
                    ring.setBlendMode(Phaser.BlendModes.ADD);

                    this.scene.tweens.add({
                        targets: ring,
                        scaleX: 2.5,
                        scaleY: 2.5,
                        alpha: 0,
                        duration: 400,
                        onComplete: () => ring.destroy()
                    });
                }

                // 10. Explosive Particles (爆炸粒子 - 增加數量和變化)
                if (Math.random() > 0.3 && currentRange > 50) {
                    for (let p = 0; p < 2; p++) {
                        const dist = Phaser.Math.Between(0, currentRange);
                        const px = player.x + Math.cos(angle) * dist;
                        const py = player.y + Math.sin(angle) * dist;

                        // 隨機偏移
                        const offsetAngle = Phaser.Math.FloatBetween(-Math.PI / 3, Math.PI / 3);
                        const offsetDist = Phaser.Math.FloatBetween(0, width / 2);
                        const finalX = px + Math.cos(angle + offsetAngle) * offsetDist;
                        const finalY = py + Math.sin(angle + offsetAngle) * offsetDist;

                        const particle = this.scene.add.circle(finalX, finalY, Phaser.Math.Between(3, 10),
                            Phaser.Math.RND.pick([0xff0000, 0xff3300, 0xff6600, 0xff9900, 0xffff00]));
                        particle.setBlendMode(Phaser.BlendModes.ADD);

                        this.scene.tweens.add({
                            targets: particle,
                            x: finalX + Phaser.Math.FloatBetween(-20, 20),
                            y: finalY + Phaser.Math.FloatBetween(-20, 20),
                            scale: 0,
                            alpha: 0,
                            duration: Phaser.Math.Between(300, 500),
                            onComplete: () => particle.destroy()
                        });
                    }
                }

                // 11. Shockwave at Start (發射時的衝擊波)
                if (elapsed < 100 && elapsed > 10) {
                    const shockwave = this.scene.add.circle(player.x, player.y, 20, 0xff6600, 0);
                    shockwave.setStrokeStyle(4, 0xff9900, 1);
                    shockwave.setBlendMode(Phaser.BlendModes.ADD);

                    this.scene.tweens.add({
                        targets: shockwave,
                        scaleX: 3,
                        scaleY: 3,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => shockwave.destroy()
                    });
                }
            }
        });

        // Damage Tick
        const damageEvent = this.scene.time.addEvent({
            delay: tickRate,
            repeat: Math.floor(duration / tickRate) - 1,
            callback: () => {
                // Check collisions (Dynamic range check)
                const activeTime = this.scene.time.now - startTime;
                const currentDmgRange = range * Math.min(activeTime / 300, 1);

                const currentTargets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()];
                let hitAny = false;
                currentTargets.forEach(e => {
                    if (!e.active) return;

                    // Transform enemy pos to local beam space
                    const dx = e.x - player.x;
                    const dy = e.y - player.y;
                    const cos = Math.cos(-angle);
                    const sin = Math.sin(-angle);
                    const localX = dx * cos - dy * sin;
                    const localY = dx * sin + dy * cos;

                    if (localX >= 0 && localX <= currentDmgRange && Math.abs(localY) <= width / 1.5) {
                        e.takeDamage(damage);
                        hitAny = true;

                        // Impact visual
                        const impact = this.scene.add.circle(e.x, e.y, 25, 0x00ffff, 0.6);
                        this.scene.tweens.add({
                            targets: impact,
                            alpha: 0,
                            scale: 1.5,
                            duration: 150,
                            onComplete: () => impact.destroy()
                        });
                    }
                });

                if (hitAny) {
                    this.scene.cameras.main.shake(150, 0.003);
                }
            }
        });

        // Cleanup
        this.scene.time.delayedCall(duration, () => {
            if (beamGraphics.active) beamGraphics.destroy();
        });

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
                const angleOffset = (i - (count - 1) / 2) * (stats.spread || 15);
                const angleToTarget = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
                const finalAngle = angleToTarget + Phaser.Math.DegToRad(angleOffset);
                const tx = player.x + Math.cos(finalAngle) * 100;
                const ty = player.y + Math.sin(finalAngle) * 100;

                // Pass tracking ability if missile
                bullet.fire(player.x, player.y, tx, ty, {
                    ...stats,
                    isTracking: true,
                    trackingSpeed: 0.1
                });
            }
        }
        return true;
    }

    fireMelee(stats, player) {
        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        const target = this.getClosestTargetInRange(targets, stats.range * 1.5);
        let baseAngle;

        if (target) {
            baseAngle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
        } else {
            const pointer = this.scene.input.activePointer;
            baseAngle = Phaser.Math.Angle.Between(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, pointer.x, pointer.y);
        }

        const slashAngle = Phaser.Math.DegToRad(stats.spread || 120);
        const graphics = this.scene.add.graphics();
        const duration = 200;
        const startAngle = baseAngle - slashAngle / 2;
        const endAngle = baseAngle + slashAngle / 2;

        this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: duration,
            onUpdate: (tween) => {
                const t = tween.getValue();
                graphics.clear();
                graphics.lineStyle(6, 0xffffff, 1 - t);
                graphics.fillStyle(0xffffff, 0.3 * (1 - t));
                const currentEnd = startAngle + (endAngle - startAngle) * t;
                graphics.slice(player.x, player.y, stats.range, startAngle, currentEnd, false);
                graphics.fillPath();
                graphics.strokePath();
            },
            onComplete: () => graphics.destroy()
        });

        // Damage detection
        targets.forEach(e => {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
            if (dist <= stats.range + 40) {
                const angleToEnemy = Phaser.Math.Angle.Between(player.x, player.y, e.x, e.y);
                const diff = Phaser.Math.Angle.Wrap(angleToEnemy - baseAngle);
                if (Math.abs(diff) < slashAngle / 2 + 0.2) {
                    if (e.takeDamage) {
                        e.takeDamage(stats.damage);
                        // Melee knockback
                        const kx = Math.cos(angleToEnemy) * 30;
                        const ky = Math.sin(angleToEnemy) * 30;
                        e.x += kx;
                        e.y += ky;
                    }
                }
            }
        });
        return true;
    }

    fireAura(stats, player) {
        const circle = this.scene.add.circle(player.x, player.y, stats.range, stats.color || 0x00ffff, 0.15);
        circle.setStrokeStyle(2, stats.color || 0x00ffff, 0.5);

        this.scene.tweens.add({
            targets: circle,
            scale: 1.2,
            alpha: 0,
            duration: 400,
            onComplete: () => circle.destroy()
        });

        const targets = this.scene.enemies.getChildren().filter(t => t.active);
        targets.forEach(e => {
            const dist = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
            if (dist <= stats.range) {
                if (e.takeDamage) e.takeDamage(stats.damage);
                if (stats.slowEffect) e.slow(stats.slowEffect, 1000);
            }
        });
        return true;
    }

    fireFlamethrower(stats, player) {
        const targets = this.scene.enemies.getChildren().filter(t => t.active);
        const closest = this.getClosestTargetInRange(targets, stats.range);
        let targetAngle;

        if (closest) {
            targetAngle = Phaser.Math.Angle.Between(player.x, player.y, closest.x, closest.y);
        } else {
            const pointer = this.scene.input.activePointer;
            targetAngle = Phaser.Math.Angle.Between(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, pointer.x, pointer.y);
        }

        const count = 4;
        for (let i = 0; i < count; i++) {
            const bullet = this.scene.bullets.get();
            if (bullet) {
                const spread = Phaser.Math.DegToRad(30);
                const angle = targetAngle + Phaser.Math.FloatBetween(-spread, spread);
                const tx = player.x + Math.cos(angle) * stats.range;
                const ty = player.y + Math.sin(angle) * stats.range;

                bullet.setTexture('fire');
                bullet.fire(player.x, player.y, tx, ty, {
                    ...stats,
                    speed: 400 * (0.8 + Math.random() * 0.4),
                    scale: 1.0 + Math.random() * 1.5,
                    duration: 600
                });
                bullet.setAlpha(0.6);
                bullet.setBlendMode(Phaser.BlendModes.ADD);
            }
        }
        return true;
    }

    fireLightning(stats, player) {
        const targets = this.scene.enemies.getChildren().filter(e => e.active);
        let currentTarget = this.getClosestTargetInRange(targets, stats.range);
        if (!currentTarget) return false;

        const chainCount = stats.count || 3;
        const hitTargets = new Set();
        let prevSource = player;
        let chainIndex = 0;

        const chainNext = () => {
            if (chainIndex >= chainCount || !currentTarget || !currentTarget.active) return;

            hitTargets.add(currentTarget);
            this.drawLightning(prevSource, currentTarget, stats.color || 0x00f2fe);

            if (currentTarget.takeDamage) currentTarget.takeDamage(stats.damage);
            if (currentTarget.stun) currentTarget.stun(stats.stunDuration || 500);

            prevSource = currentTarget;
            let nextTarget = null;
            let minDist = 300;

            targets.forEach(e => {
                if (e.active && !hitTargets.has(e)) {
                    const d = Phaser.Math.Distance.Between(prevSource.x, prevSource.y, e.x, e.y);
                    if (d < minDist) {
                        minDist = d;
                        nextTarget = e;
                    }
                }
            });

            currentTarget = nextTarget;
            chainIndex++;
            this.scene.time.delayedCall(50, chainNext);
        };

        chainNext();
        this.scene.cameras.main.shake(100, 0.005);
        return true;
    }

    drawLightning(source, target, color) {
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(2, color, 1);
        graphics.setBlendMode(Phaser.BlendModes.ADD);

        const x1 = source.x;
        const y1 = source.y;
        const x2 = target.x;
        const y2 = target.y;

        const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const steps = Math.max(3, Math.floor(dist / 20));

        graphics.beginPath();
        graphics.moveTo(x1, y1);
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t + Phaser.Math.Between(-15, 15);
            const py = y1 + (y2 - y1) * t + Phaser.Math.Between(-15, 15);
            graphics.lineTo(px, py);
        }
        graphics.lineTo(x2, y2);
        graphics.strokePath();

        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 250,
            onComplete: () => graphics.destroy()
        });

        // Spark effect
        const spark = this.scene.add.circle(target.x, target.y, 4, 0xffffff);
        this.scene.tweens.add({
            targets: spark,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => spark.destroy()
        });
    }

    activateSusanoo(stats, player) {
        try {
            // 獲取武器等級
            const level = stats.level || 1;

            if (!player.susanoo) {
                this.initSusanooVisuals(player, level);
                return true;
            }

            const susanoo = player.susanoo;

            // 更新須佐能乎尺寸（如果等級改變）
            if (susanoo.level !== level) {
                const newScale = 0.35 + (level * 0.05);
                susanoo.sprite.setScale(newScale);
                susanoo.level = level;
                susanoo.baseScale = newScale;
            }

            if (susanoo.state !== 'IDLE') return true;

            // Cooldown check for ACTIONS only (使用遊戲時間，與動畫同步)
            const now = this.scene.time.now;
            if (susanoo.nextActionTime && now < susanoo.nextActionTime) return true;

            const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);

            // 獲取時間縮放以調整冷卻
            const timeScale = this.scene.time.timeScale || 1;

            // --- LOGIC: Shield (Low HP) ---
            const currentShield = player.stats.shield || 0;
            const maxHP = player.stats.maxHp || 100;
            const hpRatio = player.stats.hp / maxHP;

            // 只在 HP < 40% 時觸發護盾（避免一直觸發）
            if (hpRatio < 0.4) {
                this.susanooActionShield(player, stats);
                susanoo.nextActionTime = now + (30000 / timeScale); // Shield 30s CD (受時間加速影響)
                return true;
            }

            // --- LOGIC: Sweep (Offense) ---
            // Range check - Scan for enemies nearby
            const range = stats.range || 300;
            const enemiesInRange = targets.filter(e => Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y) < range);

            if (enemiesInRange.length > 0) {
                // Check for very close enemies to PUSH (Self-defense)
                const closeEnemies = enemiesInRange.filter(e => Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y) < 150);

                if (closeEnemies.length > 0) {
                    this.susanooActionPush(player, stats, closeEnemies);
                    susanoo.nextActionTime = now + (1500 / timeScale); // 受時間加速影響
                } else {
                    // Enemies are in range but not super close -> SWEEP
                    this.susanooActionSweep(player, stats, enemiesInRange);
                    susanoo.nextActionTime = now + (1000 / timeScale); // Attack speed (受時間加速影響)
                }
                return true;
            }
        } catch (err) {
            console.error("Susanoo Logic Error:", err);
            // Disable Susanoo temporarily to prevent loop
            player.susanoo = null;
        }

        return true;
    }



    initSusanooVisuals(player, level = 1) {
        if (player.susanoo) return;

        // 1. Setup Container
        const container = this.scene.add.container(player.x, player.y);
        container.setDepth((player.depth || 10) - 2); // 在主角下面

        // 2. Create Sprite (使用移動動畫作為預設，使用去背版本)
        const sprite = this.scene.add.sprite(0, 0, 'susanoo_move_1_clean');

        // 根據等級調整尺寸：LV1=0.4, LV2=0.45, LV3=0.5, LV4=0.55, LV5=0.6
        const baseScale = 0.35 + (level * 0.05);
        sprite.setScale(baseScale);
        sprite.setAlpha(0.5); // 半透明
        container.add(sprite);

        player.susanoo = {
            container,
            sprite,
            state: 'IDLE',
            nextActionTime: 0,
            level: level,
            baseScale: baseScale
        };

        // 3. CRITICAL: Update Loop for Position Sync
        const updateListener = () => {
            if (!player.active || !container.scene) {
                this.scene.events.off('update', updateListener);
                if (container.active) container.destroy();
                player.susanoo = null;
                return;
            }
            if (container.active) {
                container.setPosition(player.x, player.y);

                // Idle Animation (subtle breathing)
                if (player.susanoo && player.susanoo.state === 'IDLE') {
                    const breath = Math.sin(this.scene.time.now / 400) * 0.03;
                    const currentScale = player.susanoo.baseScale || 0.6;
                    container.scaleX = 1.0 + breath;
                    container.scaleY = 1.0 + breath;
                }
            }
        };
        this.scene.events.on('update', updateListener);

        // 4. Play idle animation
        sprite.play('susanoo_move_anim');
    }


    drawSusanooIdle(player) {
        if (!player.susanoo) return;
        const g = player.susanoo.graphics;
        g.clear();

        const color = 0x9900ff; // Main Purple
        const darkColor = 0x5500aa; // Fill

        // Outline Ghost Style
        g.lineStyle(6, color, 1);
        g.fillStyle(darkColor, 0.2);

        // --- The Ghost Body (One Continuous Shape) ---
        g.beginPath();

        // Start from bottom left of "skirt" area
        g.moveTo(-50, 50);

        // Wavy line up to left shoulder
        g.lineTo(-60, 0);
        g.lineTo(-40, -40); // Shoulder L

        // -- Left Arm / Wing --
        g.lineTo(-120, -20); // Elbow out
        g.lineTo(-150, 0);   // Hand out
        // Claws L
        g.lineTo(-130, 10);
        g.lineTo(-140, 20);
        g.lineTo(-110, 10); // Back to wrist
        g.lineTo(-50, -30); // Back to neck base

        // -- Head with Horns --
        g.lineTo(-40, -80); // Neck up
        g.lineTo(-50, -130); // Left Horn tip
        g.lineTo(-20, -100); // Between horns
        g.lineTo(0, -90);    // Forehead dip
        g.lineTo(20, -100);  // Between horns
        g.lineTo(50, -130);  // Right Horn tip
        g.lineTo(40, -80);   // Right neck

        // -- Right Arm / Wing --
        g.lineTo(50, -30); // Shoulder R
        g.lineTo(120, -20); // Elbow out
        g.lineTo(150, 0);   // Hand out
        // Claws R
        g.lineTo(130, 10);
        g.lineTo(140, 20);
        g.lineTo(110, 10); // Back to wrist
        g.lineTo(40, -40); // Back to armpit

        // Body down right side
        g.lineTo(60, 0);
        g.lineTo(50, 50);

        // Bottom jagged edge
        g.lineTo(20, 40);
        g.lineTo(0, 60);
        g.lineTo(-20, 40);
        g.lineTo(-50, 50); // Close loop

        g.closePath();
        g.fillPath();
        g.strokePath();

        // --- Angry Face ---
        g.lineStyle(4, color, 1);
        g.fillStyle(0xffffff, 0.9); // Glowing Eyes

        // Left Eye (Triangle)
        g.beginPath();
        g.moveTo(-30, -90);
        g.lineTo(-10, -85);
        g.lineTo(-25, -100);
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Right Eye
        g.beginPath();
        g.moveTo(30, -90);
        g.lineTo(10, -85);
        g.lineTo(25, -100);
        g.closePath();
        g.fillPath();
        g.strokePath();

        // Mouth (Sad/Angry Curve)
        g.beginPath();
        g.moveTo(-20, -65);
        g.quadraticBezierTo(0, -75, 20, -65); // Frown
        g.strokePath();
    }

    drawSusanooHand(graphics, offsetX, offsetY, scaleX, color, glowColor) {
        // Safe Visual: Glowing Orb Hands + Claws
        const handX = offsetX;
        const handY = offsetY;

        // 1. Hand Orb (Palm)
        graphics.fillStyle(color, 0.6);
        graphics.fillCircle(handX, handY, 15);
        graphics.lineStyle(2, glowColor, 1);
        graphics.strokeCircle(handX, handY, 15);

        // 2. Wrist Connection
        graphics.beginPath();
        graphics.moveTo(handX, handY + 15);
        graphics.lineTo(handX, handY + 40);
        graphics.strokePath();

        // 3. Energy Claws
        graphics.beginPath();
        graphics.moveTo(handX, handY - 10);
        graphics.lineTo(handX + (20 * scaleX), handY - 25);
        graphics.moveTo(handX + (10 * scaleX), handY);
        graphics.lineTo(handX + (35 * scaleX), handY + 5);
        graphics.moveTo(handX + (5 * scaleX), handY + 10);
        graphics.lineTo(handX + (25 * scaleX), handY + 20);
        graphics.strokePath();



    }


    susanooActionShield(player, stats) {
        if (!player.susanoo) return;
        player.susanoo.state = 'SHIELD';

        // 播放防禦動畫
        player.susanoo.sprite.play('susanoo_def_anim');

        const shieldG = this.scene.add.graphics();
        player.susanoo.container.add(shieldG);

        // Visual: Big X Shield + Bubble
        shieldG.clear();
        shieldG.lineStyle(20, 0xaa00ff, 0.8);
        shieldG.beginPath();
        shieldG.moveTo(-60, -60); shieldG.lineTo(60, 60);
        shieldG.moveTo(60, -60); shieldG.lineTo(-60, 60);
        shieldG.strokePath();

        shieldG.lineStyle(4, 0xffffff, 0.5);
        shieldG.strokeCircle(0, 0, 90);

        // Logic: Restore Shield
        const restore = stats.shieldRestore || 30;
        if (player.stats) player.stats.shield = Math.min((player.stats.shield || 0) + restore, player.stats.maxShield || 100);

        this.scene.time.delayedCall(800, () => {
            if (shieldG.active) shieldG.destroy();
            if (player.susanoo) {
                player.susanoo.state = 'IDLE';
                player.susanoo.sprite.play('susanoo_move_anim'); // 回到移動動畫
            }
        });
    }

    susanooActionPush(player, stats, targets) {
        if (!player.susanoo) return;
        player.susanoo.state = 'PUSH';
        const dmg = stats.pushDamage || 25;

        // 播放攻擊動畫
        player.susanoo.sprite.play('susanoo_att_anim');

        const timeScale = this.scene.time.timeScale || 1;

        // Visual: Expanding Shockwave (Separate)
        const pushG = this.scene.add.graphics();
        player.susanoo.container.add(pushG);

        pushG.fillStyle(0xaa00ff, 0.5);
        pushG.fillCircle(0, 0, 10); // Start small

        // Pulse the ghost itself slightly
        this.scene.tweens.add({
            targets: player.susanoo.container,
            scaleX: 1.2, scaleY: 1.2,
            duration: 100 / timeScale,
            yoyo: true
        });

        // Expand shockwave
        this.scene.tweens.add({
            targets: pushG,
            scaleX: 10, scaleY: 10, // Grows huge
            alpha: 0,
            duration: 300 / timeScale,
            onUpdate: (tween) => {
                // Redraw if needed for sharpness, or just scale graphics object
                // Scaling is fine for simple circle
            },
            onComplete: () => {
                if (pushG.active) pushG.destroy();
                if (player.susanoo) {
                    player.susanoo.state = 'IDLE';
                    player.susanoo.sprite.play('susanoo_move_anim'); // 回到移動動畫
                }
            }
        });

        // Apply Knockback logic immediately or mid-tween
        targets.forEach(t => {
            if (t.active) {
                t.takeDamage(dmg);
                const angle = Phaser.Math.Angle.Between(player.x, player.y, t.x, t.y);
                t.x += Math.cos(angle) * 300; // 擊退300px
                t.y += Math.sin(angle) * 300;
            }
        });
    }

    susanooActionSweep(player, stats, targets) {
        if (!player.susanoo) return;
        player.susanoo.state = 'SWEEP';
        const dmg = stats.damage || 50;

        // 切換到攻擊動畫
        player.susanoo.sprite.play('susanoo_att_anim');

        // 找到目標方向
        const target = targets[0];
        const angle = target ? Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y) : 0;

        // 建立虛空風格的斬擊視覺效果
        const slashG = this.scene.add.graphics();
        player.susanoo.container.add(slashG);

        // 斬擊範圍參數（根據等級和攻擊範圍調整）
        const baseRadius = stats.range || 250;
        const slashRadius = baseRadius; // 視覺範圍等於攻擊範圍
        const slashWidth = Math.PI * 0.8; // 弧度寬度增加到144度

        // 繪製虛空斬擊（紫色能量刀光）
        let slashAlpha = 0;
        const timeScale = this.scene.time.timeScale || 1;
        const slashTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 400 / timeScale, // 根據遊戲速度調整動畫時長
            onUpdate: (tween) => {
                const progress = tween.getValue();
                slashG.clear();

                // 斬擊弧度隨時間擴展
                const currentAngle = angle - slashWidth / 2 + (slashWidth * progress);

                // 多層刀光效果（更粗更明顯）
                // 外層光暈
                slashG.lineStyle(35, 0x9900ff, 0.4 * (1 - progress));
                slashG.beginPath();
                slashG.arc(0, 0, slashRadius, angle - slashWidth / 2, currentAngle);
                slashG.strokePath();

                // 中層能量
                slashG.lineStyle(22, 0xcc00ff, 0.7 * (1 - progress));
                slashG.beginPath();
                slashG.arc(0, 0, slashRadius - 15, angle - slashWidth / 2, currentAngle);
                slashG.strokePath();

                // 內層核心
                slashG.lineStyle(12, 0xff00ff, 1.0 * (1 - progress));
                slashG.beginPath();
                slashG.arc(0, 0, slashRadius - 30, angle - slashWidth / 2, currentAngle);
                slashG.strokePath();

                // 刀尖粒子效果（更多粒子）
                if (progress > 0.2) {
                    for (let i = 0; i < 5; i++) {
                        const particleAngle = currentAngle + (Math.random() - 0.5) * 0.4;
                        const particleRadius = slashRadius + Math.random() * 30;
                        const px = Math.cos(particleAngle) * particleRadius;
                        const py = Math.sin(particleAngle) * particleRadius;

                        slashG.fillStyle(0xffffff, 0.9 * (1 - progress));
                        slashG.fillCircle(px, py, 4);
                    }
                }

                // 斬擊路徑上的能量波紋
                if (progress > 0.4) {
                    for (let i = 0; i < 3; i++) {
                        const waveAngle = angle - slashWidth / 2 + (slashWidth * (progress - 0.2 * i));
                        const waveRadius = slashRadius - 10;
                        const wx = Math.cos(waveAngle) * waveRadius;
                        const wy = Math.sin(waveAngle) * waveRadius;

                        slashG.fillStyle(0xaa00ff, 0.5 * (1 - progress));
                        slashG.fillCircle(wx, wy, 8);
                    }
                }
            },
            onComplete: () => {
                slashG.destroy();

                // 造成傷害
                targets.forEach(t => {
                    if (t.active) t.takeDamage(dmg);
                });

                if (player.susanoo) {
                    player.susanoo.state = 'IDLE';
                    player.susanoo.sprite.play('susanoo_move_anim');
                }
            }
        });
    }
}
