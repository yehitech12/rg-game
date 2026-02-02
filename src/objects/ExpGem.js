import Phaser from 'phaser';

export default class ExpGem extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'xp_gem');
        this.setDisplaySize(16, 16);
        this.value = 10;
        this.isCollected = false;
        this.magnetSpeed = 400;
    }

    spawn(x, y, value) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.value = value || 10;
        this.isCollected = false;
        this.setVelocity(0);

        // Color based on value
        if (this.value >= 100) this.setTint(0xff0000);      // Red (Boss/Elite)
        else if (this.value >= 50) this.setTint(0xffff00); // Yellow (Tank)
        else if (this.value >= 25) this.setTint(0x00ff00); // Green (Fast)
        else this.setTint(0x00ffff);                      // Cyan (Slime)
    }

    collect() {
        this.isCollected = true;
    }

    preUpdate(time, delta) {
        if (this.scene.isGamePaused) return;
        super.preUpdate(time, delta);
        if (!this.active) return;

        const player = this.scene.player;
        if (!player) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const currentPickupRange = player.pickupRange * (player.stats.pickupRange || 1);

        if (!this.isCollected && dist < currentPickupRange) {
            this.isCollected = true;
        }

        if (this.isCollected) {
            // Move towards player fast
            this.scene.physics.moveToObject(this, player, this.magnetSpeed);

            if (dist < 20) {
                this.scene.gainXP(this.value); // Use scene gainXP instead of direct event if available
                this.setActive(false);
                this.setVisible(false);
            }
        }
    }
}
