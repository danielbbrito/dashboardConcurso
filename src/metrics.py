import pandas as pd


def compute_kpis(df):
    vazio = df.empty
    feitas = int(df["feitas"].sum()) if not vazio else 0
    acertos = int(df["acertos"].sum()) if not vazio else 0
    erros = feitas - acertos
    chutes = int(df["chutes"].sum()) if not vazio else 0
    chutes_certos = int(df["chutes_certos"].sum()) if not vazio else 0
    chutes_errados = chutes - chutes_certos
    acertos_sem_chute = acertos - chutes_certos
    taxa_acerto = acertos / feitas if feitas else None
    taxa_acerto_seguro = (
        (acertos - chutes_certos) / feitas if feitas else None
    )
    base_nao_chutadas = feitas - chutes
    taxa_acerto_nao_chutadas = (
        (acertos - chutes_certos) / base_nao_chutadas if base_nao_chutadas > 0 else None
    )
    pct_chutes = chutes / feitas if feitas else None
    taxa_chute_certo = chutes_certos / chutes if chutes else None
    nota_cebraspe = acertos - 0.5 * erros
    nota_cebraspe_pct = nota_cebraspe / feitas if feitas else None
    return {
        "feitas": feitas,
        "acertos": acertos,
        "erros": erros,
        "chutes": chutes,
        "chutes_certos": chutes_certos,
        "chutes_errados": chutes_errados,
        "acertos_sem_chute": acertos_sem_chute,
        "taxa_acerto": taxa_acerto,
        "taxa_acerto_seguro": taxa_acerto_seguro,
        "taxa_acerto_nao_chutadas": taxa_acerto_nao_chutadas,
        "pct_chutes": pct_chutes,
        "taxa_chute_certo": taxa_chute_certo,
        "nota_cebraspe": nota_cebraspe,
        "nota_cebraspe_pct": nota_cebraspe_pct,
    }


_COLS_SERIE = [
    "data",
    "feitas",
    "acertos",
    "chutes",
    "chutes_certos",
    "feitas_acum",
    "acertos_acum",
    "chutes_acum",
    "chutes_certos_acum",
    "taxa_acum",
    "nota_acum",
    "taxa_acum_seguro",
]


def serie_diaria(df):
    if df.empty:
        return pd.DataFrame(columns=_COLS_SERIE)
    g = (
        df.groupby("data", as_index=False)
        .agg(
            feitas=("feitas", "sum"),
            acertos=("acertos", "sum"),
            chutes=("chutes", "sum"),
            chutes_certos=("chutes_certos", "sum"),
        )
        .sort_values("data")
        .reset_index(drop=True)
    )
    g["feitas_acum"] = g["feitas"].cumsum()
    g["acertos_acum"] = g["acertos"].cumsum()
    g["chutes_acum"] = g["chutes"].cumsum()
    g["chutes_certos_acum"] = g["chutes_certos"].cumsum()
    g["taxa_acum"] = g["acertos_acum"] / g["feitas_acum"]
    g["nota_acum"] = g["acertos_acum"] - 0.5 * (g["feitas_acum"] - g["acertos_acum"])
    g["taxa_acum_seguro"] = (g["acertos_acum"] - g["chutes_certos_acum"]) / g["feitas_acum"]
    return g[_COLS_SERIE]


_COLS_SERIE_HORAS = ["data", "horas", "horas_acum"]


def serie_horas_diaria(df):
    if df.empty:
        return pd.DataFrame(columns=_COLS_SERIE_HORAS)
    g = (
        df.groupby("data", as_index=False)["horas"]
        .sum()
        .sort_values("data")
        .reset_index(drop=True)
    )
    g["horas_acum"] = g["horas"].cumsum()
    return g[_COLS_SERIE_HORAS]


def _inicio_semana(dt):
    return dt - pd.to_timedelta(dt.dt.dayofweek, unit="D")


def semanas_de(datas):
    s = pd.to_datetime(list(datas)).to_series().reset_index(drop=True)
    inicios = _inicio_semana(s)
    semanas = sorted(set(inicios), reverse=True)
    return [
        (m.strftime("%Y-%m-%d"), (m + pd.Timedelta(days=6)).strftime("%Y-%m-%d"))
        for m in semanas
    ]


_COLS_HORAS_SEMANA = ["semana_inicio", "data_fim", "horas", "dias", "media_dia"]


