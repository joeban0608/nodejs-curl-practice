const express = require("express");
const fs = require("fs");
const path = require("path"); // ✅ 加上這行
const crypto = require("crypto");
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
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uuid}${ext}`);
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
 * POST method - image upload
 * upload.single("file")
 * 對應   curl -F "file" 的keyname
 * example:
 * - curl -F file=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
 * - curl -F file=@/Users/hongbangzhou/Downloads/screenshot.mov http://localhost:3000/upload
 */
app.post("/upload", (req, res) => {
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  };
  console.log("requestData:", requestData);
  upload.single("file")(req, res, function (err) {
    if (err) {
      console.error("Upload error:", err);
      return res
        .status(500)
        .json({ error: "File upload failed", detail: err.message });
    }

    console.log("Uploaded file:", req.file);
    res.json({ message: "File upload successful", file: req.file });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

/* 
  ref: https://curl.se/docs/manpage.html#-d
  - urlencoded: curl -d "name=curl" http://localhost:3000/data
  - JSON: curl -H "Content-Type: application/json" -d '{"name":"curl"}' http://localhost:3000/data
*/

/* 
  ref: https://curl.se/docs/manpage.html#-F
  curl -F file=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
  curl -F file=@/Users/hongbangzhou/Downloads/screenshot.mov http://localhost:3000/upload
*/
