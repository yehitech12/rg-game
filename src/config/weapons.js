export const Weapons = {
    'Handgun': {
        name: '手槍 (Handgun)',
        showName: '手槍',
        type: 'projectile',
        description: '初始均衡武器，中規中矩的遠程火力',
        baseStats: {
            damage: 20,
            range: 800,
            attackSpeed: 600,
            pierce: 1,
            count: 1,
            spread: 0,
            inaccuracy: 0
        },
        upgrades: [
            { damage: 15 }, // LV2 (Total 35)
            { attackSpeed: -100 }, // LV3 (Total 500ms)
            { damage: 10, pierce: 2 }, // LV4 (Total 45)
            { count: 1, damage: 5 } // LV5 (Total 2 shots, Total 50 dmg)
        ]
    },
    'MachineGun': {
        name: '機關槍 (Machine Gun)',
        showName: '機關槍',
        type: 'projectile',
        description: '高射速武器，靠著彈幕壓制敵人',
        baseStats: {
            damage: 6,
            range: 400,
            attackSpeed: 100,
            pierce: 1,
            count: 1,
            spread: 10,
            inaccuracy: 15 // Machine gun is unstable
        },
        upgrades: [
            { damage: 4, inaccuracy: -2 }, // LV2 (Total 10)
            { damage: 2, inaccuracy: -3 }, // LV3 (Total 12)
            { attackSpeed: -10, inaccuracy: -2 }, // LV4 (Total 90ms)
            { attackSpeed: -10, inaccuracy: -3 } // LV5 (Total 80ms, 5 inaccuracy)
        ]
    },
    'SniperRifle': {
        name: '狙擊槍 (Sniper Rifle)',
        showName: '狙擊槍',
        type: 'projectile',
        description: '極高傷害與長距離穿透，攻擊間隔長',
        baseStats: {
            damage: 120,
            range: 1000,
            attackSpeed: 1800,
            pierce: 3,
            count: 1,
            spread: 0
        },
        upgrades: [
            { damage: 80 }, // LV2 (Total 200)
            { damage: 40, pierce: 2 }, // LV3 (Total 240)
            { attackSpeed: -300 }, // LV4 (Total 1500ms)
            { damage: 60, explodeRange: 150 } // LV5 (Total 300)
        ]
    },
    'Broadsword': {
        name: '大刀 (Broadsword)',
        showName: '大刀',
        type: 'melee',
        description: '近戰範圍武器，擊退感與傷害驚人',
        baseStats: {
            damage: 60,
            range: 150,
            attackSpeed: 900,
            pierce: 99,
            count: 1,
            spread: 120
        },
        upgrades: [
            { damage: 15, range: 50 }, // LV2 (Total 75)
            { damage: 45 }, // LV3 (Total 120)
            { attackSpeed: -150 }, // LV4 (Total 750ms)
            { damage: 30, spread: 240 } // LV5 (Total 150)
        ]
    },
    'MagicMissile': {
        name: '魔法飛彈 (Magic Missile)',
        showName: '魔法飛彈',
        type: 'multishot',
        description: '發射自動追蹤敵人的能量飛彈',
        baseStats: {
            damage: 12,
            range: 600,
            attackSpeed: 1400,
            pierce: 1,
            count: 5,
            spread: 30
        },
        upgrades: [
            { count: 2 }, // LV2 (Total 7)
            { damage: 10 }, // LV3 (Total 22)
            { count: 3 }, // LV4 (Total 10)
            { damage: 8, pierce: 2 } // LV5 (Total 30)
        ]
    },
    'ChainLightning': {
        name: '連鎖雷電 (Chain Lightning)',
        showName: '連鎖雷電',
        type: 'lightning',
        description: '自動鎖定敵人並在目標間彈跳，附帶暈眩效果',
        baseStats: {
            damage: 25,
            range: 400,
            attackSpeed: 1200,
            count: 3,
            stunDuration: 500,
            color: 0x00f2fe
        },
        upgrades: [
            { damage: 12 }, // LV2 (Total 37)
            { count: 1 }, // LV3 (Total 4)
            { attackSpeed: -200 }, // LV4 (Total 1000ms)
            { count: 1, stunDuration: 500 } // LV5 (Total 5)
        ]
    },
    'Shotgun': {
        name: '散彈槍 (Shotgun)',
        showName: '散彈槍',
        type: 'shotgun',
        description: '近距離爆發武器，一次射出大量彈藥',
        baseStats: {
            damage: 15,
            range: 1200,
            attackSpeed: 1200,
            pierce: 2,
            count: 5,
            spread: 45 // Total fan angle
        },
        upgrades: [
            { damage: 5 }, // LV2 (Total 20)
            { count: 2 }, // LV3 (Total 7)
            { attackSpeed: -300 }, // LV4 (Total 900ms)
            { count: 2, stunDuration: 300 } // LV5 (Total 9 shots)
        ]
    },
    'HeavyCannon': {
        name: '重型加農砲 (Heavy Cannon)',
        showName: '重型加農砲',
        type: 'beam_cannon',
        description: '需長時間填充的終極兵器，發射毀滅性持續光束',
        baseStats: {
            damage: 30, // per tick (0.2s)
            range: 700,
            attackSpeed: 6000,
            duration: 2000,
            width: 80,
            tickRate: 200
        },
        upgrades: [
            { width: 40 }, // LV2 (120px)
            { damage: 15 }, // LV3 (45)
            { attackSpeed: -1000 }, // LV4 (5000ms)
            { duration: 1000 } // LV5 (3000ms)
        ]
    },
    'Susanoo': {
        name: '須佐能乎 (Susanoo)',
        showName: '須佐能乎',
        type: 'susanoo',
        description: '召喚紫色查克拉巨人守護自身，自動攻擊與防禦。',
        baseStats: {
            damage: 50, // Sweep damage
            pushDamage: 20,
            range: 250, // Defensive range
            attackSpeed: 100, // Frequent checks (AI driven)
            shieldRestore: 20
        },
        upgrades: [
            { attackSpeed: -500 }, // LV2 (2000ms)
            { damage: 30, pushDamage: 20, range: 150 }, // LV3 - 攻擊範圍增加到400
            { shieldRestore: 20 }, // LV4
            { attackSpeed: -500 } // LV5 (1500ms)
        ]
    },
    'Aura': {
        name: '氣場 (Aura)',
        showName: '氣場',
        type: 'aura',
        description: '在自身周圍產生持續性傷害場',
        baseStats: {
            damage: 8,
            range: 160,
            attackSpeed: 500,
            pierce: 99
        },
        upgrades: [
            { damage: 6 }, // LV2 (Total 14)
            { damage: 4, range: 60 }, // LV3 (Total 18)
            { damage: 10 }, // LV4 (Total 28)
            { damage: 12, slowEffect: 0.5 } // LV5 (Total 40)
        ]
    },
    // Special Overload Weapons
    'Overload_Flame': {
        name: '超載火焰 (Overload Phoenix)',
        type: 'flamethrower',
        baseStats: { damage: 15, range: 450, attackSpeed: 50, color: 0xffaa00 }
    },
    'Overload_MachineGun': {
        name: '超載機砲 (Overload Vulcan)',
        type: 'projectile',
        baseStats: { damage: 25, range: 600, attackSpeed: 60, pierce: 3, spread: 5, color: 0xffff00 }
    },
    'Overload_Aura': {
        name: '強力氣場 (Powerful Aura)',
        type: 'aura',
        baseStats: { damage: 40, range: 300, attackSpeed: 200, color: 0xff00ff }
    }
};
