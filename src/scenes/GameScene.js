import Phaser from 'phaser';
import Player from '../objects/Player';
import Enemy from '../objects/Enemy';
import Bullet from '../objects/Bullet';
import ExpGem from '../objects/ExpGem';
import Box from '../objects/Box';
import WeaponSystem from '../systems/WeaponSystem';
import { Weapons } from '../config/weapons';
import { Enemies } from '../config/enemies';
import DebugPanel from '../systems/DebugPanel';

// Assets served from /public/assets/
const playerImg = 'assets/robot.png';
const bgImg = 'assets/BG4-2.png';
const enemyImg = 'assets/enemy.png';
const bulletImg = 'assets/bullet.png';
const xpGemImg = 'assets/xp_gem.png';
const dragonImg = 'assets/dragon.png';
const bossSlimeImg = 'assets/boss_slime.png';
const bossBatImg = 'assets/boss_bat.png';
const bossGolemImg = 'assets/boss_golem.png';
const bossDemonImg = 'assets/boss_demon.png';
const chestImg = 'assets/chest.png';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.player = null;
        this.enemies = null;
        this.bullets = null;
        this.xpGems = null;
        this.boxes = null;

        this.spawnDelay = 266;
        this.maxEnemies = 300;
        this.level = 1;
        this.currentXP = 0;
        this.neededXP = 100;
        this.gameTimer = 0;

        this.levelUpPending = 0;
        this.isLevelingUp = false;

        this.overloadEnergy = 0;
        this.maxOverloadEnergy = 100;
        this.overloadActive = false;
        this.overloadDuration = 10000;
        this.overloadTimeLeft = 0;
        this.difficulty = 'normal';
        this.enemiesKilled = 0;
    }

    init(data) {
        this.difficulty = data.difficulty || 'normal';
        this.selectedLevel = data.level || 1;

        // Reset all states for restart
        this.spawnDelay = 266;
        this.maxEnemies = 300;
        this.level = 1;
        this.currentXP = 0;
        this.neededXP = 100;
        this.gameTimer = 0;
        this.levelUpPending = 0;
        this.isLevelingUp = false;
        this.overloadEnergy = 0;
        this.enemiesKilled = 0;
        this.isFinalBossSpawned = false;
        this.isVictoryPending = false;
        this.isTestMode = data.isTestMode || false;
        this.internalGameTime = 0; // 新增：內部遊戲時間計數器
    }

    preload() {
        this.load.image('player_raw', playerImg);
        this.load.image('player_robot2_raw', 'assets/Robot2.png');
        this.load.image('bg', bgImg);
        this.load.image('enemy', enemyImg);
        this.load.image('enemy_weak', 'assets/enemy_weak.png');
        this.load.image('enemy_fast', enemyImg);
        this.load.image('enemy_tank', 'assets/enemy_strong.png');
        this.load.image('bullet', bulletImg);
        this.load.image('xp_gem', xpGemImg);
        this.load.image('dragon', dragonImg);
        this.load.image('boss_slime', bossSlimeImg);
        this.load.image('boss_bat', bossBatImg);
        this.load.image('boss_golem', bossGolemImg);
        this.load.image('boss_demon', bossDemonImg);
        this.load.image('chest', chestImg);

        // Slime animations
        for (let i = 1; i <= 4; i++) {
            this.load.image(`slime_move_${i}`, `assets/Enemy/SLM${i}.png`);
        }
        for (let i = 1; i <= 3; i++) {
            this.load.image(`slime_die_${i}`, `assets/Enemy/SLM_D${i}.png`);
        }

        // Skeleton animations
        for (let i = 1; i <= 4; i++) {
            this.load.image(`skeleton_move_${i}`, `assets/Enemy/SKE${i}.png`);
        }
        for (let i = 1; i <= 2; i++) {
            this.load.image(`skeleton_die_${i}`, `assets/Enemy/SKE_D${i}.png`);
        }

        // Knight animations
        for (let i = 1; i <= 2; i++) {
            this.load.image(`knight_move_${i}`, `assets/Enemy/KNI${i}.png`);
            this.load.image(`knight_die_${i}`, `assets/Enemy/KNI_D${i}.png`);
        }

        // Rock Golem animations
        for (let i = 1; i <= 3; i++) {
            this.load.image(`rock_move_${i}`, `assets/Enemy/ROC${i}.png`);
        }
        for (let i = 1; i <= 2; i++) {
            this.load.image(`rock_die_${i}`, `assets/Enemy/ROC_D${i}.png`);
        }

        // Boss Slime animations
        for (let i = 1; i <= 6; i++) {
            this.load.image(`boss_slime_move_${i}`, `assets/Enemy/Boss_SLM_${i}.png`);
        }
        for (let i = 1; i <= 3; i++) {
            this.load.image(`boss_slime_die_${i}`, `assets/Enemy/Boss_SLM_D${i}.png`);
        }

        // Player walk animation frames (New Main assets)
        for (let i = 1; i <= 4; i++) {
            this.load.image(`player_walk_${i}`, `assets/Enemy/Main${i}.png`);
        }

        // Susanoo individual frames
        this.load.image('susanoo_move_1', 'assets/SUS_move1.png');
        this.load.image('susanoo_move_2', 'assets/SUS_move2.png');
        this.load.image('susanoo_att_1', 'assets/SUS_att1.png');
        this.load.image('susanoo_att_2', 'assets/SUS_att2.png');
        this.load.image('susanoo_def_1', 'assets/SUS_def1.png');
        this.load.image('susanoo_def_2', 'assets/SUS_def2.png');

        // Snowfall Magic Assets
        this.load.image('snow_magic', 'assets/snow_magic.png');
    }

    create() {
        // Process Susanoo textures - Remove white background
        ['susanoo_move_1', 'susanoo_move_2', 'susanoo_att_1', 'susanoo_att_2', 'susanoo_def_1', 'susanoo_def_2'].forEach(key => {
            if (!this.textures.exists(key + '_clean')) {
                const texture = this.textures.get(key).getSourceImage();
                const canvas = this.textures.createCanvas(key + '_clean', texture.width, texture.height);
                const ctx = canvas.getContext();
                ctx.drawImage(texture, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Remove white/light backgrounds
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];

                    // If pixel is very light (close to white), make it transparent
                    if (r > 230 && g > 230 && b > 230) {
                        imageData.data[i + 3] = 0;
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                canvas.refresh();
            }
        });

        // Create Susanoo animations using cleaned textures
        if (!this.anims.exists('susanoo_move_anim')) {
            this.anims.create({
                key: 'susanoo_move_anim',
                frames: [
                    { key: 'susanoo_move_1_clean' },
                    { key: 'susanoo_move_2_clean' }
                ],
                frameRate: 2,
                repeat: -1
            });
        }
        if (!this.anims.exists('susanoo_att_anim')) {
            this.anims.create({
                key: 'susanoo_att_anim',
                frames: [
                    { key: 'susanoo_att_1_clean' },
                    { key: 'susanoo_att_2_clean' }
                ],
                frameRate: 10,
                repeat: 0
            });
        }
        if (!this.anims.exists('susanoo_def_anim')) {
            this.anims.create({
                key: 'susanoo_def_anim',
                frames: [
                    { key: 'susanoo_def_1_clean' },
                    { key: 'susanoo_def_2_clean' }
                ],
                frameRate: 8,
                repeat: 0
            });
        }

        // Process player walk textures - Remove white background
        for (let i = 1; i <= 4; i++) {
            const key = 'player_walk_' + i;
            if (!this.textures.exists(key + '_clean')) {
                const texture = this.textures.get(key).getSourceImage();
                const canvas = this.textures.createCanvas(key + '_clean', texture.width, texture.height);
                const ctx = canvas.getContext();
                ctx.drawImage(texture, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Remove white/light backgrounds
                for (let j = 0; j < imageData.data.length; j += 4) {
                    const r = imageData.data[j];
                    const g = imageData.data[j + 1];
                    const b = imageData.data[j + 2];

                    // If pixel is very light (close to white), make it transparent
                    if (r > 230 && g > 230 && b > 230) {
                        imageData.data[j + 3] = 0;
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                canvas.refresh();
            }
        }

        // Create player walk animation
        if (!this.anims.exists('player_walk')) {
            this.anims.create({
                key: 'player_walk',
                frames: [
                    { key: 'player_walk_1_clean' },
                    { key: 'player_walk_2_clean' },
                    { key: 'player_walk_3_clean' },
                    { key: 'player_walk_4_clean' }
                ],
                frameRate: 8,
                repeat: -1
            });
        }

        // Process slime textures - Remove white background
        const slimeKeys = [];
        for (let i = 1; i <= 4; i++) slimeKeys.push(`slime_move_${i}`);
        for (let i = 1; i <= 3; i++) slimeKeys.push(`slime_die_${i}`);

        slimeKeys.forEach(key => {
            if (!this.textures.exists(key + '_clean')) {
                const texture = this.textures.get(key).getSourceImage();
                const canvas = this.textures.createCanvas(key + '_clean', texture.width, texture.height);
                const ctx = canvas.getContext();
                ctx.drawImage(texture, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    if (r > 240 && g > 240 && b > 240) {
                        imageData.data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                canvas.refresh();
            }
        });

        // Create slime animations
        if (!this.anims.exists('slime_move')) {
            this.anims.create({
                key: 'slime_move',
                frames: [
                    { key: 'slime_move_1_clean' },
                    { key: 'slime_move_2_clean' },
                    { key: 'slime_move_3_clean' },
                    { key: 'slime_move_4_clean' }
                ],
                frameRate: 6,
                repeat: -1
            });
        }
        if (!this.anims.exists('slime_die')) {
            this.anims.create({
                key: 'slime_die',
                frames: [
                    { key: 'slime_die_1_clean' },
                    { key: 'slime_die_2_clean' },
                    { key: 'slime_die_3_clean' }
                ],
                frameRate: 10,
                repeat: 0
            });
        }

        // Process skeleton textures - Remove white background
        const skeletonKeys = [];
        for (let i = 1; i <= 4; i++) skeletonKeys.push(`skeleton_move_${i}`);
        for (let i = 1; i <= 2; i++) skeletonKeys.push(`skeleton_die_${i}`);

        skeletonKeys.forEach(key => {
            if (!this.textures.exists(key + '_clean')) {
                const texture = this.textures.get(key).getSourceImage();
                const canvas = this.textures.createCanvas(key + '_clean', texture.width, texture.height);
                const ctx = canvas.getContext();
                ctx.drawImage(texture, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    // 更激進地移除背景與腳下淺色影子 (門檻降至 160)
                    if (r > 160 && g > 160 && b > 160) {
                        imageData.data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                canvas.refresh();
            }
        });

        // Create skeleton animations
        if (!this.anims.exists('skeleton_move')) {
            this.anims.create({
                key: 'skeleton_move',
                frames: [
                    { key: 'skeleton_move_1_clean' },
                    { key: 'skeleton_move_2_clean' },
                    { key: 'skeleton_move_3_clean' },
                    { key: 'skeleton_move_4_clean' }
                ],
                frameRate: 4, // 減慢動畫速度
                repeat: -1
            });
        }
        if (!this.anims.exists('skeleton_die')) {
            this.anims.create({
                key: 'skeleton_die',
                frames: [
                    { key: 'skeleton_die_1_clean' },
                    { key: 'skeleton_die_2_clean' }
                ],
                frameRate: 4, // 減慢動畫速度
                repeat: 0
            });
        }

        // Process knight textures - Remove white background
        const knightKeys = [];
        for (let i = 1; i <= 2; i++) {
            knightKeys.push(`knight_move_${i}`);
            knightKeys.push(`knight_die_${i}`);
        }

        knightKeys.forEach(key => {
            if (!this.textures.exists(key + '_clean')) {
                const texture = this.textures.get(key).getSourceImage();
                const canvas = this.textures.createCanvas(key + '_clean', texture.width, texture.height);
                const ctx = canvas.getContext();
                ctx.drawImage(texture, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    // 平衡去背法：只針對接近白色的「灰色/白色」像素進行移除
                    // 同時檢查 R,G,B 是否非常接近（灰階特徵），以保護像淺藍色刀刃這種有色彩的區域
                    const isGrayscale = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
                    if (r > 180 && g > 180 && b > 180 && isGrayscale) {
                        imageData.data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                canvas.refresh();
            }
        });

        // Create knight animations
        if (!this.anims.exists('knight_move')) {
            this.anims.create({
                key: 'knight_move',
                frames: [
                    { key: 'knight_move_1_clean' },
                    { key: 'knight_move_2_clean' }
                ],
                frameRate: 4,
                repeat: -1
            });
        }
        if (!this.anims.exists('knight_die')) {
            this.anims.create({
                key: 'knight_die',
                frames: [
                    { key: 'knight_die_1_clean' },
                    { key: 'knight_die_2_clean' }
                ],
                frameRate: 4,
                repeat: 0
            });
        }

        // Process rock textures - Remove white background
        const rockKeys = [];
        for (let i = 1; i <= 3; i++) rockKeys.push(`rock_move_${i}`);
        for (let i = 1; i <= 2; i++) rockKeys.push(`rock_die_${i}`);

        rockKeys.forEach(key => {
            if (!this.textures.exists(key + '_clean')) {
                const texture = this.textures.get(key).getSourceImage();
                const canvas = this.textures.createCanvas(key + '_clean', texture.width, texture.height);
                const ctx = canvas.getContext();
                ctx.drawImage(texture, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    // 針對魔像使用更強力的灰階去背 (門檻 150)
                    const isGrayscale = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
                    if (r > 150 && g > 150 && b > 150 && isGrayscale) {
                        imageData.data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                canvas.refresh();
            }
        });

        // Create rock animations
        if (!this.anims.exists('rock_move')) {
            this.anims.create({
                key: 'rock_move',
                frames: [
                    { key: 'rock_move_1_clean' },
                    { key: 'rock_move_2_clean' },
                    { key: 'rock_move_3_clean' }
                ],
                frameRate: 4,
                repeat: -1
            });
        }
        if (!this.anims.exists('rock_die')) {
            this.anims.create({
                key: 'rock_die',
                frames: [
                    { key: 'rock_die_1_clean' },
                    { key: 'rock_die_2_clean' }
                ],
                frameRate: 4,
                repeat: 0
            });
        }

        // Process boss slime textures - Remove white background
        const bossSlimeKeys = [];
        for (let i = 1; i <= 6; i++) bossSlimeKeys.push(`boss_slime_move_${i}`);
        for (let i = 1; i <= 3; i++) bossSlimeKeys.push(`boss_slime_die_${i}`);

        bossSlimeKeys.forEach(key => {
            if (!this.textures.exists(key + '_clean')) {
                const texture = this.textures.get(key).getSourceImage();
                const canvas = this.textures.createCanvas(key + '_clean', texture.width, texture.height);
                const ctx = canvas.getContext();
                ctx.drawImage(texture, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    if (r > 230 && g > 230 && b > 230) {
                        imageData.data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                canvas.refresh();
            }
        });

        // Create boss slime animations
        if (!this.anims.exists('boss_slime_move')) {
            this.anims.create({
                key: 'boss_slime_move',
                frames: [
                    { key: 'boss_slime_move_1_clean' },
                    { key: 'boss_slime_move_2_clean' },
                    { key: 'boss_slime_move_3_clean' },
                    { key: 'boss_slime_move_4_clean' },
                    { key: 'boss_slime_move_5_clean' },
                    { key: 'boss_slime_move_6_clean' }
                ],
                frameRate: 6,
                repeat: -1
            });
        }
        if (!this.anims.exists('boss_slime_die')) {
            this.anims.create({
                key: 'boss_slime_die',
                frames: [
                    { key: 'boss_slime_die_1_clean' },
                    { key: 'boss_slime_die_2_clean' },
                    { key: 'boss_slime_die_3_clean' }
                ],
                frameRate: 6,
                repeat: 0
            });
        }

        // No world bounds - infinite map
        this.physics.world.setBounds();
        // 提升物理運算精度，防止主角在高速移動或側邊碰撞時穿牆
        this.physics.world.setFPS(120);
        this.physics.world.TILE_BIAS = 32; // 增加碰撞偵測容差

        // Add BG1 background as tileSprite (seamless repeating)
        // Make it large enough to cover the viewport
        const bgWidth = window.innerWidth;
        const bgHeight = window.innerHeight;
        // 將原點設在左上角 (0,0)，方便計算與世界座標的對齊
        this.background = this.add.tileSprite(0, 0, bgWidth, bgHeight, 'bg').setOrigin(0);
        this.background.setAlpha(1.0);
        this.background.setScrollFactor(0); // Fixed to camera

        // --- 椅子物理碰撞體機制 ---
        // 假設背景圖尺寸為 1024x1024 (常見生成尺寸)
        this.bgTileSize = 1024;
        this.obstacles = this.physics.add.staticGroup();

        // 建立 9 個碰撞體，覆蓋玩家當前所在的 3x3 區塊範圍
        this.obstacleBodies = [];
        for (let i = 0; i < 9; i++) {
            // 王座 Hitbox (隱藏，由系統 debug 功能顯示)
            const obs = this.add.rectangle(0, 0, 100, 130, 0xff00ff, 0);
            this.physics.add.existing(obs, true);
            this.obstacles.add(obs);
            this.obstacleBodies.push(obs);
        }

        // 儲存上一次更新時的區塊索引，避免每幀運算
        this.lastTileX = NaN;
        this.lastTileY = NaN;
        // ------------------------

        this.player = new Player(this, 0, 0);

        // Process player texture (Only once or reuse)
        if (!this.textures.exists('player_clean')) {
            const texture = this.textures.get('player_raw').getSourceImage();
            const canvas = this.textures.createCanvas('player_clean', texture.width, texture.height);
            const ctx = canvas.getContext();
            ctx.drawImage(texture, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i] > 240 && imageData.data[i + 1] > 240 && imageData.data[i + 2] > 240) {
                    imageData.data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            canvas.refresh();
        }

        // Set player to use walk animation texture
        this.player.setTexture('player_walk_1_clean');
        this.player.setScale(0.3); // 主角比例改為 0.3

        // 強化主角 Hitbox 穩定性
        // 使用更具體的像素尺寸 (50x50) 並確保精確置中，這能有效防止鑽入王座邊緣
        this.player.body.setSize(50, 50);
        this.player.body.setOffset((this.player.width - 50) / 2, (this.player.height - 50) / 2);

        this.player.shield = 0;

        // Process Susanoo textures - Remove white background
        ['susanoo_move', 'susanoo_att', 'susanoo_def'].forEach(key => {
            if (!this.textures.exists(key + '_clean')) {
                const texture = this.textures.get(key).getSourceImage();
                const canvas = this.textures.createCanvas(key + '_clean', texture.width, texture.height);
                const ctx = canvas.getContext();
                ctx.drawImage(texture, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Remove white/light backgrounds
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];

                    // If pixel is very light (close to white), make it transparent
                    if (r > 230 && g > 230 && b > 230) {
                        imageData.data[i + 3] = 0;
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                canvas.refresh();
            }
        });

        // Process Robot2 texture for Overload mode
        if (!this.textures.exists('player_robot2')) {
            const robot2Texture = this.textures.get('player_robot2_raw').getSourceImage();
            const robot2Canvas = this.textures.createCanvas('player_robot2', robot2Texture.width, robot2Texture.height);
            const robot2Ctx = robot2Canvas.getContext();
            robot2Ctx.drawImage(robot2Texture, 0, 0);
            const robot2Data = robot2Ctx.getImageData(0, 0, robot2Canvas.width, robot2Canvas.height);
            for (let i = 0; i < robot2Data.data.length; i += 4) {
                if (robot2Data.data[i] > 240 && robot2Data.data[i + 1] > 240 && robot2Data.data[i + 2] > 240) {
                    robot2Data.data[i + 3] = 0;
                }
            }
            robot2Ctx.putImageData(robot2Data, 0, 0);
            robot2Canvas.refresh();
        }

        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true, maxSize: 1000 });
        this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true, maxSize: 1000 });
        this.xpGems = this.physics.add.group({ classType: ExpGem, runChildUpdate: true, maxSize: 2000 });
        this.boxes = this.physics.add.group({ classType: Box, runChildUpdate: true });

        this.weaponSystem = new WeaponSystem(this);
        this.weaponSystem.addWeapon('Susanoo', Weapons['Susanoo']);

        // --- DEBUG PANEL STATE ---
        this.isGamePaused = false;

        // Create fire texture
        if (!this.textures.exists('fire')) {
            const fireGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            fireGraphics.fillStyle(0xff4400, 1);
            fireGraphics.fillCircle(8, 8, 8);
            fireGraphics.generateTexture('fire', 16, 16);
        }

        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.bullets, this.boxes, this.hitBox, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);

        // 讓椅子擋住玩家與怪物
        this.physics.add.collider(this.player, this.obstacles);
        this.physics.add.collider(this.enemies, this.obstacles);

        // Debug Toggle Listener
        this.events.on('toggleDebug', (isVisible) => {
            this.physics.world.drawDebug = isVisible;
            if (isVisible) {
                if (!this.physics.world.debugGraphic) {
                    this.physics.world.createDebugGraphic();
                }
                this.physics.world.debugGraphic.setVisible(true);
            } else if (this.physics.world.debugGraphic) {
                this.physics.world.debugGraphic.setVisible(false);
            }
        });

        // 監聽暫停/恢復事件，確保特效、動畫與 Tweens 同步暫停
        this.events.on('pause', () => {
            this.isGamePaused = true;
            this.physics.world.pause(); // 暫停物理模擬（保留速度數據）
            this.time.paused = true;     // 暫停時鐘（TimerEvents）
            this.tweens.pauseAll();      // 暫停所有補間動畫（包含粒子運動）
            this.anims.pauseAll();       // 暫停所有 Sprite 動畫（解決原地踏步）

            // 暫停所有粒子發射器 (如 SnowfallArea)
            this.children.each(child => {
                if (child.type === 'ParticleEmitterManager' || child.type === 'ParticleEmitter') {
                    child.pause();
                }
            });
        });
        this.events.on('resume', () => {
            this.isGamePaused = false;
            this.physics.world.resume(); // 恢復物理模擬
            this.time.paused = false;     // 恢復時鐘
            this.tweens.resumeAll();      // 恢復補間動畫
            this.anims.resumeAll();      // 恢復 Sprite 動畫

            // 恢復粒子發射器
            this.children.each(child => {
                if (child.type === 'ParticleEmitterManager' || child.type === 'ParticleEmitter') {
                    child.resume();
                }
            });
        });

        this.events.off('setSpeed');
        this.events.on('setSpeed', (multiplier) => {
            this.time.timeScale = multiplier;
            this.physics.world.timeScale = 1 / multiplier;
        });

        this.spawnTimer = this.time.addEvent({ delay: this.spawnDelay, callback: this.spawnEnemy, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 30000, callback: this.spawnBox, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 1000, callback: this.updateGameTimer, callbackScope: this, loop: true });

        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.overloadEnergy >= this.maxOverloadEnergy && !this.overloadActive) {
                this.activateOverload();
            }
        });

        // Launch UI Scene
        this.scene.launch('UIScene');

        this.updateUI();
    }

    update(time, delta) {
        if (this.isGamePaused) return; // 暫停時停止所有邏輯

        if (this.player) {
            this.player.update();

            // Update background tilePosition for seamless scrolling
            if (this.background) {
                // 簡化公式：將背景貼圖與相機直接同步，確保 1:1 像素對應
                this.background.tilePositionX = this.cameras.main.scrollX;
                this.background.tilePositionY = this.cameras.main.scrollY;
            }

            // Update weapon system using internal timer to prevent rapid fire after pause
            if (this.weaponSystem) {
                this.internalGameTime += delta;
                this.weaponSystem.update(this.internalGameTime, this.player);
            }

            if (this.overloadActive) {
                this.overloadTimeLeft -= (delta * this.time.timeScale);
                if (this.overloadTimeLeft <= 0) {
                    this.deactivateOverload();
                } else {
                    this.updateUI();
                }
            }

            // 更新椅子物理碰撞體位置
            this.updateObstacles();
        }
    }

    updateObstacles() {
        // 計算玩家所在的區塊座標
        const tileX = Math.floor((this.player.x + (this.bgTileSize / 2)) / this.bgTileSize);
        const tileY = Math.floor((this.player.y + (this.bgTileSize / 2)) / this.bgTileSize);

        // 如果區塊沒變，就不重新移動碰撞體
        if (tileX === this.lastTileX && tileY === this.lastTileY) return;

        this.lastTileX = tileX;
        this.lastTileY = tileY;

        let index = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const obs = this.obstacleBodies[index];
                // 地圖 1024x1024，王座在中心 (512, 512)
                // 根據用戶回饋微調：往右 10, 往上 35 (再往上 5px)
                const worldX = (tileX + dx) * this.bgTileSize + 512 + 10;
                const worldY = (tileY + dy) * this.bgTileSize + 512 - 45;

                obs.setPosition(worldX, worldY);
                obs.body.updateFromGameObject(); // 靜態物件移動後需手動更新物理位置
                index++;
            }
        }
    }

    updateUI() {
        if (!this.weaponSystem) return;
        this.events.emit('updateScore', {
            level: this.level,
            xp: this.currentXP,
            neededXP: this.neededXP,
            hp: this.player.health,
            maxHP: this.player.maxHealth,
            shield: this.player.shield,
            overloadEnergy: this.overloadEnergy,
            maxOverloadEnergy: this.maxOverloadEnergy,
            overloadActive: this.overloadActive,
            stats: this.player.stats,
            dps: this.weaponSystem.getDPS(),
            requiredDPS: this.weaponSystem.getRequiredDPS(),
            kills: this.enemiesKilled
        });
    }

    spawnEnemy() {
        if (!this.player || this.enemies.countActive() > this.maxEnemies || this.isVictoryPending) return;

        const distance = Phaser.Math.Between(700, 1000);
        const angle = Phaser.Math.Between(0, 360);
        const x = this.player.x + distance * Math.cos(Phaser.Math.DegToRad(angle));
        const y = this.player.y + distance * Math.sin(Phaser.Math.DegToRad(angle));

        const enemy = this.enemies.get();
        if (enemy) {
            let type = 'slime';
            const roll = Math.random();
            if (roll < 0.5) type = 'slime';
            else if (roll < 0.75) type = 'fast';
            else if (roll < 0.90) type = 'tank';
            else type = 'dragon';

            const config = { ...Enemies[type] };

            // Dynamic Scaling: HP increases by 10% every minute
            const timeScaling = 1 + (Math.floor(this.gameTimer / 60) * 0.1);
            config.hp *= timeScaling;
            config.xp *= timeScaling; // More tanky enemies give slightly more XP

            // Apply Difficulty Modifiers
            if (this.difficulty === 'hard') {
                config.hp *= 1.8;
                config.damage *= 1.5;
                config.xp *= 1.1;
            } else if (this.difficulty === 'hell') {
                config.hp *= 4.0;
                config.damage *= 2.5;
                config.xp *= 1.2;
            }

            enemy.spawn(x, y, config);
            enemy.setTarget(this.player);
        }
    }

    spawnBox() {
        if (!this.player || this.boxes.countActive() > 2) return;
        const x = this.player.x + Phaser.Math.Between(-600, 600);
        const y = this.player.y + Phaser.Math.Between(-600, 600);
        const box = this.boxes.get();
        if (box) box.spawn(x, y);
    }

    spawnBoss() {
        const distance = 800;
        const angle = Phaser.Math.Between(0, 360);
        const x = this.player.x + distance * Math.cos(Phaser.Math.DegToRad(angle));
        const y = this.player.y + distance * Math.sin(Phaser.Math.DegToRad(angle));

        const minutes = Math.floor(this.gameTimer / 60);
        let key = 'boss_slime';
        if (minutes >= 10) key = 'boss_demon';
        else if (minutes >= 8) key = 'boss_dragon';
        else if (minutes >= 6) key = 'boss_golem';
        else if (minutes >= 4) key = 'boss_bat';
        else if (minutes >= 2) key = 'boss_slime';

        const boss = this.enemies.get();
        if (boss) {
            const config = { ...Enemies[key] };

            // Apply Difficulty Modifiers
            if (this.difficulty === 'hard') {
                config.hp *= 1.5;
                config.damage *= 1.3;
            } else if (this.difficulty === 'hell') {
                config.hp *= 3.0;
                config.damage *= 2.0;
            }

            boss.spawn(x, y, config);
            boss.setTarget(this.player);
            boss.isMegaBoss = config.isMegaBoss || false;

            const txt = this.add.text(this.player.x, this.player.y - 150, `${Enemies[key].name} APPEARED!`, { fontSize: '40px', fill: '#ff00ff' }).setOrigin(0.5);
            this.tweens.add({ targets: txt, alpha: 0, duration: 4000, onComplete: () => txt.destroy() });
        }
    }

    hitEnemy(bullet, enemy) {
        if (bullet.active && enemy.active) {
            enemy.takeDamage(bullet.damage);

            if (bullet.burnStacks > 0) {
                enemy.addBurnStack(bullet.burnStacks);
            }

            bullet.hit();
        }
    }

    hitBox(bullet, box) {
        if (bullet.active && box.active) {
            box.takeDamage();
            bullet.hit();
        }
    }

    spawnItem(x, y) {
        const type = Phaser.Math.Between(1, 3);
        const colors = [0x00ff00, 0x00ffff, 0xffff00];
        const labels = ['HEAL', 'VACUUM', 'BUFF'];

        const circle = this.add.circle(x, y, 15, colors[type - 1]);
        this.physics.add.existing(circle);

        const txt = this.add.text(x, y - 30, labels[type - 1], { fontSize: '14px', fill: '#fff' }).setOrigin(0.5);

        const overlap = this.physics.add.overlap(this.player, circle, () => {
            overlap.destroy();
            circle.destroy();
            txt.destroy();
            this.applyPowerup(type);
        });
    }

    applyPowerup(type) {
        if (type === 1) {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
        } else if (type === 2) {
            this.xpGems.getChildren().forEach(gem => {
                if (gem.active) {
                    this.tweens.add({
                        targets: gem,
                        x: this.player.x,
                        y: this.player.y,
                        duration: 500,
                        onComplete: () => this.collectGem(this.player, gem)
                    });
                }
            });
        } else if (type === 3) {
            this.player.stats.damage *= 1.2;
            this.time.delayedCall(10000, () => {
                this.player.stats.damage /= 1.2;
            });
        }
        this.updateUI();
    }

    enemyDied(x, y, xpValue, isBoss, isMegaBoss) {
        this.enemiesKilled++;

        if (isBoss) {
            this.spawnMegaHeal(x, y);
        }

        if (isMegaBoss) {
            this.time.delayedCall(2000, () => this.gameOver(true));
        }
        const gem = this.xpGems.get();
        if (gem) {
            gem.spawn(x, y, xpValue);
        }

        if (!this.overloadActive) {
            this.overloadEnergy = Math.min(this.maxOverloadEnergy, this.overloadEnergy + 5);
            this.updateUI();
        }
    }

    hitPlayer(player, enemy) {
        if (enemy.active) {
            let remainingDamage = enemy.damage;
            if (player.shield > 0) {
                const absorbed = Math.min(player.shield, remainingDamage);
                player.shield -= absorbed;
                remainingDamage -= absorbed;
            }

            if (remainingDamage > 0) {
                player.health -= remainingDamage;
            }

            player.lastDamageTime = this.time.now;
            this.cameras.main.shake(100, 0.01);

            const damageText = this.add.text(player.x, player.y - 40, `-${enemy.damage}`, {
                fontSize: '20px',
                fill: remainingDamage > 0 ? '#ff0000' : '#ffffff'
            }).setOrigin(0.5);
            this.tweens.add({
                targets: damageText,
                y: player.y - 80,
                alpha: 0,
                duration: 1000,
                onComplete: () => damageText.destroy()
            });

            this.updateUI();

            if (player.health <= 0) {
                this.gameOver(false);
            }
        }

        const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
        enemy.x += Math.cos(angle) * 20;
        enemy.y += Math.sin(angle) * 20;
    }

    collectGem(player, gem) {
        if (gem.active) {
            gem.setActive(false);
            gem.setVisible(false);
            this.gainXP(gem.value);
        }
    }

    updateGameTimer() {
        this.gameTimer++;

        if (this.gameTimer % 30 === 0 && this.spawnDelay > 100) {
            this.spawnDelay = Math.max(100, this.spawnDelay - 40);
            this.spawnTimer.reset({ delay: this.spawnDelay, callback: this.spawnEnemy, callbackScope: this, loop: true });
            this.maxEnemies += 50;
        }

        if (this.gameTimer > 0 && this.gameTimer % 120 === 0) {
            this.spawnBoss();
        }

        const mins = Math.floor(this.gameTimer / 60);
        const secs = this.gameTimer % 60;
        this.events.emit('updateTime', `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);

        if (this.gameTimer >= 600 && !this.isVictoryPending) {
            this.isVictoryPending = true;
            this.spawnFinalBoss();
        }
    }

    spawnFinalBoss() {
        this.isFinalBossSpawned = true;

        // Kill all normal enemies for the final showdown
        this.enemies.getChildren().forEach(e => {
            if (e.active && !e.isBoss) e.die();
        });

        const x = this.player.x + 500;
        const y = this.player.y;

        const config = { ...Enemies['dragon'] };
        config.hp *= 15; // Final boss multiplier
        config.damage *= 2;
        config.scale = 2.5; // Adjusted scale to be similar to other bosses but not overly huge
        config.name = "ULTIMATE OVERLORD";
        config.isBoss = true;
        config.isMegaBoss = true;

        const boss = this.enemies.get();
        if (boss) {
            boss.spawn(x, y, config);
            boss.setTarget(this.player);

            const txt = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'FINAL BOSS APPROACHING', {
                fontSize: '64px',
                fill: '#ff0000',
                fontFamily: 'Arial Black'
            }).setOrigin(0.5).setScrollFactor(0);

            this.tweens.add({
                targets: txt,
                alpha: 0,
                duration: 5000,
                onComplete: () => txt.destroy()
            });
        }
    }

    spawnMegaHeal(x, y) {
        const circle = this.add.circle(x, y, 20, 0x00ff00);
        this.physics.add.existing(circle);
        circle.setStrokeStyle(4, 0xffffff, 0.8);

        const txt = this.add.text(x, y - 40, 'FULL HEAL', {
            fontSize: '18px',
            fill: '#00ff00',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const overlap = this.physics.add.overlap(this.player, circle, () => {
            overlap.destroy();
            circle.destroy();
            txt.destroy();
            this.player.health = this.player.maxHealth;
            this.updateUI();

            const healEffect = this.add.text(this.player.x, this.player.y, 'MAX HP!', {
                fontSize: '32px',
                fill: '#00ff00',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.tweens.add({
                targets: healEffect,
                y: this.player.y - 100,
                alpha: 0,
                duration: 1500,
                onComplete: () => healEffect.destroy()
            });
        });
    }

    gameOver(isVictory) {
        this.events.emit('pause');
        this.scene.pause();
        const ui = this.scene.get('UIScene');
        ui.showSummary({
            isVictory: isVictory,
            level: this.level,
            enemiesKilled: this.enemiesKilled,
            time: this.gameTimer,
            difficulty: this.difficulty
        }, () => {
            this.scene.resume();
            this.events.off('updateScore');
            this.events.off('updateTime');
            this.events.off('bossSpawned');
            this.events.off('updateBossHP');
            this.events.off('bossDied');
            this.events.off('setSpeed');
            this.scene.stop('UIScene');
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
        });
    }

    gainXP(amount) {
        this.currentXP += amount;

        while (this.currentXP >= this.neededXP) {
            this.currentXP -= this.neededXP;
            this.neededXP = Math.floor(this.neededXP * 1.3);
            this.levelUpPending++;
        }

        if (this.levelUpPending > 0 && !this.isLevelingUp) {
            this.triggerLevelUp();
        }
        this.updateUI();
    }

    activateOverload() {
        this.overloadActive = true;
        this.overloadTimeLeft = this.overloadDuration;

        this.player.setTexture('player_robot2');
        this.player.setScale(0.75);
        this.player.body.setSize(120, 120);
        this.player.shield = 50;

        const currentDPS = this.weaponSystem.getDPS();
        this.savedWeapons = { ...this.weaponSystem.weapons };
        this.weaponSystem.weapons = {};

        this.weaponSystem.addWeapon('Overload_Flame', Weapons['Overload_Flame']);
        this.weaponSystem.addWeapon('Overload_MG1', Weapons['Overload_MachineGun']);
        this.weaponSystem.addWeapon('Overload_MG2', Weapons['Overload_MachineGun']);
        this.weaponSystem.addWeapon('Overload_Aura', Weapons['Overload_Aura']);

        const overloadBaseDPS = this.weaponSystem.getDPS();
        const scalar = overloadBaseDPS > 0 ? (currentDPS * 2) / overloadBaseDPS : 2;
        Object.values(this.weaponSystem.weapons).forEach(w => {
            w.baseStats.damage *= scalar;
        });

        this.cameras.main.flash(500, 255, 255, 255);

        // 隱藏須佐能乎
        if (this.player.susanoo && this.player.susanoo.container) {
            this.player.susanoo.container.setVisible(false);
        }

        this.updateUI();
    }

    deactivateOverload() {
        this.overloadActive = false;
        this.overloadEnergy = 0;
        this.player.setTexture('player_walk_1_clean'); // 恢復行走貼圖
        this.player.setScale(0.3);
        this.player.body.setSize(64, 64);
        this.weaponSystem.weapons = this.savedWeapons;

        // 恢復須佐能乎
        if (this.player.susanoo && this.player.susanoo.container) {
            this.player.susanoo.container.setVisible(true);
        }

        this.updateUI();
    }

    triggerLevelUp() {
        if (this.levelUpPending <= 0) {
            this.isLevelingUp = false;
            return;
        }

        this.isLevelingUp = true;
        const weaponKeys = Object.keys(Weapons).filter(k => !k.startsWith('Overload_'));

        // Filter out weapons that are already max level (LV5)
        const availableKeys = weaponKeys.filter(k => {
            const current = this.weaponSystem.weapons[k] || (this.savedWeapons ? this.savedWeapons[k] : null);
            return !current || current.level < 5;
        });

        // Fallback: If everything is maxed, give player HP or buff (simplified here)
        if (availableKeys.length === 0) {
            this.player.health = Math.min(this.player.maxHealth, this.player.health + 50);
            this.levelUpPending--;
            this.isLevelingUp = false;
            this.scene.resume('GameScene');
            return;
        }

        const options = [];
        const selected = Phaser.Utils.Array.Shuffle(availableKeys).slice(0, 3);
        selected.forEach(key => {
            const current = this.weaponSystem.weapons[key] || (this.savedWeapons ? this.savedWeapons[key] : null);
            const nextLevel = current ? current.level + 1 : 1;
            options.push({
                key: key,
                config: Weapons[key],
                level: nextLevel,
                isNew: !current
            });
        });

        const ui = this.scene.get('UIScene');
        this.events.emit('pause'); // 觸發全域暫停（包含 Tweens 與動畫）
        ui.showLevelUp(options, (choice) => {
            this.level++;
            this.levelUpPending--;
            if (choice) {
                // If in overload, prioritize updating savedWeapons
                if (this.overloadActive && this.savedWeapons) {
                    // Temporarily add to a dummy system to leverage its upgrade logic
                    const tempSystem = { weapons: this.savedWeapons, config: Weapons[choice.key] };
                    this.weaponSystem.addWeapon.call(tempSystem, choice.key, Weapons[choice.key]);
                } else {
                    this.weaponSystem.addWeapon(choice.key, Weapons[choice.key]);
                }
            }
            this.events.emit('resume'); // 恢復全域運作
            this.scene.resume('GameScene');
            if (this.levelUpPending > 0) {
                this.time.delayedCall(100, () => this.triggerLevelUp());
            } else {
                this.isLevelingUp = false;
            }
        });
    }
}
