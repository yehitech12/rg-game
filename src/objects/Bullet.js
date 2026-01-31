import Phaser from 'phaser';

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bullet');
        this.setDisplaySize(16, 16);
        this.speed = 400;
        this.damage = 10;
    }

    fire(x, y, targetX, targetY, stats) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);

        this.damage = stats.damage;
        this.speed = stats.speed;
        this.currentPierce = stats.pierce || 1;
        this.isHoming = stats.homing || false;
        this.burnStacks = stats.burnStacks || 0;
        this.isFire = stats.isFire || false;
        this.target = null; // For homing

        // Calculate angle
        let angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);

        // Add random spread if any
        if (stats.spread) {
            angle += Phaser.Math.DegToRad(Phaser.Math.Between(-stats.spread, stats.spread));
        }

        this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
        this.setRotation(angle);
        this.setTint(stats.color || 0xffffff);
    }

    hit() {
        this.currentPierce--;
        if (this.currentPierce <= 0) {
            this.setActive(false);
            this.setVisible(false);
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        // Homing logic
        if (this.isHoming && this.active) {
            if (!this.target || !this.target.active) {
                // Find nearest enemy
                let closest = null;
                let minDist = 300; // Homing range
                this.scene.enemies.getChildren().forEach(e => {
                    if (e.active) {
                        const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
                        if (d < minDist) { minDist = d; closest = e; }
                    }
                });
                this.target = closest;
            }

            if (this.target && this.target.active) {
                this.scene.physics.moveToObject(this, this.target, this.speed);
                // Rotate towards movement
                this.setRotation(this.body.velocity.angle());
            }
        }

        // Destroy if out of bounds (camera view + padding)
        const camera = this.scene.cameras.main;
        // Simple distance check from camera center is safest for infinite map
        if (Phaser.Math.Distance.Between(this.x, this.y, camera.midPoint.x, camera.midPoint.y) > 3000) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}
