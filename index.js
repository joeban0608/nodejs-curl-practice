const express = require("express");
const fs = require("fs");
const path = require("path"); // ✅ 加上這行
const multer = require("multer");

class FacebookAPI {
  /* 
    {
      "name": "TW - Ban joe app",
      "id": "691349837385339"
    }
  */
  static pageId = "";
  static pageAccessToken = "";

  constructor() {
    this.pageId = FacebookAPI.pageId;
    this.pageAccessToken = FacebookAPI.pageAccessToken;
  }

  static userAccessToken =
    "EAAY8shITnb0BO6MqHxqoZCJyje5xXrSm27yB095yqYLvaH7TYoG7k9ZBa2xdGueT6j2ZArOt8mK3ej4t2avqOT0Yh5ZBcUZCICUyojzuvrGOOgLEgZBfApmGeHRnZCAnGtPE7i448pEFZAVTnt8O5ET3YS8qrYXMNhXh9oLHU0FzxqyB5hf0HGbOPZBSdZBOgeQZAUXrF5egYAXQFYW2QPkNFZBVT3JO5FmfHdmZB8egbdC58DTe2Vx47hmQ0";
  // static pageId = "691349837385339";
  // static pageAccessToken =
  //   "EAAY8shITnb0BO7wJfPj7VStFnNPJS2v5WC4s9UCLTBbUKCym2GwqgsNzwmL50ibtCnlp2IePPUMFZBHVJMUFP5uMSlhLdxichUtdfdQhSIKytFrIfA3tQ8SlPB360tz7RC0SqU2ZCyidva0qLmn60j9jtohvLTZAnOZCxbQDCTzZA0hNv3aFz35NPL3ZCSJNFcdzY6IzD2yfL6sqrViFUx1nga8QDE9ZCHUKoRzvfreNuTKEVbLoeVA7vMZD";

  static async getPageData() {
    if (!FacebookAPI.userAccessToken) {
      throw new Error("No user access token provided.");
    }
    const url = `https://graph.facebook.com/v23.0/me/accounts?access_token=${FacebookAPI.userAccessToken}`;
    return fetch(url);
  }

  static async createUpload(clientId, file_name, file_length, file_type) {
    const url = `https://graph.facebook.com/v23.0/${clientId}/uploads`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${FacebookAPI.pageAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // access_token: FacebookAPI.pageAccessToken,
        file_name,
        file_length,
        file_type,
      }),
    });
    return response;
  }

  static async getUploadFileHandle(fileUrl, uploadId) {
    if (!uploadId) {
      throw new Error("No upload ID provided.");
    }

    if (!fileUrl) {
      throw new Error("No data provided for upload.");
    }
    const fileStream = fs.createReadStream(fileUrl);

    const headers = {
      Authorization: `OAuth ${FacebookAPI.pageAccessToken}`,
      file_offset: "0",
      "Content-Type": "application/octet-stream",
      "Content-Length": fs.statSync(fileUrl).size, // 確保 Content-Length 正確
    };
    const url = `https://graph.facebook.com/v23.0/${uploadId}`;
    return fetch(url, {
      method: "POST",
      headers,
      body: fileStream,
      duplex: "half",
    });
  }

  static async uploadVideo(title, description, UPLOADED_FILE_HANDLE) {
    const url = new URL(
      `https://graph.facebook.com/v23.0/${FacebookAPI.pageId}/videos`
    );
    url.searchParams.append("access_token", FacebookAPI.pageAccessToken);

    const formData = new FormData();
    // formData.append("access_token", FacebookAPI.pageAccessToken);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("fbuploader_video_file_chunk", UPLOADED_FILE_HANDLE);
    // 注意：如果使用 FormData，則需要將 headers 的 Content-Type 設置為 multipart/form-data
    // 但在 Node.js 中，fetch 會自動處理這個問題
    // headers["Content-Type"] = "multipart/form-data";
    const response = await fetch(url.toString(), {
      method: "POST",
      body: formData,
    });
    return response;
  }
}

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
    const ext = path.extname(file.originalname).toLowerCase(); // ex: .mp4
    const formatFileName = reqName ? `${reqName}${ext}` : file.originalname;
    cb(null, formatFileName);
  },
});

// fileFilter：在檔案被儲存之前就阻擋不合法的類型
const fileFilter = function (req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext !== ".mp4") {
    return cb(new Error("Only .mp4 video files are allowed"), false);
  }

  cb(null, true); // ✅ 通過驗證
};

