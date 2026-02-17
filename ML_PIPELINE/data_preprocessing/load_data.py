import pandas as pd

def load_dataset(file_path):

    df = pd.read_csv(file_path)

    df['x_Timestamp'] = pd.to_datetime(df['x_Timestamp'])

    df = df.sort_values('x_Timestamp')

    df = df.reset_index(drop=True)

    return df
