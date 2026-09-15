import numpy as np
import pandas as pd

from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import IsolationForest


class CricketAnalytics:

    def __init__(self, df, matches_df=None):

        self.df = df.copy()

        # Optional match-level dataset
        if matches_df is not None:
            self.matches_df = matches_df.copy()
        else:
            self.matches_df = pd.DataFrame()

        # =====================================================
        # BASIC CLEANING
        # =====================================================

        numeric_columns = [
            "season",
            "innings",
            "over",
            "batter_runs",
            "extra_runs",
            "total_runs",
            "wides",
            "noballs",
            "byes",
            "legbyes",
            "penalty_runs",
            "wicket",
            "is_boundary",
            "is_dot"
        ]

        for column in numeric_columns:

            if column in self.df.columns:

                self.df[column] = pd.to_numeric(
                    self.df[column],
                    errors="coerce"
                ).fillna(0)

        text_columns = [
            "match_id",
            "date",
            "venue",
            "team_1",
            "team_2",
            "batting_team",
            "batter",
            "non_striker",
            "bowler",
            "wicket_player",
            "wicket_kind",
            "phase"
        ]

        for column in text_columns:

            if column in self.df.columns:

                self.df[column] = (
                    self.df[column]
                    .fillna("")
                    .astype(str)
                    .str.strip()
                )

        # Clean match dataframe
        if not self.matches_df.empty:

            for column in [
                "match_id",
                "date",
                "venue",
                "team_1",
                "team_2",
                "winner"
            ]:

                if column in self.matches_df.columns:

                    self.matches_df[column] = (
                        self.matches_df[column]
                        .fillna("")
                        .astype(str)
                        .str.strip()
                    )

            for column in [
                "season",
                "win_by_runs",
                "win_by_wickets"
            ]:

                if column in self.matches_df.columns:

                    self.matches_df[column] = pd.to_numeric(
                        self.matches_df[column],
                        errors="coerce"
                    ).fillna(0)

    # =====================================================
    # HELPERS
    # =====================================================

    def _legal_batting_balls(self, df):

        if df.empty:
            return 0

        return int(
            (df["wides"] == 0).sum()
        )

    def _legal_bowling_balls(self, df):

        if df.empty:
            return 0

        return int(
            (
                (df["wides"] == 0)
                &
                (df["noballs"] == 0)
            ).sum()
        )

    def _bowler_runs_conceded(self, df):

        if df.empty:
            return 0

        return int(
            df["total_runs"].sum()
            - df["byes"].sum()
            - df["legbyes"].sum()
            - df["penalty_runs"].sum()
        )

    def _credited_wickets(self, df):

        if df.empty:
            return 0

        if "wicket_player" not in df.columns:
            return 0

        wicket_df = df[
            df["wicket_player"].str.strip() != ""
        ]

        if wicket_df.empty:
            return 0

        credited_kinds = [
            "bowled",
            "caught",
            "caught and bowled",
            "lbw",
            "stumped",
            "hit wicket"
        ]

        return int(
            wicket_df[
                wicket_df["wicket_kind"].isin(
                    credited_kinds
                )
            ].shape[0]
        )

    def _safe_round(self, value, digits=2):

        try:

            if not np.isfinite(float(value)):
                return 0

            return round(float(value), digits)

        except Exception:

            return 0

    def _clean_name(self, value):

        return str(value).strip()

    # =====================================================
    # OVERVIEW
    # =====================================================

    def overview(self):

        total_deliveries = len(self.df)

        total_runs = int(
            self.df["total_runs"].sum()
        )

        total_wickets = int(
            self.df["wicket"].sum()
        )

        total_matches = int(
            self.df["match_id"].nunique()
        )

        total_players = int(
            self.df["batter"].nunique()
        )

        valid_venues = (
            self.df["venue"]
            .loc[
                self.df["venue"].str.strip() != ""
            ]
            .nunique()
        )

        boundaries = int(
            self.df["is_boundary"].sum()
        )

        dots = int(
            self.df["is_dot"].sum()
        )

        return {
            "matches": total_matches,
            "deliveries": total_deliveries,
            "runs": total_runs,
            "wickets": total_wickets,
            "players": total_players,
            "venues": int(valid_venues),
            "boundaries": boundaries,
            "dot_balls": dots
        }

    # =====================================================
    # PLAYER LIST
    # =====================================================

    def player_list(self):

        players = sorted(
            self.df["batter"]
            .dropna()
            .loc[
                self.df["batter"].str.strip() != ""
            ]
            .unique()
            .tolist()
        )

        return players

    # =====================================================
    # BATTING PROFILE
    # =====================================================

    def batting_profile(self, player_name):

        player_df = self.df[
            self.df["batter"].str.lower()
            == str(player_name).lower()
        ]

        if player_df.empty:
            return None

        runs = int(
            player_df["batter_runs"].sum()
        )

        balls = self._legal_batting_balls(
            player_df
        )

        fours = int(
            (
                player_df["batter_runs"] == 4
            ).sum()
        )

        sixes = int(
            (
                player_df["batter_runs"] == 6
            ).sum()
        )

        boundaries = fours + sixes

        matches = int(
            player_df["match_id"].nunique()
        )

        innings = int(
            player_df[
                ["match_id", "innings"]
            ]
            .drop_duplicates()
            .shape[0]
        )

        strike_rate = (
            runs / balls * 100
            if balls > 0
            else 0
        )

        average = 0

        dismissals = int(
            (
                player_df["wicket_player"].str.lower()
                == str(player_name).lower()
            ).sum()
        )

        if dismissals > 0:
            average = runs / dismissals

        match_scores = (
            player_df
            .groupby(
                ["match_id", "innings"]
            )["batter_runs"]
            .sum()
        )

        highest_score = (
            int(match_scores.max())
            if not match_scores.empty
            else 0
        )

        fifties = int(
            (
                (match_scores >= 50)
                &
                (match_scores < 100)
            ).sum()
        )

        hundreds = int(
            (match_scores >= 100).sum()
        )

        return {

            "player": player_name,

            "matches": matches,

            "innings": innings,

            "runs": runs,

            "balls": balls,

            "strike_rate": self._safe_round(
                strike_rate
            ),

            "average": self._safe_round(
                average
            ),

            "fours": fours,

            "sixes": sixes,

            "boundaries": boundaries,

            "highest_score": highest_score,

            "fifties": fifties,

            "hundreds": hundreds
        }

    # =====================================================
    # BOWLING PROFILE
    # =====================================================

    def bowling_profile(self, player_name):

        player_df = self.df[
            self.df["bowler"].str.lower()
            == str(player_name).lower()
        ]

        if player_df.empty:
            return None

        balls = self._legal_bowling_balls(
            player_df
        )

        runs_conceded = (
            self._bowler_runs_conceded(
                player_df
            )
        )

        wickets = self._credited_wickets(
            player_df
        )

        economy = (
            runs_conceded
            /
            (balls / 6)
            if balls > 0
            else 0
        )

        matches = int(
            player_df["match_id"].nunique()
        )

        fours_conceded = int(
            (
                player_df["batter_runs"] == 4
            ).sum()
        )

        sixes_conceded = int(
            (
                player_df["batter_runs"] == 6
            ).sum()
        )

        return {

            "player": player_name,

            "matches": matches,

            "balls": balls,

            "runs_conceded": runs_conceded,

            "wickets": wickets,

            "economy": self._safe_round(
                economy
            ),

            "fours_conceded": fours_conceded,

            "sixes_conceded": sixes_conceded
        }

    # =====================================================
    # PHASE ANALYSIS
    # =====================================================

    def phase_stats(self, player_name):

        player_df = self.df[
            self.df["batter"].str.lower()
            == str(player_name).lower()
        ].copy()

        if player_df.empty:
            return []

        results = []

        phase_order = [
            "Powerplay",
            "Middle",
            "Death"
        ]

        for phase in phase_order:

            phase_df = player_df[
                player_df["phase"].str.lower()
                == phase.lower()
            ]

            if phase_df.empty:
                continue

            runs = int(
                phase_df["batter_runs"].sum()
            )

            balls = self._legal_batting_balls(
                phase_df
            )

            fours = int(
                (
                    phase_df["batter_runs"] == 4
                ).sum()
            )

            sixes = int(
                (
                    phase_df["batter_runs"] == 6
                ).sum()
            )

            boundaries = fours + sixes

            strike_rate = (
                runs / balls * 100
                if balls > 0
                else 0
            )

            dot_balls = int(
                phase_df["is_dot"].sum()
            )

            dot_percentage = (
                dot_balls / balls * 100
                if balls > 0
                else 0
            )

            results.append({

                "phase": phase,

                "runs": runs,

                "balls": balls,

                "strike_rate": self._safe_round(
                    strike_rate
                ),

                "fours": fours,

                "sixes": sixes,

                "boundaries": boundaries,

                "dot_balls": dot_balls,

                "dot_percentage":
                    self._safe_round(
                        dot_percentage
                    )
            })

        return results

    # =====================================================
    # PLAYER PROFILE
    # =====================================================

    def player_profile(self, player_name):

        batting = self.batting_profile(
            player_name
        )

        bowling = self.bowling_profile(
            player_name
        )

        phases = self.phase_stats(
            player_name
        )

        return {

            "player": player_name,

            "batting": batting,

            "bowling": bowling,

            "phase_analysis": phases
        }

    # =====================================================
    # FEATURE TABLE
    # =====================================================

    def feature_table(self):

        players = sorted(
            self.df["batter"]
            .dropna()
            .loc[
                self.df["batter"].str.strip() != ""
            ]
            .unique()
        )

        rows = []

        for player in players:

            batting = self.batting_profile(
                player
            )

            bowling = self.bowling_profile(
                player
            )

            if batting is None:
                continue

            if bowling is None:

                bowling = {
                    "wickets": 0,
                    "economy": 0,
                    "balls": 0,
                    "runs_conceded": 0
                }

            rows.append({

                "player": player,

                "runs": batting["runs"],

                "strike_rate":
                    batting["strike_rate"],

                "average":
                    batting["average"],

                "fours":
                    batting["fours"],

                "sixes":
                    batting["sixes"],

                "highest_score":
                    batting["highest_score"],

                "wickets":
                    bowling["wickets"],

                "economy":
                    bowling["economy"],

                "bowling_balls":
                    bowling["balls"]
            })

        return pd.DataFrame(rows)

    # =====================================================
    # PLAYER DNA
    # =====================================================

    def player_dna(self, player_name):

        batting = self.batting_profile(
            player_name
        )

        bowling = self.bowling_profile(
            player_name
        )

        phases = self.phase_stats(
            player_name
        )

        if batting is None:
            return None

        phase_scores = {}

        for phase in phases:

            phase_scores[
                phase["phase"]
            ] = phase["strike_rate"]

        powerplay_sr = phase_scores.get(
            "Powerplay", 0
        )

        middle_sr = phase_scores.get(
            "Middle", 0
        )

        death_sr = phase_scores.get(
            "Death", 0
        )

        phase_values = {

            "Powerplay":
                powerplay_sr,

            "Middle":
                middle_sr,

            "Death":
                death_sr
        }

        highest_phase = "Balanced"

        if max(phase_values.values()) > 0:

            highest_phase = max(
                phase_values,
                key=phase_values.get
            )

        runs = batting["runs"]

        boundary_runs = (
            batting["fours"] * 4
            +
            batting["sixes"] * 6
        )

        boundary_dependency = (
            boundary_runs / runs * 100
            if runs > 0
            else 0
        )

        if (
            bowling
            and bowling["wickets"] >= 20
            and batting["runs"] >= 500
        ):

            archetype = "All-Rounder"

        elif (
            batting["strike_rate"] >= 145
            and death_sr >= 150
        ):

            archetype = "Power Finisher"

        elif (
            batting["strike_rate"] >= 135
            and powerplay_sr >= 135
        ):

            archetype = "Aggressive Opener"

        elif (
            batting["average"] >= 30
            and batting["strike_rate"] >= 120
        ):

            archetype = "Reliable Run Scorer"

        elif batting["average"] >= 30:

            archetype = "Anchor"

        elif (
            bowling
            and bowling["wickets"] >= 30
        ):

            archetype = "Strike Bowler"

        elif (
            bowling
            and bowling["economy"] > 0
            and bowling["economy"] <= 8
        ):

            archetype = "Economical Bowler"

        else:

            archetype = "Utility Player"

        return {

            "player": player_name,

            "archetype": archetype,

            "primary_phase":
                highest_phase,

            "powerplay_strike_rate":
                self._safe_round(
                    powerplay_sr
                ),

            "middle_strike_rate":
                self._safe_round(
                    middle_sr
                ),

            "death_strike_rate":
                self._safe_round(
                    death_sr
                ),

            "boundary_dependency":
                self._safe_round(
                    boundary_dependency
                ),

            "batting": batting,

            "bowling": bowling
        }

    # =====================================================
    # PLAYER SIMILARITY
    # =====================================================

    def similar_players(
        self,
        player_name,
        limit=5
    ):

        table = self.feature_table()

        if table.empty:
            return []

        target_rows = table[
            table["player"].str.lower()
            == str(player_name).lower()
        ]

        if target_rows.empty:
            return []

        feature_columns = [
            "runs",
            "strike_rate",
            "average",
            "fours",
            "sixes",
            "highest_score",
            "wickets",
            "economy"
        ]

        X = table[
            feature_columns
        ].fillna(0)

        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(X)

        target_index = target_rows.index[0]

        target_position = table.index.get_loc(
            target_index
        )

        similarities = cosine_similarity(
            X_scaled[
                target_position
            ].reshape(1, -1),
            X_scaled
        )[0]

        table = table.copy()

        table["similarity"] = similarities

        table = table[
            table["player"].str.lower()
            != str(player_name).lower()
        ]

        table = table.sort_values(
            "similarity",
            ascending=False
        ).head(limit)

        results = []

        for _, row in table.iterrows():

            results.append({

                "player":
                    row["player"],

                "similarity":
                    self._safe_round(
                        row["similarity"],
                        4
                    )
            })

        return results

    # =====================================================
    # K-MEANS ARCHETYPES
    # =====================================================

    def archetypes(self):

        table = self.feature_table()

        if len(table) < 4:
            return []

        feature_columns = [
            "runs",
            "strike_rate",
            "average",
            "fours",
            "sixes",
            "wickets",
            "economy"
        ]

        X = table[
            feature_columns
        ].fillna(0)

        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(X)

        number_of_clusters = min(
            4,
            len(table)
        )

        model = KMeans(
            n_clusters=number_of_clusters,
            random_state=42,
            n_init=10
        )

        clusters = model.fit_predict(
            X_scaled
        )

        table["cluster"] = clusters

        results = []

        for cluster_id in sorted(
            table["cluster"].unique()
        ):

            cluster_df = table[
                table["cluster"] == cluster_id
            ]

            avg_runs = cluster_df[
                "runs"
            ].mean()

            avg_sr = cluster_df[
                "strike_rate"
            ].mean()

            avg_wickets = cluster_df[
                "wickets"
            ].mean()

            avg_economy = (
                cluster_df["economy"]
                .replace(0, np.nan)
                .mean()
            )

            if (
                avg_wickets >= 20
                and avg_runs >= 500
            ):

                name = "All-Rounders"

            elif avg_wickets >= 30:

                name = "Strike Bowlers"

            elif (
                avg_sr >= 140
                and avg_runs >= 700
            ):

                name = "Explosive Batters"

            elif (
                avg_runs >= 800
                and avg_sr >= 120
            ):

                name = "Elite Run Scorers"

            elif (
                avg_economy > 0
                and avg_economy <= 8
            ):

                name = "Economical Players"

            else:

                name = "Balanced Players"

            players = []

            for _, row in cluster_df.iterrows():

                players.append(
                    row["player"]
                )

            results.append({

                "cluster":
                    int(cluster_id),

                "archetype":
                    name,

                "player_count":
                    len(players),

                "players":
                    players,

                "average_runs":
                    self._safe_round(
                        avg_runs
                    ),

                "average_strike_rate":
                    self._safe_round(
                        avg_sr
                    ),

                "average_wickets":
                    self._safe_round(
                        avg_wickets
                    ),

                "average_economy":
                    self._safe_round(
                        avg_economy
                    )
            })

        return results

    # =====================================================
    # CONTEXT SCORE
    # =====================================================

    def context_score(self, player_name):

        batting = self.batting_profile(
            player_name
        )

        bowling = self.bowling_profile(
            player_name
        )

        phases = self.phase_stats(
            player_name
        )

        if batting is None:
            return None

        batting_score = min(
            batting["runs"] / 20,
            35
        )

        strike_rate_score = min(
            batting["strike_rate"] / 5,
            20
        )

        boundary_score = min(
            (
                batting["fours"]
                +
                batting["sixes"] * 2
            ) / 10,
            10
        )

        batting_component = (
            batting_score
            +
            strike_rate_score
            +
            boundary_score
        )

        bowling_component = 0

        if bowling:

            wicket_score = min(
                bowling["wickets"] * 0.8,
                15
            )

            economy_score = 0

            if bowling["economy"] > 0:

                economy_score = max(
                    0,
                    10
                    -
                    (
                        bowling["economy"]
                        - 6
                    ) * 2
                )

            bowling_component = (
                wicket_score
                +
                economy_score
            )

        phase_component = 0

        if phases:

            valid_phase_scores = [

                phase["strike_rate"]

                for phase in phases

                if phase["balls"] >= 20
            ]

            if valid_phase_scores:

                best_phase_sr = max(
                    valid_phase_scores
                )

                phase_component = min(
                    best_phase_sr / 10,
                    10
                )

        raw_score = (
            batting_component
            +
            bowling_component
            +
            phase_component
        )

        score = min(
            max(raw_score, 0),
            100
        )

        if score >= 80:

            rating = "Elite"

        elif score >= 65:

            rating = "Excellent"

        elif score >= 50:

            rating = "Strong"

        elif score >= 35:

            rating = "Developing"

        else:

            rating = "Emerging"

        return {

            "player": player_name,

            "context_score":
                self._safe_round(score),

            "rating": rating,

            "components": {

                "batting":
                    self._safe_round(
                        batting_component
                    ),

                "bowling":
                    self._safe_round(
                        bowling_component
                    ),

                "phase_impact":
                    self._safe_round(
                        phase_component
                    )
            },

            "note": (
                "SportsIQ Context Score is a "
                "custom analytics metric based "
                "on batting output, strike rate, "
                "boundaries, bowling contribution "
                "and phase performance. It is not "
                "an official cricket statistic."
            )
        }

    # =====================================================
    # IMPACT LEADERBOARD
    # =====================================================

    def _impact_for(self, player_name):

        result = self.context_score(
            player_name
        )

        if result is None:
            return None

        return result["context_score"]

    def impact_leaderboard(
        self,
        limit=20
    ):

        players = self.player_list()

        results = []

        for player in players:

            score = self._impact_for(
                player
            )

            if score is None:
                continue

            results.append({

                "player": player,

                "impact_score": score
            })

        results.sort(
            key=lambda x:
                x["impact_score"],
            reverse=True
        )

        return results[:limit]

    # =====================================================
    # ANOMALY DETECTION
    # =====================================================

    def anomalies(self):

        table = self.feature_table()

        if len(table) < 10:
            return []

        feature_columns = [
            "runs",
            "strike_rate",
            "average",
            "fours",
            "sixes",
            "wickets",
            "economy"
        ]

        X = table[
            feature_columns
        ].fillna(0)

        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(X)

        model = IsolationForest(
            contamination=0.05,
            random_state=42
        )

        predictions = model.fit_predict(
            X_scaled
        )

        table["anomaly"] = predictions

        anomalies_df = table[
            table["anomaly"] == -1
        ]

        results = []

        for _, row in anomalies_df.iterrows():

            results.append({

                "player":
                    row["player"],

                "runs":
                    int(row["runs"]),

                "strike_rate":
                    self._safe_round(
                        row["strike_rate"]
                    ),

                "average":
                    self._safe_round(
                        row["average"]
                    ),

                "wickets":
                    int(row["wickets"]),

                "economy":
                    self._safe_round(
                        row["economy"]
                    ),

                "type":
                    "Statistical anomaly"
            })

        return results

    # =====================================================
    # TEAM ANALYTICS
    # =====================================================

    def team_analytics(self):

        results = []

        if "batting_team" not in self.df.columns:
            return results

        team_df = self.df[
            self.df["batting_team"].str.strip() != ""
        ]

        for team, data in team_df.groupby(
            "batting_team"
        ):

            matches = int(
                data["match_id"].nunique()
            )

            runs = int(
                data["total_runs"].sum()
            )

            wickets = int(
                data["wicket"].sum()
            )

            boundaries = int(
                data["is_boundary"].sum()
            )

            results.append({

                "team": team,

                "matches": matches,

                "runs": runs,

                "wickets_lost": wickets,

                "boundaries": boundaries,

                "average_runs_per_match":
                    self._safe_round(
                        runs / matches
                        if matches > 0
                        else 0
                    )
            })

        results.sort(
            key=lambda x:
                x["runs"],
            reverse=True
        )

        return results

    # =====================================================
    # VENUE ANALYTICS
    # =====================================================

    def venue_analytics(self):

        results = []

        if "venue" not in self.df.columns:
            return results

        venue_df = self.df[
            self.df["venue"].str.strip() != ""
        ]

        for venue, data in venue_df.groupby(
            "venue"
        ):

            matches = int(
                data["match_id"].nunique()
            )

            runs = int(
                data["total_runs"].sum()
            )

            boundaries = int(
                data["is_boundary"].sum()
            )

            results.append({

                "venue": venue,

                "matches": matches,

                "runs": runs,

                "boundaries": boundaries,

                "average_runs_per_match":
                    self._safe_round(
                        runs / matches
                        if matches > 0
                        else 0
                    )
            })

        results.sort(
            key=lambda x:
                x["runs"],
            reverse=True
        )

        return results

    # =====================================================
    # DETAILED TEAM ANALYTICS
    # =====================================================

    def team_detail(self, team_name):

        team_name = self._clean_name(
            team_name
        )

        team_rows = self.df[
            self.df["batting_team"].str.lower()
            == team_name.lower()
        ].copy()

        if team_rows.empty:
            return None

        match_ids = team_rows[
            "match_id"
        ].dropna().unique()

        matches_played = len(match_ids)

        # -------------------------------------------------
        # BATTING
        # -------------------------------------------------

        total_runs = int(
            team_rows["batter_runs"].sum()
        )

        balls = self._legal_batting_balls(
            team_rows
        )

        strike_rate = (
            total_runs / balls * 100
            if balls > 0
            else 0
        )

        run_rate = (
            total_runs / balls * 6
            if balls > 0
            else 0
        )

        wickets = int(
            team_rows["wicket"].sum()
        )

        fours = int(
            (
                team_rows["batter_runs"] == 4
            ).sum()
        )

        sixes = int(
            (
                team_rows["batter_runs"] == 6
            ).sum()
        )

        dots = int(
            team_rows["is_dot"].sum()
        )

        # -------------------------------------------------
        # WIN / LOSS
        # -------------------------------------------------

        wins = 0

        if not self.matches_df.empty:

            match_data = self.matches_df[
                self.matches_df["match_id"].isin(
                    match_ids
                )
            ].copy()

            if "winner" in match_data.columns:

                wins = int(
                    (
                        match_data["winner"]
                        .str.lower()
                        == team_name.lower()
                    ).sum()
                )

        losses = max(
            matches_played - wins,
            0
        )

        win_percentage = (
            wins / matches_played * 100
            if matches_played > 0
            else 0
        )

        # -------------------------------------------------
        # PLAYER BATTING TABLE
        # -------------------------------------------------

        batter_stats = (
            team_rows
            .groupby("batter")
            .agg(
                runs=("batter_runs", "sum"),
                balls=("batter_runs", "count")
            )
            .reset_index()
        )

        batter_stats = batter_stats[
            batter_stats["batter"].str.strip() != ""
        ]

        batter_stats["strike_rate"] = np.where(
            batter_stats["balls"] > 0,
            batter_stats["runs"]
            /
            batter_stats["balls"]
            * 100,
            0
        )

        batter_stats = batter_stats.sort_values(
            "runs",
            ascending=False
        )

        top_batters = []

        for _, row in batter_stats.head(10).iterrows():

            top_batters.append({

                "player":
                    str(row["batter"]),

                "runs":
                    int(row["runs"]),

                "balls":
                    int(row["balls"]),

                "strike_rate":
                    self._safe_round(
                        row["strike_rate"]
                    )
            })

        best_batter = (
            top_batters[0]
            if top_batters
            else None
        )

        # -------------------------------------------------
        # TEAM'S BOWLERS
        #
        # For a team, its bowlers are the bowlers
        # operating while the OPPOSITION is batting.
        # -------------------------------------------------

        bowling_rows = self.df[
            self.df["match_id"].isin(
                match_ids
            )
        ].copy()

        bowling_rows = bowling_rows[
            bowling_rows["bowler"].str.strip() != ""
        ]

        bowling_rows = bowling_rows[
            bowling_rows["batting_team"].str.lower()
            != team_name.lower()
        ]

        bowler_records = []

        for bowler, bowler_df in bowling_rows.groupby(
            "bowler"
        ):

            legal_balls = self._legal_bowling_balls(
                bowler_df
            )

            runs_conceded = (
                self._bowler_runs_conceded(
                    bowler_df
                )
            )

            wickets_taken = (
                self._credited_wickets(
                    bowler_df
                )
            )

            economy = (
                runs_conceded
                /
                (legal_balls / 6)
                if legal_balls > 0
                else 0
            )

            bowler_records.append({

                "player":
                    str(bowler),

                "wickets":
                    int(wickets_taken),

                "runs_conceded":
                    int(runs_conceded),

                "balls":
                    int(legal_balls),

                "economy":
                    self._safe_round(
                        economy
                    )
            })

        bowler_records.sort(
            key=lambda x: (
                x["wickets"],
                -x["economy"]
            ),
            reverse=True
        )

        top_bowlers = bowler_records[:10]

        best_bowler = (
            top_bowlers[0]
            if top_bowlers
            else None
        )

        # -------------------------------------------------
        # PHASE ANALYSIS
        # -------------------------------------------------

        phases = {}

        for phase in [
            "Powerplay",
            "Middle",
            "Death"
        ]:

            phase_df = team_rows[
                team_rows["phase"].str.lower()
                == phase.lower()
            ]

            phase_runs = int(
                phase_df["batter_runs"].sum()
            )

            phase_balls = self._legal_batting_balls(
                phase_df
            )

            phase_sr = (
                phase_runs
                /
                phase_balls
                * 100
                if phase_balls > 0
                else 0
            )

            phases[
                phase.lower()
            ] = {

                "runs":
                    phase_runs,

                "balls":
                    phase_balls,

                "strike_rate":
                    self._safe_round(
                        phase_sr
                    )
            }

        # -------------------------------------------------
        # SEASON PERFORMANCE
        # -------------------------------------------------

        season_stats = []

        if "season" in team_rows.columns:

            for season, season_df in team_rows.groupby(
                "season"
            ):

                season_runs = int(
                    season_df["batter_runs"].sum()
                )

                season_matches = int(
                    season_df["match_id"].nunique()
                )

                season_balls = (
                    self._legal_batting_balls(
                        season_df
                    )
                )

                season_run_rate = (
                    season_runs
                    /
                    season_balls
                    * 6
                    if season_balls > 0
                    else 0
                )

                season_wins = 0

                if not self.matches_df.empty:

                    season_matches_df = (
                        self.matches_df[
                            self.matches_df["match_id"]
                            .isin(
                                season_df[
                                    "match_id"
                                ].unique()
                            )
                        ]
                    )

                    if "winner" in season_matches_df:

                        season_wins = int(
                            (
                                season_matches_df[
                                    "winner"
                                ]
                                .str.lower()
                                == team_name.lower()
                            ).sum()
                        )

                season_stats.append({

                    "season":
                        str(season),

                    "matches":
                        season_matches,

                    "wins":
                        season_wins,

                    "runs":
                        season_runs,

                    "run_rate":
                        self._safe_round(
                            season_run_rate
                        )
                })

        season_stats.sort(
            key=lambda x: x["season"],
            reverse=True
        )

        # -------------------------------------------------
        # FINAL TEAM DETAIL
        # -------------------------------------------------

        return {

            "team": team_name,

            "matches":
                matches_played,

            "wins":
                wins,

            "losses":
                losses,

            "win_percentage":
                self._safe_round(
                    win_percentage
                ),

            "runs":
                total_runs,

            "wickets":
                wickets,

            "balls":
                balls,

            "run_rate":
                self._safe_round(
                    run_rate
                ),

            "strike_rate":
                self._safe_round(
                    strike_rate
                ),

            "fours":
                fours,

            "sixes":
                sixes,

            "dot_balls":
                dots,

            "best_batter":
                best_batter,

            "best_bowler":
                best_bowler,

            "top_batters":
                top_batters,

            "top_bowlers":
                top_bowlers,

            "phases":
                phases,

            "season_stats":
                season_stats
        }

    # =====================================================
    # DETAILED VENUE ANALYTICS
    # =====================================================

    def venue_detail(self, venue_name):

        venue_name = self._clean_name(
            venue_name
        )

        venue_rows = self.df[
            self.df["venue"].str.lower()
            == venue_name.lower()
        ].copy()

        if venue_rows.empty:
            return None

        match_ids = (
            venue_rows["match_id"]
            .dropna()
            .unique()
        )

        matches = len(match_ids)

        total_runs = int(
            venue_rows["total_runs"].sum()
        )

        batting_runs = int(
            venue_rows["batter_runs"].sum()
        )

        balls = self._legal_batting_balls(
            venue_rows
        )

        run_rate = (
            total_runs / balls * 6
            if balls > 0
            else 0
        )

        average_runs = (
            total_runs / matches
            if matches > 0
            else 0
        )

        boundaries = int(
            venue_rows["is_boundary"].sum()
        )

        fours = int(
            (
                venue_rows["batter_runs"] == 4
            ).sum()
        )

        sixes = int(
            (
                venue_rows["batter_runs"] == 6
            ).sum()
        )

        dots = int(
            venue_rows["is_dot"].sum()
        )

        wickets = int(
            venue_rows["wicket"].sum()
        )

        # -------------------------------------------------
        # TEAM PERFORMANCE AT VENUE
        # -------------------------------------------------

        team_performance = []

        for team, team_df in venue_rows.groupby(
            "batting_team"
        ):

            if str(team).strip() == "":
                continue

            team_runs = int(
                team_df["total_runs"].sum()
            )

            team_batter_runs = int(
                team_df["batter_runs"].sum()
            )

            team_balls = self._legal_batting_balls(
                team_df
            )

            team_matches = int(
                team_df["match_id"].nunique()
            )

            team_run_rate = (
                team_runs / team_balls * 6
                if team_balls > 0
                else 0
            )

            team_wins = 0

            if not self.matches_df.empty:

                venue_match_data = (
                    self.matches_df[
                        self.matches_df["match_id"]
                        .isin(match_ids)
                    ]
                )

                if "winner" in venue_match_data.columns:

                    team_wins = int(
                        (
                            venue_match_data[
                                "winner"
                            ].str.lower()
                            == str(team).lower()
                        ).sum()
                    )

            team_performance.append({

                "team":
                    str(team),

                "matches":
                    team_matches,

                "wins":
                    team_wins,

                "runs":
                    team_runs,

                "batting_runs":
                    team_batter_runs,

                "run_rate":
                    self._safe_round(
                        team_run_rate
                    ),

                "average_runs":
                    self._safe_round(
                        team_runs / team_matches
                        if team_matches > 0
                        else 0
                    )
            })

        team_performance.sort(
            key=lambda x: x["runs"],
            reverse=True
        )

        # -------------------------------------------------
        # TOP BATTERS AT VENUE
        # -------------------------------------------------

        batter_stats = (
            venue_rows
            .groupby("batter")
            .agg(
                runs=("batter_runs", "sum"),
                balls=("batter_runs", "count")
            )
            .reset_index()
        )

        batter_stats = batter_stats[
            batter_stats["batter"].str.strip() != ""
        ]

        batter_stats["strike_rate"] = np.where(
            batter_stats["balls"] > 0,
            batter_stats["runs"]
            /
            batter_stats["balls"]
            * 100,
            0
        )

        batter_stats = batter_stats.sort_values(
            "runs",
            ascending=False
        )

        top_batters = []

        for _, row in batter_stats.head(10).iterrows():

            top_batters.append({

                "player":
                    str(row["batter"]),

                "runs":
                    int(row["runs"]),

                "balls":
                    int(row["balls"]),

                "strike_rate":
                    self._safe_round(
                        row["strike_rate"]
                    )
            })

        # -------------------------------------------------
        # TOP BOWLERS AT VENUE
        # -------------------------------------------------

        top_bowlers = []

        for bowler, bowler_df in venue_rows.groupby(
            "bowler"
        ):

            if str(bowler).strip() == "":
                continue

            legal_balls = self._legal_bowling_balls(
                bowler_df
            )

            runs_conceded = (
                self._bowler_runs_conceded(
                    bowler_df
                )
            )

            wickets_taken = (
                self._credited_wickets(
                    bowler_df
                )
            )

            economy = (
                runs_conceded
                /
                (legal_balls / 6)
                if legal_balls > 0
                else 0
            )

            top_bowlers.append({

                "player":
                    str(bowler),

                "wickets":
                    int(wickets_taken),

                "runs_conceded":
                    int(runs_conceded),

                "balls":
                    int(legal_balls),

                "economy":
                    self._safe_round(
                        economy
                    )
            })

        top_bowlers.sort(
            key=lambda x: (
                x["wickets"],
                -x["economy"]
            ),
            reverse=True
        )

        top_bowlers = top_bowlers[:10]

        # -------------------------------------------------
        # SEASON PERFORMANCE
        # -------------------------------------------------

        season_stats = []

        for season, season_df in venue_rows.groupby(
            "season"
        ):

            season_matches = int(
                season_df["match_id"].nunique()
            )

            season_runs = int(
                season_df["total_runs"].sum()
            )

            season_balls = (
                self._legal_batting_balls(
                    season_df
                )
            )

            season_run_rate = (
                season_runs
                /
                season_balls
                * 6
                if season_balls > 0
                else 0
            )

            season_stats.append({

                "season":
                    str(season),

                "matches":
                    season_matches,

                "runs":
                    season_runs,

                "run_rate":
                    self._safe_round(
                        season_run_rate
                    ),

                "average_runs":
                    self._safe_round(
                        season_runs
                        /
                        season_matches
                        if season_matches > 0
                        else 0
                    )
            })

        season_stats.sort(
            key=lambda x: x["season"],
            reverse=True
        )

        # -------------------------------------------------
        # PHASE PERFORMANCE
        # -------------------------------------------------

        phases = {}

        for phase in [
            "Powerplay",
            "Middle",
            "Death"
        ]:

            phase_df = venue_rows[
                venue_rows["phase"].str.lower()
                == phase.lower()
            ]

            phase_runs = int(
                phase_df["total_runs"].sum()
            )

            phase_balls = (
                self._legal_batting_balls(
                    phase_df
                )
            )

            phase_run_rate = (
                phase_runs
                /
                phase_balls
                * 6
                if phase_balls > 0
                else 0
            )

            phases[
                phase.lower()
            ] = {

                "runs":
                    phase_runs,

                "balls":
                    phase_balls,

                "run_rate":
                    self._safe_round(
                        phase_run_rate
                    )
            }

        # -------------------------------------------------
        # FINAL VENUE DETAIL
        # -------------------------------------------------

        return {

            "venue":
                venue_name,

            "matches":
                matches,

            "runs":
                total_runs,

            "batting_runs":
                batting_runs,

            "average_runs":
                self._safe_round(
                    average_runs
                ),

            "run_rate":
                self._safe_round(
                    run_rate
                ),

            "wickets":
                wickets,

            "boundaries":
                boundaries,

            "fours":
                fours,

            "sixes":
                sixes,

            "dot_balls":
                dots,

            "team_performance":
                team_performance,

            "top_batters":
                top_batters,

            "top_bowlers":
                top_bowlers,

            "season_stats":
                season_stats,

            "phases":
                phases
        }

    # =====================================================
    # AI CONTEXT
    # =====================================================

    def ai_context(self):

        overview = self.overview()

        return {

            "overview":
                overview,

            "top_impact_players":
                self.impact_leaderboard(
                    limit=10
                ),

            "archetypes":
                self.archetypes()
        }