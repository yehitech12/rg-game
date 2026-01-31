export const Weapons = {
    'Handgun': {
        name: '手槍 (Handgun)',
        type: 'projectile',
        description: '初始武器, 射速與威力均衡',
        baseStats: {
            damage: 15,
            range: 800,
            speed: 400,
            attackSpeed: 800,
            pierce: 1,
            bulletCount: 1
        },
        upgrade: {
            damage: 5,
            attackSpeed: -50,
            pierce: 0.2
        }
    },
    'Broadsword': {
        name: '大刀 (Broadsword)',
        type: 'melee',
        description: '自動砍向最近敵人，升級增加範圍',
        baseStats: {
            damage: 50,
            range: 150,
            attackSpeed: 1000,
            duration: 250,
            color: 0xcccccc
        },
        upgrade: {
            damage: 15,
            range: 30, // Better range upgrade
            attackSpeed: -100
        }
    },
    'MachineGun': {
        name: '機關槍 (Machine Gun)',
        type: 'projectile',
        description: '快速發射子彈，穿透力 1',
        baseStats: {
            damage: 5,
            range: 400,
            attackSpeed: 100,
            speed: 600, // Bullet speed
            pierce: 1,
            color: 0xffff00,
            spread: 10 // Random spread angle
        },
        upgrade: {
            damage: 2,
            attackSpeed: -5
        }
    },
    'SniperRifle': {
        name: '狙擊槍 (Sniper Rifle)',
        type: 'projectile',
        description: '慢速發射高傷子彈，穿透力 3',
        baseStats: {
            damage: 100,
            range: 1000,
            attackSpeed: 2000,
            speed: 1200,
            pierce: 3,
            color: 0xff0000,
            spread: 0
        },
        upgrade: {
            damage: 20,
            pierce: 1
        }
    },
    'MagicMissile': {
        name: '魔法飛彈 (Magic Missile)',
        type: 'multishot',
        description: '一次發射 5 顆追蹤飛彈',
        baseStats: {
            damage: 10,
            range: 600,
            attackSpeed: 1500,
            speed: 300,
            pierce: 1,
            count: 5,
            color: 0x00ffff,
            homing: true
        },
        upgrade: {
            damage: 5,
            count: 1
        }
    },
    'Aura': {
        name: '氣場 (Aura)',
        type: 'aura',
        description: '持續傷害周圍敵人',
        baseStats: {
            damage: 5,
            range: 150,
            attackSpeed: 500, // Tick rate
            color: 0xaa00aa
        },
        upgrade: {
            damage: 2,
            range: 20
        }
    },
    // Special Overload Weapons (Internal)
    'Overload_Flame': {
        name: '超載噴火 (Overload Flame)',
        type: 'flamethrower',
        baseStats: {
            damage: 2, // Low direct damage
            burnStacks: 1, // Applies debuff
            range: 350,
            attackSpeed: 30, // Extremely fast spray
            speed: 600,
            isFire: true
        }
    },
    'Overload_MachineGun': {
        name: '超載機槍 (Overload MG)',
        type: 'projectile',
        baseStats: {
            damage: 15,
            range: 600,
            attackSpeed: 50, // Super fast
            speed: 800,
            pierce: 2,
            color: 0xffffff,
            spread: 5
        }
    },
    'Overload_Aura': {
        name: '強力氣場 (Powerful Aura)',
        type: 'aura',
        baseStats: {
            damage: 40,
            range: 300,
            attackSpeed: 300,
            color: 0x00ffff
        }
    }
};
