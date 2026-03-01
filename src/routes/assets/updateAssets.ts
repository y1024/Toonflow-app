import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 更新资产
export default router.post(
  "/",
  validateFields({
    id: z.number(),
    name: z.string(),
    intro: z.string(),
    type: z.string(),
    prompt: z.string(),
    videoPrompt: z.string().optional().nullable(),
    remark: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
    dialogue: z.string().optional().nullable(),
  }),
  async (req, res) => {
    const { id, name, intro, type, prompt, remark, duration, videoPrompt, dialogue } = req.body;

    const updateData: Record<string, any> = {
      name,
      intro,
      type,
      prompt,
      remark,
      videoPrompt,
    };
    if (duration !== undefined) updateData.duration = duration == null ? null : String(duration);
    if (dialogue !== undefined) updateData.dialogue = dialogue;

    await u
      .db("t_assets")
      .where("id", id)
      .update(updateData);

    res.status(200).send(success({ message: "更新资产成功" }));
  }
);
