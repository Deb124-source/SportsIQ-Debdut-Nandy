import json
import csv
from pathlib import Path


# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
RAW_DIR = BASE_DIR / "raw" / "ipl"
PROCESSED_DIR = BASE_DIR / "processed"

DELIVERIES_OUTPUT = PROCESSED_DIR / "ipl_deliveries.csv"
MATCHES_OUTPUT = PROCESSED_DIR / "matches.csv"


# ---------------------------------------------------------
# PHASE CLASSIFICATION
# ---------------------------------------------------------

def get_phase(over):
    """
    Cricsheet overs are zero-indexed.
    0-5   -> Powerplay
    6-14  -> Middle
    15+   -> Death
    """

    if over <= 5:
        return "Powerplay"
    elif over <= 14:
        return "Middle"
    else:
        return "Death"


# ---------------------------------------------------------
# SAFE VALUE HELPER
# ---------------------------------------------------------

def safe_get(dictionary, key, default=""):
    value = dictionary.get(key, default)

    if value is None:
        return default

    return value


# ---------------------------------------------------------
# EXTRACT MATCH OUTCOME
# ---------------------------------------------------------

def extract_match_outcome(info):
    """
    Extract winner and victory margin from Cricsheet outcome data.
    """

    outcome = info.get("outcome", {})

    winner = outcome.get("winner", "")

    win_by_runs = ""
    win_by_wickets = ""

    if "by" in outcome:

        by = outcome["by"]

        if "runs" in by:
            win_by_runs = by["runs"]

        if "wickets" in by:
            win_by_wickets = by["wickets"]

    return winner, win_by_runs, win_by_wickets


# ---------------------------------------------------------
# EXTRACT PLAYER OF THE MATCH
# ---------------------------------------------------------

def extract_player_of_match(info):

    awards = info.get("players_of_match", [])

    if not awards:
        return ""

    return ", ".join(str(player) for player in awards)


# ---------------------------------------------------------
# PROCESS ALL IPL MATCHES
# ---------------------------------------------------------

