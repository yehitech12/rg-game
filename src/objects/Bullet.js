import Phaser from 'phaser';

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bullet');
        this.setDisplaySize(16, 16);
        this.speed = 400;
        this.damage = 10;
        this.isTracking = false;
        this.explodeRange = 0;
    }

    fire(x, y, targetX, targetY, stats) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);

        this.damage = stats.damage;
        this.speed = stats.bulletSpeed || stats.speed || 600;
        this.currentPierce = stats.pierce || 1;
        this.isTracking = stats.isTracking || false;
        this.explodeRange = stats.explodeRange || 0;
        this.isShockwave = stats.isShockwave || false;
        this.trackingSpeed = stats.trackingSpeed || 0.1;
        this.target = null;

        // Calculate initial angle
        let angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);

        this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
        this.setRotation(angle);
        this.setTint(stats.color || 0xffffff);

        // Visual enhancement: trail/shockwave
        this.setAlpha(1);
        if (this.isShockwave) {
            this.setScale(2, 0.5); // Initial long/thin shape
        } else {
            this.setScale(1);
        }

        if (stats.duration) {
            this.scene.time.delayedCall(stats.duration, () => {
                if (this.active) this.hit(true); // Forced hit to disappear
            });
        }
    }

    hit(force = false) {
        if (this.explodeRange > 0 && !force) {
            this.explode();
        }

        if (force) {
            this.currentPierce = 0;
        } else {
            this.currentPierce--;
        }

        if (this.currentPierce <= 0) {
            this.setActive(false);
            this.setVisible(false);
        }
    }

    explode() {
        const explosion = this.scene.add.circle(this.x, this.y, this.explodeRange, 0xffaa00, 0.5);
        this.scene.tweens.add({
            targets: explosion,
            scale: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => explosion.destroy()
        });

        // Damage enemies in range
        const enemies = this.scene.enemies.getChildren().filter(e => e.active);
        enemies.forEach(e => {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
            if (dist <= this.explodeRange) {
                e.takeDamage(this.damage * 0.5); // Area damage is 50%
            }
        });

        this.scene.cameras.main.shake(100, 0.005);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        if (this.active && this.isShockwave) {
            // "Long and fierce" golden flash stretch effect
            this.scaleX += 0.4; // Explode forward
            this.scaleY = Math.max(0.05, this.scaleY - 0.015); // Get thinner/sharper
            this.setAlpha(this.alpha - 0.025); // Fade slower for 1200px range

            // Random slight height flicker for "fire" energy feel
            if (Math.random() > 0.5) this.scaleY += 0.05;
        }

        if (this.active && this.isTracking) {
            if (!this.target || !this.target.active) {
                let closest = null;
                let minDist = 400;
                this.scene.enemies.getChildren().forEach(e => {
                    if (e.active) {
                        const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
                        if (d < minDist) { minDist = d; closest = e; }
                    }
                });
                this.target = closest;
            }

            if (this.target && this.target.active) {
                const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
                const currentAngle = this.body.velocity.angle();
                const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, this.trackingSpeed);
                this.scene.physics.velocityFromRotation(newAngle, this.speed, this.body.velocity);
                this.setRotation(newAngle);
            }
        }

        const camera = this.scene.cameras.main;
        if (Phaser.Math.Distance.Between(this.x, this.y, camera.midPoint.x, camera.midPoint.y) > 2000) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}
