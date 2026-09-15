import pandas as pd


def load_matches(path):

    df = pd.read_csv(
        path,
        low_memory=False
    )

    return df