def horas_por_semana(df):
    if df.empty:
        return pd.DataFrame(columns=_COLS_HORAS_SEMANA)
    g = df.copy()
    g["dt"] = pd.to_datetime(g["data"])
    g["semana_inicio"] = _inicio_semana(g["dt"])
    out = (
        g.groupby("semana_inicio", as_index=False)
        .agg(horas=("horas", "sum"), dias=("data", "nunique"))
    )
    out["data_fim"] = out["semana_inicio"] + pd.Timedelta(days=6)
    out["media_dia"] = out["horas"] / out["dias"]
    out["semana_inicio"] = out["semana_inicio"].dt.strftime("%Y-%m-%d")
    out["data_fim"] = out["data_fim"].dt.strftime("%Y-%m-%d")
    return (
        out.sort_values("semana_inicio", ascending=False)
        .reset_index(drop=True)[_COLS_HORAS_SEMANA]
    )


_COLS_RANKING = [
    "disciplina_id",
    "nome",
    "bloco",
    "feitas",
    "acertos",
    "chutes",
    "chutes_certos",
    "taxa_acerto",
    "taxa_acerto_seguro",
    "nota_cebraspe",
]


def ranking(df, min_feitas=20, metrica="taxa"):
    if df.empty:
        return pd.DataFrame(columns=_COLS_RANKING)
    g = (
        df.groupby(["disciplina_id", "nome", "bloco"], as_index=False)
        .agg(
            feitas=("feitas", "sum"),
            acertos=("acertos", "sum"),
            chutes=("chutes", "sum"),
            chutes_certos=("chutes_certos", "sum"),
        )
    )
    g["taxa_acerto"] = g["acertos"] / g["feitas"]
    g["taxa_acerto_seguro"] = pd.Series(
        [
            (a - cc) / f if f > 0 else None
            for a, cc, f in zip(g["acertos"], g["chutes_certos"], g["feitas"])
        ],
        dtype=object,
    )
    g["nota_cebraspe"] = g["acertos"] - 0.5 * (g["feitas"] - g["acertos"])
    g = g[g["feitas"] >= min_feitas]
    coluna = "taxa_acerto_seguro" if metrica == "taxa_segura" else "taxa_acerto"
    return (
        g.sort_values(
            [coluna, "feitas", "nome"],
            ascending=[False, False, True],
            na_position="last",
        ).reset_index(drop=True)
    )


def comparar(df, corte_a, corte_b):
    str_a, str_b = str(corte_a), str(corte_b)
    df_a = df[df["data"] <= str_a]
    df_b = df[df["data"] <= str_b]
    df_ab = df[(df["data"] > str_a) & (df["data"] <= str_b)]
    return {
        "kpis_a": compute_kpis(df_a),
        "kpis_b": compute_kpis(df_b),
        "por_disciplina": _comparar_por_disciplina(df_a, df_b, df_ab),
    }


def _comparar_por_disciplina(df_a, df_b, df_ab):
    linhas = []
    for (disc_id, nome, bloco), sub_b in df_b.groupby(["disciplina_id", "nome", "bloco"]):
        sub_a = df_a[df_a["disciplina_id"] == disc_id]
        sub_ab = df_ab[df_ab["disciplina_id"] == disc_id]
        feitas_periodo = int(sub_ab["feitas"].sum())
        if feitas_periodo == 0:
            continue
        feitas_a = int(sub_a["feitas"].sum())
        acertos_a = int(sub_a["acertos"].sum())
        feitas_b = int(sub_b["feitas"].sum())
        acertos_b = int(sub_b["acertos"].sum())
        taxa_a = acertos_a / feitas_a if feitas_a else None
        taxa_b = acertos_b / feitas_b if feitas_b else None
        if taxa_a is None:
            delta_pp = (taxa_b or 0) * 100
        elif taxa_b is None:
            delta_pp = None
        else:
            delta_pp = (taxa_b - taxa_a) * 100
        linhas.append(
            {
                "disciplina_id": disc_id,
                "nome": nome,
                "bloco": bloco,
                "feitas_periodo": feitas_periodo,
                "feitas_a": feitas_a,
                "feitas_b": feitas_b,
                "taxa_a": taxa_a,
                "taxa_b": taxa_b,
                "delta_pp": delta_pp,
            }
        )
    if not linhas:
        return pd.DataFrame(
            columns=[
                "disciplina_id",
                "nome",
                "bloco",
                "feitas_periodo",
                "feitas_a",
                "feitas_b",
                "taxa_a",
                "taxa_b",
                "delta_pp",
            ]
        )
    out = pd.DataFrame(linhas)
    return out.sort_values("delta_pp", ascending=False).reset_index(drop=True)