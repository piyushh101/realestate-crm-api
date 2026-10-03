import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is missing in .env");
}

export const env = {
  JWT_SECRET: jwtSecret,   // TS jaanta hai: pakka string (narrowing!)
};