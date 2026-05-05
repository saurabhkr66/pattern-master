const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const mappingFile = path.join(__dirname, 'cloudinary_mapping.json');
const validExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

function countLocalImages(dir) {
    let count = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            count += countLocalImages(filePath);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (validExts.includes(ext)) count++;
        }
    }
    return count;
}

console.log("-----------------------------------------");
console.log("☁️  Cloudinary Migration Status Checker");
console.log("-----------------------------------------");

if (!fs.existsSync(publicDir)) {
    console.error("❌ Error: 'public' directory not found.");
    process.exit(1);
}

const totalImages = countLocalImages(publicDir);
let uploadedCount = 0;

if (fs.existsSync(mappingFile)) {
    const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
    uploadedCount = Object.keys(mapping).length;
}

const percentage = ((uploadedCount / totalImages) * 100).toFixed(2);

console.log(`📂 Total Local Images:    ${totalImages}`);
console.log(`✅ Uploaded to Cloudinary: ${uploadedCount}`);
console.log(`📊 Progress:              ${percentage}%`);
console.log("-----------------------------------------");

if (uploadedCount < totalImages) {
    console.log(`⏳ Status: Still migrating... (${totalImages - uploadedCount} remaining)`);
    console.log("💡 Tip: Make sure your 'node upload_public_images.js' script is still running.");
} else {
    console.log("🎉 Status: Migration Complete! All images are uploaded.");
    console.log("🚀 You can now safely delete the local images from the 'public' folder if you wish.");
}
console.log("-----------------------------------------");