const upload = multer({ storage, fileFilter });
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
 * video example:
 * - curl -F filepath=@/Users/hongbangzhou/Downloads/screenshot.mov http://localhost:3000/upload
 * else example:
 * - curl -F name=joeban -F shoesize=11  http://localhost:3000/upload
 *
 * facebook API example:
 * - curl -F filepath=@/Users/hongbangzhou/Downloads/screenshotV2.mp4 -F fbClientId="1755585365384637" -F videoTitle="v-t-1" -F videoDescription="v-d-1" http://localhost:3000/upload
 * error video type example:
 * - curl -F filepath=@/Users/hongbangzhou/Downloads/screenshotV2.mov -F fbClientId="1755585365384637" -F videoTitle="v-t-1" -F videoDescription="v-d-1" http://localhost:3000/upload
 */
app.post("/upload", upload.single("filepath"), async (req, res) => {
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    file: req.file,
  };
  console.log("requestData:", requestData);
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;

  const pageData = await FacebookAPI.getPageData()
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to fetch page data:", response);
        throw new Error("Failed to fetch page data");
      }
      return response.json();
    })
    .catch((error) => {
      console.error("Error fetching page data:", error);
      return null;
    });
  console.log("FacebookAPI.getPageData pageData:\n", pageData);
  const chosenPage = pageData?.data[0]; // 假設選擇第一個頁面
  if (!chosenPage) {
    console.error("No page data found");
    return res.status(500).json({ error: "No page data found" });
  }

  FacebookAPI.pageId = chosenPage.id;
  FacebookAPI.pageAccessToken = chosenPage.access_token;

  // FacebookAPI.createUpload and FacebookAPI.getUploadFileHandle
  if (
    FacebookAPI.pageAccessToken &&
    req.body.fbClientId &&
    FacebookAPI.pageId &&
    FacebookAPI.pageAccessToken
  ) {
    const resData = await FacebookAPI.createUpload(
      req.body.fbClientId,
      req.file.originalname,
      req.file.size,
      req.file.mimetype
    )
      .then((response) => {
        if (!response.ok) {
          console.error(
            "Failed to upload video to Facebook - createUpload:",
            response
          );
        }
        return response.json();
      })
      .catch((error) => {
        console.error("Error in FacebookAPI.createUpload:", error);
        return null;
      });

    console.log("FacebookAPI.createUpload resData:\n", resData);
    const uploadId = await resData.id;
    if (!uploadId) {
      console.error("No upload ID returned from Facebook API");
      return res.status(500).json({
        error: "Failed to upload video to Facebook - upload ID is empty",
      });
    }

    const uploadFileToFacebookResData = await FacebookAPI.getUploadFileHandle(
      "./uploads/" + req.file.filename,
      uploadId
    )
      .then((response) => {
        if (!response.ok) {
          console.error(
            "Failed to upload video to Facebook - uploadVideo:",
            response
          );
          throw new Error(
            "Failed to upload file to Facebook - getUploadFileHandle"
          );
        }
        const uploadFileToFacebookResJson = response.json();

        return uploadFileToFacebookResJson;
      })
      .catch((error) => {
        console.error("Error in FacebookAPI.getUploadFileHandle:", error);
        return null;
      });

    console.log(
      "FacebookAPI.uploadFile resData:\n",
      uploadFileToFacebookResData
    );

    const UPLOADED_FILE_HANDLE = await uploadFileToFacebookResData.h;
    if (!UPLOADED_FILE_HANDLE) {
      console.error("No UPLOADED_FILE_HANDLE returned from Facebook API");
      return res.status(500).json({
        error:
          "Failed to upload video to Facebook - UPLOADED_FILE_HANDLE is empty",
      });
    }

    const uploadVideoResData = await FacebookAPI.uploadVideo(
      req.body.videoTitle || "Default Video Title",
      req.body.videoDescription || "Default Video Description",
      UPLOADED_FILE_HANDLE
    )
      .then((response) => {
        if (!response.ok) {
          console.error(
            "Failed to upload video to Facebook - uploadVideo:",
            response
          );
        }
        return response.json();
      })
      .catch((error) => {
        console.error("Error in FacebookAPI.uploadVideo:", error);
        return null;
      });
    console.log("FacebookAPI.uploadVideo resData:\n", uploadVideoResData);
    const videoId = await uploadVideoResData.id;
    if (!videoId) {
      console.error("No video ID returned from Facebook API");
      return res.status(500).json({
        error: "Failed to upload video to Facebook - video id is empty",
      });
    }

    return res.json({
      message: "File upload successful",
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        videoId,
      },
    });
  }

  await res.json({
    message: "File upload successful",
    file: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      // file: req.file,
    },
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
