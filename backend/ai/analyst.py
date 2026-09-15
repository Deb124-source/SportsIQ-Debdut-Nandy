import os


class AIAnalyst:

    def __init__(self):
        self.key = os.getenv("GEMINI_API_KEY")
        self.client = None

        if not self.key:
            print("WARNING: GEMINI_API_KEY is not set.")
            return

        try:
            from google import genai

            self.client = genai.Client(
                api_key=self.key
            )

            print("Gemini AI client initialized successfully.")

        except Exception as e:
            print(
                "Gemini initialization failed:",
                repr(e)
            )

            self.client = None

    def ask(self, question, context):

        # ----------------------------------------------------
        # No Gemini client
        # ----------------------------------------------------

        if not self.client:

            return (
                "SportsIQ AI is currently unavailable because "
                "the Gemini AI client could not be initialized."
            )

        # ----------------------------------------------------
        # Build prompt
        # ----------------------------------------------------

        prompt = f"""
You are SportsIQ, an IPL cricket analytics assistant.

Your job is to answer questions using ONLY the supplied
SportsIQ analytics context.

IMPORTANT RULES:

1. Do not invent statistics.
2. Do not use statistics that are not present in the context.
3. If the requested information is unavailable, clearly say so.
4. Use actual numbers from the context whenever possible.
5. Keep answers concise and useful.
6. Explain the relevant evidence behind the answer.
7. You can compare players, teams, venues and matchups
   when the supplied context contains the required data.

User Question:
{question}

SportsIQ Analytics Context:
{context}
"""

        # ----------------------------------------------------
        # Gemini request
        # ----------------------------------------------------

        try:

            print(
                f"Sending SportsIQ AI question: {question}"
            )

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            print("Gemini response received.")

            if response is None:

                return (
                    "SportsIQ AI received no response from "
                    "the Gemini service."
                )

            answer = getattr(
                response,
                "text",
                None
            )

            if answer:

                return answer.strip()

            return (
                "Gemini returned an empty answer. "
                "Please try another cricket question."
            )

        except Exception as e:

            print(
                "Gemini API error:",
                repr(e)
            )

            return (
                "SportsIQ AI could not process the request "
                "through Gemini right now. "
                "Please try again."
            )
