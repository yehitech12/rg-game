const fs = require('fs');
const path = require('path');

// 正確定位到專案根目錄的 WEAPON_DEV.md
const filePath = path.join(__dirname, '..', 'WEAPON_DEV.md');

function calculateDPS(stats) {
    const dmg = stats.damage || 0;
    const count = stats.count || 1;
    const bounce = stats.bounce || 0;
    const speed = stats.speed || 1000;

    // Formula: (Damage * Count * (1 + Bounce * 0.5)) / (Speed / 1000)
    const dps = (dmg * count * (1 + bounce * 0.5)) / (speed / 1000);
    return dps.toFixed(1);
}

function updateFile() {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let updatedContent = [];

        console.log('Detected changes in WEAPON_DEV.md, recalculating DPS...');

        let currentWeaponStats = {
            damage: 0,
            speed: 1000,
            count: 1,
            bounce: 0
        };

        // 第一次掃描：獲取基礎屬性
        // 第二次掃描：更新各行 DPS (為了簡化，我們在一次迴圈內透過狀態追蹤處理)

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // 解析基礎屬性
            if (line.includes('- **傷害**:')) {
                const match = line.match(/: (\d+)/);
                if (match) currentWeaponStats.damage = parseInt(match[1]);
            }
            if (line.includes('- **攻速**:')) {
                const match = line.match(/: (\d+)/);
                if (match) currentWeaponStats.speed = parseInt(match[1]);
            }
            if (line.includes('- **發射數量**:')) {
                const match = line.match(/: (\d+)/);
                if (match) currentWeaponStats.count = parseInt(match[1]);
            }
            if (line.includes('- **彈跳次數**:')) {
                const match = line.match(/: (\d+)/);
                if (match) currentWeaponStats.bounce = parseInt(match[1]);
            }

            // 更新 LV 行
            // 格式: - **LVx**: 描述 | **DPS: XXX.X**
            const lvMatch = line.match(/^- \*\*LV(\d+)\*\*: (.*?) \| \*\*DPS: (.*?)\*\*/);
            if (lvMatch) {
                const lv = parseInt(lvMatch[1]);
                const desc = lvMatch[2];

                // 這裡是關鍵：我們需要重新計算該等級目前的真實屬性
                // 為了可靠性，我們暫時只針對 LV1 更新，後續會擴展到自動累加增量
                let calcStats = { ...currentWeaponStats };

                // 簡單解析當前行的增量 (Damage +X, Speed -Xms)
                const dmgInc = desc.match(/傷害 \+(\d+)/);
                if (dmgInc) calcStats.damage += parseInt(dmgInc[1]);
                const speedDec = desc.match(/攻速 -(\d+)ms/);
                if (speedDec) calcStats.speed -= parseInt(speedDec[1]);
                const countInc = desc.match(/(?:發射數量|數量) \+(\d+)/);
                if (countInc) calcStats.count += parseInt(countInc[1]);
                const bounceInc = desc.match(/彈跳次數? \+(\d+)/);
                if (bounceInc) calcStats.bounce += parseInt(bounceInc[1]);

                const newDPS = calculateDPS(calcStats);
                line = `- **LV${lv}**: ${desc} | **DPS: ${newDPS}**`;
            }

            updatedContent.push(line);
        }

        const finalContent = updatedContent.join('\n');
        if (finalContent !== content) {
            fs.writeFileSync(filePath, finalContent);
            console.log('DPS recalculation complete.');
        }
    } catch (err) {
        console.error('Error during update:', err.message);
    }
}

// Watch the file
if (!fs.existsSync(filePath)) {
    console.error(`File NOT found: ${filePath}`);
    process.exit(1);
}

console.log(`Watching ${filePath}...`);
let debounceTimer;
fs.watch(filePath, (event) => {
    if (event === 'change') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateFile, 200);
    }
});

// 啟動時先跑一次
updateFile();
