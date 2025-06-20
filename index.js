const express = require("express");
const fs = require("fs");
const path = require("path"); // ✅ 加上這行
const multer = require("multer");
const busboy = require("busboy");

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const app = express();
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/");
//   },
//   filename: function (req, file, cb) {
//     const reqName = req?.body?.name;
//     const ext = path.extname(file.originalname); // etc .png, .jpg, .mov
//     const formatFileName = reqName
//       ? `${Date.now()}-${reqName}${ext}`
//       : Date.now() + ext; // Use the name from the request body if available

//     cb(null, formatFileName);
//   },
// });
// const upload = multer({ storage });

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
 * upload.single("filepath")
 * 對應   curl -F "filepath" 的keyname
 * image example:
 * - curl -F filepath=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
 * - curl -F name=testName -F description="testDescription" -F filepath=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
 * video example:
 * - curl -F filepath=@/Users/hongbangzhou/Downloads/screenshot.mov http://localhost:3000/upload
 * else example:
 * - curl -F name=joeban -F shoesize=11  http://localhost:3000/upload
 */
app.post("/upload", (req, res) => {
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  };
  console.log("requestData:", requestData);
  const bb = busboy({ headers: req.headers });
  let reqName;
  let resFile = {};
  let totalSize = 0;

  /**
   * form fields
   * example output:
   * field: {
      "name": "name",
      "val": "testName",
      "info": {
        "nameTruncated": false,
        "valueTruncated": false,
        "encoding": "7bit",
        "mimeType": "text/plain"
      }
    }
   * field: {
      "name": "description",
      "val": "testDescription",
      "info": {
        "nameTruncated": false,
        "valueTruncated": false,
        "encoding": "7bit",
        "mimeType": "text/plain"
      }
    }
   */
  bb.on("field", (name, val, info) => {
    // console.log("field:", JSON.stringify({ name, val, info }, null, 2));
    if (name === "name" && val) {
      reqName = val;
    }
  });
  bb.on("file", (_name, file, info) => {
    const formatName = reqName
      ? `${Date.now()}-${reqName}${path.extname(info.filename)}`
      : `${Date.now()}-${info.filename}`; // Use the name from the request body if available
    const saveTo = path.join(uploadDir, formatName);
    const fileUrl = `${req.protocol}://${req.get(
      "host"
    )}/uploads/${formatName}`;

    resFile.url = fileUrl; // Set the URL of the uploaded file
    if (reqName) {
      resFile.filename = reqName;
    }
    if (info.mimeType) {
      resFile.mimetype = info.mimeType;
    }
    if (info.filename) {
      resFile.originalname = info.filename;
    }

    file.on("data", (data) => {
      totalSize += data.length;
      resFile.size = totalSize; // Update the size as data comes in
    });

    file.pipe(fs.createWriteStream(saveTo));
  });

  bb.on("close", () => {
    res.writeHead(200, { Connection: "close" });
    // res.end(`That's all folks!`);

    res.end(
      JSON.stringify(
        {
          message: "File uploaded successfully!",
          file: resFile,
        },
        null,
        2
      )
    );
  });
  req.pipe(bb);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
