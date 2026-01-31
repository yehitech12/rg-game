
import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDisplaySize(64, 64); // Ensure sprite is not huge
        this.body.setSize(64, 64); // Adjust hitbox

        // Infinite map, so no bounds
        this.setCollideWorldBounds(false);
        this.body.setBounce(0);

        this.speed = 250;
        this.maxHealth = 100;
        this.health = 100;
        this.pickupRange = 150; // Initial pickup range

        // Multipliers
        this.stats = {
            damage: 1,
            attackSpeed: 1,
            moveSpeed: 1,
            pickupRange: 1
        };
    }

    update() {
        const pointer = this.scene.input.activePointer;
        if (!pointer) return;

        const timeScale = this.scene.time.timeScale || 1;
        const currentSpeed = this.speed * this.stats.moveSpeed;

        // Use world position of pointer for more accurate movement towards mouse
        const mouseX = pointer.worldX;
        const mouseY = pointer.worldY;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, mouseX, mouseY);

        // Deadzone to stop jittering
        if (dist > 10) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, mouseX, mouseY);
            // In Phaser, velocity is pixels per second. 
            // We don't need to multiply by timeScale here because the physics engine handles 
            // the delta with world.timeScale. 
            this.scene.physics.velocityFromRotation(angle, currentSpeed, this.body.velocity);

            // Flip sprite based on movement direction
            if (this.body.velocity.x < 0) {
                this.setFlipX(true);
            } else if (this.body.velocity.x > 0) {
                this.setFlipX(false);
            }
        } else {
            this.setVelocity(0);
        }
    }
}
