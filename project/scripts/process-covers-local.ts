import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const SOURCE_DIR = path.join(__dirname, '../cover');
const OUTPUT_DIR = path.join(__dirname, '../cover-processed');

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const files = (await fs.readdir(SOURCE_DIR))
    .filter(f => f.endsWith('.png'))
    .sort();

  console.log(`📁 发现 ${files.length} 张封面图片`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = path.join(SOURCE_DIR, file);
    const outputName = file.replace(/\.png$/i, '.webp');
    const outputPath = path.join(OUTPUT_DIR, outputName);

    try {
      const buffer = await sharp(inputPath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      await fs.writeFile(outputPath, buffer);

      const originalStat = await fs.stat(inputPath);
      const saved = ((1 - buffer.length / originalStat.size) * 100).toFixed(1);
      console.log(`[${i + 1}/${files.length}] ${file} → ${outputName} (${(buffer.length / 1024).toFixed(1)} KB, 节省 ${saved}%)`);
    } catch (err: any) {
      console.error(`[${i + 1}/${files.length}] ❌ ${file} 处理失败: ${err.message}`);
    }
  }

  console.log(`\n✅ 处理完成，输出目录: ${OUTPUT_DIR}`);
}

main();
