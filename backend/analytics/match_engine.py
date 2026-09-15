import pandas as pd


class MatchAnalytics:

    def __init__(self, deliveries, matches):
        self.df = deliveries.copy()
        self.matches = matches.copy()

    # =====================================================
    # MATCH LIST
    # =====================================================

    def match_list(self, limit=100):

        matches = self.matches.copy()

        if "date" in matches.columns:
            matches["date"] = matches["date"].astype(str)

        matches = matches.head(limit)

        records = matches.to_dict(
            orient="records"
        )

        clean_records = []

        for record in records:

            clean_record = {}

            for key, value in record.items():

                if pd.isna(value):
                    clean_record[key] = None

                elif hasattr(value, "item"):

                    try:
                        clean_record[key] = value.item()
                    except Exception:
                        clean_record[key] = value

                else:
                    clean_record[key] = value

            clean_records.append(clean_record)

        return clean_records

    # =====================================================
    # MATCH SCORECARD
    # =====================================================

    def scorecard(self, match_id):

        match_id = str(match_id)

        match_df = self.df[
            self.df["match_id"].astype(str) == match_id
        ].copy()

        if match_df.empty:
            return None

        match_info = self.matches[
            self.matches["match_id"].astype(str) == match_id
        ]

        result = {
            "match_id": match_id,
            "innings": []
        }

        # -------------------------------------------------
        # MATCH INFORMATION
        # -------------------------------------------------

        if not match_info.empty:

            info = match_info.iloc[0]

            for column in [
                "season",
                "date",
                "venue",
                "team_1",
                "team_2",
                "winner",
                "win_by_runs",
                "win_by_wickets",
                "player_of_match"
            ]:

                if column in match_info.columns:

                    value = info[column]

                    if pd.isna(value):
                        value = None

                    elif hasattr(value, "item"):

                        try:
                            value = value.item()
                        except Exception:
                            pass

                    result[column] = value

        # -------------------------------------------------
        # PROCESS EACH INNINGS
        # -------------------------------------------------

        for innings_number, innings_df in match_df.groupby(
            "innings",
            sort=True
        ):

            batting_team = (
                innings_df["batting_team"].iloc[0]
            )

            # =============================================
            # TEAM TOTAL
            # =============================================

            total_runs = int(
                innings_df["total_runs"].sum()
            )

            wickets = int(
                innings_df["wicket"].sum()
            )

            # =============================================
            # LEGAL BALLS
            # =============================================

            legal_ball_mask = (
                (innings_df["wides"] == 0)
                &
                (innings_df["noballs"] == 0)
            )

            legal_balls = int(
                legal_ball_mask.sum()
            )

            # Cricket overs notation
            overs = (
                f"{legal_balls // 6}."
                f"{legal_balls % 6}"
            )

            # =============================================
            # EXTRAS
            # =============================================

            wides = int(
                innings_df["wides"].sum()
            )

            noballs = int(
                innings_df["noballs"].sum()
            )

            byes = int(
                innings_df["byes"].sum()
            )

            legbyes = int(
                innings_df["legbyes"].sum()
            )

            penalty_runs = int(
                innings_df["penalty_runs"].sum()
            )

            extras = {
                "wides": wides,
                "noballs": noballs,
                "byes": byes,
                "legbyes": legbyes,
                "penalty_runs": penalty_runs,
                "total": (
                    wides
                    + noballs
                    + byes
                    + legbyes
                    + penalty_runs
                )
            }

            # =============================================
            # BATTING SCORECARD
            # =============================================

            batting = []

            for batter, batter_df in innings_df.groupby(
                "batter",
                sort=False
            ):

                runs = int(
                    batter_df["batter_runs"].sum()
                )

                # A batter does not face a wide delivery
                balls = int(
                    (batter_df["wides"] == 0).sum()
                )

                fours = int(
                    (
                        batter_df["batter_runs"] == 4
                    ).sum()
                )

                sixes = int(
                    (
                        batter_df["batter_runs"] == 6
                    ).sum()
                )

                strike_rate = (
                    round(
                        runs / balls * 100,
                        2
                    )
                    if balls > 0
                    else 0
                )

                # -----------------------------------------
                # DISMISSAL
                # -----------------------------------------

                dismissal = "not out"

                if "wicket_player" in batter_df.columns:

                    wicket_rows = batter_df[
                        batter_df["wicket_player"]
                        .astype(str)
                        .str.lower()
                        == str(batter).lower()
                    ]

                    if not wicket_rows.empty:

                        if "wicket_kind" in wicket_rows.columns:

                            dismissal = str(
                                wicket_rows[
                                    "wicket_kind"
                                ].iloc[0]
                            )

                        else:

                            dismissal = "out"

                batting.append({

                    "batter": batter,

                    "runs": runs,

                    "balls": balls,

                    "fours": fours,

                    "sixes": sixes,

                    "strike_rate": strike_rate,

                    "dismissal": dismissal
                })

            # =============================================
            # BOWLING SCORECARD
            # =============================================

            bowling = []

            for bowler, bowler_df in innings_df.groupby(
                "bowler",
                sort=False
            ):

                legal_balls_bowled = int(
                    (
                        (bowler_df["wides"] == 0)
                        &
                        (bowler_df["noballs"] == 0)
                    ).sum()
                )

                bowler_overs = (
                    f"{legal_balls_bowled // 6}."
                    f"{legal_balls_bowled % 6}"
                )

                # -----------------------------------------
                # BOWLER RUNS CONCEDED
                # -----------------------------------------

                runs_conceded = int(
                    bowler_df["total_runs"].sum()
                    - bowler_df["byes"].sum()
                    - bowler_df["legbyes"].sum()
                    - bowler_df["penalty_runs"].sum()
                )

                # -----------------------------------------
                # BOWLER WICKETS
                # -----------------------------------------

                wickets_taken = 0

                if "wicket_player" in bowler_df.columns:

                    wicket_rows = bowler_df[
                        bowler_df["wicket_player"].notna()
                    ]

                    if "wicket_kind" in bowler_df.columns:

                        credited_kinds = [
                            "bowled",
                            "caught",
                            "caught and bowled",
                            "lbw",
                            "stumped",
                            "hit wicket"
                        ]

                        wicket_rows = wicket_rows[
                            wicket_rows["wicket_kind"]
                            .isin(credited_kinds)
                        ]

                    wickets_taken = len(
                        wicket_rows
                    )

                # -----------------------------------------
                # ECONOMY
                # -----------------------------------------

                economy = (
                    round(
                        runs_conceded
                        /
                        (legal_balls_bowled / 6),
                        2
                    )
                    if legal_balls_bowled > 0
                    else 0
                )

                bowling.append({

                    "bowler": bowler,

                    "overs": bowler_overs,

                    "runs": runs_conceded,

                    "wickets": wickets_taken,

                    "economy": economy
                })

            # =============================================
            # ADD INNINGS
            # =============================================

            result["innings"].append({

                "innings": int(
                    innings_number
                ),

                "batting_team": batting_team,

                "runs": total_runs,

                "wickets": wickets,

                "overs": overs,

                "extras": extras,

                "batting": batting,

                "bowling": bowling
            })

        return result

    # =====================================================
    # PLAYER FORM
    # =====================================================

    def player_form(
        self,
        player_name,
        last_n=5
    ):

        player_df = self.df[
            self.df["batter"].astype(str).str.lower()
            == str(player_name).lower()
        ].copy()

        if player_df.empty:
            return []

        results = []

        # -------------------------------------------------
        # ONE RECORD PER MATCH
        # -------------------------------------------------

        for (match_id, date), match_df in player_df.groupby(
            ["match_id", "date"]
        ):

            runs = int(
                match_df["batter_runs"].sum()
            )

            balls = int(
                (match_df["wides"] == 0).sum()
            )

            fours = int(
                (match_df["batter_runs"] == 4).sum()
            )

            sixes = int(
                (match_df["batter_runs"] == 6).sum()
            )

            strike_rate = (
                round(
                    runs / balls * 100,
                    2
                )
                if balls > 0
                else 0
            )

            dismissed = False

            dismissal = "not out"

            # -------------------------------------------------
            # DISMISSAL
            # -------------------------------------------------

            if "wicket_player" in match_df.columns:

                wicket_rows = match_df[
                    match_df["wicket_player"]
                    .astype(str)
                    .str.lower()
                    == str(player_name).lower()
                ]

                if not wicket_rows.empty:

                    dismissed = True

                    if "wicket_kind" in wicket_rows.columns:

                        dismissal = str(
                            wicket_rows[
                                "wicket_kind"
                            ].iloc[0]
                        )

                    else:

                        dismissal = "out"

            results.append({

                "match_id": str(match_id),

                "date": str(date),

                "runs": runs,

                "balls": balls,

                "strike_rate": strike_rate,

                "fours": fours,

                "sixes": sixes,

                "dismissed": dismissed,

                "dismissal": dismissal
            })

        # -------------------------------------------------
        # NEWEST MATCH FIRST
        # -------------------------------------------------

        results.sort(
            key=lambda x: x["date"],
            reverse=True
        )

        return results[:last_n]

    # =====================================================
    # SEASON STATISTICS
    # =====================================================

    def season_stats(
        self,
        player_name
    ):

        player_df = self.df[
            self.df["batter"].astype(str).str.lower()
            == str(player_name).lower()
        ].copy()

        if player_df.empty:
            return []

        results = []

        # -------------------------------------------------
        # ONE RECORD PER SEASON
        # -------------------------------------------------

        for season, season_df in player_df.groupby(
            "season"
        ):

            runs = int(
                season_df["batter_runs"].sum()
            )

            balls = int(
                (season_df["wides"] == 0).sum()
            )

            fours = int(
                (season_df["batter_runs"] == 4).sum()
            )

            sixes = int(
                (season_df["batter_runs"] == 6).sum()
            )

            matches = int(
                season_df["match_id"].nunique()
            )

            innings = int(
                season_df[
                    ["match_id", "innings"]
                ]
                .drop_duplicates()
                .shape[0]
            )

            strike_rate = (
                round(
                    runs / balls * 100,
                    2
                )
                if balls > 0
                else 0
            )

            # -------------------------------------------------
            # INDIVIDUAL MATCH SCORES
            # -------------------------------------------------

            match_runs = (
                season_df
                .groupby(
                    ["match_id", "innings"]
                )["batter_runs"]
                .sum()
            )

            highest_score = (
                int(match_runs.max())
                if not match_runs.empty
                else 0
            )

            # -------------------------------------------------
            # FIFTIES AND HUNDREDS
            # -------------------------------------------------

            fifties = int(
                (
                    (match_runs >= 50)
                    &
                    (match_runs < 100)
                ).sum()
            )

            hundreds = int(
                (match_runs >= 100).sum()
            )

            results.append({

                "season": season,

                "matches": matches,

                "innings": innings,

                "runs": runs,

                "balls": balls,

                "strike_rate": strike_rate,

                "fours": fours,

                "sixes": sixes,

                "highest_score": highest_score,

                "fifties": fifties,

                "hundreds": hundreds
            })

        # -------------------------------------------------
        # NEWEST SEASON FIRST
        # -------------------------------------------------

        results.sort(
            key=lambda x: str(x["season"]),
            reverse=True
        )

        return results

    # =====================================================
    # BATTER VS BOWLER MATCHUP
    # =====================================================

    def matchup(
        self,
        batter,
        bowler
    ):

        matchup_df = self.df[
            (
                self.df["batter"].astype(str).str.lower()
                == str(batter).lower()
            )
            &
            (
                self.df["bowler"].astype(str).str.lower()
                == str(bowler).lower()
            )
        ].copy()

        if matchup_df.empty:
            return None

        runs = int(
            matchup_df["batter_runs"].sum()
        )

        balls = int(
            (
                matchup_df["wides"] == 0
            ).sum()
        )

        dismissals = 0

        if "wicket_player" in matchup_df.columns:

            dismissals = int(
                (
                    matchup_df["wicket_player"]
                    .astype(str)
                    .str.lower()
                    ==
                    str(batter).lower()
                ).sum()
            )

        strike_rate = (
            runs / balls * 100
            if balls > 0
            else 0
        )

        return {

            "batter": batter,

            "bowler": bowler,

            "runs": runs,

            "balls": balls,

            "dismissals": dismissals,

            "strike_rate": round(
                strike_rate,
                2
            )
        }