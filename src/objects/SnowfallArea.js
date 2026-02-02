import Phaser from 'phaser';

export default class SnowfallArea extends Phaser.GameObjects.Container {
    constructor(scene, x, y, stats) {
        super(scene, x, y);
        this.scene = scene;
        this.stats = stats;

        // Visual properties
        this.radius = stats.radius;
        this.duration = stats.duration;
        this.damage = stats.damage;
        this.slowFactor = stats.slowFactor;
        this.tickRate = stats.tickRate || 500;

        // Add to scene
        scene.add.existing(this);

        // 1. Core Area Graphics (Semi-transparent icy glow)
        this.bg = scene.add.graphics();
        this.add(this.bg);

        // --- NEW: Magical Rune Sprite from Assets ---
        this.rune = scene.add.sprite(0, 0, 'snow_magic');
        // 增加 1.15 倍的顯示比例以抵消素材留白，確保尖角對準半徑
        const runeSize = this.radius * 2 * 1.15;
        this.rune.setDisplaySize(runeSize, runeSize);
        this.rune.setAlpha(0.8); // 提高亮度使其更明顯
        this.rune.setTint(0x00ffff);
        this.rune.setBlendMode('ADD');
        this.add(this.rune);

        // 2. Frost Ring (Border)
        this.border = scene.add.graphics();
        this.add(this.border);

        // 3. Mist Particles (The "Cold Fog" at the bottom)
        this.mistParticles = scene.add.particles(0, 0, 'bullet', {
            frame: 0,
            scale: { start: 1, end: 2 },
            alpha: { start: 0, intermediate: 0.15, end: 0 },
            alphaEase: 'Sine.easeInOut',
            speed: { min: 5, max: 20 },
            angle: { min: 0, max: 360 },
            lifespan: 2000,
            frequency: 100,
            tint: 0xaaddff,
            blendMode: 'ADD',
            emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, this.radius) }
        });
        this.add(this.mistParticles);

        // 4. Falling Snowflakes (Moving from top-ish to bottom)
        this.snowParticles = scene.add.particles(0, 0, 'bullet', {
            frame: 0,
            scale: { start: 0.15, end: 0.05 },
            alpha: { start: 1, end: 0.2 },
            speedY: { min: 50, max: 150 }, // downward movement
            speedX: { min: -20, max: 20 },
            rotate: { min: 0, max: 360 },
            lifespan: { min: 1000, max: 2000 },
            frequency: 30,
            tint: 0xffffff,
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-this.radius, -this.radius, this.radius * 2, this.radius)
            }
        });
        this.add(this.snowParticles);

        // 5. Icy Wind Streaks
        this.windParticles = scene.add.particles(0, 0, 'bullet', {
            frame: 0,
            scaleX: { start: 2, end: 0.5 },
            scaleY: { start: 0.05, end: 0.02 },
            alpha: { start: 0, intermediate: 0.6, end: 0 },
            speedX: { min: 200, max: 400 },
            lifespan: 500,
            frequency: 200,
            tint: 0xffffff,
            blendMode: 'ADD',
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-this.radius, -this.radius, this.radius * 2, this.radius * 2)
            }
        });
        this.add(this.windParticles);

        // --- Animations ---

        // Rune Rotation & Pulse
        scene.tweens.add({
            targets: this.rune,
            angle: 360,
            duration: 10000,
            repeat: -1
        });

        scene.tweens.add({
            targets: this.rune,
            alpha: { from: 0.4, to: 0.8 },
            duration: 1500,
            yoyo: true,
            repeat: -1
        });

        // Background Pulse
        scene.tweens.add({
            targets: this.bg,
            alpha: { from: 0.5, to: 1.0 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.drawGlow()
        });

        // Border Pulsing
        scene.tweens.add({
            targets: this.border,
            alpha: { from: 0.3, to: 0.8 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.drawBorder()
        });

        // 6. Timer for Tick Damage & Slow
        this.tickTimer = scene.time.addEvent({
            delay: this.tickRate,
            callback: this.applyEffect,
            callbackScope: this,
            loop: true
        });

        // 7. Lifespan Timer
        scene.time.delayedCall(this.duration, () => {
            this.destroyArea();
        });

        // Entrance animation
        this.setScale(0);
        scene.tweens.add({
            targets: this,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
    }

    drawGlow() {
        if (!this.active) return;
        const g = this.bg;
        g.clear();
        g.fillStyle(0x00ccff, 0.1);
        g.fillCircle(0, 0, this.radius);
    }

    drawBorder() {
        if (!this.active) return;
        const g = this.border;
        g.clear();

        // Thick Frost Border
        g.lineStyle(6, 0xffffff, 0.5);
        g.strokeCircle(0, 0, this.radius);

        // Outer Glow
        g.lineStyle(12, 0x00ffff, 0.2);
        g.strokeCircle(0, 0, this.radius + 5);
    }

    applyEffect() {
        if (!this.active) return;

        const enemies = this.scene.enemies.getChildren();
        const boxes = this.scene.boxes.getChildren();
        const targets = [...enemies, ...boxes];

        targets.forEach(target => {
            if (target.active) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
                if (dist <= this.radius) {
                    // Apply Damage
                    if (target.takeDamage) {
                        target.takeDamage(this.damage);
                    }

                    // Apply Slow (only to enemies)
                    if (target.slow) {
                        target.slow(this.slowFactor, this.tickRate + 200);
                    }

                    // Visual feedback: brief blue tint
                    target.setTint(0x00ffff);
                    this.scene.time.delayedCall(100, () => {
                        if (target.active) {
                            if (target.burnStacks > 0) target.setTint(0xff6600);
                            else if (target.isElite) target.setTint(0xffff00);
                            else if (target.isBoss && target.configColor) target.setTint(target.configColor);
                            else target.clearTint();
                        }
                    });
                }
            }
        });
    }

    destroyArea() {
        // Exit animation
        this.scene.tweens.add({
            targets: this,
            scale: 0,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.tickTimer.remove();
                if (this.particles) this.particles.destroy();
                this.destroy();
            }
        });
    }
}
