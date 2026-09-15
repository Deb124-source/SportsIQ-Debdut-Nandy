import os

class AIAnalyst:
    def __init__(self):
        self.key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.key)
            except Exception:
                self.client = None

    def ask(self, question, context):
        if not self.client:
            return (
                "AI Analyst is running in demo mode. Add GEMINI_API_KEY to .env for "
                "LLM-powered answers. The analytics engine currently knows about "
                f"{context['overview']['players']} players and {context['overview']['matches']} matches."
            )
        prompt = f"""
You are SportsIQ, a cricket data analyst. Answer only from the supplied analytics context.
Do not invent statistics. If the context is insufficient, say so.
Keep the answer concise and explain the relevant evidence.

Question: {question}

Analytics context:
{context}
"""
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"AI service error: {e}"
