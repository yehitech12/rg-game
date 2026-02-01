export const Enemies = {
    'slime': {
        name: 'Slime',
        hp: 20,
        speed: 50,
        damage: 10,
        xp: 10,
        sprite: 'slime',
        scale: 0.3
    },
    'fast': {
        name: '骷髏士兵',
        hp: 15,
        speed: 130,
        damage: 12,
        xp: 25,
        sprite: 'skeleton',
        scale: 0.45
    },
    'tank': {
        name: '岩石魔像',
        hp: 200,
        speed: 35,
        damage: 35,
        xp: 80,
        sprite: 'rock',
        scale: 0.7
    },
    'dragon': {
        name: '惡靈騎士團',
        hp: 120,
        speed: 90,
        damage: 30,
        xp: 150,
        sprite: 'knight',
        scale: 0.55
    },
    // BOSSES - Massively upscaled
    'boss_slime': {
        name: 'GIANT SLIME OVERLORD',
        hp: 6000,
        speed: 50,
        damage: 40,
        xp: 2000,
        sprite: 'boss_slime',
        scale: 4.0,
        isBoss: true,
        attackType: 'aoe',
        attackRange: 200,
        attackCooldown: 3000
    },
    'boss_bat': {
        name: 'SUPREME VAMPIRE BAT',
        hp: 12000,
        speed: 120,
        damage: 50,
        xp: 5000,
        sprite: 'boss_bat',
        scale: 8.0,
        isBoss: true,
        attackType: 'dash',
        attackCooldown: 4000
    },
    'boss_golem': {
        name: 'ANCIENT IRON COLOSSUS',
        hp: 50000,
        speed: 40,
        damage: 80,
        xp: 10000,
        sprite: 'boss_golem',
        scale: 12.0,
        isBoss: true,
        attackType: 'stomp',
        attackRange: 300,
        attackCooldown: 5000
    },
    'boss_dragon': {
        name: 'ELDEN FIRE DRAGON',
        hp: 100000,
        speed: 100,
        damage: 150,
        xp: 20000,
        sprite: 'dragon',
        scale: 15.0,
        color: 0xff0000,
        isBoss: true,
        attackType: 'fire',
        attackCooldown: 3000
    },
    'boss_demon': {
        name: 'DEMON LORD OF DOOM',
        hp: 500000,
        speed: 70,
        damage: 999,
        xp: 100000,
        sprite: 'boss_demon',
        scale: 15.0,
        isBoss: true,
        attackType: 'doom',
        attackCooldown: 6000
    }
};
