import pandas as pd

def clean_data(df):

    # Remove duplicates
    df = df.drop_duplicates()

    # Fill missing values
    df = df.ffill()

    return df
