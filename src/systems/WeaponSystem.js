import Phaser from 'phaser';
import { Enemies } from '../config/enemies';
import SnowfallArea from '../objects/SnowfallArea';

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
            case 'snowfall': return this.fireSnowfall(stats, player);
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
        const startTime = this.scene.internalGameTime;

        // 根據等級調整寬度：LV1=40%, LV2=60%, LV3=80%, LV4=100%, LV5=120%
        const level = stats.level || 1;
        const widthMultiplier = 0.2 + (level * 0.2); // LV1=0.4, LV2=0.6, LV3=0.8, LV4=1.0, LV5=1.2
        const width = baseWidth * widthMultiplier;

        // Camera shake on fire (降低震動強度)
        this.scene.cameras.main.shake(duration, 0.002);

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

                const pulse = Math.sin(this.scene.internalGameTime / 50) * 5; // Breathing effect
                const fastPulse = Math.sin(this.scene.internalGameTime / 30) * 3; // Faster pulse

                // Dynamic Beam Growth: "Shooting out" effect
                const elapsed = this.scene.internalGameTime - startTime;

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

                // --- 高溫輻射光束渲染 (25層熱核色調版) ---
                const layers = 25;
                const innerWidth = width * 1.0;

                for (let i = layers; i > 0; i--) {
                    const ratio = i / layers;
                    const lWidth = innerWidth * Math.pow(ratio, 1.5) * 1.25;
                    const alpha = (1 - ratio) * 0.18;

                    let hexColor;
                    if (ratio > 0.85) { // 最外層：深紅/暗紅 (高熱殘餘)
                        const subRatio = (ratio - 0.85) / 0.15;
                        hexColor = Phaser.Display.Color.GetColor(
                            Phaser.Math.Interpolation.Linear([150, 255], subRatio),
                            0,
                            0
                        );
                    } else if (ratio > 0.45) { // 中層：烈焰紅 -> 熔岩橘
                        const subRatio = (ratio - 0.45) / 0.4;
                        hexColor = Phaser.Display.Color.GetColor(
                            255,
                            Phaser.Math.Interpolation.Linear([0, 140], subRatio),
                            0
                        );
                    } else if (ratio > 0.15) { // 內層：熔岩橘 -> 亮黃
                        const subRatio = (ratio - 0.15) / 0.3;
                        hexColor = Phaser.Display.Color.GetColor(
                            255,
                            Phaser.Math.Interpolation.Linear([140, 230], subRatio),
                            Phaser.Math.Interpolation.Linear([0, 50], subRatio)
                        );
                    } else { // 接近核心：白熱化黃
                        hexColor = 0xfffdcc;
                    }
                    drawTaperedBeam(lWidth + pulse, hexColor, alpha);
                }

                // --- 核心內部漸變 (25層全白極致平滑過渡) ---
                const coreLayers = 25;
                const coreMaxJitter = Math.random() * 6 - 3;
                for (let i = coreLayers; i > 0; i--) {
                    const ratio = i / coreLayers;
                    const cWidth = (width / 1.8) * Math.pow(ratio, 1.4);
                    const alpha = (1 - ratio) * 0.35;
                    drawTaperedBeam(cWidth + coreMaxJitter * ratio, 0xffffff, alpha);
                }
                // 最中心極細線，確保視覺衝擊力
                drawTaperedBeam(width / 12, 0xffffff, 1);

                // --- 分形熱能電弧 (Fractal Heat Arcs) ---
                // 減少主解析度但增加細節抖動，使其更像真實物理折射
                const boltResolution = Math.floor(currentRange / 20);
                const boltStep = currentRange / (boltResolution || 1);

                if (boltResolution > 0) {
                    const drawFractalBolt = (color, alpha, thickness, complexity, spread) => {
                        const flicker = Math.random() * 0.4 + 0.6; // 高頻閃爍
                        beamGraphics.lineStyle(thickness, color, alpha * flicker);
                        beamGraphics.beginPath();
                        beamGraphics.moveTo(0, 0);

                        let curX = 0;
                        let curY = 0;

                        for (let i = 1; i <= boltResolution; i++) {
                            const targetX = i * boltStep;
                            const taper = targetX < taperLength ? (targetX / taperLength) : 1;

                            // 分形抖動：結合大波段與高頻小抖動 (修改為相減，使波動向外噴射)
                            const largeWave = Math.sin(i * 0.4 - this.scene.internalGameTime / 60) * (width * 0.4);
                            const tinyJitter = (Math.random() - 0.5) * complexity;
                            const nextY = (largeWave + tinyJitter) * taper * spread;

                            beamGraphics.lineTo(targetX, nextY);

                            // 隨機分支 (Branching)
                            if (Math.random() > 0.92 && i > 2) {
                                const branchX = targetX;
                                const branchY = nextY;
                                beamGraphics.moveTo(branchX, branchY);
                                beamGraphics.lineTo(branchX + Math.random() * 30, branchY + (Math.random() - 0.5) * 40);
                                beamGraphics.moveTo(branchX, branchY); // 回到主路徑
                            }

                            curX = targetX;
                            curY = nextY;
                        }
                        beamGraphics.strokePath();

                        // 同步渲染一層半透明暈影，增加厚度感
                        beamGraphics.lineStyle(thickness * 3, color, alpha * 0.3 * flicker);
                        beamGraphics.strokePath();
                    };

                    // 1. 底層深紅高熱暈影
                    drawFractalBolt(0xff3300, 0.4, 3, 25, 1.2);
                    // 2. 中層熾熱橘弧
                    drawFractalBolt(0xff9900, 0.6, 1.5, 15, 1.0);
                    // 3. 核心白熱化絲線
                    drawFractalBolt(0xfffdb0, 0.8, 0.8, 8, 0.8);
                }

                beamGraphics.restore();

                // 8. 強化密集粒子能量流 (增加數量、隨機色彩與噴射感)
                if (currentRange > 50) {
                    for (let p = 0; p < 8; p++) {
                        const distPercent = Math.random();
                        const dist = distPercent * currentRange;
                        const px = player.x + Math.cos(angle) * dist;
                        const py = player.y + Math.sin(angle) * dist;

                        const sideOffset = (Math.random() - 0.5) * (width * 1.2);
                        const finalX = px + Math.cos(angle + Math.PI / 2) * sideOffset;
                        const finalY = py + Math.sin(angle + Math.PI / 2) * sideOffset;

                        const pColor = Phaser.Math.RND.pick([0xffffff, 0xffaa00, 0xff00ff, 0xff4400, 0x00ffff]);
                        const particle = this.scene.add.rectangle(finalX, finalY, Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 4), pColor);
                        particle.setAlpha(0.9);
                        particle.setBlendMode(Phaser.BlendModes.ADD);
                        particle.setRotation(Math.random() * Math.PI);

                        this.scene.tweens.add({
                            targets: particle,
                            x: finalX + Math.cos(angle) * Phaser.Math.Between(200, 400),
                            y: finalY + Math.sin(angle) * Phaser.Math.Between(200, 400),
                            angle: 180,
                            alpha: 0,
                            scale: 0.5,
                            duration: Phaser.Math.Between(300, 700),
                            onComplete: () => particle.destroy()
                        });
                    }
                }

                // 9. (Energy Pulse Rings 已移除 - 使用者要求移除)

                // 10. Explosive Particles (沿線微型爆炸 - 強化規模)
                if (Math.random() > 0.4 && currentRange > 50) {
                    for (let p = 0; p < 3; p++) {
                        const dist = Phaser.Math.Between(0, currentRange);
                        const px = player.x + Math.cos(angle) * dist;
                        const py = player.y + Math.sin(angle) * dist;

                        const offsetAngle = Phaser.Math.FloatBetween(-Math.PI / 2, Math.PI / 2);
                        const offsetDist = Phaser.Math.FloatBetween(0, width * 0.7);
                        const finalX = px + Math.cos(angle + offsetAngle) * offsetDist;
                        const finalY = py + Math.sin(angle + offsetAngle) * offsetDist;

                        const particle = this.scene.add.circle(finalX, finalY, Phaser.Math.Between(5, 15),
                            Phaser.Math.RND.pick([0xffffff, 0xff0000, 0xffaa00, 0xff00ff]));
                        particle.setBlendMode(Phaser.BlendModes.ADD);

                        this.scene.tweens.add({
                            targets: particle,
                            x: finalX + Phaser.Math.FloatBetween(-40, 40),
                            y: finalY + Phaser.Math.FloatBetween(-40, 40),
                            scale: 0,
                            alpha: 0,
                            duration: Phaser.Math.Between(400, 600),
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
                const activeTime = this.scene.internalGameTime - startTime;
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

                        // Impact visual (Heat themed)
                        const impactColor = Phaser.Math.RND.pick([0xff0000, 0xffaa00, 0xffff00]);
                        const impact = this.scene.add.circle(e.x, e.y, 25, impactColor, 0.6);
                        this.scene.tweens.add({
                            targets: impact,
                            alpha: 0,
                            scale: 1.5,
                            duration: 150,
                            onComplete: () => impact.destroy()
                        });
                    }
                });

                // Debug Hitbox Visualization (強制並優化顯示)
                if (this.scene.physics.world.drawDebug || (this.scene.game.config.physics && this.scene.game.config.physics.arcade.debug)) {
                    const debugRect = this.scene.add.graphics().setDepth(1000000); // 極高深度
                    debugRect.lineStyle(4, 0xffff00, 1); // 超粗黃線
                    debugRect.setPosition(player.x, player.y);
                    debugRect.setRotation(angle);
                    debugRect.strokeRect(0, -width / 1.3, currentDmgRange, (width / 1.3) * 2);

                    this.scene.time.delayedCall(tickRate - 2, () => {
                        if (debugRect && debugRect.active) debugRect.destroy();
                    });
                }

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
            const level = stats.level || 1;
            this.drawLightning(prevSource, currentTarget, stats.color || 0x4d00ff, level);

            if (currentTarget.takeDamage) currentTarget.takeDamage(stats.damage);
            if (currentTarget.stun) currentTarget.stun(stats.stunDuration || 500);

            prevSource = currentTarget;
            let nextTarget = null;
            // 彈跳距離隨等級提升：基礎 300，每級加 50
            let searchRadius = 300 + (level * 50);

            targets.forEach(e => {
                if (e.active && !hitTargets.has(e)) {
                    const d = Phaser.Math.Distance.Between(prevSource.x, prevSource.y, e.x, e.y);
                    if (d < searchRadius) {
                        searchRadius = d;
                        nextTarget = e;
                    }
                }
            });

            currentTarget = nextTarget;
            chainIndex++;
            this.scene.time.delayedCall(50, chainNext);
        };

        chainNext();
        // Removed camera shake
        return true;
    }

    drawLightning(source, target, color, level = 1) {
        const graphics = this.scene.add.graphics();
        graphics.setBlendMode(Phaser.BlendModes.ADD);
        graphics.setDepth(100);

        const x1 = source.x;
        const y1 = source.y;
        const x2 = target.x;
        const y2 = target.y;

        const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const steps = Math.max(3, Math.floor(dist / 20));

        // 根據等級決定是否疊加金色
        const isHighLevel = level >= 3;
        const isYellowLevel = level >= 4;
        const isMaxLevel = level >= 5;

        const drawBolt = (g, startX, startY, endX, endY, thickness, alpha, offsetRange, boltColor) => {
            g.lineStyle(thickness, boltColor || color, alpha);
            g.beginPath();
            g.moveTo(startX, startY);
            for (let i = 1; i < steps; i++) {
                const t = i / steps;
                const px = startX + (endX - startX) * t + Phaser.Math.Between(-offsetRange, offsetRange);
                const py = startY + (endY - startY) * t + Phaser.Math.Between(-offsetRange, offsetRange);
                g.lineTo(px, py);

                // 高階分支閃電 (Branching)
                if (isHighLevel && Math.random() > 0.85 && i < steps - 1) {
                    const bx = px + Phaser.Math.Between(-30, 30);
                    const by = py + Phaser.Math.Between(-30, 30);
                    g.strokePath(); // 結束主線段
                    g.lineStyle(thickness * 0.5, boltColor || color, alpha * 0.7);
                    g.beginPath();
                    g.moveTo(px, py);
                    g.lineTo(bx, by);
                    g.strokePath();
                    g.lineStyle(thickness, boltColor || color, alpha); // 回到主線段樣式
                    g.beginPath();
                    g.moveTo(px, py);
                }
            }
            g.lineTo(endX, endY);
            g.strokePath();
        };

        // 1. 外層光暈 (Glow) - 使用原始藍色
        const glowWidth = 4 + (level * 2);
        drawBolt(graphics, x1, y1, x2, y2, glowWidth, 0.3, 20, color);

        // 2. 次級光束 (Secondary)
        if (level >= 2) {
            drawBolt(graphics, x1, y1, x2, y2, glowWidth * 0.5, 0.6, 12, color);
        }

        // 核心光束 (Core)
        const coreWidth = 1 + (level * 0.5);
        drawBolt(graphics, x1, y1, x2, y2, coreWidth, 1, 8, 0xffffff);

        // 4. 新增：高階金黃螢光閃電 (LV4+ 獨立疊加)
        if (isYellowLevel) {
            const goldColor = 0xffd700;
            drawBolt(graphics, x1, y1, x2, y2, coreWidth * 0.8, 0.9, 25, goldColor);

            // 隨機金色螢光微粒 (更亮的點綴)
            if (Math.random() > 0.4) {
                for (let i = 0; i < 6; i++) {
                    const tx = Phaser.Math.Interpolation.Linear([x1, x2], Math.random());
                    const ty = Phaser.Math.Interpolation.Linear([y1, y2], Math.random());
                    const p = this.scene.add.circle(tx, ty, 2, goldColor);
                    p.setBlendMode(Phaser.BlendModes.ADD);
                    this.scene.tweens.add({
                        targets: p,
                        x: tx + Phaser.Math.Between(-40, 40),
                        y: ty + Phaser.Math.Between(-40, 40),
                        alpha: 0,
                        scale: 2.5,
                        duration: 500,
                        onComplete: () => p.destroy()
                    });
                }
            }
        }

        // 高階額外效果：擊中地面或目標的微型火花海
        if (isMaxLevel) {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const len = Math.random() * 50;
                const spx = x2 + Math.cos(angle) * len;
                const spy = y2 + Math.sin(angle) * len;
                graphics.lineStyle(1, isYellowLevel ? 0xffea00 : 0xffffff, 0.8);
                graphics.beginPath();
                graphics.moveTo(x2, y2);
                graphics.lineTo(spx, spy);
                graphics.strokePath();
            }
        }
        // Removed camera shake from both branches

        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 200 + (level * 20),
            onComplete: () => graphics.destroy()
        });

        // Spark effect (Hit point)
        const sparkSize = 4 + level;
        const spark = this.scene.add.circle(x2, y2, sparkSize, 0xffffff);
        spark.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
            targets: spark,
            scale: 2 + (level * 0.2),
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

            // Cooldown check for ACTIONS only (使用 internalGameTime)
            const now = this.scene.internalGameTime;
            if (susanoo.nextActionTime && now < susanoo.nextActionTime) return true;

            const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);

            // 獲取時間縮放以調整冷卻
            const timeScale = this.scene.time.timeScale || 1;

            // --- LOGIC: Shield (Condition: Shield < 30% Max HP) ---
            const currentShield = player.shield || 0;
            const maxHP = player.maxHealth || 100;

            if (currentShield < (maxHP * 0.3) && now > (susanoo.nextShieldTime || 0)) {
                this.susanooActionShield(player, stats);
                susanoo.nextShieldTime = now + (30000 / timeScale); // Keep cooldown to prevent spam
                susanoo.nextActionTime = now + (1000 / timeScale);
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

            return true;
        } catch (e) {
            console.error("Susanoo Error:", e);
            return false;
        }
    }

    fireSnowfall(stats, player) {
        const targets = [...this.scene.enemies.getChildren(), ...this.scene.boxes.getChildren()].filter(t => t.active);
        const target = this.getClosestTargetInRange(targets, 500); // 尋找 500 距離內的最近敵人

        let spawnX, spawnY;
        if (target) {
            spawnX = target.x;
            spawnY = target.y;
        } else {
            // 如果附近沒敵人，在玩家原地召喚
            spawnX = player.x;
            spawnY = player.y;
        }

        new SnowfallArea(this.scene, spawnX, spawnY, stats);

        // 視覺震動增加打擊感
        this.scene.cameras.main.shake(200, 0.002);

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
            nextShieldTime: 0, // Separate timer for Shield (30s interval)
            level: level,
            baseScale: baseScale
        };

        // 3. CRITICAL: Update Loop for Position Sync
        const updateListener = () => {
            if (this.scene.isGamePaused) return; // 暫停時跳過更新
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
                    const breath = Math.sin(this.scene.internalGameTime / 400) * 0.03;
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

        // Logic: Restore Shield
        const restore = stats.shieldRestore || 30;
        player.shield = Math.min((player.shield || 0) + restore, player.maxHealth || 100);

        // --- FIX UI DELAY: Force UI update immediately ---
        if (this.scene.updateUI) {
            this.scene.updateUI();
        }

        // --- USER SETTINGS: SHIELD EFFECT ---
        const FINAL_SIZE = 0.7;   // 設定護盾最終大小 (原本 1.5)
        const DURATION_MS = 1600;  // 設定護盾動畫時間 (毫秒, 原本 600)
        // ------------------------------------

        // Visual: Shield Texture Effect - Rapid Growth then Vanish
        const shieldSprite = this.scene.add.sprite(0, 0, 'shield_clean_v2');
        shieldSprite.setScale(0); // Start tiny
        shieldSprite.setAlpha(0.9);
        shieldSprite.setBlendMode(Phaser.BlendModes.ADD); // Glowy

        player.susanoo.container.add(shieldSprite);
        player.susanoo.container.bringToTop(shieldSprite);

        const timeScale = this.scene.time.timeScale || 1;
        this.scene.tweens.add({
            targets: shieldSprite,
            scaleX: FINAL_SIZE,
            scaleY: FINAL_SIZE,
            alpha: { from: 1, to: 0 }, // Fade out while growing
            duration: DURATION_MS / timeScale,
            ease: 'Back.out', // Pop effect
            onComplete: () => {
                shieldSprite.destroy();
                if (player.susanoo) {
                    player.susanoo.state = 'IDLE';
                    player.susanoo.sprite.play('susanoo_move_anim');
                }
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

        // --- Visual: Enhanced Force Push ---
        const pushG = this.scene.add.graphics();
        player.susanoo.container.add(pushG);
        player.susanoo.container.bringToTop(pushG);

        const duration = 350 / timeScale;
        const maxR = 300;

        this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: duration,
            ease: 'Cubic.out',
            onUpdate: (tween) => {
                const t = tween.getValue();
                pushG.clear();

                // 1. Solid Shockwave Core (White -> Blue -> Clear)
                pushG.fillStyle(0x00ffff, 0.2 * (1 - t));
                pushG.fillCircle(0, 0, maxR * t);

                // 2. Thick Expanding Ring
                pushG.lineStyle(10 * (1 - t), 0xffffff, 1 * (1 - t));
                pushG.strokeCircle(0, 0, maxR * t);

                // 3. Secondary Ring (Delayed)
                if (t > 0.2) {
                    const t2 = (t - 0.2) / 0.8;
                    pushG.lineStyle(20 * (1 - t2), 0x0088ff, 0.5 * (1 - t2));
                    pushG.strokeCircle(0, 0, (maxR * 0.8) * t2);
                }

                // 4. Force Distortion Lines (Spikes sticking out)
                const spikes = 16;
                for (let j = 0; j < spikes; j++) {
                    const angle = (j / spikes) * Math.PI * 2;
                    const startR = 50 + (t * 150);
                    const len = 60 * t;
                    const sx = Math.cos(angle) * startR;
                    const sy = Math.sin(angle) * startR;
                    const ex = Math.cos(angle) * (startR + len);
                    const ey = Math.sin(angle) * (startR + len);

                    pushG.lineStyle(4, 0xff00ff, 0.8 * (1 - t));
                    pushG.beginPath();
                    pushG.moveTo(sx, sy);
                    pushG.lineTo(ex, ey);
                    pushG.strokePath();
                }
            },
            onComplete: () => {
                pushG.destroy();
                if (player.susanoo) {
                    player.susanoo.state = 'IDLE';
                    player.susanoo.sprite.play('susanoo_move_anim');
                }
            }
        });

        // Apply Knockback Logic
        targets.forEach(t => {
            if (t.active) {
                t.takeDamage(dmg);
                const angle = Phaser.Math.Angle.Between(player.x, player.y, t.x, t.y);
                const force = 350;
                t.x += Math.cos(angle) * force;
                t.y += Math.sin(angle) * force;
                // Add stun if possible
                if (t.stun) t.stun(1000);
            }
        });
    }

    susanooActionSweep(player, stats, targets) {
        if (!player.susanoo) return;
        player.susanoo.state = 'SWEEP';

        // Damage per hit (Half of total damage)
        const totalDmg = stats.damage || 50;
        const dmgPerHit = totalDmg / 2;

        const timeScale = this.scene.time.timeScale || 1;

        // 找到目標方向
        const target = targets[0];
        const baseAngle = target ? Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y) : 0;

        // 斬擊範圍參數
        const range = stats.range || 250;

        // Helper: Spawn refined sword energy slashes at enemy position
        const spawnSwordEnergySlashes = (enemy, swordAngle, timeScale) => {
            const slashCount = 4 + Math.floor(Math.random() * 3);
            for (let i = 0; i < slashCount; i++) {
                const slash = this.scene.add.graphics();
                slash.x = enemy.x;
                slash.y = enemy.y;

                // Direction perpendicular to sword (along swing direction) with deviation
                const deviation = (Math.random() - 0.5) * 0.6; // ±17 degrees
                const angle = swordAngle + deviation;
                const speed = 80 + Math.random() * 60;
                const baseLength = 35 + Math.random() * 35;
                const baseWidth = 4 + Math.random() * 3;

                // Color palette - refined purple/magenta spectrum
                const colorVariant = Math.random();
                let coreColor, midColor, outerColor;
                if (colorVariant < 0.33) {
                    coreColor = 0xffffff;   // White core
                    midColor = 0xff00ff;    // Magenta
                    outerColor = 0xaa00ff;  // Purple
                } else if (colorVariant < 0.66) {
                    coreColor = 0xffccff;   // Light pink
                    midColor = 0xcc00ff;    // Deep magenta
                    outerColor = 0x8800ff;  // Deep purple
                } else {
                    coreColor = 0xccffff;   // Cyan tint
                    midColor = 0xaa55ff;    // Purple-pink
                    outerColor = 0x6600cc;  // Dark purple
                }

                // Draw multi-layer blade with tapered tip
                // Layer 1: Outer Halo (widest, most transparent)
                slash.lineStyle(baseWidth * 3, outerColor, 0.15);
                slash.beginPath();
                slash.moveTo(0, 0);
                slash.lineTo(baseLength * 0.9, 0);
                // Tapered tip
                slash.lineTo(baseLength, 0);
                slash.strokePath();

                // Layer 2: Mid Glow
                slash.lineStyle(baseWidth * 1.8, midColor, 0.4);
                slash.beginPath();
                slash.moveTo(0, 0);
                slash.lineTo(baseLength * 0.95, 0);
                slash.lineTo(baseLength, 0);
                slash.strokePath();

                // Layer 3: Core Blade (sharpest, brightest)
                slash.lineStyle(baseWidth * 0.8, coreColor, 0.9);
                slash.beginPath();
                slash.moveTo(0, 0);
                slash.lineTo(baseLength, 0);
                slash.strokePath();

                // Add sharp tip accent
                slash.fillStyle(coreColor, 0.8);
                slash.fillCircle(baseLength, 0, baseWidth * 0.6);

                slash.setRotation(angle);
                slash.setBlendMode(Phaser.BlendModes.ADD);

                // Shoot outward and fade (no rotation)
                const endX = slash.x + Math.cos(angle) * speed;
                const endY = slash.y + Math.sin(angle) * speed;

                this.scene.tweens.add({
                    targets: slash,
                    x: endX,
                    y: endY,
                    alpha: 0,
                    scaleX: 1.3,
                    scaleY: 0.8, // Slight vertical compression for speed effect
                    duration: 350 + Math.random() * 150,
                    ease: 'Cubic.out',
                    onComplete: () => slash.destroy()
                });
            }
        };

        // --- Helper: Domineering Slash (Crescent + Void Rift) ---
        // --- Helper: Sprite Slash (Sword + Trails + Flame) ---
        const performSlash = (direction, delay) => {
            this.scene.time.delayedCall(delay, () => {
                if (!player.susanoo) return;

                // 1. Animation
                player.susanoo.sprite.play('susanoo_att_anim');

                // 2. Setup Sprite
                const sword = this.scene.add.sprite(0, 0, 'susanoo_sword_clean');
                if (!sword.texture || sword.texture.key === '__MISSING') {
                    // Fallback if texture load failed or not clean yet
                    sword.setTexture('susanoo_sword');
                }
                sword.setOrigin(0.5, 1.0); // Handle at bottom
                // Scale to match range approx (assuming sword height is ~length)
                // If sword height is 0 (not loaded), default to 1
                const sScale = sword.height > 0 ? range / sword.height : 1;
                sword.setScale(sScale);

                player.susanoo.container.add(sword);
                player.susanoo.container.bringToTop(sword);

                // 3. Setup FX Graphics
                const fxG = this.scene.add.graphics();
                player.susanoo.container.add(fxG);
                player.susanoo.container.moveBelow(fxG, sword); // FX behind sword
                fxG.setBlendMode(Phaser.BlendModes.SCREEN);

                // Motion Params
                const safeTimeScale = Math.max(0.1, timeScale);
                const swingDuration = 120 / safeTimeScale; // Fast swing
                const fadeDuration = 100 / safeTimeScale; // Fast fade

                const sweepArc = Math.PI * 1.0;
                // Angle Math: 0 is Right. -PI/2 is Up.
                // Sword points Up by default (Handle bottom).
                // To point Right (0 rad), rotation must be +PI/2.
                // So Rotation = Angle + PI/2.

                const startAngle = baseAngle + (sweepArc / 2) * direction;
                const endAngle = baseAngle - (sweepArc / 2) * direction;

                this.scene.tweens.addCounter({
                    from: 0,
                    to: 1,
                    duration: swingDuration + fadeDuration,
                    onUpdate: (tween) => {
                        const totalProgress = tween.getValue();
                        // 0.8 Swing, 0.2 Fade
                        const swingProgress = Phaser.Math.Clamp(totalProgress / 0.8, 0, 1);

                        fxG.clear();

                        if (swingProgress < 1) {
                            const currentAngle = startAngle + (endAngle - startAngle) * swingProgress;
                            sword.setRotation(currentAngle + Math.PI / 2);

                            // --- EFFECT: GHOST TRAILS (殘影) ---
                            // Spawn a ghost every other frame effectively by probability
                            if (Math.random() < 0.6) {
                                const ghost = this.scene.add.sprite(0, 0, 'susanoo_sword_clean');
                                ghost.setOrigin(0.5, 1.0);
                                ghost.setScale(sword.scaleX, sword.scaleY);
                                ghost.setRotation(sword.rotation);
                                ghost.setAlpha(0.4);
                                ghost.setTint(0xaa55ff); // Purple Tint
                                player.susanoo.container.add(ghost);
                                player.susanoo.container.moveBelow(ghost, fxG); // Behind FX

                                this.scene.tweens.add({
                                    targets: ghost,
                                    alpha: 0,
                                    duration: 250 / safeTimeScale,
                                    onComplete: () => ghost.destroy()
                                });
                            }

                            // --- EFFECT: PURPLE FLAME (紫焰) ---
                            // Draw jagged shapes trailing/along the blade
                            // We can draw a sector from Handle to Tip
                            const tipX = Math.cos(currentAngle) * range;
                            const tipY = Math.sin(currentAngle) * range;

                            // Draw chaotic flame spurts
                            fxG.lineStyle(2, 0xff00ff, 0.5);
                            fxG.fillStyle(0xaa00cc, 0.5);

                            const flameCnt = 5;
                            for (let i = 0; i < flameCnt; i++) {
                                // interpolate along blade
                                const r = range * (0.3 + 0.7 * Math.random());
                                const px = Math.cos(currentAngle) * r;
                                const py = Math.sin(currentAngle) * r;

                                // Flame extends opposite to Swing Direction?
                                // Actually let's just make it "burn" outward broadly
                                const burnAng = currentAngle - (direction * 0.2 * Math.random());
                                const bx = Math.cos(burnAng) * (r + 20);
                                const by = Math.sin(burnAng) * (r + 20);

                                fxG.beginPath();
                                fxG.moveTo(px, py);
                                fxG.lineTo(bx, by);
                                fxG.lineTo(Math.cos(currentAngle) * (r + 10), Math.sin(currentAngle) * (r + 10));
                                fxG.closePath();
                                fxG.fillPath();
                            }
                        } else {
                            // Fade out main sword
                            const fadeP = (totalProgress - 0.8) / 0.2;
                            sword.setAlpha(1 - fadeP);
                        }
                    },
                    onComplete: () => {
                        sword.destroy();
                        fxG.destroy();
                    }
                });

                // Sweep-based damage & VFX
                const hitEnemies = new Set();
                const startTime = Date.now();

                const hitCheckInterval = this.scene.time.addEvent({
                    delay: 16,
                    repeat: Math.ceil(swingDuration / 16) + 5,
                    callback: () => {
                        const elapsed = Date.now() - startTime;
                        const swingProgress = Math.min(elapsed / swingDuration, 1);
                        const currentAngle = startAngle + (endAngle - startAngle) * swingProgress;

                        if (swingProgress >= 1) return;

                        targets.forEach(t => {
                            if (!t.active || hitEnemies.has(t) || !t.takeDamage) return;

                            const angleToEnemy = Phaser.Math.Angle.Between(player.x, player.y, t.x, t.y);
                            const dist = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);

                            if (dist > range) return;

                            const normalizeAngle = (a) => {
                                while (a < 0) a += Math.PI * 2;
                                while (a >= Math.PI * 2) a -= Math.PI * 2;
                                return a;
                            };

                            const normStart = normalizeAngle(startAngle);
                            const normCurrent = normalizeAngle(currentAngle);
                            const normEnemy = normalizeAngle(angleToEnemy);

                            let isHit = false;
                            if (direction > 0) {
                                if (normStart < normCurrent) {
                                    isHit = normEnemy >= normStart && normEnemy <= normCurrent;
                                } else {
                                    isHit = normEnemy >= normStart || normEnemy <= normCurrent;
                                }
                            } else {
                                if (normStart > normCurrent) {
                                    isHit = normEnemy <= normStart && normEnemy >= normCurrent;
                                } else {
                                    isHit = normEnemy <= normStart || normEnemy >= normCurrent;
                                }
                            }

                            if (isHit) {
                                hitEnemies.add(t);
                                t.takeDamage(dmgPerHit);
                                spawnSwordEnergySlashes(t, currentAngle, safeTimeScale);
                            }
                        });
                    }
                });
            });
        };

        // --- Execute Two Slashes ---
        performSlash(1, 0);
        performSlash(-1, 150 / timeScale);

        // Reset State
        this.scene.time.delayedCall(600 / timeScale, () => {
            if (player.susanoo) {
                player.susanoo.state = 'IDLE';
                player.susanoo.sprite.play('susanoo_move_anim');
            }
        });
    }
}
