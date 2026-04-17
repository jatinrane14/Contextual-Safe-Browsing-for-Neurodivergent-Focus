const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv")
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
app.use(cors({
    origin:"*"
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server working");
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/v1/analyze/dom", async (req,res) => {
    try {
    const { data, intent } = req.body;

    // Limit data (important for performance)
    const trimmedData = data.slice(0, 20);
        console.log("TrimmedData: ",trimmedData)
        console.log("------------------------------")
    // Build prompt
    const prompt = `
You are an AI that helps reduce distractions.
User Goal: "${intent}"
Below is a list of webpage elements:
${trimmedData.map((d, i) => `${i}: ${d.text?.slice(0, 100)}`).join("\n")}
Task:
- Identify which elements are NOT relevant to the user goal
- Return ONLY JSON in this format:
{
  "blockIndexes": [indexes]
}
Do NOT explain anything.
`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
        console.log(text)
        console.log("--------------------------------")
    // Extract JSON safely
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      json = match ? JSON.parse(match[0]) : { blockIndexes: [] };
    }
    console.log(json)
    res.json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});
app.listen(3000, () => {
  console.log("Server is running");
});
