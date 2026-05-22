#!/usr/bin/env node
/**
 * LinkChest 图标批量切图脚本（支持 SVG / PNG / JPG 母版）
 * 默认母版：assets/linkchest.svg
 * 用法：node scripts/generate-icons.js [自定义母版路径]
 * 示例：node scripts/generate-icons.js ./my-icon.png
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { default: toIco } = require('png-to-ico');

const DEFAULT_SVG = path.resolve(__dirname, '../assets/linkchest.svg');
const INPUT = process.argv[2];

const BASE_DIR = path.resolve(__dirname, '../assets/icons');
const SOURCE_FILE = INPUT ? path.resolve(INPUT) : DEFAULT_SVG;

if (!fs.existsSync(SOURCE_FILE)) {
  console.error(`文件不存在：${SOURCE_FILE}`);
  process.exit(1);
}

const isSvg = path.extname(SOURCE_FILE).toLowerCase() === '.svg';
let rasterBuffer = null;
let rasterMeta = null;

// 确保输出目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 从 SVG 提取第二个 <image> 的 base64 PNG（实际显示内容）
async function extractSvgImage(svgPath) {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const images = [...svg.matchAll(/<image[^>]*xlink:href="data:image\/png;base64,([^"]*)"[^>]*>/g)];
  if (images.length < 2) {
    throw new Error('SVG 中未找到足够的内嵌 PNG 图片');
  }
  // 第二个 image 是实际显示内容（被 clip-path + mask 包裹）
  const base64Data = images[1][1];
  return Buffer.from(base64Data, 'base64');
}

async function prepareRaster() {
  if (!isSvg) {
    rasterBuffer = await sharp(SOURCE_FILE).toBuffer();
    rasterMeta = await sharp(rasterBuffer).metadata();
    console.log(`母版尺寸：${rasterMeta.width}x${rasterMeta.height}\n`);
    return;
  }

  console.log('🔧 从 SVG 提取内嵌图标 PNG...');
  const pngBuffer = await extractSvgImage(SOURCE_FILE);
  // 将提取的 PNG 渲染为 2048px 高清光栅（保持比例）
  rasterBuffer = await sharp(pngBuffer, { density: 300 })
    .resize(2048, 2048, { fit: 'inside' })
    .png()
    .toBuffer();
  rasterMeta = await sharp(rasterBuffer).metadata();
  console.log(`  ✓ 提取光栅图：${rasterMeta.width}x${rasterMeta.height}\n`);
}

// 居中裁切为正方形 + 缩放
async function resize(outPath, size) {
  await sharp(rasterBuffer)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .png()
    .toFile(outPath);
  console.log(`  ✓ ${path.basename(outPath)} (${size}x${size})`);
}

// 生成纯色背景 PNG（Android Adaptive Icon 背景用）
async function generateSolidBackground(outPath, size, color) {
  await sharp({
    create: { width: size, height: size, channels: 4, background: color },
  })
    .png()
    .toFile(outPath);
  console.log(`  ✓ ${path.basename(outPath)} (纯色背景 ${color})`);
}

async function main() {
  console.log('\n📦 LinkChest 图标批量生成');
  console.log(`母版：${SOURCE_FILE} (${isSvg ? 'SVG' : '位图'})\n`);

  await prepareRaster();

  // ========== 1. 高清母版 PNG ==========
  console.log('🎨 [1/5] 生成高清母版...');
  ensureDir(path.join(BASE_DIR, 'master'));
  await resize(path.join(BASE_DIR, 'master', 'icon-master.png'), 1024);

  // ========== 2. Android 图标 ==========
  console.log('\n📱 [2/5] 生成 Android 图标...');

  ensureDir(path.join(BASE_DIR, 'android'));
  await resize(path.join(BASE_DIR, 'android', 'ic_launcher.png'), 1024);

  await resize(path.join(BASE_DIR, 'android', 'ic_launcher_foreground.png'), 432);
  await generateSolidBackground(
    path.join(BASE_DIR, 'android', 'ic_launcher_background.png'),
    432,
    '#F7F5F0',
  );

  const androidSizes = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];
  for (const { dir, size } of androidSizes) {
    const d = path.join(BASE_DIR, 'android', dir);
    ensureDir(d);
    await resize(path.join(d, 'ic_launcher.png'), size);
  }

  // ========== 3. iOS 图标 ==========
  console.log('\n🍎 [3/5] 生成 iOS 图标...');
  ensureDir(path.join(BASE_DIR, 'ios'));

  const iosSizes = [
    { name: 'AppIcon-1024x1024@1x.png', size: 1024 },
    { name: 'AppIcon-60x60@3x.png', size: 180 },
    { name: 'AppIcon-60x60@2x.png', size: 120 },
    { name: 'AppIcon-83.5x83.5@2x.png', size: 167 },
    { name: 'AppIcon-76x76@2x.png', size: 152 },
    { name: 'AppIcon-40x40@3x.png', size: 120 },
    { name: 'AppIcon-40x40@2x.png', size: 80 },
    { name: 'AppIcon-29x29@3x.png', size: 87 },
    { name: 'AppIcon-29x29@2x.png', size: 58 },
    { name: 'AppIcon-20x20@3x.png', size: 60 },
    { name: 'AppIcon-20x20@2x.png', size: 40 },
  ];
  for (const { name, size } of iosSizes) {
    await resize(path.join(BASE_DIR, 'ios', name), size);
  }

  // ========== 4. Web / PWA 图标 ==========
  console.log('\n🌐 [4/5] 生成 Web / PWA 图标...');
  ensureDir(path.join(BASE_DIR, 'web'));

  const webSizes = [
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-256x256.png', size: 256 },
    { name: 'icon-384x384.png', size: 384 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 },
  ];
  for (const { name, size } of webSizes) {
    await resize(path.join(BASE_DIR, 'web', name), size);
  }

  // ========== 5. favicon.ico ==========
  console.log('\n🔖 [5/5] 生成 favicon.ico...');
  const faviconBuf = await toIco([
    path.join(BASE_DIR, 'web', 'favicon-16x16.png'),
    path.join(BASE_DIR, 'web', 'favicon-32x32.png'),
  ]);
  await fs.promises.writeFile(path.join(BASE_DIR, 'web', 'favicon.ico'), faviconBuf);
  console.log('  ✓ favicon.ico');

  console.log('\n✅ 全部生成完毕！');
  console.log(`📂 输出目录：${BASE_DIR}`);
  console.log('\n💡 运行 node scripts/sync-icons.js 可同步到项目各平台目录');
  console.log('');
}

main().catch((err) => {
  console.error('❌ 生成失败：', err.message);
  process.exit(1);
});
