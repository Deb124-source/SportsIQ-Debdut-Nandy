import os
import traceback


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

            print("Gemini initialization failed:")
            print(repr(e))

            traceback.print_exc()

            self.client = None

    def ask(self, question, context):

        # ----------------------------------------------------
        # Check Gemini client
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

            print("=" * 60)
            print("SPORTSIQ AI REQUEST")
            print("Question:", question)
            print("=" * 60)

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            print("Gemini API request completed.")

            # ------------------------------------------------
            # Empty response
            # ------------------------------------------------

            if response is None:

                print("ERROR: Gemini returned None.")

                return (
                    "SportsIQ AI received no response from "
                    "the Gemini service."
                )

            # ------------------------------------------------
            # Extract text
            # ------------------------------------------------

            answer = getattr(
                response,
                "text",
                None
            )

            if answer:

                print("Gemini answer received successfully.")

                return answer.strip()

            # ------------------------------------------------
            # Unexpected response
            # ------------------------------------------------

            print("WARNING: Gemini response contained no text.")
            print("Raw response:")
            print(response)

            return (
                "Gemini returned an empty answer. "
                "Please try another cricket question."
            )

        except Exception as e:

            # ------------------------------------------------
            # IMPORTANT:
            # Do NOT hide the real Gemini error.
            # ------------------------------------------------

            print("=" * 60)
            print("GEMINI API ERROR")
            print("=" * 60)

            print("Error type:")
            print(type(e).__name__)

            print("Error message:")
            print(str(e))

            print("Full error:")
            print(repr(e))

            print("Traceback:")
            traceback.print_exc()

            print("=" * 60)

            return (
                "SportsIQ AI encountered a Gemini API error. "
                "Check the Render logs for the exact error."
            )
