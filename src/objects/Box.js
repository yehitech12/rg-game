import Phaser from 'phaser';

export default class Box extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'chest');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setImmovable(true);
        this.setScale(1.5); // Make it a bit bigger and visible
        this.hp = 1;
    }

    spawn(x, y) {
        this.body.reset(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.hp = 1;
    }

    takeDamage() {
        this.hp--;
        if (this.hp <= 0) {
            this.scene.spawnItem(this.x, this.y);
            this.setActive(false);
            this.setVisible(false);
        }
    }
}
