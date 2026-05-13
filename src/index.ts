import { createServer } from "celsian";

const server = createServer();

server.get("/", (req, res) => {
  res.json({ message: "Hello from CelsianJS!" });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
