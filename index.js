const express = require("express");
const fs = require("fs");
const path = require("path"); // ✅ 加上這行
const multer = require("multer");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const app = express();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const reqName = req?.body?.name;
    const ext = path.extname(file.originalname); // etc .png, .jpg, .mov
    const formatFileName = reqName
      ? `${Date.now()}-${reqName}${ext}`
      : Date.now() + ext; // Use the name from the request body if available

    cb(null, formatFileName);
  },
});
const upload = multer({ storage });

const port = 3000;
// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GET method
app.get("/", (req, res) => {
  res.send("Hello, this is a GET request!");
});

/**
 * post method - data
 * ref: https://curl.se/docs/manpage.html#-d
 * This endpoint can handle both URL-encoded and JSON data.
 * - urlencoded: curl -d "name=curl" http://localhost:3000/data
 * - JSON: curl -H "Content-Type: application/json" -d '{"name":"curl"}' http://localhost:3000/data
 */
app.post("/data", (req, res) => {
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  };
  console.log("requestData:", requestData);
  res.json({
    message: "POST /post/data request successful!",
    receivedData: req.body,
  });
});

/**
 * 將 uploads 資料夾設為靜態資源目錄
 */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * POST method - image upload
 * upload.single("file")
 * 對應   curl -F "file" 的keyname
 * image example:
 * - curl -F file=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
 * - curl -F name=testName -F file=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
 * video example:
 * - curl -F file=@/Users/hongbangzhou/Downloads/screenshot.mov http://localhost:3000/upload
 * - curl -F name=joeban -F shoesize=11  http://localhost:3000/upload
 */
app.post("/upload", upload.single("file"), (req, res) => {
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    file: req.file,
  };
  console.log("requestData:", requestData);

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;

  res.json({
    message: "File upload successful",
    file: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      file: req.file,
    },
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
