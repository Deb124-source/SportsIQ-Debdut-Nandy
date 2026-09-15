from pathlib import Path
from typing import Optional
import math

import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.data.loader import load_dataset
from backend.data.match_loader import load_matches

from backend.analytics.engine import CricketAnalytics
from backend.analytics.match_engine import MatchAnalytics
from backend.ai.analyst import AIAnalyst


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "ipl_deliveries.csv"
)

MATCHES_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "matches.csv"
)

FRONTEND_DIR = BASE_DIR.parent / "frontend"


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="SportsIQ Cricket Analytics API",
    description=(
        "Cricket Analytics and Intelligence Engine "
        "powered by IPL data."
    ),
    version="2.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATA VALIDATION
# ============================================================

if not DATA_PATH.exists():
    raise RuntimeError(
        f"IPL deliveries dataset not found: {DATA_PATH}"
    )

if not MATCHES_PATH.exists():
    raise RuntimeError(
        f"Matches dataset not found: {MATCHES_PATH}"
    )


# ============================================================
# LOAD DATA
# ============================================================

df = load_dataset(str(DATA_PATH))
matches_df = load_matches(str(MATCHES_PATH))


# ============================================================
# NORMALIZE DATA
# ============================================================

df.columns = [
    str(column).strip()
    for column in df.columns
]

matches_df.columns = [
    str(column).strip()
    for column in matches_df.columns
]


# ============================================================
# DERIVED BOWLING TEAM
# ============================================================

def add_bowling_team(dataframe: pd.DataFrame) -> pd.DataFrame:

    data = dataframe.copy()

    if "bowling_team" in data.columns:
        return data

    if (
        "batting_team" not in data.columns
        or "team_1" not in data.columns
        or "team_2" not in data.columns
    ):
        data["bowling_team"] = ""

        return data

    data["bowling_team"] = data.apply(
        lambda row: (
            row["team_2"]
            if str(row["batting_team"]).strip()
            == str(row["team_1"]).strip()
            else row["team_1"]
        ),
        axis=1,
    )

    return data


df = add_bowling_team(df)


# ============================================================
# ANALYTICS ENGINES
# ============================================================

analytics = CricketAnalytics(df)

match_analytics = MatchAnalytics(
    df,
    matches_df,
)

ai_analyst = AIAnalyst()


# ============================================================
# REQUEST MODELS
# ============================================================

class AIQuestion(BaseModel):
    question: str


# ============================================================
# JSON CLEANER
# ============================================================

