export default [
  "strapi::logger",
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": ["'self'", "data:", "blob:", "res.cloudinary.com"],
          "media-src": ["'self'", "data:", "blob:", "res.cloudinary.com"],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: "strapi::cors",
    config: {
      enabled: true,
      origin: "*", // Chấp nhận tất cả domain
      headers: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Cho phép tất cả phương thức HTTP
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  {
    name: "strapi::body",
    config: {
      formLimit: "500mb", // modify form body
      jsonLimit: "500mb", // modify JSON body
      textLimit: "500mb", // modify text body
      formidable: {
        maxFileSize: 500 * 1024 * 1024, // multipart data, modify here limit of uploaded file size
      },
    },
  },
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
  "global::auth-customization",
];
