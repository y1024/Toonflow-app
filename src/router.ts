// @routes-hash 9d731e20672e7e7da8e1f6afe4b056ea
import { Express } from "express";

import route1 from "./routes/artStyle/getArtStyle";
import route2 from "./routes/other/clearDatabase";
import route3 from "./routes/other/deleteAllData";
import route4 from "./routes/other/getCaptcha";
import route5 from "./routes/other/login";
import route6 from "./routes/other/testAI";
import route7 from "./routes/other/testImage";
import route8 from "./routes/other/testVideo";
import route9 from "./routes/project/addProject";
import route10 from "./routes/project/delProject";
import route11 from "./routes/project/getProject";
import route12 from "./routes/project/getProjectCount";
import route13 from "./routes/project/getSingleProject";
import route14 from "./routes/project/updateProject";
import route15 from "./routes/script/addScript";
import route16 from "./routes/script/getScrptApi";
import route17 from "./routes/script/updateScript";
import route18 from "./routes/user/getUser";
import route19 from "./routes/user/saveUser";

export default async (app: Express) => {
  app.use("/artStyle/getArtStyle", route1);
  app.use("/other/clearDatabase", route2);
  app.use("/other/deleteAllData", route3);
  app.use("/other/getCaptcha", route4);
  app.use("/other/login", route5);
  app.use("/other/testAI", route6);
  app.use("/other/testImage", route7);
  app.use("/other/testVideo", route8);
  app.use("/project/addProject", route9);
  app.use("/project/delProject", route10);
  app.use("/project/getProject", route11);
  app.use("/project/getProjectCount", route12);
  app.use("/project/getSingleProject", route13);
  app.use("/project/updateProject", route14);
  app.use("/script/addScript", route15);
  app.use("/script/getScrptApi", route16);
  app.use("/script/updateScript", route17);
  app.use("/user/getUser", route18);
  app.use("/user/saveUser", route19);
}
