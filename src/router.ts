// @routes-hash dedcd64a6e859a828e892d692a251a97
import { Express } from "express";

import route1 from "./routes/project/addProject";
import route2 from "./routes/project/delProject";
import route3 from "./routes/project/getProject";
import route4 from "./routes/project/getProjectCount";
import route5 from "./routes/project/getSingleProject";
import route6 from "./routes/project/updateProject";

export default async (app: Express) => {
  app.use("/project/addProject", route1);
  app.use("/project/delProject", route2);
  app.use("/project/getProject", route3);
  app.use("/project/getProjectCount", route4);
  app.use("/project/getSingleProject", route5);
  app.use("/project/updateProject", route6);
}