def process_matches():

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    json_files = sorted(RAW_DIR.glob("*.json"))

    print(f"Found {len(json_files)} IPL matches.")

    if not json_files:
        print("No JSON files found.")
        return

    delivery_rows = []
    match_rows = []

    # -----------------------------------------------------
    # PROCESS EVERY MATCH
    # -----------------------------------------------------

    for file_path in json_files:

        try:

            with open(file_path, "r", encoding="utf-8") as file:
                data = json.load(file)

            info = data.get("info", {})

            # -------------------------------------------------
            # BASIC MATCH INFORMATION
            # -------------------------------------------------

            match_id = file_path.stem

            season = safe_get(info, "season")

            dates = info.get("dates", [])

            if dates:
                match_date = str(dates[0])
            else:
                match_date = ""

            venue = safe_get(info, "venue")

            teams = info.get("teams", [])

            team_1 = teams[0] if len(teams) > 0 else ""
            team_2 = teams[1] if len(teams) > 1 else ""

            winner, win_by_runs, win_by_wickets = extract_match_outcome(info)

            player_of_match = extract_player_of_match(info)

            # -------------------------------------------------
            # MATCH ROW
            # -------------------------------------------------

            match_rows.append({
                "match_id": match_id,
                "season": season,
                "date": match_date,
                "venue": venue,
                "team_1": team_1,
                "team_2": team_2,
                "winner": winner,
                "win_by_runs": win_by_runs,
                "win_by_wickets": win_by_wickets,
                "player_of_match": player_of_match
            })

            # -------------------------------------------------
            # PLAYER REGISTRY
            # -------------------------------------------------

            # Cricsheet provides a registry containing stable
            # player IDs. We don't need it for the current
            # delivery dataset, but keeping the names from
            # deliveries preserves compatibility.

            # -------------------------------------------------
            # INNINGS
            # -------------------------------------------------

            innings_list = data.get("innings", [])

            for innings_number, innings in enumerate(innings_list, start=1):

                batting_team = innings.get("team", "")

                overs = innings.get("overs", [])

                for over_data in overs:

                    over_number = over_data.get("over", 0)

                    phase = get_phase(over_number)

                    deliveries = over_data.get("deliveries", [])

                    for delivery in deliveries:

                        batter = delivery.get("batter", "")
                        non_striker = delivery.get("non_striker", "")
                        bowler = delivery.get("bowler", "")

                        runs = delivery.get("runs", {})

                        batter_runs = runs.get("batter", 0)
                        extras_total = runs.get("extras", 0)
                        total_runs = runs.get("total", 0)

                        extras = delivery.get("extras", {})

                        wides = extras.get("wides", 0)
                        noballs = extras.get("noballs", 0)
                        byes = extras.get("byes", 0)
                        legbyes = extras.get("legbyes", 0)
                        penalty_runs = extras.get("penalty", 0)

                        # -------------------------------------------------
                        # WICKET INFORMATION
                        # -------------------------------------------------

                        wicket = 0
                        wicket_player = ""
                        wicket_kind = ""

                        wickets = delivery.get("wickets", [])

                        if wickets:

                            wicket = len(wickets)

                            # Usually one wicket per delivery,
                            # but support multiple just in case.

                            wicket_player = wickets[0].get(
                                "player_out", ""
                            )

                            wicket_kind = wickets[0].get(
                                "kind", ""
                            )

                        # -------------------------------------------------
                        # BOUNDARY / DOT
                        # -------------------------------------------------

                        is_boundary = 1 if batter_runs in (4, 6) else 0

                        is_dot = (
                            1
                            if total_runs == 0
                            else 0
                        )

                        # -------------------------------------------------
                        # DELIVERY ROW
                        # -------------------------------------------------

                        delivery_rows.append({

                            "match_id": match_id,

                            "season": season,

                            "date": match_date,

                            "venue": venue,

                            "team_1": team_1,

                            "team_2": team_2,

                            "innings": innings_number,

                            "batting_team": batting_team,

                            "over": over_number,

                            "phase": phase,

                            "batter": batter,

                            "non_striker": non_striker,

                            "bowler": bowler,

                            "batter_runs": batter_runs,

                            "extra_runs": extras_total,

                            "total_runs": total_runs,

                            "wides": wides,

                            "noballs": noballs,

                            "byes": byes,

                            "legbyes": legbyes,

                            "penalty_runs": penalty_runs,

                            "wicket": wicket,

                            "wicket_player": wicket_player,

                            "wicket_kind": wicket_kind,

                            "is_boundary": is_boundary,

                            "is_dot": is_dot
                        })

        except Exception as error:

            print(
                f"Error processing {file_path.name}: {error}"
            )

    # ---------------------------------------------------------
    # SAVE DELIVERY DATA
    # ---------------------------------------------------------

    delivery_fields = [

        "match_id",
        "season",
        "date",
        "venue",
        "team_1",
        "team_2",
        "innings",
        "batting_team",
        "over",
        "phase",
        "batter",
        "non_striker",
        "bowler",
        "batter_runs",
        "extra_runs",
        "total_runs",
        "wides",
        "noballs",
        "byes",
        "legbyes",
        "penalty_runs",
        "wicket",
        "wicket_player",
        "wicket_kind",
        "is_boundary",
        "is_dot"
    ]

    with open(
        DELIVERIES_OUTPUT,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=delivery_fields
        )

        writer.writeheader()

        writer.writerows(delivery_rows)

    # ---------------------------------------------------------
    # SAVE MATCH DATA
    # ---------------------------------------------------------

    match_fields = [

        "match_id",
        "season",
        "date",
        "venue",
        "team_1",
        "team_2",
        "winner",
        "win_by_runs",
        "win_by_wickets",
        "player_of_match"
    ]

    with open(
        MATCHES_OUTPUT,
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=match_fields
        )

        writer.writeheader()

        writer.writerows(match_rows)

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------

    print()
    print("=" * 60)
    print("SPORTSIQ DATA PROCESSING COMPLETE")
    print("=" * 60)

    print(f"Matches processed    : {len(match_rows)}")
    print(f"Deliveries processed : {len(delivery_rows)}")

    print()
    print(f"Delivery dataset:")
    print(DELIVERIES_OUTPUT)

    print()
    print(f"Match dataset:")
    print(MATCHES_OUTPUT)

    print()
    print("Files generated successfully.")


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

if __name__ == "__main__":
    process_matches()