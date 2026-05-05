const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Parse .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const publicDir = path.join(__dirname, 'public');
const mappingFile = path.join(__dirname, 'cloudinary_mapping.json');

const validExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

// Recursively find all images
function findImages(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findImages(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (validExts.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const allImages = findImages(publicDir);
console.log(`Found ${allImages.length} images to upload.`);

let mapping = {};
if (fs.existsSync(mappingFile)) {
  mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
}

async function uploadImages() {
  const BATCH_SIZE = 5; // Upload 5 at a time
  for (let i = 0; i < allImages.length; i += BATCH_SIZE) {
    const batch = allImages.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (filePath) => {
      // Relative path to public folder
      const relativePath = path.relative(publicDir, filePath).replace(/\\/g, '/');
      
      if (mapping[relativePath]) {
        console.log(`Skipping already uploaded: ${relativePath}`);
        return;
      }

      console.log(`Uploading: ${relativePath}`);
      try {
        const dir = path.dirname(relativePath);
        // Sanitize for Cloudinary: replace '&' which is forbidden
        const sanitizedDir = dir.replace(/&/g, 'and');
        const folder = sanitizedDir === '.' ? 'pattern-master' : `pattern-master/${sanitizedDir}`;

        const result = await cloudinary.uploader.upload(filePath, {
          folder: folder,
          use_filename: true,
          unique_filename: false,
          overwrite: true
        });
        
        mapping[relativePath] = result.secure_url;
        console.log(`Success: ${relativePath} -> ${result.secure_url}`);
      } catch (err) {
        console.error(`Failed to upload ${relativePath}:`, err);
      }
    });

    await Promise.all(promises);
    
    // Save mapping after every batch
    fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  }
  console.log("Upload complete!");
}

uploadImages();
