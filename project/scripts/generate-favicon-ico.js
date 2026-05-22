#!/usr/bin/env node
/**
 * 生成多尺寸 favicon.ico
 * 用法：node scripts/generate-favicon-ico.js
 */
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const INPUT_DIR = path.resolve(__dirname, '../apps/web/public');
const OUTPUT = path.join(INPUT_DIR, 'favicon.ico');

const sizes = [16, 32, 48];

async function main() {
  const files = sizes
    .map((s) => path.join(INPUT_DIR, `favicon-${s}x${s}.png`))
    .filter((f) => fs.existsSync(f));

  if (files.length === 0) {
    console.error('错误：未找到 favicon PNG 文件');
    process.exit(1);
  }

  console.log(`生成 favicon.ico，包含 ${files.length} 个尺寸: ${sizes.join(', ')}`);

  const buf = await pngToIco(files);
  fs.writeFileSync(OUTPUT, buf);

  const stats = fs.statSync(OUTPUT);
  console.log(`✅ 已生成: ${OUTPUT} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('❌ 生成失败:', err.message);
  process.exit(1);
});
