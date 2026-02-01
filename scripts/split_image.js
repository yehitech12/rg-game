const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function splitImage() {
    const inputPath = 'C:/Users/user/.gemini/antigravity/brain/1be43a63-9677-4324-8789-df42794b5feb/uploaded_media_1769900510711.png';
    const outputDir = path.join(__dirname, '../public/assets');

    // 確保輸出目錄存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 載入圖片
    const img = await loadImage(inputPath);
    const width = img.width;
    const height = img.height;

    // 計算每個史萊姆的大小
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);

    // 定義4個區域 (x, y, width, height)
    const regions = [
        { name: 'slime_1', x: 0, y: 0, w: halfWidth, h: halfHeight },           // 左上
        { name: 'slime_2', x: halfWidth, y: 0, w: halfWidth, h: halfHeight },   // 右上
        { name: 'slime_3', x: 0, y: halfHeight, w: halfWidth, h: halfHeight },  // 左下
        { name: 'slime_4', x: halfWidth, y: halfHeight, w: halfWidth, h: halfHeight } // 右下
    ];

    // 分割並保存每個區域
    for (const region of regions) {
        const canvas = createCanvas(region.w, region.h);
        const ctx = canvas.getContext('2d');

        // 繪製裁切的區域
        ctx.drawImage(
            img,
            region.x, region.y, region.w, region.h,  // 源區域
            0, 0, region.w, region.h                  // 目標區域
        );

        // 保存為 PNG
        const buffer = canvas.toBuffer('image/png');
        const outputPath = path.join(outputDir, `${region.name}.png`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`已保存: ${region.name}.png`);
    }

    console.log('\n✅ 完成！已分割成4張圖片');
}

splitImage().catch(err => {
    console.error('錯誤:', err);
    process.exit(1);
});
