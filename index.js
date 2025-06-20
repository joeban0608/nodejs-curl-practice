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
 * - curl -i -F filepath=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
 * - curl -i -F name=testName -F filepath=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
 * video example:
 * - curl -i -F filepath=@/Users/hongbangzhou/Downloads/screenshot.mov http://localhost:3000/upload
 * else example:
 * - curl -i -F name=joeban -F shoesize=11  http://localhost:3000/upload
 */
app.post("/upload", (req, res) => {
  const uploadId =
    "upload:MTphdHRhY2htZW50OmY4N2IwMGNkLWRlM2YtNGJhMC04YjM2LWNlMGVlMTgyMTZmYj9maWxlX25hbWU9dGVzdE5hbWUmZmlsZV9sZW5ndGg9NTUxMzY1NCZmaWxlX3R5cGU9YXBwbGljYXRpb24lMkZvY3RldC1zdHJlYW0=?sig=ARZ78BHj02DTrgsuOyQ";
  const accessToken =
    "EAAY8shITnb0BOzpM8z1SkVqT3PpWHZBYOuceZCzUyD7d23TgkoluD6Ulh8CNZCLtSohUZCQfeNi4ukRsaXUOUgYIQrB0147RlBB3fI6ZCrF5Hr5hynCWTcx2meqHRDNfnCVMhz00Ug6jHuiDl4m1GIVfLN38R9YmKoy65MkZCSn8EhqXwiCHsw3ZAeJVY0McjU7wmZAaR6e0Bm1H2jIuPH3OwGyoJj878RykeQrQ0rUhP9j3W9lNrRHiBwZDZD";
  function uploadFileToFacebook(data) {
    if (!data) {
      throw new Error("No data provided for upload.");
    }
    const headers = {
      Authorization: `OAuth ${accessToken}`,
      file_offset: "0",
      "Content-Type": "application/octet-stream",
    };
    const url = `https://graph.facebook.com/v23.0/${uploadId}`;
    return fetch(url, {
      method: "POST",
      headers: headers,
      body: data,
    });
  }
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  };
  console.log("requestData:", requestData);
  const bb = busboy({ headers: req.headers });
  let reqName;
  /**
   * type resFile = {
    url: "",
    filename: "",
    mimetype: "",
    originalname: "",
    size: 0,
  } | null
   */
  let resFile = null;
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
    resFile = {};
    // Use the name from the request body if available
    const formatName = reqName
      ? `${reqName}${path.extname(info.filename)}`
      : `${info.filename}`;

    // use file.pipe(fs.createWriteStream(saveTo)) to save the file with streaming
    const saveTo = path.join(uploadDir, formatName);

    const fileUrl = `${req.protocol}://${req.get(
      "host"
    )}/uploads/${formatName}`;
    resFile.url = fileUrl;
    if (reqName) {
      resFile.filename = reqName;
    }
    if (info.mimeType) {
      resFile.mimetype = info.mimeType;
    }
    if (info.filename) {
      resFile.originalname = info.filename;
    }

    // Update the size as data comes in
    file.on("data", async (data) => {
      console.log("data.length", data.length);
      let storeData = data;
      totalSize += data.length;
      resFile.size = totalSize;
      try {
        const uploadFileToFacebookRes = await uploadFileToFacebook(storeData);
        const uploadFileToFacebookResJson =
          await uploadFileToFacebookRes.json();
        console.log(
          "uploadFileToFacebookResJson:",
          uploadFileToFacebookResJson
        );
      } catch (error) {
        console.error("Error uploading file to Facebook:", error);
      }
    });

    file.pipe(fs.createWriteStream(saveTo));
  });

  bb.on("close", () => {
    if (resFile === null) {
      res.writeHead(400, { Connection: "close" });
      return res.end("No file uploaded or no valid file provided.");
    }

    res.writeHead(200, { Connection: "close" });
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
