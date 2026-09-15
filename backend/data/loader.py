import pandas as pd
from pathlib import Path


def load_dataset(path):
    """
    Load the processed Cricsheet IPL delivery dataset.
    """

    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}"
        )

    print(f"Loading dataset: {path}")

    df = pd.read_csv(
        path,
        low_memory=False
    )

    # Normalize column names
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
    )

    # Numeric columns
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

        if column in df.columns:

            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            ).fillna(0)

    # Text columns
    text_columns = [
        "match_id",
        "date",
        "venue",
        "team_1",
        "team_2",
        "batting_team",
        "phase",
        "batter",
        "non_striker",
        "bowler",
        "wicket_player",
        "wicket_kind"
    ]

    for column in text_columns:

        if column in df.columns:

            df[column] = (
                df[column]
                .fillna("")
                .astype(str)
                .str.strip()
            )

    # Make sure these columns exist
    if "is_boundary" not in df.columns:

        df["is_boundary"] = (
            df["batter_runs"]
            .isin([4, 6])
            .astype(int)
        )

    if "is_dot" not in df.columns:

        df["is_dot"] = (
            df["total_runs"] == 0
        ).astype(int)

    # Required columns
    required_columns = [
        "match_id",
        "season",
        "innings",
        "batting_team",
        "batter",
        "bowler",
        "batter_runs",
        "total_runs",
        "wicket"
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            "Missing required columns: "
            + ", ".join(missing_columns)
        )

    print(
        f"Dataset loaded successfully: "
        f"{len(df):,} deliveries"
    )

    print(
        f"Unique matches: "
        f"{df['match_id'].nunique():,}"
    )

    print(
        f"Unique batters: "
        f"{df['batter'].nunique():,}"
    )

    print(
        f"Unique bowlers: "
        f"{df['bowler'].nunique():,}"
    )

    return df