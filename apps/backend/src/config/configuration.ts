export default () => ({
  port: parseInt(process.env.PORT || "4000", 10),
  apiPrefix: process.env.API_PREFIX || "api",
  nodeEnv: process.env.NODE_ENV || "development",

  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
  },

  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: process.env.PUPPETEER_ARGS
      ? process.env.PUPPETEER_ARGS.split(",")
      : ["--no-sandbox", "--disable-setuid-sandbox"],
  },

  storage: {
    type: process.env.STORAGE_TYPE || "local",
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
      bucket: process.env.AWS_S3_BUCKET || "drymdf-files",
    },
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || "60000", 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || "10", 10),
  },

  queue: {
    name: process.env.QUEUE_NAME || "pdf-generation",
    attempts: parseInt(process.env.JOB_ATTEMPTS || "3", 10),
    backoff: {
      type: "exponential" as const,
      delay: parseInt(process.env.JOB_BACKOFF_DELAY || "3000", 10),
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || "debug",
  },
});
