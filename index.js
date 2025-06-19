const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = 3000;
// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// GET method
app.get("/", (req, res) => {
  res.send("Hello, this is a GET request!");
});

// post method - data
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

// POST method - image upload
app.post("/upload", (req, res) => {
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  };
  console.log("requestData:", requestData);
  const uuid = crypto.randomUUID();
  const contentLength = parseInt(req.headers["content-length"], 10); // 總數據大小
  let receivedLength = 0; // 已接收數據大小

  let rawData = Buffer.alloc(0);

  // 收集請求主體的數據並計算進度
  req.on("data", (chunk) => {
    receivedLength += chunk.length; // 增加已接收的數據大小
    rawData = Buffer.concat([rawData, chunk]);
    // 計算百分比
    const progress = ((receivedLength / contentLength) * 100).toFixed(2);

    // 回應進度給客戶端
    res.write(JSON.stringify({ progress: `${progress}%` }));
  });

  req.on("end", () => {
    const contentType = req.headers["content-type"];
    const boundary = contentType.match(/boundary=([\w-]+)/)?.[1];
    if (!boundary) {
      res.status(400).send("Invalid multipart/form-data request");
      return;
    }

    const parts = rawData.toString().split(`--${boundary}`);
    parts.forEach((part) => {
      // 判斷是否有檔案數據
      if (part.includes("Content-Disposition")) {
        const dispositionMatch = part.match(
          /Content-Disposition: form-data; name="([^"]+)"; filename="([^"]+)"/
        );
        if (dispositionMatch) {
          const fieldName = dispositionMatch[1];
          const fileName = dispositionMatch[2];

          // 找到檔案內容的起始位置
          const fileContentStart = part.indexOf("\r\n\r\n") + 4;
          const fileContent = part.slice(fileContentStart, -2); // 去除結尾的 `\r\n`

          const uploadPath = path.join(
            __dirname,
            "uploads",
            `${uuid}-${fileName}`
          );

          // 儲存檔案
          fs.writeFile(uploadPath, fileContent, "binary", (err) => {
            if (err) {
              res.status(500).send("Failed to save file");
              return;
            }
          });

          console.log(`Uploaded file: ${fileName} (field: ${fieldName})`);
        } else {
          res.status(400).send({
            error:
              "Invalid Content-Disposition. Ensure the upload request includes filename and proper format.",
          });
          return;
        }
      }
    });

    // 上傳完成，結束回應
    res.end(JSON.stringify({ message: "File upload successful" }));
  });
});

// 建立 uploads 資料夾（如果不存在）
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

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
  curl -F profile=@/Users/hongbangzhou/Downloads/joebanV1.png http://localhost:3000/upload
  curl -F video=@/Users/hongbangzhou/Downloads/screenshot.mov http://localhost:3000/upload
*/
