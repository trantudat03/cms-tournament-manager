module.exports = ({ env }) => {
  // Log giá trị JWT_SECRET khi khởi động
  console.log("JWT_SECRET loaded:", env("JWT_SECRET", "yourDefaultSecretHere"));

  return {
    upload: {
      config: {
        provider: "cloudinary",
        providerOptions: {
          cloud_name: env("CLOUDINARY_NAME", "dtfrotdax"),
          api_key: env("CLOUDINARY_KEY", "188385232158984"),
          api_secret: env("CLOUDINARY_SECRET"),
        },
        actionOptions: {
          upload: {},
          delete: {},
        },
      },
    },
    "users-permissions": {
      config: {
        jwtSecret: env("JWT_SECRET", "c0X7spuiLBYGSNX9y+NQNw=="),
      },
    },
  };
};
