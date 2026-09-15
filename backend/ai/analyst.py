import os
import json


class AIAnalyst:

    def __init__(self):
        self.key = os.getenv("GEMINI_API_KEY")
        self.client = None

        if self.key:
            try:
                from google import genai

                self.client = genai.Client(
                    api_key=self.key
                )

            except Exception:
                self.client = None

    def ask(self, question, context):

        if not self.client:
            overview = context.get("overview", {})

            return (
                "AI Analyst is running in demo mode. "
                "GEMINI_API_KEY is not available. "
                f"SportsIQ currently contains "
                f"{overview.get('players', 0)} players and "
                f"{overview.get('matches', 0)} matches."
            )

        # Convert analytics context into readable JSON
        try:
            context_text = json.dumps(
                context,
                indent=2,
                default=str
            )
        except Exception:
            context_text = str(context)

        prompt = f"""
You are SportsIQ, an advanced IPL cricket analytics assistant.

Your job is to answer questions using ONLY the SportsIQ analytics
context supplied below.

IMPORTANT RULES:

1. Never invent statistics.
2. Never use statistics that are not present in the context.
3. If the supplied context does not contain enough information,
   clearly say that the available SportsIQ data is insufficient.
4. Explain conclusions using the actual statistics provided.
5. Keep answers concise but useful.
6. Use cricket terminology naturally.
7. When comparing players or teams, explicitly mention the
   relevant numbers.
8. When discussing a player, distinguish between career/overall
   statistics, recent form, season statistics, phase performance,
   and contextual metrics when available.
9. Do not claim that a player or team is "best" unless the
   supplied statistics support that conclusion.
10. Do not provide information about matches, players, teams,
    venues or seasons that is absent from the supplied context.

USER QUESTION:
{question}

SPORTSIQ ANALYTICS CONTEXT:
{context_text}

Now answer the user's question based strictly on the data above.
"""

        try:

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            if response and response.text:
                return response.text.strip()

            return "SportsIQ could not generate an answer from the available analytics."

        except Exception as error:

            return f"AI service error: {error}"
            
