import express from "express";
import u from "@/utils";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { z } from "zod";
import axios from "axios";

const router = express.Router();

const prompt = `
你是一名资深动画导演，擅长将静态分镜转化为简洁、专业、详尽的 Motion Prompt（视频生成动作提示）。你理解镜头语言、情绪节奏，能补充丰富但不重复静态元素，只突出变化与动态；同时，你也负责从第三方叙述视角解释当前镜头的场景与人物状态。

## 任务
你将接收用户输入的：  
- **分镜图片**（单张）  
- **分镜提示词**（对应该镜头）  
- **剧本内容**  

你需输出**规范的 Motion Prompt JSON 对象**。

---

## 核心要求

### 1. 画面类型描述（必需，开头一句）
- 明确本分镜属于：**前景/近景/中景/远景/全景**
- 表述格式："中景。" / "近景。" / "远景。" / "全景。"

### 3. 细致动作叙述
清晰分别描述以下要素：
- **镜头运动**（1种，5-20字）：推拉摇移、跟随、固定等
- **角色核心动作**（1-2种，20-60字）：主体动作+情绪细节
- **环境动态**（0-1种，10-30字）：光影、物体、自然元素变化
- **速度节奏**（5-15字）：缓慢、急促、平稳等
- **氛围风格**（可选，10-20字）：情绪渲染、视觉基调

用"，" "并且" "同时"等词串联，使句子流畅连贯。

### 4. 长度优化
- **content 必须在 80-150 字之间**
- 若不足 80 字，补充：
  - 角色细微神态（眼神、呼吸、肌肉紧张度）
  - 动作过渡细节（转身、停顿、重心转移）
  - 环境反应（光影变化、物体晃动）
- **禁止引入图片中已有的静态描述**

---

## 结构推荐

**标准结构：**  
画面类型。镜头运动，角色主动作+情绪表现+微动作细节，环境动态（如有），速度节奏，氛围渲染。

**参考示例：**  
- 中景。镜头缓慢推进，角色身体微微紧绷，神情凝重，缓缓转头注视门口，眉头微皱、唇角轻颤，光影在脸上拉出一缕阴影，衣角随动作轻晃，气氛变得紧张。
- 远景。镜头稳定，角色站立不动，但指尖不停地敲打桌面，目光游移不定，窗外树影摇曳，光线逐渐变暗，整体节奏平稳，渲染出迟疑与不安。

---

## 禁忌

❌ 不重复任何静态画面元素（外观、场景、服装、道具等）  
❌ 不使用否定句、抽象形容词  
❌ 不超过 2 种主体动作、1 种镜头运动、1 种环境动态  
❌ 不分多场景，单个 content 不超过 200 字

---

### 5. 人物对话（必需）
- 根据剧本内容，输出本镜头对应的**人物对话/台词**。
- **若无对白**：dialogue 填空字符串 ""。
- **若有对白**：必须标明**说话人角色名**（与剧本/项目内角色名称一致），格式为 **「角色名：台词」**；多句用换行或分号分隔。
- 示例：\`王林：你怎么来了？\`、\`李慕婉：我来找你。\` 或 \`王林：你怎么来了？\n李慕婉：我来找你。\`

### 6. 第三方视角叙述（可选）
- 从**第三人称旁观视角**，根据剧本内容对当前镜头进行简要叙述，解释场景、人物状态、情绪氛围与关键信息（例如地点、时间、人物关系等）。
- 语气应客观、冷静，不使用第一人称或第二人称。
- 若本镜头无需额外叙述或剧本无相关信息，则 narration 填空字符串 ""。

---

## 输出格式

返回 **JSON 对象**，包含：

{
  "time": 数字（1-15，镜头时长秒数）,
  "name": "字符串（2-6字，概括镜头动态/情绪）",
  "content": "字符串（80-150字，首句为画面类型，充分描述动态细节）",
  "dialogue": "字符串（本镜头人物对话，格式「角色名：台词」，无则空字符串）",
  "narration": "字符串（本镜头第三方视角叙述，根据剧本解释场景与人物，无则空字符串）"
}

### 字段说明
- **time**：根据动作复杂度合理分配，简单动作 2-5 秒，复杂动作 6-10 秒
- **name**：精炼概括本镜头核心动态或情绪转折
- **content**：首句必须是画面类型，后续流畅衔接动态描述
- **dialogue**：本镜头内角色对白，格式「角色名：台词」，无对白则 ""

---

## 处理流程

1. **分析输入的单张图片**
2. **生成对应的 JSON 对象**
3. **检查 content 字段：**
   - 首句是否为画面类型
   - 字数是否在 80-150 之间
   - 是否避免了静态描述

---

现在请根据我提供的分镜内容，严格按照以上规则输出 Motion Prompt JSON 对象。

`;
async function urlToBase64(imageUrl: string): Promise<string> {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const contentType = response.headers["content-type"] || "image/png";
  const base64 = Buffer.from(response.data, "binary").toString("base64");
  return `data:${contentType};base64,${base64}`;
}
// 生成单个分镜提示
async function generateSingleVideoPrompt({
  scriptText,
  storyboardPrompt,
  ossPath,
}: {
  scriptText: string;
  storyboardPrompt: string;
  ossPath: string;
}): Promise<{ content: string; time: number; name: string; dialogue: string; narration: string }> {
  const messages: any[] = [
    {
      role: "system",
      content: prompt,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `剧本内容:${scriptText}\n分镜提示词:${storyboardPrompt}`,
        },
        {
          type: "image",
          image: await urlToBase64(ossPath),
        },
      ],
    },
  ];

  try {
    const apiConfig = await u.getPromptAi("videoPrompt");

    const result = await u.ai.text.invoke(
      {
        messages,
        output: {
          time: z.number().describe("时长,镜头时长 1-15"),
          content: z.string().describe("提示词内容"),
          name: z.string().describe("分镜名称"),
          dialogue: z.string().describe("本镜头人物对话，格式「角色名：台词」，无则空字符串"),
          narration: z.string().describe("本镜头第三方视角叙述，根据剧本解释场景与人物，无则空字符串"),
        },
      },
      apiConfig,
    );
    if (!result) {
      console.error("AI 返回结果为空:", result);
      throw new Error("AI 返回结果为空");
    }

    const dialogue = (result as any).dialogue;
    const narration = (result as any).narration;
    if (
      !result.content ||
      result.time === undefined ||
      !result.name ||
      typeof dialogue !== "string" ||
      typeof narration !== "string"
    ) {
      console.error("AI 返回格式错误:", result);
      throw new Error("AI 返回格式错误");
    }

    return { ...result, dialogue, narration };
  } catch (err: any) {
    console.error("generateSingleVideoPrompt 调用失败:", err?.message || err);
    throw new Error(`生成视频提示词失败: ${err?.message || "未知错误"}`);
  }
}
// 主路由 - 单张图片处理
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number().nullable(),
    id: z.string(),
    prompt: z.string().optional(),
    src: z.string(),
  }),
  async (req, res) => {
    const { projectId, scriptId, id, prompt: imagePrompt, src } = req.body;

    try {
      const scriptData = await u.db("t_script").where("id", scriptId).select("content").first();
      if (!scriptData) return res.status(500).send(error("剧本不存在"));

      const projectData = await u.db("t_project").where({ id: +projectId }).select("artStyle", "videoRatio").first();
      if (!projectData) return res.status(500).send(error("项目不存在"));

      const result = await generateSingleVideoPrompt({
        scriptText: scriptData.content!,
        storyboardPrompt: imagePrompt || "",
        ossPath: src,
      });

      // 写回资产表，方便前端从通用资产接口直接读取视频提示词、对白与第三方叙述
      await u
        .db("t_assets")
        .where({ id: Number(id), projectId })
        .update({
          videoPrompt: result.content || "",
          duration: String(result.time),
          dialogue: result.dialogue ?? "",
          narration: result.narration ?? "",
        });

      res.status(200).send(
        success({
          id,
          videoPrompt: result.content || "",
          prompt: imagePrompt,
          duration: String(result.time || ""),
          projectId,
          type: "分镜",
          name: result.name || "",
          scriptId,
          src,
          dialogue: result.dialogue ?? "",
          narration: result.narration ?? "",
        }),
      );
    } catch (err: any) {
      console.error("生成视频提示词失败:", err?.message || err);
      res.status(500).send(error(err?.message || "生成视频提示词失败"));
    }
  },
);
