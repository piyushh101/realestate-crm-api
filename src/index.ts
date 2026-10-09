import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { auth } from "./middleware/auth.js";
import { propertyRouter } from "./routes/property.routes.js";
import { leadRouter } from "./routes/lead.routes.js";
import swaggerUi from "swagger-ui-express";
import { openapi } from "./docs/openapi.js";



const app = express();
app.use(express.json());
app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "OK" });
});


app.use("/auth", authRouter);
app.use("/properties", propertyRouter);
app.get("/me", auth, (req, res) => {
  res.json({ success: true, data: req.user });
});
app.use("/leads", leadRouter);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});


app.use(errorHandler);


const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));