def clean_for_json(value):

    if value is None:
        return None

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None

        return value

    if hasattr(value, "item"):
        try:
            return clean_for_json(value.item())
        except Exception:
            pass

    if isinstance(value, pd.DataFrame):
        return clean_for_json(
            value.to_dict(orient="records")
        )

    if isinstance(value, pd.Series):
        return clean_for_json(
            value.to_dict()
        )

    if isinstance(value, dict):
        return {
            str(key): clean_for_json(val)
            for key, val in value.items()
        }

    if isinstance(value, list):
        return [
            clean_for_json(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            clean_for_json(item)
            for item in value
        ]

    return value


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def find_team(team_name: str) -> Optional[str]:

    target = team_name.strip().lower()

    possible_columns = [
        "team_1",
        "team_2",
        "batting_team",
        "bowling_team",
    ]

    for column in possible_columns:

        if column not in df.columns:
            continue

        values = (
            df[column]
            .dropna()
            .astype(str)
            .unique()
        )

        for value in values:

            if value.strip().lower() == target:
                return value.strip()

    if "team_1" in matches_df.columns:

        values = (
            matches_df["team_1"]
            .dropna()
            .astype(str)
            .unique()
        )

        for value in values:

            if value.strip().lower() == target:
                return value.strip()

    if "team_2" in matches_df.columns:

        values = (
            matches_df["team_2"]
            .dropna()
            .astype(str)
            .unique()
        )

        for value in values:

            if value.strip().lower() == target:
                return value.strip()

    return None


def find_venue(venue_name: str) -> Optional[str]:

    if "venue" not in df.columns:
        return None

    target = venue_name.strip().lower()

    values = (
        df["venue"]
        .dropna()
        .astype(str)
        .unique()
    )

    for value in values:

        if value.strip().lower() == target:
            return value.strip()

    return None


def get_team_matches(team_name: str):

    target = team_name.strip().lower()

    mask = (
        (
            matches_df["team_1"]
            .astype(str)
            .str.lower()
            == target
        )
        |
        (
            matches_df["team_2"]
            .astype(str)
            .str.lower()
            == target
        )
    )

    return matches_df[mask].copy()


def get_team_batting_df(team_name: str):

    target = team_name.strip().lower()

    return df[
        df["batting_team"]
        .astype(str)
        .str.lower()
        == target
    ].copy()


def get_team_bowling_df(team_name: str):

    target = team_name.strip().lower()

    return df[
        df["bowling_team"]
        .astype(str)
        .str.lower()
        == target
    ].copy()


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    index_file = FRONTEND_DIR / "index.html"

    if not index_file.exists():

        return {
            "message": "SportsIQ API is running."
        }

    return FileResponse(index_file)


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():

    try:

        players = (
            df["batter"]
            .dropna()
            .nunique()
        )

        seasons = (
            df["season"]
            .dropna()
            .nunique()
        )

        matches = (
            matches_df["match_id"]
            .nunique()
            if "match_id" in matches_df.columns
            else len(matches_df)
        )

        return {
            "status": "healthy",
            "deliveries": int(len(df)),
            "matches": int(matches),
            "players": int(players),
            "seasons": int(seasons),
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# OVERVIEW
# ============================================================

@app.get("/api/overview")
def overview():

    try:

        result = analytics.overview()

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# PLAYERS
# ============================================================

@app.get("/api/players")
def players():

    try:

        result = analytics.player_list()

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# PLAYER PROFILE
# ============================================================

@app.get("/api/player/{player_name}")
def player_profile(player_name: str):

    try:

        result = analytics.player_profile(
            player_name
        )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# PLAYER SIMILARITY
# ============================================================

@app.get("/api/player/{player_name}/similar")
def similar_players(player_name: str):

    try:

        result = analytics.similar_players(
            player_name
        )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# PLAYER PHASES
# ============================================================

@app.get("/api/player/{player_name}/phases")
def player_phases(player_name: str):

    try:

        result = analytics.phase_stats(
            player_name
        )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# PLAYER DNA
# ============================================================

@app.get("/api/player/{player_name}/dna")
def player_dna(player_name: str):

    try:

        result = analytics.player_dna(
            player_name
        )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# PLAYER CONTEXT SCORE
# ============================================================

@app.get("/api/player/{player_name}/context-score")
def player_context_score(player_name: str):

    try:

        result = analytics.context_score(
            player_name
        )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# PLAYER INTELLIGENCE
# ============================================================

@app.get("/api/player/{player_name}/intelligence")
def player_intelligence(player_name: str):

    try:

        profile = analytics.player_profile(
            player_name
        )

        dna = analytics.player_dna(
            player_name
        )

        context = analytics.context_score(
            player_name
        )

        phases = analytics.phase_stats(
            player_name
        )

        similar = analytics.similar_players(
            player_name
        )

        form = match_analytics.player_form(
            player_name
        )

        season = match_analytics.season_stats(
            player_name
        )

        return clean_for_json(
            {
                "profile": profile,
                "dna": dna,
                "context": context,
                "phases": phases,
                "similar": similar,
                "form": form,
                "season": season,
            }
        )

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# ARCHETYPES
# ============================================================

@app.get("/api/archetypes")
def archetypes():

    try:

        result = analytics.archetypes()

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# TEAMS SUMMARY
# ============================================================

@app.get("/api/teams")
def teams():

    try:

        all_teams = set()

        if "team_1" in matches_df.columns:
            all_teams.update(
                matches_df["team_1"]
                .dropna()
                .astype(str)
                .tolist()
            )

        if "team_2" in matches_df.columns:
            all_teams.update(
                matches_df["team_2"]
                .dropna()
                .astype(str)
                .tolist()
            )

        result = []

        for team in sorted(all_teams):

            team_matches = get_team_matches(team)

            matches_count = len(team_matches)

            wins = 0

            if (
                "winner" in team_matches.columns
                and matches_count > 0
            ):

                wins = int(
                    (
                        team_matches["winner"]
                        .astype(str)
                        .str.lower()
                        == team.lower()
                    ).sum()
                )

            losses = max(
                matches_count - wins,
                0,
            )

            win_percentage = (
                wins / matches_count * 100
                if matches_count
                else 0
            )

            batting_df = get_team_batting_df(
                team
            )

            runs = int(
                batting_df["total_runs"].sum()
            )

            legal_balls = int(
                (
                    batting_df["wides"] == 0
                ).sum()
            )

            run_rate = (
                runs / legal_balls * 6
                if legal_balls
                else 0
            )

            result.append(
                {
                    "team": team,
                    "matches": matches_count,
                    "wins": wins,
                    "losses": losses,
                    "win_percentage": win_percentage,
                    "runs": runs,
                    "run_rate": run_rate,
                }
            )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# TEAM DETAIL
# ============================================================

@app.get("/api/team/{team_name}")
def team_detail(team_name: str):

    try:

        actual_team = find_team(team_name)

        if actual_team is None:

            raise HTTPException(
                status_code=404,
                detail="Team not found.",
            )

        team_matches = get_team_matches(
            actual_team
        )

        batting_df = get_team_batting_df(
            actual_team
        )

        bowling_df = get_team_bowling_df(
            actual_team
        )

        # ----------------------------------------------------
        # BASIC TEAM METRICS
        # ----------------------------------------------------

        matches_count = len(team_matches)

        wins = 0

        if "winner" in team_matches.columns:

            wins = int(
                (
                    team_matches["winner"]
                    .astype(str)
                    .str.lower()
                    == actual_team.lower()
                ).sum()
            )

        losses = max(
            matches_count - wins,
            0,
        )

        win_percentage = (
            wins / matches_count * 100
            if matches_count
            else 0
        )

        runs = int(
            batting_df["total_runs"].sum()
        )

        legal_balls = int(
            (
                batting_df["wides"] == 0
            ).sum()
        )

        strike_rate = (
            runs / legal_balls * 100
            if legal_balls
            else 0
        )

        run_rate = (
            runs / legal_balls * 6
            if legal_balls
            else 0
        )

        wickets = 0

        if not bowling_df.empty:

            valid_wickets = bowling_df[
                bowling_df["wicket_kind"]
                .astype(str)
                .str.lower()
                .isin(
                    [
                        "bowled",
                        "caught",
                        "caught and bowled",
                        "lbw",
                        "stumped",
                        "hit wicket",
                    ]
                )
            ]

            wickets = int(
                valid_wickets["wicket"].sum()
            )

        # ----------------------------------------------------
        # TOP BATTERS
        # ----------------------------------------------------

        top_batters = []

        if not batting_df.empty:

            grouped = (
                batting_df
                .groupby("batter")["batter_runs"]
                .sum()
                .sort_values(
                    ascending=False
                )
                .head(10)
            )

            for player, player_runs in grouped.items():

                top_batters.append(
                    {
                        "player": str(player),
                        "runs": int(player_runs),
                    }
                )

        # ----------------------------------------------------
        # TOP BOWLERS
        # ----------------------------------------------------

        top_bowlers = []

        if not bowling_df.empty:

            valid_wickets = bowling_df[
                bowling_df["wicket_kind"]
                .astype(str)
                .str.lower()
                .isin(
                    [
                        "bowled",
                        "caught",
                        "caught and bowled",
                        "lbw",
                        "stumped",
                        "hit wicket",
                    ]
                )
            ]

            grouped = (
                valid_wickets
                .groupby("bowler")["wicket"]
                .sum()
                .sort_values(
                    ascending=False
                )
                .head(10)
            )

            for player, player_wickets in grouped.items():

                top_bowlers.append(
                    {
                        "player": str(player),
                        "wickets": int(
                            player_wickets
                        ),
                    }
                )

        # ----------------------------------------------------
        # PHASE SCORING
        # ----------------------------------------------------

        phase_stats = []

        if not batting_df.empty:

            phase_group = (
                batting_df
                .groupby("phase")
                .agg(
                    runs=("total_runs", "sum"),
                    balls=("total_runs", "count"),
                )
                .reset_index()
            )

            for _, row in phase_group.iterrows():

                phase_runs = int(
                    row["runs"]
                )

                phase_balls = int(
                    row["balls"]
                )

                phase_sr = (
                    phase_runs
                    / phase_balls
                    * 100
                    if phase_balls
                    else 0
                )

                phase_stats.append(
                    {
                        "phase": str(
                            row["phase"]
                        ),
                        "runs": phase_runs,
                        "balls": phase_balls,
                        "strike_rate": phase_sr,
                    }
                )

        # ----------------------------------------------------
        # RECENT MATCHES
        # ----------------------------------------------------

        recent_matches = []

        if not team_matches.empty:

            recent = (
                team_matches
                .sort_values(
                    "date",
                    ascending=False
                )
                .head(10)
            )

            for _, row in recent.iterrows():

                winner = str(
                    row.get(
                        "winner",
                        ""
                    )
                )

                result = (
                    "Won"
                    if winner.lower()
                    == actual_team.lower()
                    else "Lost"
                )

                recent_matches.append(
                    {
                        "match_id": str(
                            row.get(
                                "match_id",
                                ""
                            )
                        ),
                        "date": str(
                            row.get(
                                "date",
                                ""
                            )
                        ),
                        "team_1": str(
                            row.get(
                                "team_1",
                                ""
                            )
                        ),
                        "team_2": str(
                            row.get(
                                "team_2",
                                ""
                            )
                        ),
                        "winner": winner,
                        "result": result,
                    }
                )

        return clean_for_json(
            {
                "team": {
                    "team": actual_team,
                    "matches": matches_count,
                    "wins": wins,
                    "losses": losses,
                    "win_percentage": win_percentage,
                    "runs": runs,
                    "run_rate": run_rate,
                    "strike_rate": strike_rate,
                    "wickets": wickets,
                },
                "top_batters": top_batters,
                "top_bowlers": top_bowlers,
                "phase_stats": phase_stats,
                "recent_matches": recent_matches,
            }
        )

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# VENUES SUMMARY
# ============================================================

@app.get("/api/venues")
def venues():

    try:

        if "venue" not in df.columns:

            return []

        venue_data = []

        grouped = (
            df.groupby("venue")
            .agg(
                deliveries=(
                    "match_id",
                    "count",
                ),
                runs=(
                    "total_runs",
                    "sum",
                ),
                matches=(
                    "match_id",
                    "nunique",
                ),
            )
            .reset_index()
        )

        grouped = grouped.sort_values(
            "matches",
            ascending=False,
        )

        for _, row in grouped.iterrows():

            matches_count = int(
                row["matches"]
            )

            runs = int(
                row["runs"]
            )

            average_runs = (
                runs / matches_count
                if matches_count
                else 0
            )

            venue_data.append(
                {
                    "venue": str(
                        row["venue"]
                    ),
                    "matches": matches_count,
                    "runs": runs,
                    "average_runs": average_runs,
                }
            )

        return clean_for_json(
            venue_data
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# VENUE DETAIL
# ============================================================

@app.get("/api/venue/{venue_name}")
def venue_detail(venue_name: str):

    try:

        actual_venue = find_venue(
            venue_name
        )

        if actual_venue is None:

            raise HTTPException(
                status_code=404,
                detail="Venue not found.",
            )

        venue_df = df[
            df["venue"]
            .astype(str)
            .str.lower()
            == actual_venue.lower()
        ].copy()

        matches_count = int(
            venue_df["match_id"]
            .nunique()
        )

        runs = int(
            venue_df["total_runs"].sum()
        )

        legal_balls = int(
            (
                venue_df["wides"] == 0
            ).sum()
        )

        average_runs = (
            runs / matches_count
            if matches_count
            else 0
        )

        run_rate = (
            runs / legal_balls * 6
            if legal_balls
            else 0
        )

        boundaries = int(
            (
                venue_df["is_boundary"] == 1
            ).sum()
        )

        sixes = int(
            (
                venue_df["batter_runs"] == 6
            ).sum()
        )

        wickets = int(
            venue_df["wicket"].sum()
        )

        # ----------------------------------------------------
        # TEAM PERFORMANCE
        # ----------------------------------------------------

        team_performance = []

        grouped = (
            venue_df
            .groupby("batting_team")
            ["total_runs"]
            .sum()
            .sort_values(
                ascending=False
            )
            .head(10)
        )

        for team, team_runs in grouped.items():

            team_matches = int(
                venue_df[
                    venue_df["batting_team"]
                    == team
                ]["match_id"]
                .nunique()
            )

            team_performance.append(
                {
                    "team": str(team),
                    "runs": int(team_runs),
                    "matches": team_matches,
                }
            )

        # ----------------------------------------------------
        # SEASON PERFORMANCE
        # ----------------------------------------------------

        season_stats = []

        if "season" in venue_df.columns:

            grouped_seasons = (
                venue_df
                .groupby("season")
                .agg(
                    runs=(
                        "total_runs",
                        "sum",
                    ),
                    matches=(
                        "match_id",
                        "nunique",
                    ),
                )
                .reset_index()
                .sort_values(
                    "season"
                )
            )

            for _, row in grouped_seasons.iterrows():

                season_stats.append(
                    {
                        "season": str(
                            row["season"]
                        ),
                        "runs": int(
                            row["runs"]
                        ),
                        "matches": int(
                            row["matches"]
                        ),
                    }
                )

        return clean_for_json(
            {
                "venue": {
                    "venue": actual_venue,
                    "matches": matches_count,
                    "runs": runs,
                    "average_runs": average_runs,
                    "run_rate": run_rate,
                    "boundaries": boundaries,
                    "sixes": sixes,
                    "wickets": wickets,
                },
                "team_performance": team_performance,
                "season_stats": season_stats,
            }
        )

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# IMPACT
# ============================================================

@app.get("/api/impact")
def impact():

    try:

        result = analytics.impact()

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# ANOMALIES
# ============================================================

@app.get("/api/anomalies")
def anomalies():

    try:

        result = analytics.anomalies()

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# MATCH LIST
# ============================================================

@app.get("/api/matches")
def matches():

    try:

        result = match_analytics.match_list()

        return clean_for_json(
            {
                "matches": result
            }
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# MATCH DETAIL
# ============================================================

@app.get("/api/match/{match_id}")
def match_detail(match_id: str):

    try:

        result = match_analytics.scorecard(
            match_id
        )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# PLAYER FORM
# ============================================================

@app.get("/api/player/{player_name}/form")
def player_form(
    player_name: str,
    n: int = 10,
):

    try:

        result = match_analytics.player_form(
            player_name,
            n,
        )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# PLAYER SEASON
# ============================================================

@app.get("/api/player/{player_name}/season")
def player_season(player_name: str):

    try:

        result = match_analytics.season_stats(
            player_name
        )

        return clean_for_json(result)

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# MATCHUP
# ============================================================

@app.get("/api/matchup")
def matchup(
    batter: str,
    bowler: str,
):

    try:

        result = match_analytics.matchup(
            batter,
            bowler,
        )

        return clean_for_json(
            {
                "matchup": result
            }
        )

    except Exception as error:

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )


# ============================================================
# SEASONS
# ============================================================

@app.get("/api/seasons")
def seasons():

    try:

        if "season" not in df.columns:
            return []

        values = (
            df["season"]
            .dropna()
            .unique()
            .tolist()
        )

        values = sorted(
            values,
            key=lambda x: str(x)
        )

        return clean_for_json(values)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# AI ANALYST
# ============================================================
# ============================================================
# AI ANALYST
# ============================================================

@app.post("/api/ai/chat")
def ai_chat(request: AIQuestion):

    try:

        question = request.question.strip()

        if not question:
            raise HTTPException(
                status_code=400,
                detail="Question cannot be empty."
            )

        # Get current SportsIQ analytics context
        overview_data = analytics.overview()

        context = {
            "overview": overview_data
        }

        # Send question + analytics context to Gemini
        answer = ai_analyst.ask(
            question,
            context
        )

        return clean_for_json(
            {
                "question": question,
                "answer": answer
            }
        )

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
        
# ============================================================
# STATIC FRONTEND
# ============================================================

if FRONTEND_DIR.exists():

    app.mount(
        "/static",
        StaticFiles(
            directory=str(
                FRONTEND_DIR
            )
        ),
        name="static",
    )
