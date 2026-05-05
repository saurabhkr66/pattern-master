const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure manually for test
cloudinary.config({
  cloud_name: "dtf5dqbrs",
  api_key: "962996265996825",
  api_secret: "hEYN6Lt28Rprfe03OASEIuCOly8",
});

const filePath = path.join(__dirname, '..', 'public', 'Fluid Mechanics & Hydraulics', 'ce_a-1-m-wide-rectangular-channel-has_exp_img1.jpg');

async function test() {
  console.log("Testing upload for:", filePath);
  if (!fs.existsSync(filePath)) {
    console.error("File does not exist!");
    return;
  }
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'pattern-master/Fluid Mechanics & Hydraulics',
      use_filename: true,
      unique_filename: false
    });
    console.log("Success:", result.secure_url);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
