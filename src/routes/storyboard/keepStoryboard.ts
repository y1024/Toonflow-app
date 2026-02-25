import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateSingleVideoPrompt } from "@/routes/storyboard/generateVideoPrompt";
const router = express.Router();

// 保存分镜图
export default router.post(
  "/",
  validateFields({
    results: z.array(
      z.object({
        videoPrompt: z.string(),
        prompt: z.string(),
        duration: z.string(),
        projectId: z.number(),
        filePath: z.string(),
        type: z.string(),
        name: z.string(),
        scriptId: z.number(),
        segmentId: z.number(),
        shotIndex: z.number(),
        dialogue: z.string().optional().nullable(),
        narration: z.string().optional().nullable(),
      })
    ),
  }),
  async (req, res) => {
    const { results } = req.body;
    // const assetsIds = await u.db("t_assets").where("scriptId", results[0].scriptId).andWhere("type", "分镜").select("id").pluck("id");
    const list = results.map((item: any) => {
      const row: Record<string, any> = {
        ...item,
        filePath: new URL(item.filePath).pathname,
        dialogue: item.dialogue ?? "",
        narration: item.narration ?? "",
      };
      // 导出流程中 id 可能为前端 cell 的 uuid，插入时由库表自增生成 id，故去掉非数字 id
      const idNum = Number(row.id);
      if (Number.isNaN(idNum) || idNum <= 0) delete row.id;
      return row;
    });
    await u.db("t_assets").insert(list);

    // 对未填写 videoPrompt/dialogue/narration 的新插入行，异步生成并回写（不阻塞响应）
    const needGenerate = list.filter(
      (r: any) => (r.videoPrompt == null || String(r.videoPrompt).trim() === "") && r.filePath && r.prompt
    );
    if (needGenerate.length > 0 && results[0]?.scriptId != null && results[0]?.projectId != null) {
      const scriptId = results[0].scriptId;
      const projectId = results[0].projectId;
      const scriptRow = await u.db("t_script").where("id", scriptId).select("content").first();
      const scriptText = scriptRow?.content ?? "";
      const insertedRows = await u
        .db("t_assets")
        .where({ scriptId, projectId, type: "分镜" })
        .orderBy("id", "desc")
        .limit(needGenerate.length)
        .select("id", "filePath", "prompt");
      Promise.all(
        insertedRows.map(async (row: { id: number; filePath: string | null; prompt: string | null }) => {
          try {
            const imageUrl = row.filePath ? await u.oss.getFileUrl(row.filePath) : "";
            if (!imageUrl) return;
            const result = await generateSingleVideoPrompt({
              scriptText,
              storyboardPrompt: row.prompt ?? "",
              ossPath: imageUrl,
            });
            await u.db("t_assets").where({ id: row.id, projectId }).update({
              videoPrompt: result.content || "",
              duration: String(result.time),
              dialogue: result.dialogue ?? "",
              narration: result.narration ?? "",
            });
          } catch (e) {
            console.error("keepStoryboard 异步生成视频提示词失败:", row.id, e);
          }
        })
      ).catch((e) => console.error("keepStoryboard 异步生成视频提示词批量失败:", e));
    }

    res.status(200).send({ message: "保存分镜图成功" });
  },
);
